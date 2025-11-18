/**
 * Server-side scraping API endpoint
 * Scrapes full article content from external URLs using Cheerio
 */

import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = body;

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'URL is required' },
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

    // Fetch the HTML content with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,tr;q=0.8',
        'Referer': articleUrl.origin,
        'Cache-Control': 'no-cache'
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch article: ${response.statusText}`, content: '' },
        { status: response.status }
      );
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Remove unwanted elements
    $('script, style, nav, header, footer, aside, .ads, .advertisement, .social-share, .comments, iframe, .related-posts').remove();

    let content = '';

    // Strategy 1: Look for article tag
    const articleElement = $('article');
    if (articleElement.length > 0) {
      content = articleElement.text();
    }

    // Strategy 2: Common article content selectors (EXPANDED LIST)
    if (!content) {
      const contentSelectors = [
        '.article-content',
        '.post-content',
        '.entry-content',
        '.article-body',
        '.post-body',
        '[class*="article-text"]',
        '[class*="post-text"]',
        'main article',
        '.content',
        '[itemprop="articleBody"]',
        '.story-body',
        '.article__body',
        '.post__content',
        '#article-body',
        '#post-content',
        '.post__body',
        '.entry__content',
        '.story__content',
        '.article__text',
        '[class*="content-body"]',
        '[class*="article-wrapper"]',
        '[class*="post-wrapper"]',
        '.td-post-content',
        '.tdb-block-inner',
        '[class*="news-content"]',
        '[class*="blog-content"]',
        'div[class*="Article"]',
        'div[class*="Content"]'
      ];

      for (const selector of contentSelectors) {
        const element = $(selector);
        if (element.length > 0 && element.text().trim().length > 100) {
          content = element.text();
          break;
        }
      }
    }

    // Strategy 3: Get paragraphs from main content area
    if (!content) {
      const mainContent = $('main');
      if (mainContent.length > 0) {
        const paragraphs = mainContent.find('p');
        if (paragraphs.length > 0) {
          content = paragraphs.map((_, el) => $(el).text()).get().join('\n\n');
        }
      }
    }

    // Strategy 4: Get all paragraphs
    if (!content) {
      const paragraphs = $('p');
      const texts = paragraphs
        .map((_, el) => $(el).text().trim())
        .get()
        .filter(text => text.length > 50); // Filter out short paragraphs

      if (texts.length > 0) {
        content = texts.join('\n\n');
      }
    }

    // Clean up the content
    content = content
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/\n\s*\n/g, '\n\n') // Replace multiple newlines with double newline
      .trim();

    // If content is too short, it might be a scraping failure
    if (content.length < 100) {
      return NextResponse.json({
        success: false,
        content: '',
        error: 'Could not extract sufficient content from article'
      });
    }

    return NextResponse.json({
      success: true,
      content: content,
      length: content.length
    });

  } catch (error) {
    console.error('Scraping error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Unknown error',
        content: '',
        success: false
      },
      { status: 500 }
    );
  }
}
