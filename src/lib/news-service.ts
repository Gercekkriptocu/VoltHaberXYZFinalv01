/**
 * News Service - Fetches crypto news from Tree of Alpha API, AggrNews via Exa, and Bloomberg Crypto
 */

import { exaSearch } from '../exa-api';
import * as cheerio from 'cheerio';
import type { CheerioAPI } from 'cheerio';

// User agent rotation for anti-scraping
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14.2; rv:121.0) Gecko/20100101 Firefox/121.0'
];

function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

export interface CryptoNews {
  id: string;
  title: string;
  url: string;
  text?: string;
  publishedDate?: string;
  source?: string;
  score?: number;
  image?: string;
  sentiment?: 'positive' | 'negative' | 'neutral';
  fetchedAt?: string;
}

interface TreeOfAlphaNews {
  _id: string;
  title?: string;
  body?: string;
  url?: string;
  time?: number;
  source?: {
    name?: string;
    domain?: string;
  };
  similarity?: number;
  image?: string;
  imageUrl?: string;
}

/**
 * Scrape individual article page for images (most reliable method)
 */
async function scrapeArticleImage(articleUrl: string): Promise<string | undefined> {
  try {
    const urlParts = new URL(articleUrl);
    const response = await fetch('/api/proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        protocol: urlParts.protocol.replace(':', ''),
        origin: urlParts.host,
        path: urlParts.pathname + urlParts.search,
        method: 'GET',
        headers: {
          'User-Agent': getRandomUserAgent(),
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9,tr;q=0.8',
          'Referer': urlParts.origin,
          'Cache-Control': 'no-cache'
        }
      })
    });

    if (!response.ok) return undefined;

    const html = await response.text();
    const $ = cheerio.load(html);
    
    // Extract image from full article page
    return extractImageFromHtml($, $('body'), articleUrl);
  } catch (error) {
    console.error(`Error scraping article ${articleUrl}:`, error);
    return undefined;
  }
}

/**
 * Advanced image extraction from HTML using multiple strategies
 */
function extractImageFromHtml($: CheerioAPI, $element: cheerio.Cheerio<cheerio.Element>, baseUrl: string): string | undefined {
  const images: string[] = [];

  // Strategy 1: Meta tags (og:image, twitter:image) - Most reliable for article pages
  const ogImage = $('meta[property="og:image"]').attr('content') || 
                  $('meta[property="og:image:secure_url"]').attr('content') ||
                  $('meta[name="twitter:image"]').attr('content') ||
                  $('meta[name="twitter:image:src"]').attr('content') ||
                  $('meta[itemprop="image"]').attr('content');
  if (ogImage) images.push(ogImage);

  // Strategy 2: JSON-LD structured data (schema.org)
  $('script[type="application/ld+json"]').each((_, script) => {
    try {
      const jsonText = $(script).html();
      if (jsonText) {
        const data = JSON.parse(jsonText);
        
        // Handle both single objects and arrays
        const items = Array.isArray(data) ? data : [data];
        
        for (const item of items) {
          // Check for image in various formats
          if (item.image) {
            if (typeof item.image === 'string') {
              images.push(item.image);
            } else if (Array.isArray(item.image)) {
              images.push(...item.image.filter((img: unknown): img is string => typeof img === 'string'));
            } else if (typeof item.image === 'object' && item.image.url) {
              images.push(item.image.url);
            }
          }
          
          // Check for thumbnailUrl
          if (item.thumbnailUrl) {
            if (typeof item.thumbnailUrl === 'string') {
              images.push(item.thumbnailUrl);
            } else if (Array.isArray(item.thumbnailUrl)) {
              images.push(...item.thumbnailUrl.filter((img: unknown): img is string => typeof img === 'string'));
            }
          }
        }
      }
    } catch (error) {
      // Silently ignore JSON parse errors
    }
  });

  // Strategy 3: Standard img tags with all lazy loading variants
  $element.find('img').each((_, img) => {
    const $img = $(img);
    const src = $img.attr('src') || 
                $img.attr('data-src') || 
                $img.attr('data-lazy-src') ||
                $img.attr('data-original') ||
                $img.attr('data-lazy') ||
                $img.attr('data-srcset')?.split(',')[0]?.trim().split(' ')[0];
    
    if (src && src.length > 10) {
      images.push(src);
    }
    
    // Check srcset for responsive images
    const srcset = $img.attr('srcset');
    if (srcset) {
      // Parse srcset: "image-300w.jpg 300w, image-600w.jpg 600w"
      const sources = srcset.split(',').map(s => s.trim().split(' ')[0]);
      // Get the largest image (last one in srcset)
      if (sources.length > 0) {
        images.push(sources[sources.length - 1] || sources[0] || '');
      }
    }
  });

  // Strategy 4: CSS background-image (in style attribute)
  $element.find('[style*="background-image"]').each((_, elem) => {
    const style = $(elem).attr('style');
    if (style) {
      const match = style.match(/background-image:\s*url\(['"]?([^'"()]+)['"]?\)/);
      if (match?.[1]) {
        images.push(match[1]);
      }
    }
  });

  // Strategy 5: Picture element (modern responsive images)
  $element.find('picture source').each((_, source) => {
    const srcset = $(source).attr('srcset');
    if (srcset) {
      const sources = srcset.split(',').map(s => s.trim().split(' ')[0]);
      if (sources.length > 0) {
        images.push(sources[sources.length - 1] || sources[0] || '');
      }
    }
  });

  // Strategy 6: Common image container classes (expanded)
  const imageContainers = $element.find(
    '.featured-image, .post-image, .article-image, .hero-image, .post-thumbnail, ' +
    '.wp-post-image, .entry-image, .main-image, .lead-image, .story-image, ' +
    '[class*="thumbnail"], [class*="hero"], [class*="featured"], [class*="cover"], ' +
    '[class*="banner"], figure, .figure'
  );
  imageContainers.find('img').each((_, img) => {
    const $img = $(img);
    const src = $img.attr('src') || $img.attr('data-src') || $img.attr('data-lazy-src');
    if (src) images.push(src);
  });

  // Strategy 7: Article body's first large image
  $element.find('article img, .article-body img, .entry-content img, .post-content img, main img').each((_, img) => {
    const $img = $(img);
    const src = $img.attr('src') || $img.attr('data-src');
    const width = parseInt($img.attr('width') || '0');
    const height = parseInt($img.attr('height') || '0');
    
    // Prioritize large images (likely featured images)
    if (src && (width > 400 || height > 300 || !width)) {
      images.push(src);
    }
  });

  // Strategy 8: First img tag in document (often the featured image)
  const firstImg = $('img').first();
  const firstSrc = firstImg.attr('src') || firstImg.attr('data-src');
  if (firstSrc) images.push(firstSrc);

  // Filter and normalize images
  const validImages = images
    .filter(img => {
      if (!img || img.length < 10) return false;
      // Filter out common placeholders and icons
      const lower = img.toLowerCase();
      return !lower.includes('placeholder') && 
             !lower.includes('avatar') && 
             !lower.includes('icon.') &&
             !lower.includes('logo.') &&
             !lower.includes('favicon') &&
             !lower.includes('sprite') &&
             !lower.includes('emoji') &&
             !lower.includes('pixel') &&
             !lower.match(/\d+x\d+\.(png|jpg|gif)$/) && // e.g., 1x1.png
             !img.endsWith('.svg') &&
             !img.includes('data:image') &&
             !img.includes('gravatar') &&
             !img.includes('avatar');
    })
    .map(img => {
      // Normalize relative URLs
      if (img.startsWith('//')) {
        return `https:${img}`;
      }
      if (!img.startsWith('http')) {
        try {
          const base = new URL(baseUrl);
          return new URL(img, base.origin).href;
        } catch {
          return img.startsWith('/') ? `${baseUrl}${img}` : `${baseUrl}/${img}`;
        }
      }
      return img;
    })
    .filter(img => {
      // Final validation: must be valid URL
      try {
        new URL(img);
        return true;
      } catch {
        return false;
      }
    });

  // Return the first valid image (usually the most relevant)
  return validImages[0];
}

/**
 * Fetch latest crypto news from all sources including new server-side API
 */
export async function fetchCryptoNews(): Promise<CryptoNews[]> {
  try {
    // Fetch from server-side news API (with advanced image extraction)
    const serverNewsPromise = fetch('/api/news')
      .then(res => res.ok ? res.json() : [])
      .catch(() => []);

    // Fetch from client-side sources in parallel
    const [serverNews, treeNews, aggrNews, exchangeListings] = await Promise.all([
      serverNewsPromise,
      fetchTreeOfAlphaNews(),
      fetchAggrNews(),
      fetchExchangeListings()
    ]);

    // Combine all news and remove duplicates by URL
    const allNews = [...serverNews, ...treeNews, ...aggrNews, ...exchangeListings];
    const uniqueNews = Array.from(
      new Map(allNews.map(item => [item.url, item])).values()
    );

    // Sort by date - newest first
    return uniqueNews.sort((a, b) => {
      if (a.publishedDate && b.publishedDate) {
        return new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime();
      }
      return (b.score || 0) - (a.score || 0);
    });
  } catch (error) {
    console.error('Error fetching crypto news:', error);
    return [];
  }
}

/**
 * Fetch news from Tree of Alpha API
 */
async function fetchTreeOfAlphaNews(): Promise<CryptoNews[]> {
  try {
    const response = await fetch('/api/proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        protocol: 'https',
        origin: 'news.treeofalpha.com',
        path: '/api/news?limit=500',
        method: 'GET',
        headers: {}
      })
    });

    if (!response.ok) {
      throw new Error('Failed to fetch Tree of Alpha news');
    }

    const data = await response.json();
    const newsItems: TreeOfAlphaNews[] = Array.isArray(data) ? data : [];

    return newsItems
      .filter(item => item.url && (item.title || item.body))
      .map(item => ({
        id: item._id || Math.random().toString(),
        title: item.title || item.body?.substring(0, 100) || 'Crypto News',
        url: item.url || '',
        text: item.body || item.title,
        publishedDate: item.time ? new Date(item.time * 1000).toISOString() : undefined,
        source: item.source?.name || 'Tree of Alpha',
        score: item.similarity,
        image: item.image || item.imageUrl
      }));
  } catch (error) {
    console.error('Error fetching Tree of Alpha news:', error);
    return [];
  }
}

/**
 * Fetch news from AggrNews via Exa Search
 */
async function fetchAggrNews(): Promise<CryptoNews[]> {
  try {
    const response = await exaSearch({
      query: 'site:x.com/AggrNews OR site:twitter.com/AggrNews crypto news latest',
      text: true
    });

    if (!response.results) {
      return [];
    }

    return response.results
      .filter(result => result.url && result.title)
      .map(result => ({
        id: result.id || result.url || Math.random().toString(),
        title: result.title || 'Crypto News',
        url: result.url || '',
        text: result.text || result.summary,
        publishedDate: result.publishedDate,
        source: '@AggrNews',
        score: result.score,
        image: result.image
      }));
  } catch (error) {
    console.error('Error fetching AggrNews:', error);
    return [];
  }
}

/**
 * Fetch new coin listing announcements from major exchanges
 */
async function fetchExchangeListings(): Promise<CryptoNews[]> {
  try {
    // Search for new coin listing announcements from major exchanges
    const exchanges = [
      { name: 'Binance', query: 'site:binance.com/en/support/announcement new listing' },
      { name: 'OKX', query: 'site:okx.com new listing announcement' },
      { name: 'Upbit', query: 'site:upbit.com listing announcement' },
      { name: 'Bithumb', query: 'site:bithumb.com listing announcement' }
    ];

    const searchPromises = exchanges.map(async (exchange) => {
      try {
        const response = await exaSearch({
          query: `${exchange.query} crypto coin token`,
          text: true,
          numResults: 5
        });

        if (!response.results) {
          return [];
        }

        return response.results
          .filter(result => result.url && result.title)
          .filter(result => {
            const title = result.title?.toLowerCase() || '';
            return title.includes('listing') || 
                   title.includes('list') || 
                   title.includes('launch') ||
                   title.includes('trading');
          })
          .map(result => ({
            id: result.id || result.url || Math.random().toString(),
            title: result.title || 'Exchange Listing',
            url: result.url || '',
            text: result.text || result.summary,
            publishedDate: result.publishedDate,
            source: `${exchange.name} Listing`,
            score: result.score,
            image: result.image
          }));
      } catch (error) {
        console.error(`Error fetching ${exchange.name} listings:`, error);
        return [];
      }
    });

    const allListings = await Promise.all(searchPromises);
    return allListings.flat();
  } catch (error) {
    console.error('Error fetching exchange listings:', error);
    return [];
  }
}

/**
 * Parse RSS feed for news with images
 */
async function parseRSSFeed(rssUrl: string, sourceName: string): Promise<CryptoNews[]> {
  try {
    const urlParts = new URL(rssUrl);
    const response = await fetch('/api/proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        protocol: urlParts.protocol.replace(':', ''),
        origin: urlParts.host,
        path: urlParts.pathname + urlParts.search,
        method: 'GET',
        headers: {
          'User-Agent': getRandomUserAgent(),
          'Accept': 'application/rss+xml, application/xml, text/xml, */*'
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch RSS feed: ${rssUrl}`);
    }

    const xml = await response.text();
    const $ = cheerio.load(xml, { xmlMode: true });
    const newsItems: CryptoNews[] = [];

    // Parse RSS items
    $('item, entry').each((index, element) => {
      try {
        const $item = $(element);
        const title = $item.find('title').text().trim();
        const link = $item.find('link').text().trim() || $item.find('link').attr('href') || '';
        const description = $item.find('description, summary, content\\:encoded').text().trim();
        const pubDate = $item.find('pubDate, published, updated').text().trim();
        
        // Extract image from multiple RSS formats
        let image = 
          $item.find('media\\:content, media\\:thumbnail').attr('url') ||
          $item.find('enclosure[type*="image"]').attr('url') ||
          $item.find('image url').text().trim();
        
        // Try to extract image from description/content HTML
        if (!image && description) {
          const $desc = cheerio.load(description);
          image = $desc('img').first().attr('src') || undefined;
        }

        if (title && link) {
          newsItems.push({
            id: link,
            title: title,
            url: link,
            text: description || title,
            publishedDate: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
            source: sourceName,
            score: 0.9 - (index * 0.01),
            image: image
          });
        }
      } catch (error) {
        console.error(`Error parsing RSS item:`, error);
      }
    });

    return newsItems;
  } catch (error) {
    console.error(`Error fetching RSS feed ${rssUrl}:`, error);
    return [];
  }
}

/**
 * Fetch news from Bloomberg Crypto (RSS + Scraping + Individual Article Scraping)
 */
async function fetchBloombergNews(): Promise<CryptoNews[]> {
  // Try RSS first (more reliable for images)
  let rssNews = await parseRSSFeed('https://www.bloomberg.com/crypto/rss.xml', 'Bloomberg Crypto');
  if (rssNews.length > 0) {
    // Scrape missing images from individual articles
    rssNews = await Promise.all(
      rssNews.slice(0, 20).map(async (item) => {
        if (!item.image && item.url) {
          item.image = await scrapeArticleImage(item.url);
        }
        return item;
      })
    );
    return rssNews;
  }

  // Fallback to scraping
  try {
    const response = await fetch('/api/proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        protocol: 'https',
        origin: 'www.bloomberg.com',
        path: '/crypto',
        method: 'GET',
        headers: {
          'User-Agent': getRandomUserAgent(),
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9,tr;q=0.8',
          'Referer': 'https://www.bloomberg.com'
        }
      })
    });

    if (!response.ok) {
      throw new Error('Failed to fetch Bloomberg news');
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const newsItems: CryptoNews[] = [];

    // Bloomberg uses specific article structures
    $('article').each((index, element) => {
      try {
        const $article = $(element);
        const $link = $article.find('a[href*="/news/articles/"]').first();
        const title = $link.find('h3, h2, [class*="headline"]').text().trim() || 
                     $link.attr('aria-label')?.trim() || 
                     $article.find('[class*="headline"]').text().trim();
        const relativeUrl = $link.attr('href');
        const url = relativeUrl?.startsWith('http') ? relativeUrl : `https://www.bloomberg.com${relativeUrl}`;
        
        // Extract time/date
        const timeElement = $article.find('time, [class*="timestamp"]').first();
        let publishedDate: string | undefined;
        
        if (timeElement.attr('datetime')) {
          publishedDate = new Date(timeElement.attr('datetime') || '').toISOString();
        } else {
          const timeText = timeElement.text().trim();
          if (timeText) {
            publishedDate = new Date().toISOString(); // Fallback to current date
          }
        }

        // Extract summary/text
        const text = $article.find('p, [class*="summary"], [class*="description"]').first().text().trim();
        
        // Extract image using advanced strategy
        let image = extractImageFromHtml($, $article, 'https://www.bloomberg.com');

        if (title && url && relativeUrl?.includes('/news/articles/')) {
          newsItems.push({
            id: url,
            title: title,
            url: url,
            text: text || title,
            publishedDate: publishedDate,
            source: 'Bloomberg Crypto',
            score: 0.9 - (index * 0.01), // Higher score for earlier articles
            image: image
          });
        }
      } catch (error) {
        console.error('Error parsing Bloomberg article:', error);
      }
    });

    // Scrape individual articles for missing images (parallel processing in batches)
    const itemsToScrape = newsItems.slice(0, 20);
    const batchSize = 5;
    
    for (let i = 0; i < itemsToScrape.length; i += batchSize) {
      const batch = itemsToScrape.slice(i, i + batchSize);
      await Promise.all(
        batch.map(async (item) => {
          if (!item.image && item.url) {
            item.image = await scrapeArticleImage(item.url);
          }
        })
      );
    }
    
    return itemsToScrape;
  } catch (error) {
    console.error('Error fetching Bloomberg news:', error);
    return [];
  }
}

/**
 * Fetch news from Velo.xyz (RSS + Scraping + Individual Article Scraping)
 */
async function fetchVeloNews(): Promise<CryptoNews[]> {
  // Try RSS first
  let rssNews = await parseRSSFeed('https://velo.xyz/feed', 'Velo.xyz');
  if (rssNews.length > 0) {
    // Scrape missing images from individual articles
    rssNews = await Promise.all(
      rssNews.slice(0, 15).map(async (item) => {
        if (!item.image && item.url) {
          item.image = await scrapeArticleImage(item.url);
        }
        return item;
      })
    );
    return rssNews;
  }

  // Fallback to scraping
  try {
    const response = await fetch('/api/proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        protocol: 'https',
        origin: 'velo.xyz',
        path: '/news',
        method: 'GET',
        headers: {
          'User-Agent': getRandomUserAgent(),
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Referer': 'https://velo.xyz'
        }
      })
    });

    if (!response.ok) {
      throw new Error('Failed to fetch Velo news');
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const newsItems: CryptoNews[] = [];

    // Parse Velo news articles
    $('article, .news-item, [class*="article"], a[href*="/news/"]').each((index, element) => {
      try {
        const $element = $(element);
        
        // Try multiple selectors for title
        const title = $element.find('h1, h2, h3, h4, .title, [class*="title"], [class*="heading"]').first().text().trim() ||
                     $element.attr('title')?.trim() ||
                     $element.find('a').first().text().trim();
        
        // Try multiple selectors for URL
        let url = $element.attr('href') || $element.find('a').first().attr('href') || '';
        if (url && !url.startsWith('http')) {
          url = `https://velo.xyz${url.startsWith('/') ? url : '/' + url}`;
        }
        
        // Try to find description/text
        const text = $element.find('p, .description, [class*="description"], [class*="summary"]').first().text().trim() ||
                    $element.find('.content, [class*="content"]').first().text().trim();
        
        // Extract image using advanced strategy
        const image = extractImageFromHtml($, $element, 'https://velo.xyz');
        
        // Try to find date
        const dateElement = $element.find('time, .date, [class*="date"], [class*="time"]').first();
        let publishedDate: string | undefined;
        
        if (dateElement.attr('datetime')) {
          publishedDate = new Date(dateElement.attr('datetime') || '').toISOString();
        } else {
          const dateText = dateElement.text().trim();
          if (dateText) {
            try {
              publishedDate = new Date(dateText).toISOString();
            } catch {
              publishedDate = new Date().toISOString();
            }
          }
        }

        if (title && url && title.length > 10) {
          newsItems.push({
            id: url,
            title: title,
            url: url,
            text: text || title,
            publishedDate: publishedDate || new Date().toISOString(),
            source: 'Velo.xyz',
            score: 0.85 - (index * 0.01),
            image: image
          });
        }
      } catch (error) {
        console.error('Error parsing Velo article:', error);
      }
    });

    // Scrape individual articles for missing images (parallel processing in batches)
    const itemsToScrape = newsItems.slice(0, 15);
    const batchSize = 5;
    
    for (let i = 0; i < itemsToScrape.length; i += batchSize) {
      const batch = itemsToScrape.slice(i, i + batchSize);
      await Promise.all(
        batch.map(async (item) => {
          if (!item.image && item.url) {
            item.image = await scrapeArticleImage(item.url);
          }
        })
      );
    }
    
    return itemsToScrape;
  } catch (error) {
    console.error('Error fetching Velo news:', error);
    return [];
  }
}

/**
 * Fetch news from Watcher Guru (RSS + Scraping + Individual Article Scraping)
 */
async function fetchWatcherGuruNews(): Promise<CryptoNews[]> {
  // Try RSS first
  let rssNews = await parseRSSFeed('https://watcher.guru/feed', 'Watcher Guru');
  if (rssNews.length > 0) {
    // Scrape missing images from individual articles
    rssNews = await Promise.all(
      rssNews.slice(0, 25).map(async (item) => {
        if (!item.image && item.url) {
          item.image = await scrapeArticleImage(item.url);
        }
        return item;
      })
    );
    return rssNews;
  }

  // Fallback to scraping
  try {
    const response = await fetch('/api/proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        protocol: 'https',
        origin: 'watcher.guru',
        path: '/',
        method: 'GET',
        headers: {
          'User-Agent': getRandomUserAgent(),
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Referer': 'https://watcher.guru'
        }
      })
    });

    if (!response.ok) {
      throw new Error('Failed to fetch Watcher Guru news');
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const newsItems: CryptoNews[] = [];

    // Parse Watcher Guru news articles
    // Try multiple selectors for articles
    $('article, .post, .news-item, [class*="article"], [class*="post"], a[href*="/news/"], a[href*="/article/"]').each((index, element) => {
      try {
        const $element = $(element);
        
        // Try multiple selectors for title
        const title = $element.find('h1, h2, h3, h4, .title, [class*="title"], [class*="heading"]').first().text().trim() ||
                     $element.attr('title')?.trim() ||
                     $element.find('a').first().attr('title')?.trim() ||
                     $element.find('a').first().text().trim();
        
        // Try multiple selectors for URL
        let url = $element.attr('href') || $element.find('a').first().attr('href') || '';
        if (url && !url.startsWith('http')) {
          url = `https://watcher.guru${url.startsWith('/') ? url : '/' + url}`;
        }
        
        // Extract image using advanced strategy
        const image = extractImageFromHtml($, $element, 'https://watcher.guru');
        
        // Try to find description/text
        const text = $element.find('p, .description, [class*="description"], [class*="summary"], [class*="excerpt"]').first().text().trim() ||
                    $element.find('.content, [class*="content"]').first().text().trim();
        
        // Try to find date
        const dateElement = $element.find('time, .date, [class*="date"], [class*="time"], [class*="published"]').first();
        let publishedDate: string | undefined;
        
        if (dateElement.attr('datetime')) {
          publishedDate = new Date(dateElement.attr('datetime') || '').toISOString();
        } else {
          const dateText = dateElement.text().trim();
          if (dateText) {
            try {
              publishedDate = new Date(dateText).toISOString();
            } catch {
              publishedDate = new Date().toISOString();
            }
          }
        }

        if (title && url && title.length > 10 && url.includes('watcher.guru')) {
          newsItems.push({
            id: url,
            title: title,
            url: url,
            text: text || title,
            publishedDate: publishedDate || new Date().toISOString(),
            source: 'Watcher Guru',
            score: 0.88 - (index * 0.01),
            image: image
          });
        }
      } catch (error) {
        console.error('Error parsing Watcher Guru article:', error);
      }
    });

    // Scrape individual articles for missing images (parallel processing in batches)
    const itemsToScrape = newsItems.slice(0, 25);
    const batchSize = 5;
    
    for (let i = 0; i < itemsToScrape.length; i += batchSize) {
      const batch = itemsToScrape.slice(i, i + batchSize);
      await Promise.all(
        batch.map(async (item) => {
          if (!item.image && item.url) {
            item.image = await scrapeArticleImage(item.url);
          }
        })
      );
    }
    
    return itemsToScrape;
  } catch (error) {
    console.error('Error fetching Watcher Guru news:', error);
    return [];
  }
}

/**
 * Fetch news from CoinLaw.io (RSS + Scraping + Individual Article Scraping)
 */
async function fetchCoinLawNews(): Promise<CryptoNews[]> {
  // Try RSS first (CoinLaw.io doesn't have official RSS, but try common patterns)
  try {
    let rssNews = await parseRSSFeed('https://coinlaw.io/feed', 'CoinLaw.io');
    if (rssNews.length > 0) {
      // Scrape missing images from individual articles
      rssNews = await Promise.all(
        rssNews.slice(0, 20).map(async (item) => {
          if (!item.image && item.url) {
            item.image = await scrapeArticleImage(item.url);
          }
          return item;
        })
      );
      return rssNews;
    }
  } catch {
    // RSS not available, continue to scraping
  }

  // Fallback to scraping
  try {
    const response = await fetch('/api/proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        protocol: 'https',
        origin: 'coinlaw.io',
        path: '/tag/news/',
        method: 'GET',
        headers: {
          'User-Agent': getRandomUserAgent(),
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Referer': 'https://coinlaw.io'
        }
      })
    });

    if (!response.ok) {
      throw new Error('Failed to fetch CoinLaw news');
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const newsItems: CryptoNews[] = [];

    // Parse CoinLaw news articles
    $('article, .post, .news-item, [class*=\"article\"], [class*=\"post\"], a[href*=\"/tag/news/\"], a[href*=\"/blog/\"]').each((index, element) => {
      try {
        const $element = $(element);
        
        // Try multiple selectors for title
        const title = $element.find('h1, h2, h3, h4, .title, [class*=\"title\"], [class*=\"heading\"]').first().text().trim() ||
                     $element.attr('title')?.trim() ||
                     $element.find('a').first().attr('title')?.trim() ||
                     $element.find('a').first().text().trim();
        
        // Try multiple selectors for URL
        let url = $element.attr('href') || $element.find('a').first().attr('href') || '';
        if (url && !url.startsWith('http')) {
          url = `https://coinlaw.io${url.startsWith('/') ? url : '/' + url}`;
        }
        
        // Extract image using advanced strategy
        const image = extractImageFromHtml($, $element, 'https://coinlaw.io');
        
        // Try to find description/text
        const text = $element.find('p, .description, [class*=\"description\"], [class*=\"summary\"], [class*=\"excerpt\"]').first().text().trim() ||
                    $element.find('.content, [class*=\"content\"]').first().text().trim();
        
        // Try to find date
        const dateElement = $element.find('time, .date, [class*=\"date\"], [class*=\"time\"], [class*=\"published\"]').first();
        let publishedDate: string | undefined;
        
        if (dateElement.attr('datetime')) {
          publishedDate = new Date(dateElement.attr('datetime') || '').toISOString();
        } else {
          const dateText = dateElement.text().trim();
          if (dateText) {
            try {
              publishedDate = new Date(dateText).toISOString();
            } catch {
              publishedDate = new Date().toISOString();
            }
          }
        }

        if (title && url && title.length > 10 && url.includes('coinlaw.io')) {
          newsItems.push({
            id: url,
            title: title,
            url: url,
            text: text || title,
            publishedDate: publishedDate || new Date().toISOString(),
            source: 'CoinLaw.io',
            score: 0.87 - (index * 0.01),
            image: image
          });
        }
      } catch (error) {
        console.error('Error parsing CoinLaw article:', error);
      }
    });

    // Scrape individual articles for missing images (parallel processing in batches)
    const itemsToScrape = newsItems.slice(0, 20);
    const batchSize = 5;
    
    for (let i = 0; i < itemsToScrape.length; i += batchSize) {
      const batch = itemsToScrape.slice(i, i + batchSize);
      await Promise.all(
        batch.map(async (item) => {
          if (!item.image && item.url) {
            item.image = await scrapeArticleImage(item.url);
          }
        })
      );
    }
    
    return itemsToScrape;
  } catch (error) {
    console.error('Error fetching CoinLaw news:', error);
    return [];
  }
}

/**
 * Fetch news from Cryptopolitan.com (RSS + Scraping + Individual Article Scraping)
 */
async function fetchCryptopolitanNews(): Promise<CryptoNews[]> {
  // Try RSS first (Cryptopolitan doesn't have official RSS, but try common patterns)
  try {
    let rssNews = await parseRSSFeed('https://www.cryptopolitan.com/feed', 'Cryptopolitan');
    if (rssNews.length > 0) {
      // Scrape missing images from individual articles
      rssNews = await Promise.all(
        rssNews.slice(0, 20).map(async (item) => {
          if (!item.image && item.url) {
            item.image = await scrapeArticleImage(item.url);
          }
          return item;
        })
      );
      return rssNews;
    }
  } catch {
    // RSS not available, continue to scraping
  }

  // Fallback to scraping
  try {
    const response = await fetch('/api/proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        protocol: 'https',
        origin: 'www.cryptopolitan.com',
        path: '/news/',
        method: 'GET',
        headers: {
          'User-Agent': getRandomUserAgent(),
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Referer': 'https://www.cryptopolitan.com'
        }
      })
    });

    if (!response.ok) {
      throw new Error('Failed to fetch Cryptopolitan news');
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const newsItems: CryptoNews[] = [];

    // Parse Cryptopolitan news articles
    $('article, .post, .news-item, [class*=\"article\"], [class*=\"post\"], a[href*=\"/news/\"], .item-details').each((index, element) => {
      try {
        const $element = $(element);
        
        // Try multiple selectors for title
        const title = $element.find('h1, h2, h3, h4, .title, [class*=\"title\"], [class*=\"heading\"]').first().text().trim() ||
                     $element.attr('title')?.trim() ||
                     $element.find('a').first().attr('title')?.trim() ||
                     $element.find('a').first().text().trim();
        
        // Try multiple selectors for URL
        let url = $element.attr('href') || $element.find('a').first().attr('href') || '';
        if (url && !url.startsWith('http')) {
          url = `https://www.cryptopolitan.com${url.startsWith('/') ? url : '/' + url}`;
        }
        
        // Extract image using advanced strategy
        const image = extractImageFromHtml($, $element, 'https://www.cryptopolitan.com');
        
        // Try to find description/text
        const text = $element.find('p, .description, [class*=\"description\"], [class*=\"summary\"], [class*=\"excerpt\"]').first().text().trim() ||
                    $element.find('.content, [class*=\"content\"]').first().text().trim();
        
        // Try to find date
        const dateElement = $element.find('time, .date, [class*=\"date\"], [class*=\"time\"], [class*=\"published\"]').first();
        let publishedDate: string | undefined;
        
        if (dateElement.attr('datetime')) {
          publishedDate = new Date(dateElement.attr('datetime') || '').toISOString();
        } else {
          const dateText = dateElement.text().trim();
          if (dateText) {
            try {
              publishedDate = new Date(dateText).toISOString();
            } catch {
              publishedDate = new Date().toISOString();
            }
          }
        }

        if (title && url && title.length > 10 && url.includes('cryptopolitan.com')) {
          newsItems.push({
            id: url,
            title: title,
            url: url,
            text: text || title,
            publishedDate: publishedDate || new Date().toISOString(),
            source: 'Cryptopolitan',
            score: 0.86 - (index * 0.01),
            image: image
          });
        }
      } catch (error) {
        console.error('Error parsing Cryptopolitan article:', error);
      }
    });

    // Scrape individual articles for missing images (parallel processing in batches)
    const itemsToScrape = newsItems.slice(0, 20);
    const batchSize = 5;
    
    for (let i = 0; i < itemsToScrape.length; i += batchSize) {
      const batch = itemsToScrape.slice(i, i + batchSize);
      await Promise.all(
        batch.map(async (item) => {
          if (!item.image && item.url) {
            item.image = await scrapeArticleImage(item.url);
          }
        })
      );
    }
    
    return itemsToScrape;
  } catch (error) {
    console.error('Error fetching Cryptopolitan news:', error);
    return [];
  }
}

/**
 * Extract domain from URL
 */
function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return 'Unknown';
  }
}
