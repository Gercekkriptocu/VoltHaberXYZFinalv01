'use client';

import type React from 'react';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, ExternalLink, Calendar, TrendingUp, TrendingDown, Minimize2, Maximize2, RefreshCw, Search, Globe, Music, Sun, Moon, Bookmark, Trash2 } from 'lucide-react';
import { fetchCryptoNews, type CryptoNews } from '../../../lib/news-service';
import { summarizeAndTranslate, summarizeInEnglish, translateText } from '../../../lib/translation-service';
import { LiveCryptoTicker } from '../../../components/live-crypto-ticker';
import { WinampPlayer } from '../../../components/winamp-player';
import { DegenMode } from '../../../components/degen-mode';

/**
 * Clean HTML content - remove tags, WordPress shortcodes, and special characters
 */
function cleanHtmlContent(html: string): string {
  if (!html) return '';
  
  // Remove WordPress shortcodes like [&#8230;]
  let cleaned = html.replace(/\[&#\d+;.*?\]/g, '');
  
  // Remove HTML tags
  cleaned = cleaned.replace(/<[^>]*>/g, '');
  
  // Decode HTML entities
  cleaned = cleaned
    .replace(/&#\d+;/g, (match) => {
      const code = parseInt(match.replace(/[&#;]/g, ''));
      return String.fromCharCode(code);
    })
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
  
  // Remove extra whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  return cleaned;
}

/**
 * Scrape full article content from original URL using server-side API
 */
async function scrapeFullArticle(articleUrl: string): Promise<string> {
  try {
    console.log('Scraping article from:', articleUrl);
    
    // Call server-side scraping API
    const response = await fetch('/api/scrape', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: articleUrl })
    });

    if (!response.ok) {
      console.error('Scraping API failed:', response.statusText);
      return '';
    }

    const data = await response.json();
    
    if (data.success && data.content) {
      console.log('Successfully scraped article, length:', data.content.length);
      return data.content;
    } else {
      console.error('Scraping failed:', data.error);
      return '';
    }
  } catch (error) {
    console.error(`Error scraping article ${articleUrl}:`, error);
    return '';
  }
}

export default function NewsDetailPage(): React.JSX.Element {
  const params = useParams();
  const router = useRouter();
  // Decode the URL-encoded ID
  const encodedId = params?.id as string;
  const newsId = encodedId ? decodeURIComponent(encodedId) : '';
  const [news, setNews] = useState<CryptoNews | null>(null);
  const [translation, setTranslation] = useState<{ summary: string; sentiment: 'positive' | 'negative' | 'neutral' } | null>(null);
  const [translatedContent, setTranslatedContent] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [language, setLanguage] = useState<'tr' | 'en'>('tr');
  const [contentSource, setContentSource] = useState<'scraped' | 'description' | 'none'>('none');
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [theme, setTheme] = useState<'xp' | '80s' | 'vaporwave' | 'win95'>('xp');
  const [showWinamp, setShowWinamp] = useState<boolean>(false);
  const [degenMode, setDegenMode] = useState<boolean>(false);
  const [allNews, setAllNews] = useState<CryptoNews[]>([]);
  const [translations, setTranslations] = useState<Record<string, { summary: string; sentiment: 'positive' | 'negative' | 'neutral' }>>({});
  const [showStartMenu, setShowStartMenu] = useState<boolean>(false);
  const [savedNews, setSavedNews] = useState<Set<string>>(new Set());
  const [showSavedMenu, setShowSavedMenu] = useState<boolean>(false);
  const [showTrashModal, setShowTrashModal] = useState<boolean>(false);
  const [hiddenNews, setHiddenNews] = useState<Map<string, { language: 'tr' | 'en', summary: string }>>(new Map());
  const [currentSlogan, setCurrentSlogan] = useState<number>(0);

  // Speed-themed rotating slogans (English only)
  const speedSlogans = [
    "Faster Than a Cheetah",
    "Races with Mustangs",
    "Speed of Light Updates",
    "Lightning on Steroids",
    "Turbo Boosted News",
    "No Brakes, Just News",
    "Nitro-Powered Headlines",
    "No Need to Wait Like GTA 6",
    "Wasted? Never. News? Always.",
    "Five Stars, Zero Delays",
    "Faster Than a Lambo",
    "Bullet Time News",
    "Cheetah Speed, Eagle Vision",
    "Red Bull Gave Us Wings",
    "Tesla Plaid Mode: ON",
    "Rocket to the Moon",
    "News Before You Blink",
    "Supersonic Journalism",
    "Chain Reaction Updates",
    "Flash News, Not Flash Gordon"
  ];

  // Check language from localStorage
  useEffect(() => {
    const savedLanguage = localStorage.getItem('language') as 'tr' | 'en' | null;
    if (savedLanguage) {
      setLanguage(savedLanguage);
    }

    // Load saved news from localStorage
    try {
      const saved = localStorage.getItem('savedNews');
      if (saved) {
        setSavedNews(new Set(JSON.parse(saved)));
      }
    } catch (error) {
      console.error('Error loading saved news:', error);
    }

    // Load dark mode preference
    try {
      const savedDarkMode = localStorage.getItem('darkMode');
      if (savedDarkMode === 'true') {
        setDarkMode(true);
        document.documentElement.classList.add('dark');
      }
    } catch (error) {
      console.error('Error loading dark mode preference:', error);
    }

    // Load theme preference
    try {
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme === '80s' || savedTheme === 'xp' || savedTheme === 'vaporwave' || savedTheme === 'win95') {
        setTheme(savedTheme);
        document.documentElement.setAttribute('data-theme', savedTheme);
      }
    } catch (error) {
      console.error('Error loading theme preference:', error);
    }

    // Rotate slogan every 15 seconds
    const sloganInterval = setInterval(() => {
      setCurrentSlogan((prev) => (prev + 1) % speedSlogans.length);
    }, 15000);

    return () => {
      clearInterval(sloganInterval);
    };
  }, [speedSlogans.length]);

  useEffect(() => {
    const loadNewsDetail = async (): Promise<void> => {
      try {
        // First, try to find from localStorage (for saved news)
        let foundNews: CryptoNews | null = null;
        try {
          const savedNewsData = localStorage.getItem('savedNewsData');
          if (savedNewsData) {
            const data = JSON.parse(savedNewsData) as Record<string, CryptoNews>;
            foundNews = data[newsId] || null;
          }
        } catch (error) {
          console.error('Error loading saved news data:', error);
        }
        
        // If not found in saved data, fetch from API
        if (!foundNews) {
          const allNewsData = await fetchCryptoNews();
          setAllNews(allNewsData);
          foundNews = allNewsData.find(item => item.id === newsId) || null;
        }
        
        if (foundNews) {
          setNews(foundNews);
          
          // Try to load cached translation based on current language
          try {
            // v2 = OpenAI-based translations (crypto-optimized)
            const cacheKey = language === 'tr' ? 'newsTranslations_v2' : 'newsTranslationsEn_v2';
            const cached = localStorage.getItem(cacheKey);
            
            if (cached) {
              const cachedTranslations = JSON.parse(cached);
              setTranslations(cachedTranslations);
              if (cachedTranslations[newsId]) {
                setTranslation(cachedTranslations[newsId]);
                setLoading(false);
                return;
              }
            }
            
            // If no cached translation, translate now
            if (language === 'tr') {
              const result = await summarizeAndTranslate(foundNews.title, foundNews.text);
              setTranslation(result);
              
              // Strategy 1: Try to scrape full article content from original URL
              console.log('🔍 Step 1: Attempting to scrape full article from:', foundNews.url);
              let fullContent = '';
              
              try {
                fullContent = await scrapeFullArticle(foundNews.url);
                console.log('✅ Scraping result:', fullContent ? `${fullContent.length} characters` : 'empty');
              } catch (error) {
                console.error('❌ Scraping failed with error:', error);
              }
              
              // Strategy 2: Check if scraped content is good enough
              if (fullContent && fullContent.length > 200) {
                console.log('✅ Full content scraped successfully! Translating to Turkish...');
                try {
                  const translatedText = await translateText(fullContent, 'tr');
                  
                  // Smart validation for scraped content
                  const isDifferent = translatedText.toLowerCase() !== fullContent.toLowerCase();
                  const hasLength = translatedText.length > 50;
                  const hasTurkishChars = /[üğışöçÜĞİŞÖÇ]/.test(translatedText);
                  const isValid = translatedText && (isDifferent || hasLength || hasTurkishChars);
                  
                  if (isValid) {
                    setTranslatedContent(translatedText);
                    setContentSource('scraped');
                    console.log('✅ Translation complete:', translatedText.substring(0, 100) + '...');
                  } else {
                    throw new Error('Translation validation failed');
                  }
                } catch (error) {
                  console.error('❌ Translation failed:', error);
                  // Fall through to description fallback
                  fullContent = '';
                }
              }
              
              // Strategy 3: Fallback to RSS description if scraping failed
              if (!fullContent || fullContent.length < 200) {
                console.log('⚠️ Scraping failed or content too short. Using RSS description fallback...');
                const cleanedText = cleanHtmlContent(foundNews.text);
                console.log('📝 Cleaned description length:', cleanedText.length);
                
                if (cleanedText && cleanedText.length > 30) {
                  console.log('🔄 Translating description to Turkish...');
                  try {
                    const translatedText = await translateText(cleanedText, 'tr');
                    
                    // Smart validation: check if translation is valid
                    const isDifferent = translatedText.toLowerCase() !== cleanedText.toLowerCase();
                    const hasLength = translatedText.length > 15;
                    const hasTurkishChars = /[üğışöçÜĞİŞÖÇ]/.test(translatedText);
                    const isValid = translatedText && (isDifferent || hasLength || hasTurkishChars);
                    
                    if (isValid) {
                      setTranslatedContent(translatedText);
                      setContentSource('description');
                      console.log('✅ Description translated:', translatedText.substring(0, 100) + '...');
                    } else {
                      console.warn('⚠️ Translation validation failed, using original text');
                      setTranslatedContent(cleanedText);
                      setContentSource('description');
                    }
                  } catch (error) {
                    console.error('❌ Description translation failed:', error);
                    console.log('📝 Showing original English text as fallback');
                    setTranslatedContent(cleanedText);
                    setContentSource('description');
                  }
                } else {
                  console.warn('⚠️ Description too short, using original');
                  // If cleaned text is too short, use original text without cleaning
                  const originalText = foundNews.text.replace(/<[^>]*>/g, ' ').trim();
                  if (originalText && originalText.length > 20) {
                    setTranslatedContent(originalText);
                    setContentSource('description');
                  } else {
                    setTranslatedContent('İçerik çok kısa. Lütfen orijinal habere göz atın.');
                    setContentSource('none');
                  }
                }
              }
            } else {
              // English mode
              const result = await summarizeInEnglish(foundNews.title, foundNews.text);
              setTranslation(result);
              
              console.log('🔍 Step 1: Attempting to scrape full article (EN mode)...');
              let fullContent = '';
              
              try {
                fullContent = await scrapeFullArticle(foundNews.url);
                console.log('✅ Scraping result:', fullContent ? `${fullContent.length} characters` : 'empty');
              } catch (error) {
                console.error('❌ Scraping failed:', error);
              }
              
              if (fullContent && fullContent.length > 200) {
                console.log('✅ Full content scraped successfully');
                setTranslatedContent(fullContent);
                setContentSource('scraped');
              } else {
                console.log('⚠️ Using RSS description fallback...');
                const cleanedText = cleanHtmlContent(foundNews.text);
                if (cleanedText && cleanedText.length > 30) {
                  setTranslatedContent(cleanedText);
                  setContentSource('description');
                } else {
                  setTranslatedContent('Content not available. Please check the original article.');
                  setContentSource('none');
                }
              }
            }
          } catch (error) {
            console.error('Error loading/translating news:', error);
          }
        }
      } catch (error) {
        console.error('Error loading news detail:', error);
      } finally {
        setLoading(false);
      }
    };

    if (newsId) {
      loadNewsDetail();
    }
  }, [newsId, language]);

  const getSentimentIcon = (sentiment?: 'positive' | 'negative' | 'neutral'): React.ReactNode => {
    switch (sentiment) {
      case 'positive':
        return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'negative':
        return <TrendingDown className="w-4 h-4 text-red-600" />;
      default:
        return <div className="w-3 h-3 bg-blue-600 rounded-full" />;
    }
  };

  const getWindowTitle = (): string => {
    if (translation?.sentiment === 'positive') return '📈';
    if (translation?.sentiment === 'negative') return '📉';
    return '📰';
  };

  const toggleDarkMode = (): void => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', newDarkMode.toString());
  };

  const toggleLanguage = (): void => {
    const newLang = language === 'tr' ? 'en' : 'tr';
    setLanguage(newLang);
    localStorage.setItem('language', newLang);
    localStorage.setItem('preferredLanguage', newLang);
  };

  if (loading) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center relative" 
        style={{ 
          background: `
            linear-gradient(
              to bottom,
              transparent 0%,
              transparent 65%,
              #F8FAFC 65%,
              #E2E8F0 100%
            ),
            linear-gradient(
              to bottom,
              #1E3A5F 0%,
              #3B82F6 40%,
              #E0F2FE 70%
            )
          `,
          backgroundAttachment: 'fixed'
        }}
      >
        {/* Snowflakes */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
          {Array.from({ length: 50 }).map((_, i) => (
            <div
              key={i}
              className="absolute animate-snowfall"
              style={{
                left: `${Math.random() * 100}%`,
                top: `-${Math.random() * 20}%`,
                animationDelay: `${Math.random() * 5}s`,
                animationDuration: `${8 + Math.random() * 12}s`,
                opacity: 0.7 + Math.random() * 0.3,
                fontSize: `${10 + Math.random() * 15}px`,
                color: '#FFFFFF',
                textShadow: '0 0 3px rgba(255, 255, 255, 0.8)'
              }}
            >
              ❄
            </div>
          ))}
        </div>
        <div className="xp-window z-10" style={{ width: '300px' }}>
          <div className="xp-title-bar">
            <span className="text-white text-sm font-bold">⏳ Yükleniyor...</span>
          </div>
          <div className="bg-white p-8 flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
        <style jsx>{`
          @keyframes snowfall {
            0% { transform: translateY(0) rotate(0deg); }
            100% { transform: translateY(100vh) rotate(360deg); }
          }
          .animate-snowfall { animation: snowfall linear infinite; }
        `}</style>
      </div>
    );
  }

  if (!news) {
    return (
      <div 
        className="min-h-screen flex flex-col items-center justify-center p-4 relative" 
        style={{ 
          background: `
            linear-gradient(
              to bottom,
              transparent 0%,
              transparent 65%,
              #F8FAFC 65%,
              #E2E8F0 100%
            ),
            linear-gradient(
              to bottom,
              #1E3A5F 0%,
              #3B82F6 40%,
              #E0F2FE 70%
            )
          `,
          backgroundAttachment: 'fixed'
        }}
      >
        {/* Snowflakes */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
          {Array.from({ length: 50 }).map((_, i) => (
            <div
              key={i}
              className="absolute animate-snowfall"
              style={{
                left: `${Math.random() * 100}%`,
                top: `-${Math.random() * 20}%`,
                animationDelay: `${Math.random() * 5}s`,
                animationDuration: `${8 + Math.random() * 12}s`,
                opacity: 0.7 + Math.random() * 0.3,
                fontSize: `${10 + Math.random() * 15}px`,
                color: '#FFFFFF',
                textShadow: '0 0 3px rgba(255, 255, 255, 0.8)'
              }}
            >
              ❄
            </div>
          ))}
        </div>
        <div className="xp-window z-10" style={{ maxWidth: '500px', width: '100%' }}>
          <div className="xp-title-bar">
            <span className="text-white text-sm font-bold">❌ Hata</span>
          </div>
          <div className="bg-white p-8 text-center">
            <h1 
              className="text-2xl font-semibold text-gray-900 mb-4"
              style={{
                fontFamily: 'Tahoma, sans-serif'
              }}
            >
              Haber Bulunamadı
            </h1>
            <button
              onClick={() => router.push('/')}
              className="xp-button-blue"
            >
              Ana Sayfaya Dön
            </button>
          </div>
        </div>
        <style jsx>{`
          @keyframes snowfall {
            0% { transform: translateY(0) rotate(0deg); }
            100% { transform: translateY(100vh) rotate(360deg); }
          }
          .animate-snowfall { animation: snowfall linear infinite; }
        `}</style>
      </div>
    );
  }

  const sentimentIcon = getSentimentIcon(translation?.sentiment);

  if (isMinimized) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center p-4 relative" 
        style={{ 
          background: `
            linear-gradient(
              to bottom,
              transparent 0%,
              transparent 65%,
              #F8FAFC 65%,
              #E2E8F0 100%
            ),
            linear-gradient(
              to bottom,
              #1E3A5F 0%,
              #3B82F6 40%,
              #E0F2FE 70%
            )
          `,
          backgroundAttachment: 'fixed'
        }}
      >
        {/* Snowflakes */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
          {Array.from({ length: 50 }).map((_, i) => (
            <div
              key={i}
              className="absolute animate-snowfall"
              style={{
                left: `${Math.random() * 100}%`,
                top: `-${Math.random() * 20}%`,
                animationDelay: `${Math.random() * 5}s`,
                animationDuration: `${8 + Math.random() * 12}s`,
                opacity: 0.7 + Math.random() * 0.3,
                fontSize: `${10 + Math.random() * 15}px`,
                color: '#FFFFFF',
                textShadow: '0 0 3px rgba(255, 255, 255, 0.8)'
              }}
            >
              ❄
            </div>
          ))}
        </div>
        <div className="xp-window z-10" style={{ maxWidth: '300px', width: '100%' }}>
          <div className="xp-title-bar cursor-pointer" onClick={() => setIsMinimized(false)}>
            <span className="text-white text-sm font-bold">{getWindowTitle()} Haber Detayı</span>
            <button className="xp-control-btn" onClick={(e) => {
              e.stopPropagation();
              setIsMinimized(false);
            }}>
              <Maximize2 className="w-3 h-3 text-white" />
            </button>
          </div>
        </div>
        <style jsx>{`
          @keyframes snowfall {
            0% { transform: translateY(0) rotate(0deg); }
            100% { transform: translateY(100vh) rotate(360deg); }
          }
          .animate-snowfall { animation: snowfall linear infinite; }
        `}</style>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen pt-12 md:pt-0 relative" 
      style={{ 
        background: `
          linear-gradient(
            to bottom,
            transparent 0%,
            transparent 65%,
            #F8FAFC 65%,
            #E2E8F0 100%
          ),
          linear-gradient(
            to bottom,
            #1E3A5F 0%,
            #3B82F6 40%,
            #E0F2FE 70%
          )
        `,
        backgroundAttachment: 'fixed'
      }}
    >
      {/* Degen Mode - Fullscreen Overlay */}
      {degenMode && (
        <DegenMode
          news={allNews}
          translations={translations}
          onClose={() => setDegenMode(false)}
          language={language}
        />
      )}

      {/* Snowflakes Animation - Behind news cards */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
        {Array.from({ length: 50 }).map((_, i) => (
          <div
            key={i}
            className="absolute animate-snowfall"
            style={{
              left: `${Math.random() * 100}%`,
              top: `-${Math.random() * 20}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${8 + Math.random() * 12}s`,
              opacity: 0.7 + Math.random() * 0.3,
              fontSize: `${10 + Math.random() * 15}px`,
              color: '#FFFFFF',
              textShadow: '0 0 3px rgba(255, 255, 255, 0.8)'
            }}
          >
            ❄
          </div>
        ))}
      </div>
      
      {/* Top Bar - VOLT Logo & Actions */}
      <div className="fixed top-0 left-0 right-0 z-40 bg-gradient-to-b from-blue-100/80 to-transparent border-b border-blue-200 pt-12 md:pt-0">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* VOLT Logo */}
            <div className="volt-logo-container cursor-pointer" onClick={() => router.push('/')}>
              <svg 
                width="200" 
                height="60" 
                viewBox="0 0 200 60" 
                xmlns="http://www.w3.org/2000/svg"
                className="volt-logo transition-all duration-300"
              >
                <defs>
                  {/* Theme-Based Gradients */}
                  <linearGradient id="voltGradientDetail" x1="0%" y1="0%" x2="100%" y2="0%">
                    {theme === '80s' ? (
                      <>
                        <stop offset="0%" stopColor="#39FF14" />
                        <stop offset="50%" stopColor="#00FF00" />
                        <stop offset="100%" stopColor="#57FF57" />
                      </>
                    ) : theme === 'vaporwave' ? (
                      <>
                        <stop offset="0%" stopColor="#FF6FD8" />
                        <stop offset="50%" stopColor="#C471F5" />
                        <stop offset="100%" stopColor="#00D9FF" />
                      </>
                    ) : theme === 'win95' ? (
                      <>
                        <stop offset="0%" stopColor="#008080" />
                        <stop offset="50%" stopColor="#00A0A0" />
                        <stop offset="100%" stopColor="#00C0C0" />
                      </>
                    ) : (
                      <>
                        <stop offset="0%" stopColor="#00D9FF" />
                        <stop offset="50%" stopColor="#39FF14" />
                        <stop offset="100%" stopColor="#FFD700" />
                      </>
                    )}
                  </linearGradient>
                  
                  {/* Theme-Based Shadow */}
                  <filter id="subtleShadowDetail" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="0.5" result="blur"/>
                    <feOffset in="blur" dx="1" dy="1" result="offsetBlur"/>
                    <feMerge>
                      <feMergeNode in="offsetBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                </defs>
                
                {/* Main VOLT Text - Bold & Clear */}
                <text
                  x="100"
                  y="40"
                  fontSize="48"
                  fontWeight="900"
                  fontFamily="'SF Pro Display', system-ui, -apple-system, 'Segoe UI', sans-serif"
                  fill="url(#voltGradientDetail)"
                  textAnchor="middle"
                  letterSpacing="3"
                  filter="url(#subtleShadowDetail)"
                >
                  VOLT
                </text>
                
                {/* Tagline - Rotating Speed Slogans */}
                <text
                  x="100"
                  y="52"
                  fontSize="7"
                  fontWeight="600"
                  fontFamily="'SF Pro Text', system-ui, sans-serif"
                  fill={(theme === '80s' || theme === 'win95' || theme === 'xp') ? '#FFFFFF' : (darkMode ? '#A0A0A0' : '#666666')}
                  textAnchor="middle"
                  letterSpacing="1"
                  className="slogan-flip-transition"
                  key={currentSlogan}
                >
                  {speedSlogans[currentSlogan].toUpperCase()}
                </text>
              </svg>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-2">
              {/* Saved News Button */}
              <button
                onClick={() => router.push('/')}
                className="xp-button flex items-center gap-2"
                title="Kayıtlı Haberler"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2z"/>
                </svg>
                <span className="hidden sm:inline">Kayıtlı Haberler</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* XP Taskbar - Bottom Fixed */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 xp-taskbar h-12 sm:h-10">
        <div className="flex items-center h-full px-2 gap-2">
          {/* Start Button - XP Style */}
          <button
            className="xp-start-button flex items-center gap-2"
            onClick={() => setShowStartMenu(!showStartMenu)}
          >
            <span>{language === 'tr' ? 'Başlat' : 'Start'}</span>
          </button>

          <div className="flex-1 flex items-center gap-2">
            <div className="px-3 py-1 bg-white/20 border border-white/40 rounded text-white text-xs font-bold flex items-center gap-2">
              <div className="w-4 h-4 bg-white rounded-sm flex items-center justify-center">
                {sentimentIcon}
              </div>
              <span className="hidden sm:inline">Haber Detayı</span>
            </div>
            {/* VoltMP Button */}
            <button
              onClick={() => setShowWinamp(!showWinamp)}
              className={`px-3 py-1 rounded border text-white text-xs font-bold flex items-center gap-2 transition-colors ${
                showWinamp 
                  ? 'bg-white/20 border-white/40' 
                  : 'bg-white/10 border-white/30 hover:bg-white/15'
              }`}
              title="VoltMP Player"
            >
              <Music className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">VoltMP</span>
            </button>
          </div>

          {/* System Tray - Right Side */}
          <div className="xp-system-tray flex items-center gap-3">
            {/* Dark Mode Toggle */}
            <button
              onClick={toggleDarkMode}
              className="p-1 hover:bg-white/10 rounded transition-colors"
              title={darkMode ? (language === 'tr' ? 'Açık Mod' : 'Light Mode') : (language === 'tr' ? 'Karanlık Mod' : 'Dark Mode')}
            >
              {darkMode ? (
                <Sun className="w-3.5 h-3.5 text-yellow-400" />
              ) : (
                <Moon className="w-3.5 h-3.5 text-white" />
              )}
            </button>

            {/* Degen Mode Toggle */}
            <button
              onClick={() => setDegenMode(!degenMode)}
              className="p-1 hover:bg-white/10 rounded transition-colors"
              title={language === 'tr' ? 'Degen Mod' : 'Degen Mode'}
            >
              <span className="text-white text-lg font-black" style={{ fontFamily: 'Arial Black, sans-serif' }}>D</span>
            </button>

            {/* Language Toggle */}
            <button
              onClick={toggleLanguage}
              className="px-2 py-1 hover:bg-white/10 rounded transition-colors flex items-center gap-1"
              title="Language"
            >
              <Globe className="w-3.5 h-3.5 text-white" />
              <span className="text-white text-xs font-bold">{language.toUpperCase()}</span>
            </button>

            {/* Clock */}
            <div className="text-white text-xs font-bold px-2 border-l border-white/30">
              {new Date().toLocaleTimeString(language === 'tr' ? 'tr-TR' : 'en-US', { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </div>

            {/* Show Desktop Button (Home) */}
            <button
              onClick={() => router.push('/')}
              className="px-1 h-8 border-l border-white/30 hover:bg-white/10 transition-colors flex items-center justify-center"
              title={language === 'tr' ? 'Anasayfaya Dön' : 'Back to Home'}
              style={{ width: '12px' }}
            >
              <div className="w-1 h-full bg-white/50"></div>
            </button>
          </div>
        </div>
      </nav>

      {/* Start Menu - XP Style - Compact Vertical */}
      {showStartMenu && (
        <div className="fixed inset-0 z-[60] bg-transparent" onClick={() => setShowStartMenu(false)}>
          <div 
            className="absolute left-0 bottom-10 xp-window overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            style={{
              animation: 'slideInUp 0.2s ease-out',
              width: '380px',
              height: '258px'
            }}
          >
            {/* XP Title Bar */}
            <div className="xp-title-bar">
              <div className="flex items-center gap-1.5">
                <span className="text-white text-xs font-bold">{speedSlogans[currentSlogan].toUpperCase()}</span>
              </div>
            </div>

            {/* Menu Content - Compact */}
            <div className="bg-white p-3">
              {/* User Section - Compact */}
              <div className="mb-3 pb-3 border-b border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-gray-900 truncate">{language === 'tr' ? 'X\'te Takip Edin' : 'Follow us on X'}</div>
                    <div 
                      className="text-[30px] font-bold"
                      style={{
                        fontFamily: "'SF Pro Display', system-ui, -apple-system, 'Segoe UI', sans-serif",
                        background: 'linear-gradient(to right, #00D9FF, #39FF14, #FFD700)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text'
                      }}
                    >
                      Volt News
                    </div>
                  </div>
                </div>
                <a
                  href="https://x.com/voltnewsdotxyz"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="xp-button-green w-full text-center py-1.5 text-xs font-bold flex items-center justify-center gap-1.5"
                  onClick={(e) => e.stopPropagation()}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                  {language === 'tr' ? 'Takip Et' : 'Follow'}
                </a>
              </div>



              {/* Website Link - Compact */}
              <a
                href="https://www.voltnews.xyz"
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full px-2 py-1.5 text-xs font-bold text-left text-gray-900 hover:bg-blue-50 rounded transition-colors flex items-center gap-2"
                onClick={(e) => e.stopPropagation()}
                style={{
                  fontFamily: 'Tahoma, sans-serif'
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="2" y1="12" x2="22" y2="12"/>
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                </svg>
                www.voltnews.xyz
              </a>

              {/* Saved News Button - Compact */}
              <button
                onClick={() => {
                  setShowStartMenu(false);
                  setShowSavedMenu(true);
                }}
                className="w-full px-2 py-1.5 text-xs font-bold text-left text-gray-900 hover:bg-blue-50 rounded transition-colors flex items-center gap-2 mt-0.5"
                style={{
                  fontFamily: 'Tahoma, sans-serif'
                }}
              >
                <Bookmark className="w-3.5 h-3.5" />
                {language === 'tr' ? 'Kayıtlı Haberler' : 'Saved News'}
                {savedNews.size > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-[10px] rounded-full px-1.5 py-0.5">
                    {savedNews.size}
                  </span>
                )}
              </button>

              {/* Trash Button - Compact */}
              <button
                onClick={() => {
                  setShowStartMenu(false);
                  setShowTrashModal(true);
                }}
                className="w-full px-2 py-1.5 text-xs font-bold text-left text-gray-900 hover:bg-blue-50 rounded transition-colors flex items-center gap-2 mt-0.5"
                style={{
                  fontFamily: 'Tahoma, sans-serif'
                }}
              >
                <Trash2 className="w-3.5 h-3.5" />
                {language === 'tr' ? 'Çöp Kutusu' : 'Recycle Bin'}
                {hiddenNews.size > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-[10px] rounded-full px-1.5 py-0.5">
                    {hiddenNews.size}
                  </span>
                )}
              </button>

              {/* Domain Link - Bottom Centered */}
              <div className="mt-3 pt-3 border-t border-gray-200 text-center">
                <a
                  href="https://www.voltnews.xyz"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:text-blue-800 font-bold transition-colors"
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    fontFamily: 'Tahoma, sans-serif'
                  }}
                >
                  www.voltnews.xyz
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-20">
        {/* Back Button - XP Style */}
        <button
          onClick={() => router.push('/')}
          className="xp-button mb-6 flex items-center gap-2"
          style={{
            fontFamily: 'Tahoma, sans-serif'
          }}
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Geri</span>
        </button>

        {/* News Article - XP Window Style */}
        <article className="xp-window" style={{ position: 'relative', zIndex: 10 }}>
          {/* XP Window Title Bar */}
          <div className="xp-title-bar">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-white rounded-sm flex items-center justify-center">
                {sentimentIcon}
              </div>
              <span className="text-white text-sm font-bold truncate">{getWindowTitle()} Haber Detayı</span>
            </div>
            
            <div className="flex gap-1">
              <button 
                className="xp-control-btn"
                onClick={() => setIsMinimized(true)}
                title="Minimize"
              >
                <Minimize2 className="w-3 h-3 text-white" />
              </button>
              <button 
                className="xp-control-btn"
                onClick={() => router.push('/')}
                title="Close"
              >
                <span className="text-white font-bold text-xs">×</span>
              </button>
            </div>
          </div>

          {/* Window Content Area - ALL TEXT IN BLACK */}
          <div className="bg-white">
            {/* Original Image */}
            {news.image && (
              <div className="border-b-2 border-[#C1BBAA]">
                <img 
                  src={news.image} 
                  alt={news.title}
                  className="w-full h-auto object-cover"
                  style={{
                    maxHeight: '400px'
                  }}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
              </div>
            )}

            <div className="p-6 md:p-8">
              {/* Header */}
              <div className="flex items-start justify-between mb-6 pb-4 border-b-2 border-gray-200">
                <div className="flex items-center gap-2">
                  {/* Sentiment Badge */}
                  {translation?.sentiment === 'positive' && (
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded text-sm font-bold flex items-center gap-1">
                      <TrendingUp className="w-4 h-4" />
                      📈 Bullish
                    </span>
                  )}
                  {translation?.sentiment === 'negative' && (
                    <span className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm font-bold flex items-center gap-1">
                      <TrendingDown className="w-4 h-4" />
                      📉 Bearish
                    </span>
                  )}
                  {translation?.sentiment === 'neutral' && (
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm font-bold flex items-center gap-1">
                      <div className="w-3 h-3 bg-blue-600 rounded-full" />
                      ⚖️ Neutral
                    </span>
                  )}
                </div>
              </div>

              {/* Title/Summary - BLACK TEXT */}
              <h1 
                className="text-2xl md:text-3xl font-bold mb-6 leading-tight text-gray-900"
                style={{
                  fontFamily: 'Tahoma, sans-serif',
                  lineHeight: '1.4'
                }}
              >
                {translation?.summary || news.title}
              </h1>

              {/* Translated Content - BLACK TEXT */}
              {(() => {
                // For TR: Only show if we have Turkish translation
                if (language === 'tr') {
                  // STRICT CHECK: Must have Turkish characters (ü, ğ, ı, ş, ö, ç)
                  const hasTurkishChars = translatedContent && /[üğışöçÜĞİŞÖÇ]/.test(translatedContent);
                  
                  // STRICT CHECK: At least 30% of words should be Turkish-looking (contain Turkish chars or common Turkish words)
                  const words = translatedContent ? translatedContent.split(/\s+/) : [];
                  const turkishWords = words.filter(word => 
                    /[üğışöçÜĞİŞÖÇ]/.test(word) || 
                    /^(bir|iki|için|ile|ve|bu|şu|olan|oldu|etti|yapıyor|yapmak|edildi|ettı|yaptı|dedi|diye|göre|kadar|sonra|önce|ancak|ama|fakat|veya|ki|da|de|mi|mı|mu|mü)$/i.test(word)
                  );
                  const isMostlyTurkish = words.length > 0 && (turkishWords.length / words.length) > 0.15;
                  
                  // Only show if it's actually Turkish (has Turkish chars AND mostly Turkish words)
                  if (translatedContent && hasTurkishChars && isMostlyTurkish) {
                    return (
                      <div 
                        className="mb-6 text-gray-800"
                        style={{
                          fontFamily: 'Tahoma, sans-serif',
                          fontSize: '15px',
                          lineHeight: '1.6'
                        }}
                      >
                        <h2 className="text-sm font-bold uppercase mb-3 text-gray-600 border-b border-gray-200 pb-2 flex items-center gap-2">
                          Çevrilmiş İçerik
                          {contentSource === 'scraped' && (
                            <span className="text-xs font-normal text-green-600 normal-case">(Tam İçerik)</span>
                          )}
                          {contentSource === 'description' && (
                            <span className="text-xs font-normal text-blue-600 normal-case">(Özet)</span>
                          )}
                        </h2>
                        <p className="text-gray-900 whitespace-pre-wrap">{translatedContent}</p>
                      </div>
                    );
                  } else {
                    // Show loading/error message if content is not Turkish
                    return (
                      <div className="mb-6 p-4 bg-yellow-50 border border-yellow-300 rounded">
                        <p className="text-sm text-yellow-800 font-semibold mb-2">
                          ⚠️ Türkçe çeviri yapılamadı
                        </p>
                        <p className="text-xs text-yellow-700 mb-3">
                          İçeriğin tam hali orijinal kaynakta mevcut. Lütfen aşağıdaki butonu kullanarak orijinal habere gidin.
                        </p>
                        {translatedContent && (
                          <details className="text-xs text-gray-700">
                            <summary className="cursor-pointer text-blue-600 hover:underline mb-2">
                              İngilizce içeriği göster
                            </summary>
                            <div className="mt-2 p-3 bg-white rounded border border-gray-200 max-h-64 overflow-y-auto">
                              <p className="whitespace-pre-wrap">{translatedContent}</p>
                            </div>
                          </details>
                        )}
                      </div>
                    );
                  }
                } else {
                  // For EN: Show content directly
                  if (translatedContent) {
                    return (
                      <div 
                        className="mb-6 text-gray-800"
                        style={{
                          fontFamily: 'Tahoma, sans-serif',
                          fontSize: '15px',
                          lineHeight: '1.6'
                        }}
                      >
                        <h2 className="text-sm font-bold uppercase mb-3 text-gray-600 border-b border-gray-200 pb-2 flex items-center gap-2">
                          Content
                          {contentSource === 'scraped' && (
                            <span className="text-xs font-normal text-green-600 normal-case">(Full Content)</span>
                          )}
                          {contentSource === 'description' && (
                            <span className="text-xs font-normal text-blue-600 normal-case">(Summary)</span>
                          )}
                        </h2>
                        <p className="text-gray-900 whitespace-pre-wrap">{translatedContent}</p>
                      </div>
                    );
                  }
                }
                return null;
              })()}

              {/* Action Button */}
              <a
                href={news.url}
                target="_blank"
                rel="noopener noreferrer"
                className="xp-button-blue inline-flex items-center gap-2"
              >
                <span>Orijinal Habere Git</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        </article>

        {/* Back to Home - XP Button */}
        <div className="mt-6 text-center">
          <button
            onClick={() => router.push('/')}
            className="xp-button"
            style={{
              fontFamily: 'Tahoma, sans-serif'
            }}
          >
            ← Tüm Haberlere Dön
          </button>
        </div>
      </main>

      {/* VoltMP Player */}
      <WinampPlayer 
        isOpen={showWinamp} 
        onClose={() => setShowWinamp(false)}
        theme={theme}
      />

      {/* CSS for Snowfall Animation */}
      <style jsx>{`
        @keyframes snowfall {
          0% {
            transform: translateY(0) rotate(0deg);
          }
          100% {
            transform: translateY(100vh) rotate(360deg);
          }
        }
        
        .animate-snowfall {
          animation: snowfall linear infinite;
        }

        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes flipIn {
          0% {
            opacity: 0;
            transform: perspective(400px) rotateX(-90deg);
          }
          40% {
            transform: perspective(400px) rotateX(20deg);
          }
          100% {
            opacity: 1;
            transform: perspective(400px) rotateX(0deg);
          }
        }
        
        :global(.slogan-flip-transition) {
          animation: flipIn 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94);
          transform-origin: center;
        }
      `}</style>
    </div>
  );
}
