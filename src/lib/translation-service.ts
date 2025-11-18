/**
 * Translation Service - Google Translate only
 */

import * as cheerio from 'cheerio';

/**
 * Translate using Google Translate (unofficial, free, high quality)
 * This uses Google's web translation service, not the official API
 */
async function translateWithGoogle(text: string, targetLang: 'tr' | 'en'): Promise<string> {
  try {
    const sourceLang = targetLang === 'tr' ? 'en' : 'tr';
    
    // Use translate.googleapis.com (unofficial endpoint)
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
    
    const response = await fetch('/api/proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        protocol: 'https',
        origin: 'translate.googleapis.com',
        path: `/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`,
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0'
        }
      })
    });

    if (!response.ok) {
      console.error(`❌ Google Translate API error: ${response.status}`);
      throw new Error(`Google Translate API error: ${response.status}`);
    }

    const data = await response.json() as unknown[][];
    
    // Parse Google Translate response format: [[[\"translated text\", \"original\", null, null, 3]]]
    if (!data || !Array.isArray(data) || data.length === 0) {
      throw new Error('Invalid Google Translate response');
    }

    const translations: string[] = [];
    for (const item of data[0] as unknown[]) {
      if (Array.isArray(item) && item[0]) {
        translations.push(item[0] as string);
      }
    }
    
    const translation = translations.join('');
    
    if (!translation || translation.trim().length === 0) {
      throw new Error('Empty translation result');
    }

    console.log('✅ Google Translate successful');
    return translation;
  } catch (error) {
    console.error('❌ Google Translate error:', error instanceof Error ? error.message : error);
    throw error;
  }
}

/**
 * Translate using LibreTranslate (free, self-hosted instances available)
 */
async function translateWithLibreTranslate(text: string, targetLang: 'tr' | 'en'): Promise<string> {
  try {
    // Use official LibreTranslate instance
    const response = await fetch('/api/proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        protocol: 'https',
        origin: 'translate.argosopentech.com',
        path: '/translate',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: {
          q: text,
          source: targetLang === 'tr' ? 'en' : 'tr',
          target: targetLang,
          format: 'text'
        }
      })
    });

    if (!response.ok) {
      console.error(`❌ LibreTranslate API error: ${response.status}`);
      throw new Error(`LibreTranslate API error: ${response.status}`);
    }

    const data = await response.json() as { translatedText?: string };
    
    if (!data.translatedText || data.translatedText.trim().length === 0) {
      throw new Error('Empty translation result');
    }

    console.log('✅ LibreTranslate translation successful');
    return data.translatedText;
  } catch (error) {
    console.error('❌ LibreTranslate error:', error instanceof Error ? error.message : error);
    throw error;
  }
}

/**
 * Strip HTML tags from text and clean up mixed content
 */
function stripHtml(html: string): string {
  try {
    // Load HTML with cheerio
    const $ = cheerio.load(html);
    
    // Remove script and style tags
    $('script, style').remove();
    
    // Get text content only
    let text = $('body').text() || $.text();
    
    // Remove pipe character and everything after it (often mixed content)
    text = text.split('|')[0] || text;
    
    // Remove URLs
    text = text.replace(/https?:\/\/[^\s]+/g, '');
    text = text.replace(/www\.[^\s]+/g, '');
    text = text.replace(/t\.co\/[^\s]+/g, '');
    
    // Remove URL parameters and source mentions
    text = text.replace(/source=(twitter|web|facebook|instagram|reddit|telegram)[^\s]*/gi, '');
    text = text.replace(/utm_[a-z_]+=\[^\s&]*/gi, '');
    text = text.replace(/ref=[^\s&]*/gi, '');
    text = text.replace(/\?[a-z_]+=\w+(&[a-z_]+=\w+)*/gi, '');
    
    // Remove common artifacts and patterns
    text = text.replace(/RSVP:/gi, '');
    text = text.replace(/Read more:/gi, '');
    text = text.replace(/Click here:/gi, '');
    text = text.replace(/\[…\]/g, '');
    text = text.replace(/\[\.\.\.]/g, '');
    
    // Clean up whitespace
    text = text
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n')
      .trim();
    
    // If text is too short after cleaning, return empty
    if (text.length < 10) {
      return '';
    }
    
    return text;
  } catch {
    // If cheerio fails, just remove basic HTML tags
    let text = html
      .replace(/<[^>]*>/g, ' ')
      .split('|')[0] || html
      .replace(/https?:\/\/[^\s]+/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    return text;
  }
}

/**
 * Translate text to a target language
 */
export async function translateText(text: string, targetLang: 'tr' | 'en'): Promise<string> {
  if (targetLang === 'en') {
    // For English, just clean HTML and return
    return stripHtml(text);
  }
  // For Turkish, use the translateToTurkish function
  return translateToTurkish(text);
}

/**
 * Translate text to Turkish with fallback providers
 * Provider priority: Google Translate → LibreTranslate
 */
export async function translateToTurkish(text: string): Promise<string> {
  try {
    if (!text || text.trim().length === 0) {
      return text;
    }

    // Strip HTML tags before translation
    const cleanText = stripHtml(text);

    if (!cleanText || cleanText.trim().length === 0) {
      return text;
    }

    // For long texts, split into chunks of 500 characters
    const maxChunkSize = 500;
    if (cleanText.length > maxChunkSize) {
      console.log(`📝 Long text detected (${cleanText.length} chars), splitting into chunks...`);
      const chunks: string[] = [];
      
      // Split by sentences first
      const sentences = cleanText.match(/[^.!?]+[.!?]+/g) || [cleanText];
      let currentChunk = '';
      
      for (const sentence of sentences) {
        if ((currentChunk + sentence).length <= maxChunkSize) {
          currentChunk += sentence;
        } else {
          if (currentChunk) chunks.push(currentChunk);
          currentChunk = sentence;
        }
      }
      if (currentChunk) chunks.push(currentChunk);
      
      // Translate each chunk
      const translatedChunks: string[] = [];
      for (const chunk of chunks) {
        const translated = await translateToTurkish(chunk); // Recursive call for each chunk
        translatedChunks.push(translated);
      }
      
      return translatedChunks.join(' ');
    }

    console.log(`🔄 Translating: "${cleanText.substring(0, 50)}..."`);

    // 1. Try Google Translate FIRST
    try {
      const googleTranslation = await translateWithGoogle(cleanText, 'tr');
      
      // Verify translation quality
      if (googleTranslation && 
          googleTranslation.toLowerCase() !== cleanText.toLowerCase() && 
          googleTranslation.length > 10) {
        console.log('✅ Using Google Translate');
        return googleTranslation;
      }
    } catch (googleError) {
      console.warn('⚠️ Google Translate failed, trying LibreTranslate');
    }

    // 2. Try LibreTranslate as fallback
    try {
      const libreTranslation = await translateWithLibreTranslate(cleanText, 'tr');
      
      // Verify translation quality
      if (libreTranslation && 
          libreTranslation.toLowerCase() !== cleanText.toLowerCase() && 
          libreTranslation.length > 10) {
        console.log('✅ Using LibreTranslate translation');
        return libreTranslation;
      }
    } catch (libreError) {
      console.warn('⚠️ All translation services failed');
    }

    // If all translations fail, return cleaned original text
    console.warn('⚠️ All translation services failed, returning original');
    return cleanText;
  } catch (error) {
    console.error('❌ Translation error:', error instanceof Error ? error.message : error);
    return stripHtml(text);
  }
}

/**
 * Translate multiple texts in batch
 */
export async function translateBatch(texts: string[]): Promise<string[]> {
  try {
    const translations = await Promise.all(
      texts.map(text => translateToTurkish(text))
    );
    return translations;
  } catch (error) {
    console.error('Batch translation error:', error);
    return texts;
  }
}

export interface SummaryWithSentiment {
  summary: string;
  sentiment: 'positive' | 'negative' | 'neutral';
}

/**
 * Retry function with exponential backoff
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: Error | undefined;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (i < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, i);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}

/**
 * Summarize and translate news to Turkish
 * Just translates the title directly without summarization
 */
export async function summarizeAndTranslate(title: string, text?: string): Promise<SummaryWithSentiment> {
  try {
    // For Turkish, just translate the title
    const translatedTitle = await translateToTurkish(title);
    
    // Simple sentiment analysis based on keywords
    const content = `${title} ${text || ''}`.toLowerCase();
    let sentiment: 'positive' | 'negative' | 'neutral' = 'neutral';
    
    // Positive keywords
    if (content.match(/\b(up|rise|gain|bull|surge|rally|boost|grow|positive|profit|success|launch|partner|adoption)\b/i)) {
      sentiment = 'positive';
    }
    
    // Negative keywords
    if (content.match(/\b(down|fall|drop|bear|crash|decline|loss|negative|hack|scam|fail|lawsuit|ban|regulate)\b/i)) {
      sentiment = 'negative';
    }
    
    return {
      summary: translatedTitle && translatedTitle.length > 8 ? translatedTitle : title,
      sentiment
    };
  } catch (error) {
    console.error('❌ Translation error:', error instanceof Error ? error.message : error);
    return { summary: title, sentiment: 'neutral' };
  }
}

/**
 * Summarize news in English
 * Just returns the title as-is
 */
export async function summarizeInEnglish(title: string, text?: string): Promise<SummaryWithSentiment> {
  try {
    // Simple sentiment analysis based on keywords
    const content = `${title} ${text || ''}`.toLowerCase();
    let sentiment: 'positive' | 'negative' | 'neutral' = 'neutral';
    
    // Positive keywords
    if (content.match(/\b(up|rise|gain|bull|surge|rally|boost|grow|positive|profit|success|launch|partner|adoption)\b/i)) {
      sentiment = 'positive';
    }
    
    // Negative keywords
    if (content.match(/\b(down|fall|drop|bear|crash|decline|loss|negative|hack|scam|fail|lawsuit|ban|regulate)\b/i)) {
      sentiment = 'negative';
    }
    
    return {
      summary: title,
      sentiment
    };
  } catch (error) {
    console.error('Summarization error:', error);
    return { summary: title, sentiment: 'neutral' };
  }
}
