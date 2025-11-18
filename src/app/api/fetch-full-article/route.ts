/**
 * Full Article Fetcher API - Scrapes full article text from URL
 */

import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export const runtime = 'edge';

// User agent rotation
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
];

function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

/**
 * Extract full article text from HTML
 */
function extractArticleText(html: string): string {
  try {
    const $ = cheerio.load(html);
    
    // Remove unwanted elements
    $('script, style, nav, header, footer, aside, .advertisement, .ads, .social-share, .comments, iframe, noscript').remove();
    
    // Try multiple selectors for article content
    const contentSelectors = [
      'article',
      '.article-content',
      '.article-body',
      '.entry-content',
      '.post-content',
      '.content-body',
      'main article',
      '[class*="article-text"]',
      '[class*="post-body"]',
      '[class*="story-content"]',
      '[itemprop="articleBody"]',
      '.article__body',
      '.post__content'
    ];
    
    let fullText = '';
    
    // Try each selector until we find substantial content
    for (const selector of contentSelectors) {
      const $content = $(selector).first();
      if ($content.length > 0) {
        // Get all paragraph text
        const paragraphs: string[] = [];
        $content.find('p').each((_, elem) => {
          const text = $(elem).text().trim();
          if (text.length > 30) { // Filter out short paragraphs (likely captions or ads)
            paragraphs.push(text);
          }
        });
        
        if (paragraphs.length > 2) { // Must have at least 3 paragraphs
          fullText = paragraphs.join('\n\n');
          break;
        }
      }
    }
    
    // Fallback: Get all paragraphs from body
    if (!fullText || fullText.length < 500) {
      const paragraphs: string[] = [];
      $('body p').each((_, elem) => {
        const text = $(elem).text().trim();
        if (text.length > 30) {
          paragraphs.push(text);
        }
      });
      
      if (paragraphs.length > 0) {
        fullText = paragraphs.join('\n\n');
      }
    }
    
    // Clean up text
    fullText = fullText
      .replace(/\s+/g, ' ')
      .replace(/\n\s+/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    
    return fullText;
  } catch (error) {
    console.error('Error extracting article text:', error);
    return '';
  }
}

/**
 * Fetch full article from URL
 */
export async function POST(request: Request) {
  try {
    const { url } = await request.json();
    
    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'Invalid URL provided' },
        { status: 400 }
      );
    }
    
    // Validate URL
    let articleUrl: URL;
    try {
      articleUrl = new URL(url);
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }
    
    // Fetch article page
    const response = await fetch(url, {
      headers: {
        'User-Agent': getRandomUserAgent(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': articleUrl.origin,
        'Cache-Control': 'no-cache'
      }
    });
    
    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch article' },
        { status: response.status }
      );
    }
    
    const html = await response.text();
    const fullText = extractArticleText(html);
    
    if (!fullText || fullText.length < 100) {
      return NextResponse.json(
        { error: 'Could not extract article content' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { text: fullText },
      { status: 200 }
    );
  } catch (error) {
    console.error('Full article fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch article' },
      { status: 500 }
    );
  }
}
