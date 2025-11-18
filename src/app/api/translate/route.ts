import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export const runtime = 'edge';

/**
 * Strip HTML tags from text
 */
function stripHtml(html: string): string {
  try {
    const $ = cheerio.load(html);
    $('script, style').remove();
    const text = $('body').text() || $.text();
    return text
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n')
      .trim();
  } catch {
    return html
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
}

/**
 * Translate using Google Translate (primary and only method)
 */
async function translateWithGoogle(text: string): Promise<string | null> {
  try {
    // Simple Google Translate API request
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=tr&dt=t&q=${encodeURIComponent(text)}`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0'
      }
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    
    if (!data || !Array.isArray(data) || data.length === 0) {
      return null;
    }

    const translations: string[] = [];
    for (const item of data[0]) {
      if (Array.isArray(item) && item[0]) {
        translations.push(item[0]);
      }
    }
    
    return translations.join('');
  } catch (error) {
    console.error('Google Translate error:', error);
    return null;
  }
}

/**
 * Main translation endpoint - Google Translate only
 */
export async function POST(request: Request) {
  try {
    const { text } = await request.json();

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json(
        { error: 'Invalid text provided' },
        { status: 400 }
      );
    }

    // Strip HTML first
    const cleanText = stripHtml(text);

    if (cleanText.trim().length === 0) {
      return NextResponse.json(
        { translation: text },
        { status: 200 }
      );
    }

    // Use Google Translate
    const translation = await translateWithGoogle(cleanText);
    
    if (!translation) {
      throw new Error('Google Translate failed');
    }

    // Final cleanup
    const finalTranslation = stripHtml(translation);

    return NextResponse.json(
      { translation: finalTranslation },
      { status: 200 }
    );
  } catch (error) {
    console.error('Translation endpoint error:', error);
    return NextResponse.json(
      { 
        error: 'Translation failed',
        translation: stripHtml((await request.json()).text) // Return cleaned original text
      },
      { status: 500 }
    );
  }
}
