/**
 * News API Route - Server-side news fetching with advanced image extraction
 */

import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import type { CheerioAPI } from 'cheerio';

// User agent rotation
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

interface CryptoNews {
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

/**
 * Upgrade thumbnail URLs to full-size images
 */
function upgradeImageUrl(url: string): string {
  if (!url) return url;

  // Remove size query parameters
  let upgraded = url.split('?')[0] || url;

  // Replace thumbnail patterns with full-size
  const patterns: Record<string, string> = {
    '-thumb': '',
    '-thumbnail': '',
    '-small': '',
    '-medium': '-large',
    '-150x150': '',
    '-300x300': '',
    '_thumb': '',
    '_thumbnail': '',
    '_small': '',
    '_medium': '_large',
    '/thumb/': '/full/',
    '/thumbnail/': '/full/',
    '/small/': '/large/',
    '/thumbs/': '/images/',
    'resize=': 'original=',
    'w=\\d+': '', // Remove width parameter
    'h=\\d+': '', // Remove height parameter
    'size=\\w+': 'size=original'
  };

  for (const [pattern, replacement] of Object.entries(patterns)) {
    if (pattern.includes('=')) {
      // Query parameter pattern
      upgraded = upgraded.replace(new RegExp(`[?&]${pattern}`, 'g'), '');
    } else {
      // Path pattern
      upgraded = upgraded.replace(new RegExp(pattern, 'g'), replacement);
    }
  }

  // Clean up duplicate slashes
  upgraded = upgraded.replace(/([^:]\/)\/+/g, '$1');

  return upgraded;
}

/**
 * Validate and score image URL
 */
function scoreImageUrl(url: string): number {
  if (!url || url.length < 10) return 0;

  let score = 100;
  const lower = url.toLowerCase();

  // Penalize unwanted patterns
  const badPatterns = [
    'placeholder', 'avatar', 'icon', 'logo', 'favicon',
    'sprite', 'emoji', 'pixel', 'gravatar', 'profile',
    '1x1', '16x16', '32x32', '64x64', '100x100',
    'default', 'blank', 'no-image', 'missing'
  ];

  for (const pattern of badPatterns) {
    if (lower.includes(pattern)) score -= 50;
  }

  // Reward good patterns
  if (lower.includes('og-image') || lower.includes('og_image')) score += 50;
  if (lower.includes('twitter-image') || lower.includes('twitter_image')) score += 45;
  if (lower.includes('featured')) score += 40;
  if (lower.includes('hero')) score += 35;
  if (lower.includes('cover')) score += 30;
  if (lower.includes('banner')) score += 25;

  // Penalize small sizes in URL
  if (/\d+x\d+/.test(lower)) {
    const match = lower.match(/(\d+)x(\d+)/);
    if (match) {
      const width = parseInt(match[1] || '0');
      const height = parseInt(match[2] || '0');
      if (width < 400 || height < 300) score -= 30;
      if (width > 800 && height > 600) score += 20;
    }
  }

  // Reward common image CDNs
  if (lower.includes('cloudinary') || lower.includes('imgix') || 
      lower.includes('cloudfront') || lower.includes('amazonaws')) {
    score += 15;
  }

  return Math.max(0, score);
}

/**
 * Extract images with advanced strategies and scoring
 */
async function extractBestImage(html: string, baseUrl: string): Promise<string | undefined> {
  const $ = cheerio.load(html);
  const candidates: { url: string; score: number }[] = [];

  // Strategy 1: Meta tags (HIGHEST PRIORITY)
  const metaTags = [
    $('meta[property="og:image"]').attr('content'),
    $('meta[property="og:image:secure_url"]').attr('content'),
    $('meta[name="twitter:image"]').attr('content'),
    $('meta[name="twitter:image:src"]').attr('content'),
    $('meta[itemprop="image"]').attr('content'),
    $('link[rel="image_src"]').attr('href')
  ];

  for (const url of metaTags) {
    if (url) {
      const normalized = normalizeUrl(url, baseUrl);
      if (normalized) {
        const upgraded = upgradeImageUrl(normalized);
        candidates.push({ url: upgraded, score: scoreImageUrl(upgraded) + 100 }); // Bonus for meta tags
      }
    }
  }

  // Strategy 2: JSON-LD structured data
  $('script[type="application/ld+json"]').each((_, script) => {
    try {
      const jsonText = $(script).html();
      if (jsonText) {
        const data = JSON.parse(jsonText);
        const items = Array.isArray(data) ? data : [data];

        for (const item of items) {
          if (item.image) {
            const images = typeof item.image === 'string' 
              ? [item.image]
              : Array.isArray(item.image)
              ? item.image
              : item.image.url
              ? [item.image.url]
              : [];

            for (const url of images) {
              if (typeof url === 'string') {
                const normalized = normalizeUrl(url, baseUrl);
                if (normalized) {
                  const upgraded = upgradeImageUrl(normalized);
                  candidates.push({ url: upgraded, score: scoreImageUrl(upgraded) + 80 });
                }
              }
            }
          }

          if (item.thumbnailUrl) {
            const urls = typeof item.thumbnailUrl === 'string'
              ? [item.thumbnailUrl]
              : Array.isArray(item.thumbnailUrl)
              ? item.thumbnailUrl
              : [];

            for (const url of urls) {
              if (typeof url === 'string') {
                const normalized = normalizeUrl(url, baseUrl);
                if (normalized) {
                  const upgraded = upgradeImageUrl(normalized);
                  candidates.push({ url: upgraded, score: scoreImageUrl(upgraded) + 60 });
                }
              }
            }
          }
        }
      }
    } catch {
      // Ignore JSON parse errors
    }
  });

  // Strategy 3: Article/Featured images with high priority classes
  const highPrioritySelectors = [
    'article img[class*="featured"]',
    'article img[class*="hero"]',
    'article img[class*="cover"]',
    '.featured-image img',
    '.hero-image img',
    '.post-thumbnail img',
    '.wp-post-image',
    '[class*="featured-image"] img',
    '[class*="hero-image"] img',
    'picture source',
    'figure.wp-block-image img'
  ];

  for (const selector of highPrioritySelectors) {
    $(selector).each((_, elem) => {
      const $elem = $(elem);
      const url = $elem.attr('src') || 
                  $elem.attr('data-src') || 
                  $elem.attr('data-lazy-src') ||
                  $elem.attr('srcset')?.split(',')[0]?.trim().split(' ')[0];

      if (url) {
        const normalized = normalizeUrl(url, baseUrl);
        if (normalized) {
          const upgraded = upgradeImageUrl(normalized);
          candidates.push({ url: upgraded, score: scoreImageUrl(upgraded) + 70 });
        }
      }

      // Check srcset for largest image
      const srcset = $elem.attr('srcset');
      if (srcset) {
        const sources = srcset.split(',').map(s => s.trim().split(' ')[0]);
        if (sources.length > 0) {
          const largestUrl = sources[sources.length - 1] || sources[0];
          if (largestUrl) {
            const normalized = normalizeUrl(largestUrl, baseUrl);
            if (normalized) {
              const upgraded = upgradeImageUrl(normalized);
              candidates.push({ url: upgraded, score: scoreImageUrl(upgraded) + 75 });
            }
          }
        }
      }
    });
  }

  // Strategy 4: All article images (fallback)
  $('article img, .article-body img, .entry-content img, .post-content img, main img').each((_, elem) => {
    const $elem = $(elem);
    const url = $elem.attr('src') || $elem.attr('data-src') || $elem.attr('data-lazy-src');
    const width = parseInt($elem.attr('width') || '0');
    const height = parseInt($elem.attr('height') || '0');

    if (url && (width > 600 || height > 400 || !width)) {
      const normalized = normalizeUrl(url, baseUrl);
      if (normalized) {
        const upgraded = upgradeImageUrl(normalized);
        let score = scoreImageUrl(upgraded) + 50;
        if (width > 800) score += 20;
        if (height > 600) score += 20;
        candidates.push({ url: upgraded, score });
      }
    }
  });

  // Strategy 5: First large image
  $('img').each((_, elem) => {
    const $elem = $(elem);
    const url = $elem.attr('src') || $elem.attr('data-src');
    const width = parseInt($elem.attr('width') || '0');
    const height = parseInt($elem.attr('height') || '0');

    if (url && (width > 400 || height > 300 || !width)) {
      const normalized = normalizeUrl(url, baseUrl);
      if (normalized) {
        const upgraded = upgradeImageUrl(normalized);
        candidates.push({ url: upgraded, score: scoreImageUrl(upgraded) + 30 });
      }
    }
  });

  // Filter valid URLs and sort by score
  const validCandidates = candidates
    .filter(c => {
      try {
        new URL(c.url);
        return c.score > 0 && 
               !c.url.endsWith('.svg') && 
               !c.url.includes('data:image');
      } catch {
        return false;
      }
    })
    .sort((a, b) => b.score - a.score);

  // Return best candidate
  return validCandidates[0]?.url;
}

/**
 * Normalize relative URLs
 */
function normalizeUrl(url: string, baseUrl: string): string | undefined {
  if (!url) return undefined;

  try {
    if (url.startsWith('//')) {
      return `https:${url}`;
    }
    if (url.startsWith('http')) {
      return url;
    }
    
    const base = new URL(baseUrl);
    return new URL(url, base.origin).href;
  } catch {
    return undefined;
  }
}

/**
 * Fetch page and extract image
 */
async function fetchPageImage(url: string): Promise<string | undefined> {
  try {
    const urlParts = new URL(url);
    const response = await fetch(`${urlParts.protocol}//${urlParts.host}${urlParts.pathname}${urlParts.search}`, {
      headers: {
        'User-Agent': getRandomUserAgent(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,tr;q=0.8',
        'Referer': urlParts.origin,
        'Cache-Control': 'no-cache'
      },
      next: { revalidate: 300 } // Cache for 5 minutes
    });

    if (!response.ok) return undefined;

    const html = await response.text();
    return await extractBestImage(html, url);
  } catch (error) {
    console.error(`Error fetching image from ${url}:`, error);
    return undefined;
  }
}

/**
 * Parse RSS feed
 */
async function parseRSSFeed(rssUrl: string, sourceName: string): Promise<CryptoNews[]> {
  try {
    const response = await fetch(rssUrl, {
      headers: {
        'User-Agent': getRandomUserAgent(),
        'Accept': 'application/rss+xml, application/xml, text/xml, */*'
      },
      next: { revalidate: 60 } // Cache for 1 minute
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch RSS: ${rssUrl}`);
    }

    const xml = await response.text();
    const $ = cheerio.load(xml, { xmlMode: true });
    const newsItems: CryptoNews[] = [];

    $('item, entry').each((index, element) => {
      try {
        const $item = $(element);
        const title = $item.find('title').text().trim();
        const link = $item.find('link').text().trim() || $item.find('link').attr('href') || '';
        const description = $item.find('description, summary, content\\:encoded').text().trim();
        const pubDate = $item.find('pubDate, published, updated').text().trim();

        // Extract image from RSS
        let image = 
          $item.find('media\\:content, media\\:thumbnail').attr('url') ||
          $item.find('enclosure[type*="image"]').attr('url') ||
          $item.find('image url').text().trim();

        // Extract from description HTML
        if (!image && description) {
          const $desc = cheerio.load(description);
          image = $desc('img').first().attr('src') || undefined;
        }

        if (image) {
          image = upgradeImageUrl(normalizeUrl(image, link) || image);
        }

        // Clean up description - remove mixed language content and extra characters
        let cleanDescription = description;
        if (cleanDescription) {
          // Strip HTML tags first
          cleanDescription = cleanDescription.replace(/<[^>]*>/g, ' ');
          
          // Split by pipe character and take first part (usually the main content)
          cleanDescription = cleanDescription.split('|')[0] || cleanDescription;
          
          // Remove URLs from description (multiple patterns)
          cleanDescription = cleanDescription.replace(/https?:\/\/[^\s]+/g, '');
          cleanDescription = cleanDescription.replace(/www\.[^\s]+/g, '');
          cleanDescription = cleanDescription.replace(/t\.co\/[^\s]+/g, '');
          
          // Remove URL parameters like source=twitter, source=web, etc.
          cleanDescription = cleanDescription.replace(/source=[^\s&]+/gi, '');
          cleanDescription = cleanDescription.replace(/utm_[^\s&]+=[^\s&]+/gi, '');
          cleanDescription = cleanDescription.replace(/ref=[^\s&]+/gi, '');
          cleanDescription = cleanDescription.replace(/[?&][a-z_]+=[^\s&]+/gi, '');
          
          // Remove common artifacts and patterns
          cleanDescription = cleanDescription.replace(/RSVP:/gi, '');
          cleanDescription = cleanDescription.replace(/Read more:/gi, '');
          cleanDescription = cleanDescription.replace(/Click here:/gi, '');
          cleanDescription = cleanDescription.replace(/\[…\]/g, '');
          cleanDescription = cleanDescription.replace(/\[\.\.\.\]/g, '');
          
          // Remove any text after common separators that indicate end of main content
          cleanDescription = cleanDescription.split('The post')[0] || cleanDescription;
          cleanDescription = cleanDescription.split('Read more at')[0] || cleanDescription;
          cleanDescription = cleanDescription.split('Continue reading')[0] || cleanDescription;
          
          // Remove extra whitespace and trim
          cleanDescription = cleanDescription.replace(/\s+/g, ' ').trim();
          
          // If description is very short or empty after cleaning, use title
          if (cleanDescription.length < 10) {
            cleanDescription = title;
          }
        }

        if (title && link) {
          newsItems.push({
            id: link,
            title,
            url: link,
            text: cleanDescription || title,
            publishedDate: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
            source: sourceName,
            score: 0.9 - (index * 0.01),
            image,
            fetchedAt: new Date().toISOString()
          });
        }
      } catch (error) {
        console.error('Error parsing RSS item:', error);
      }
    });

    return newsItems;
  } catch (error) {
    console.error(`Error fetching RSS ${rssUrl}:`, error);
    return [];
  }
}

/**
 * Fetch from all sources
 */
async function fetchAllNews(): Promise<CryptoNews[]> {
  try {
    // Fetch from RSS sources
    const [
      bloombergNews, 
      veloNews, 
      watcherNews, 
      coinLawNews, 
      cryptopolitanNews, 
      twitterNews, 
      gercekKriptocuuNews,
      icoDropsNews,
      icoAnalyticsNews
    ] = await Promise.all([
      parseRSSFeed('https://www.bloomberg.com/crypto/rss.xml', 'Bloomberg Crypto'),
      parseRSSFeed('https://velo.xyz/feed', 'Velo.xyz'),
      parseRSSFeed('https://watcher.guru/feed', 'Watcher Guru'),
      parseRSSFeed('https://coinlaw.io/feed', 'CoinLaw.io'),
      parseRSSFeed('https://www.cryptopolitan.com/feed', 'Cryptopolitan'),
      parseRSSFeed('https://nitter.poast.org/voltnewsdotxyz/rss', '@voltnewsdotxyz'),
      parseRSSFeed('https://nitter.poast.org/GercekKriptocuu/rss', '@GercekKriptocuu'),
      parseRSSFeed('https://nitter.poast.org/ICODrops/rss', '@ICODrops'),
      parseRSSFeed('https://nitter.poast.org/ICO_Analytics/rss', '@ICO_Analytics')
    ]);

    let allNews = [
      ...bloombergNews, 
      ...veloNews, 
      ...watcherNews, 
      ...coinLawNews, 
      ...cryptopolitanNews, 
      ...twitterNews, 
      ...gercekKriptocuuNews,
      ...icoDropsNews,
      ...icoAnalyticsNews
    ];

    // Fetch missing images from article pages (in batches)
    const newsWithoutImages = allNews.filter(n => !n.image);
    const batchSize = 10;

    for (let i = 0; i < newsWithoutImages.length && i < 50; i += batchSize) {
      const batch = newsWithoutImages.slice(i, i + batchSize);
      await Promise.all(
        batch.map(async (item) => {
          if (!item.image && item.url) {
            item.image = await fetchPageImage(item.url);
          }
        })
      );
    }

    // Sort by date
    allNews = allNews.sort((a, b) => {
      if (a.publishedDate && b.publishedDate) {
        return new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime();
      }
      return (b.score || 0) - (a.score || 0);
    });

    return allNews;
  } catch (error) {
    console.error('Error fetching news:', error);
    return [];
  }
}

export async function GET() {
  try {
    const news = await fetchAllNews();
    return NextResponse.json(news);
  } catch (error) {
    console.error('Error in news API:', error);
    return NextResponse.json({ error: 'Failed to fetch news' }, { status: 500 });
  }
}
