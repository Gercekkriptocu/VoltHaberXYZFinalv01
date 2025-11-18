'use client'
import { useState, useEffect, useCallback } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';
import { fetchCryptoNews, type CryptoNews } from '../lib/news-service';
import { summarizeAndTranslate, summarizeInEnglish } from '../lib/translation-service';
import { NewsCard } from '../components/news-card';
import { useRouter } from 'next/navigation';
import { SkeletonCard } from '../components/skeleton-card';
import { useFarcasterShare } from '../components/farcaster-share';
import { ShareDialog } from '../components/share-dialog';
import { LiveCryptoTicker } from '../components/live-crypto-ticker';
import { PersonalizationFeed } from '../components/personalization-feed';
import { BottomNavigation } from '../components/bottom-navigation';
import { WinampPlayer } from '../components/winamp-player';
import { DegenMode } from '../components/degen-mode';

import { WalletConnection } from '../components/wallet-connection';
import { useNFTMint } from '@/hooks/useNFTMint';

import { RefreshCw, Search, X, Menu, Bookmark, ChevronLeft, ChevronRight, Globe, Music, Trash2, Sun, Moon, TrendingUp } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useAddMiniApp } from "@/hooks/useAddMiniApp";
import { useQuickAuth } from "@/hooks/useQuickAuth";
import { useIsInFarcaster } from "@/hooks/useIsInFarcaster";

interface TranslatedNews {
  summary: string;
  sentiment: 'positive' | 'negative' | 'neutral';
}

export default function Home(): React.JSX.Element {
  const [news, setNews] = useState<CryptoNews[]>([]);
  const [translations, setTranslations] = useState<Record<string, TranslatedNews>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const { shareNews, isSharing } = useFarcasterShare();
  const [sharingId, setSharingId] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [countdown, setCountdown] = useState<number>(90);
  const [savedNews, setSavedNews] = useState<Set<string>>(new Set());
  const [showSavedMenu, setShowSavedMenu] = useState<boolean>(false);
  const [showStartMenu, setShowStartMenu] = useState<boolean>(false);
  const [logoShimmer, setLogoShimmer] = useState<boolean>(false);
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [theme, setTheme] = useState<'xp' | 'win95' | 'vaporwave'>('xp');
  const [showThemeDropdown, setShowThemeDropdown] = useState<boolean>(false);
  const [showPersonalizationModal, setShowPersonalizationModal] = useState<boolean>(false);
  const [showBottomSearch, setShowBottomSearch] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [language, setLanguage] = useState<'tr' | 'en'>('tr');
  const [showLangDropdown, setShowLangDropdown] = useState<boolean>(false);
  const [hiddenNews, setHiddenNews] = useState<Map<string, { language: 'tr' | 'en', summary: string }>>(new Map());
  const [showWinamp, setShowWinamp] = useState<boolean>(false);
  const [hasOpenedWinamp, setHasOpenedWinamp] = useState<boolean>(false);
  const [showTrashModal, setShowTrashModal] = useState<boolean>(false);
  const [shareDialogNews, setShareDialogNews] = useState<CryptoNews | null>(null);
  const [showNewsCards, setShowNewsCards] = useState<boolean>(true);
  const [savedNewsPage, setSavedNewsPage] = useState<number>(1);

  const [degenMode, setDegenMode] = useState<boolean>(false);
  const [currentSlogan, setCurrentSlogan] = useState<number>(0);
  const itemsPerPage = 50; // Show 50 news per page
  const maxPages = 10; // Maximum 10 pages (500 news total)
  const router = useRouter();
  const { addMiniApp } = useAddMiniApp();
  const { account, connectWallet, isConnecting } = useNFTMint();

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

  const texts = {
    tr: {
      searchPlaceholder: 'Haber ara...',
      close: 'Kapat',
      search: 'Ara',
      lightMode: 'Açık Mod',
      darkMode: 'Karanlık Mod',
      savedNews: 'Kayıtlı Haberler',
      clearAll: '🗑️ Tümünü Temizle',
      noSavedNews: 'Henüz kayıtlı haber yok',
      noConnection: 'Şu an bağlantı yok',
      tryAgain: 'Yeniden deneyin',
      retry: 'Yeniden Dene',
      lastUpdate: 'Son güncelleme',
      previousPage: 'Önceki Sayfa',
      nextPage: 'Sonraki Sayfa',
      personalFeed: 'Kişisel Feed\'ini Oluştur',
    },
    en: {
      searchPlaceholder: 'Search news...',
      close: 'Close',
      search: 'Search',
      lightMode: 'Light Mode',
      darkMode: 'Dark Mode',
      savedNews: 'Saved News',
      clearAll: '🗑️ Clear All',
      noSavedNews: 'No saved news yet',
      noConnection: 'No connection at the moment',
      tryAgain: 'Please try again',
      retry: 'Retry',
      lastUpdate: 'Last update',
      previousPage: 'Previous Page',
      nextPage: 'Next Page',
      personalFeed: 'Create Your Personal Feed',
    },
  };

  const t = texts[language];
    const isInFarcaster = useIsInFarcaster()
    useQuickAuth(isInFarcaster)

  const loadNews = useCallback(async (isRefresh = false): Promise<void> => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const fetchedNews = await fetchCryptoNews();
      
      // Sort news by publishedDate (newest first)
      const sortedNews = fetchedNews.sort((a, b) => {
        const dateA = new Date(a.publishedDate || 0).getTime();
        const dateB = new Date(b.publishedDate || 0).getTime();
        return dateB - dateA; // Newest first
      });
      
      // Load cached translations from localStorage FIRST
      // v2 = OpenAI-based translations (crypto-optimized)
      const cacheKey = language === 'tr' ? 'newsTranslations_v2' : 'newsTranslationsEn_v2';
      const cachedTranslations: Record<string, TranslatedNews> = {};
      try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          Object.assign(cachedTranslations, JSON.parse(cached));
        }
      } catch (error) {
        console.error('Error loading cached translations:', error);
      }

      // Set translations immediately with cached data
      setTranslations(cachedTranslations);
      
      // Track first seen time for each news item in localStorage
      try {
        const newsSeenTimes = localStorage.getItem('newsSeenTimes');
        const seenTimes: Record<string, string> = newsSeenTimes ? JSON.parse(newsSeenTimes) : {};
        const now = new Date().toISOString();
        
        sortedNews.forEach(item => {
          if (!seenTimes[item.id]) {
            seenTimes[item.id] = now;
          }
        });
        
        localStorage.setItem('newsSeenTimes', JSON.stringify(seenTimes));
      } catch (error) {
        console.error('Error tracking news seen times:', error);
      }
      
      // Set sorted news immediately to show cards faster
      setNews(sortedNews);
      setLastUpdate(new Date());
      
      // Stop loading immediately - don't wait for translations
      setLoading(false);
      setRefreshing(false);

      // Start summarizing and translating in background
      if (sortedNews.length > 0) {
        const newsToTranslate = sortedNews.filter(item => !cachedTranslations[item.id]);
        
        if (newsToTranslate.length > 0) {
          // Translate in batches of 5 for better performance
          const batchSize = 5;
          for (let i = 0; i < newsToTranslate.length; i += batchSize) {
            const batch = newsToTranslate.slice(i, i + batchSize);
            
            Promise.all(
              batch.map(async (item): Promise<[string, TranslatedNews]> => {
                const result = language === 'tr' 
                  ? await summarizeAndTranslate(item.title, item.text)
                  : await summarizeInEnglish(item.title, item.text);
                return [
                  item.id,
                  {
                    summary: result.summary,
                    sentiment: result.sentiment
                  }
                ];
              })
            ).then((translatedResults) => {
              const newTranslations: Record<string, TranslatedNews> = Object.fromEntries(translatedResults);
              
              // Update translations incrementally
              setTranslations(prev => {
                const updated = { ...prev, ...newTranslations };
                
                // Save to localStorage
                try {
                  localStorage.setItem(cacheKey, JSON.stringify(updated));
                } catch (error) {
                  console.error('Error saving translations to cache:', error);
                }
                
                return updated;
              });
            }).catch(error => {
              console.error('Error translating news batch:', error);
            });
          }
        }
      }
    } catch (error) {
      console.error('Error loading news:', error);
      setLoading(false);
      setRefreshing(false);
    }
  }, [language]);

  useEffect(() => {
      const tryAddMiniApp = async () => {
        try {
          await addMiniApp()
        } catch (error) {
          console.error('Failed to add mini app:', error)
        }

      }

    

      tryAddMiniApp()
    }, [addMiniApp])

  useEffect(() => {
    // Load saved language preference
    const savedLang = localStorage.getItem('preferredLanguage');
    if (savedLang === 'en' || savedLang === 'tr') {
      setLanguage(savedLang);
    }

    // Initial load
    loadNews();

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
      if (savedTheme === 'xp' || savedTheme === 'win95' || savedTheme === 'vaporwave') {
        setTheme(savedTheme);
        document.documentElement.setAttribute('data-theme', savedTheme);
      }
    } catch (error) {
      console.error('Error loading theme preference:', error);
    }

    // Auto-refresh every 90 seconds (reduced from 60)
    const refreshInterval = setInterval(() => {
      loadNews(true);
    }, 90 * 1000);

    // Mark app as ready for Farcaster
    sdk.actions.ready();



    // Rotate slogan every 60 seconds (reduced from 30)
    const sloganInterval = setInterval(() => {
      setCurrentSlogan((prev) => (prev + 1) % speedSlogans.length);
    }, 60000);

    return () => {
      clearInterval(refreshInterval);
      clearInterval(sloganInterval);
    };
  }, [loadNews]);

  // Reload translations when language changes
  useEffect(() => {
    if (news.length > 0) {
      loadNews(true);
    }
  }, [language]);

  const handleShare = async (newsItem: CryptoNews): Promise<void> => {
    setShareDialogNews(newsItem);
  };

  const handleRefresh = async (): Promise<void> => {
    await loadNews(true);
  };

  const handleSave = (newsItem: CryptoNews): void => {
    const newSavedNews = new Set(savedNews);
    if (newSavedNews.has(newsItem.id)) {
      newSavedNews.delete(newsItem.id);
      // Remove from saved news data
      try {
        const savedNewsData = localStorage.getItem('savedNewsData');
        if (savedNewsData) {
          const data = JSON.parse(savedNewsData) as Record<string, CryptoNews>;
          delete data[newsItem.id];
          localStorage.setItem('savedNewsData', JSON.stringify(data));
        }
      } catch (error) {
        console.error('Error removing saved news data:', error);
      }
    } else {
      newSavedNews.add(newsItem.id);
      // Save full news data
      try {
        const savedNewsData = localStorage.getItem('savedNewsData');
        const data = savedNewsData ? JSON.parse(savedNewsData) as Record<string, CryptoNews> : {};
        data[newsItem.id] = newsItem;
        localStorage.setItem('savedNewsData', JSON.stringify(data));
      } catch (error) {
        console.error('Error saving news data:', error);
      }
    }
    setSavedNews(newSavedNews);
    localStorage.setItem('savedNews', JSON.stringify(Array.from(newSavedNews)));
  };

  const handleTopicFollow = (topic: string): void => {
    console.log('Following topic:', topic);
  };

  const handleHideNews = (newsItem: CryptoNews): void => {
    const newHiddenNews = new Map(hiddenNews);
    const summary = translations[newsItem.id]?.summary || newsItem.title;
    newHiddenNews.set(newsItem.id, { language, summary });
    setHiddenNews(newHiddenNews);
  };

  const handleRestoreNews = (newsId: string): void => {
    const newHiddenNews = new Map(hiddenNews);
    newHiddenNews.delete(newsId);
    setHiddenNews(newHiddenNews);
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
    localStorage.setItem('preferredLanguage', newLang);
  };

  const handleThemeChange = (newTheme: 'xp' | 'win95' | 'vaporwave'): void => {
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    setShowThemeDropdown(false);
  };

  const handleLanguageChange = (lang: 'tr' | 'en'): void => {
    setLanguage(lang);
    localStorage.setItem('preferredLanguage', lang);
    setShowLangDropdown(false);
  };

  // Count sentiments from last 20 news
  const last20News = news.slice(0, 20);
  const last20Translations = last20News
    .map(item => translations[item.id])
    .filter(t => t && t.sentiment);
  
  const positiveCount = last20Translations.filter(t => t.sentiment === 'positive').length;
  const negativeCount = last20Translations.filter(t => t.sentiment === 'negative').length;
  const neutralCount = last20Translations.filter(t => t.sentiment === 'neutral').length;
  const totalSentiments = positiveCount + negativeCount + neutralCount;
  
  // Calculate position based on positive vs negative (neutral doesn't affect position)
  const sentimentTotal = positiveCount + negativeCount;
  const positivePercentage = sentimentTotal > 0 
    ? (positiveCount / sentimentTotal) * 100 
    : 50;

  // Get user's selected topics and custom keywords from personalization feed
  const getUserTopics = (): string[] => {
    try {
      const prefs = localStorage.getItem('userPreferences');
      if (prefs) {
        const parsed = JSON.parse(prefs) as { topics?: string[]; customKeywords?: string[] };
        return parsed.topics || [];
      }
    } catch (error) {
      console.error('Error loading user topics:', error);
    }
    return [];
  };

  const getUserCustomKeywords = (): string[] => {
    try {
      const prefs = localStorage.getItem('userPreferences');
      if (prefs) {
        const parsed = JSON.parse(prefs) as { topics?: string[]; customKeywords?: string[] };
        return parsed.customKeywords || [];
      }
    } catch (error) {
      console.error('Error loading custom keywords:', error);
    }
    return [];
  };

  const userTopics = getUserTopics();
  const userCustomKeywords = getUserCustomKeywords();

  // Search filtering
  const searchFilteredNews = searchQuery.trim()
    ? news.filter((item) => {
        // Filter out hidden news
        if (hiddenNews.has(item.id)) return false;
        const query = searchQuery.toLowerCase();
        const title = item.title.toLowerCase();
        const summary = translations[item.id]?.summary?.toLowerCase() || '';
        const text = item.text?.toLowerCase() || '';
        return title.includes(query) || summary.includes(query) || text.includes(query);
      })
    : news.filter(item => !hiddenNews.has(item.id));

  // Category filtering based on selected topics and custom keywords
  const categoryFilteredNews = (userTopics.length > 0 || userCustomKeywords.length > 0)
    ? searchFilteredNews.filter((item) => {
        const title = item.title.toLowerCase();
        const summary = translations[item.id]?.summary?.toLowerCase() || '';
        const text = item.text?.toLowerCase() || '';
        const content = `${title} ${summary} ${text}`;

        // Check if any of the user's topics match the news content
        const topicMatch = userTopics.some(topic => {
          const topicLower = topic.toLowerCase();
          // Match variations of the topic
          if (topicLower === 'btc' || topicLower === 'bitcoin') {
            return content.includes('bitcoin') || content.includes('btc');
          }
          if (topicLower === 'eth' || topicLower === 'ethereum') {
            return content.includes('ethereum') || content.includes('eth');
          }
          if (topicLower === 'defi') {
            return content.includes('defi') || content.includes('decentralized finance');
          }
          if (topicLower === 'nft') {
            return content.includes('nft') || content.includes('non-fungible');
          }
          if (topicLower === 'memecoins') {
            return content.includes('meme') || content.includes('doge') || content.includes('shib');
          }
          if (topicLower === 'ai & crypto') {
            return content.includes('ai') || content.includes('artificial intelligence');
          }
          if (topicLower === 'regulation') {
            return content.includes('regulation') || content.includes('sec') || content.includes('legal');
          }
          if (topicLower === 'gaming') {
            return content.includes('gaming') || content.includes('game') || content.includes('play-to-earn');
          }
          if (topicLower === 'airdrop') {
            return content.includes('airdrop') || content.includes('token drop') || content.includes('free tokens');
          }
          return content.includes(topicLower);
        });

        // Check if any custom keywords match the news content
        const keywordMatch = userCustomKeywords.some(keyword => {
          return content.includes(keyword.toLowerCase());
        });

        return topicMatch || keywordMatch;
      })
    : searchFilteredNews;

  const filteredNews = categoryFilteredNews;

  // Pagination - Calculate based on all available news up to maxPages
  // Always ensure we can access up to 10 pages regardless of actual news count
  const totalPages = Math.min(maxPages, Math.max(1, Math.ceil(filteredNews.length / itemsPerPage)));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedNews = filteredNews.slice(startIndex, endIndex);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, language]);



  return (
    <div className="min-h-screen">

      
      {/* Degen Mode - Fullscreen Overlay */}
      {degenMode && (
        <DegenMode
          news={news}
          translations={translations}
          onClose={() => setDegenMode(false)}
          language={language}
        />
      )}
      {/* XP Taskbar - Bottom Fixed */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 xp-taskbar h-12 sm:h-10">
        <div className="flex items-center h-full px-2 gap-2">
          {/* Start Button - XP Style with Portal V */}
          <button
            className="xp-start-button flex items-center gap-2"
            onClick={() => setShowStartMenu(!showStartMenu)}
          >
            <span>{language === 'tr' ? 'Başlat' : 'Start'}</span>
          </button>

          {/* Quick Launch Buttons */}
          <div className="flex items-center gap-1 px-2 border-l border-white/20 relative">
            <button
              onClick={() => setShowBottomSearch(!showBottomSearch)}
              className="p-1.5 rounded hover:bg-white/10 transition-colors"
              title={t.search}
            >
              <Search className="w-4 h-4 text-white" />
            </button>
            <button
              onClick={() => setShowPersonalizationModal(true)}
              className="p-1.5 rounded hover:bg-white/10 transition-colors"
              title={t.personalFeed}
            >
              <span className="text-base">✨</span>
            </button>
            
            {/* Bottom Search Box - Opens Above Button */}
            {showBottomSearch && (
              <div 
                className="absolute bottom-full left-0 mb-2 xp-window overflow-hidden z-50"
                style={{
                  animation: 'slideInUp 0.2s ease-out',
                  width: '280px'
                }}
              >
                <div className="xp-title-bar">
                  <span className="text-white text-xs font-bold">{t.search}</span>
                </div>
                <div className="bg-white p-3">
                  <Input
                    type="text"
                    placeholder={t.searchPlaceholder}
                    value={searchQuery}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                    className="w-full xp-button text-sm"
                    autoFocus
                    style={{
                      fontFamily: 'Tahoma, sans-serif',
                      padding: '6px 12px',
                      border: '1px solid #003C74',
                      borderRadius: '3px'
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Taskbar Middle - Open Windows (News Feed) */}
          <div className="flex-1 flex items-center gap-2">
            <button
              onClick={() => setShowNewsCards(!showNewsCards)}
              className={`px-3 py-1 rounded border text-white text-xs font-bold flex items-center gap-2 transition-colors ${
                showNewsCards
                  ? 'bg-white/10 border-white/30 hover:bg-white/15'
                  : 'bg-white/20 border-white/40'
              }`}
              title={showNewsCards ? 'Hide News' : 'Show News'}
            >
              <div className="w-4 h-4 bg-white rounded-sm flex items-center justify-center">
                <span className="text-blue-600 text-xs">📰</span>
              </div>
              <span className="hidden sm:inline">VOLT - Crypto News</span>
            </button>
            {/* VoltMP Button */}
            <button
              onClick={() => {
                setShowWinamp(!showWinamp);
                if (!hasOpenedWinamp) {
                  setHasOpenedWinamp(true);
                }
              }}
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
            {/* Wallet Connection - USB Icon */}
            <WalletConnection language={language} />

            {/* Dark Mode Toggle */}
            <button
              onClick={toggleDarkMode}
              className="p-1 hover:bg-white/10 rounded transition-colors"
              title={darkMode ? t.lightMode : t.darkMode}
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

            {/* Refresh Button */}
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-1 hover:bg-white/10 rounded px-1.5 py-1 transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-white ${refreshing ? 'animate-spin' : ''}`} />
            </button>

            {/* Clock */}
            <div className="text-white text-xs font-bold px-2 border-l border-white/30">
              {lastUpdate.toLocaleTimeString(language === 'tr' ? 'tr-TR' : 'en-US', { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </div>
          </div>

          {/* Language Dropdown - XP Style */}
          {showLangDropdown && (
            <div 
              className="absolute right-4 top-full mt-2 xp-window overflow-hidden z-50"
              style={{
                animation: 'scaleIn 0.2s ease-out',
                width: '100px'
              }}
            >
              <div className="xp-title-bar">
                <span className="text-white text-xs font-bold">Language</span>
              </div>
              <div className="bg-white">
                <button
                  onClick={() => handleLanguageChange('tr')}
                  className={`w-full px-3 py-2 text-sm font-bold text-left transition-colors border-b border-gray-200 ${
                    language === 'tr'
                      ? 'bg-blue-200'
                      : 'hover:bg-blue-50'
                  }`}
                  style={{
                    fontFamily: 'Tahoma, sans-serif'
                  }}
                >
                  🇹🇷 TR
                </button>
                <button
                  onClick={() => handleLanguageChange('en')}
                  className={`w-full px-3 py-2 text-sm font-bold text-left transition-colors ${
                    language === 'en'
                      ? 'bg-blue-200'
                      : 'hover:bg-blue-50'
                  }`}
                  style={{
                    fontFamily: 'Tahoma, sans-serif'
                  }}
                >
                  🇬🇧 EN
                </button>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Top Bar - VOLT Logo & Actions */}
      <div className="sticky top-0 z-40 bg-gradient-to-b from-white/60 to-transparent backdrop-blur-sm border-b border-gray-200 pt-2 md:pt-0">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* VOLT Logo - Theme-Aware with Effects */}
            <div className="volt-logo-container cursor-pointer" onClick={() => router.push('/')}>
              <svg 
                width="200" 
                height="60" 
                viewBox="0 0 200 60" 
                xmlns="http://www.w3.org/2000/svg"
                className={`volt-logo transition-all duration-300 ${
                  !darkMode && logoShimmer ? 'logo-sparkle' : ''
                } ${
                  theme === 'vaporwave' ? 'logo-vaporwave' : ''
                } ${
                  theme === 'win95' ? 'logo-win95' : ''
                }`}
              >
                <defs>
                  {/* Theme-Based Gradients */}
                  <linearGradient id="voltGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    {theme === 'vaporwave' ? (
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
                  <filter id="subtleShadow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="0.5" result="blur"/>
                    <feOffset in="blur" dx="1" dy="1" result="offsetBlur"/>
                    <feMerge>
                      <feMergeNode in="offsetBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                  
                  {/* Light Mode Sparkle Effect */}
                  {!darkMode && (
                    <filter id="sparkleGlow" x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur stdDeviation="1.5" result="blur"/>
                      <feFlood floodColor="#FFD700" floodOpacity="0.6"/>
                      <feComposite in2="blur" operator="in"/>
                      <feMerge>
                        <feMergeNode/>
                        <feMergeNode in="SourceGraphic"/>
                      </feMerge>
                    </filter>
                  )}
                </defs>
                
                {/* Main VOLT Text - Bold & Clear with Border Pulse */}
                <text
                  x="100"
                  y="40"
                  fontSize="48"
                  fontWeight="900"
                  fontFamily="'SF Pro Display', system-ui, -apple-system, 'Segoe UI', sans-serif"
                  fill="url(#voltGradient)"
                  textAnchor="middle"
                  letterSpacing="3"
                  filter="url(#subtleShadow)"
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
                  fill={(theme === 'win95' || theme === 'xp') ? '#FFFFFF' : (darkMode ? '#A0A0A0' : '#666666')}
                  textAnchor="middle"
                  letterSpacing="1"
                  className="slogan-flip-transition"
                  key={currentSlogan}
                >
                  {speedSlogans[currentSlogan].toUpperCase()}
                </text>
              </svg>
            </div>

            {/* Right Actions - XP Style */}
            <div className="flex items-center gap-2">
              {/* Search Button */}
              <button
                onClick={() => setSearchOpen(!searchOpen)}
                className="xp-button flex items-center gap-2"
                title={t.search}
              >
                <Search className="w-4 h-4" />
              </button>
              
              {/* Theme Dropdown Button */}
              <div className="relative">
                <button
                  onClick={() => setShowThemeDropdown(!showThemeDropdown)}
                  className="xp-button flex items-center gap-2"
                  title="Tema Seç / Select Theme"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    {/* Minimalist Theme Icon - Circles */}
                    <circle cx="5" cy="5" r="2" fill="#666666" />
                    <circle cx="12" cy="5" r="2" fill="#888888" />
                    <circle cx="19" cy="5" r="2" fill="#AAAAAA" />
                    <circle cx="5" cy="12" r="2" fill="#888888" />
                    <circle cx="12" cy="12" r="2" fill="#666666" />
                    <circle cx="19" cy="12" r="2" fill="#888888" />
                    <circle cx="5" cy="19" r="2" fill="#AAAAAA" />
                    <circle cx="12" cy="19" r="2" fill="#888888" />
                    <circle cx="19" cy="19" r="2" fill="#666666" />
                  </svg>
                  <span className="hidden sm:inline">{language === 'tr' ? 'Tema' : 'Theme'}</span>
                </button>
                
                {/* Theme Dropdown Menu */}
                {showThemeDropdown && (
                  <div 
                    className="absolute right-0 top-full mt-2 xp-window overflow-hidden z-50"
                    style={{
                      animation: 'scaleIn 0.2s ease-out',
                      width: '200px'
                    }}
                  >
                    <div className="xp-title-bar">
                      <span className="text-white text-xs font-bold">Tema Seç</span>
                    </div>
                    <div className="bg-white">
                      <button
                        onClick={() => handleThemeChange('xp')}
                        className={`w-full px-3 py-2 text-sm font-bold text-left transition-colors border-b border-gray-200 flex items-center gap-2 ${
                          theme === 'xp' ? 'bg-blue-200' : 'hover:bg-blue-50'
                        }`}
                        style={{ fontFamily: 'Tahoma, sans-serif' }}
                      >
                        🪟 Windows XP
                      </button>
                      <button
                        onClick={() => handleThemeChange('win95')}
                        className={`w-full px-3 py-2 text-sm font-bold text-left transition-colors border-b border-gray-200 flex items-center gap-2 ${
                          theme === 'win95' ? 'bg-blue-200' : 'hover:bg-blue-50'
                        }`}
                        style={{ fontFamily: 'Tahoma, sans-serif' }}
                      >
                        🖥️ Windows 95
                      </button>
                      <button
                        onClick={() => handleThemeChange('vaporwave')}
                        className={`w-full px-3 py-2 text-sm font-bold text-left transition-colors flex items-center gap-2 ${
                          theme === 'vaporwave' ? 'bg-blue-200' : 'hover:bg-blue-50'
                        }`}
                        style={{ fontFamily: 'Tahoma, sans-serif' }}
                      >
                        🌸 Vaporwave Retro
                      </button>
                    </div>
                  </div>
                )}
              </div>
              {/* Search Input - XP Style */}
              {searchOpen && (
                <div className="flex items-center gap-2">
                  <Input
                    type="text"
                    placeholder={t.searchPlaceholder}
                    value={searchQuery}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                    className="w-56 xp-button text-sm"
                    autoFocus
                    style={{
                      fontFamily: 'Tahoma, sans-serif',
                      padding: '6px 12px',
                      border: '1px solid #003C74',
                      borderRadius: '3px'
                    }}
                  />
                  <button
                    onClick={() => {
                      setSearchOpen(false);
                      setSearchQuery('');
                    }}
                    className="xp-button"
                  >
                    {t.close}
                  </button>
                </div>
              )}

              {/* Saved News Button */}
              <button
                onClick={() => setShowSavedMenu(!showSavedMenu)}
                className="xp-button flex items-center gap-2 relative"
              >
                <Bookmark className="w-4 h-4" />
                <span className="hidden sm:inline">{t.savedNews}</span>
                {savedNews.size > 0 && (
                  <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                    {savedNews.size}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

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
                {t.savedNews}
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

      {/* Saved News - Vertical Right Sidebar */}
      {showSavedMenu && (
        <div className="fixed inset-0 z-[60] bg-black/30 backdrop-blur-sm" onClick={() => setShowSavedMenu(false)}>
          <div 
            className="fixed right-0 xp-window overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            style={{
              animation: 'slideInRight 0.3s ease-out',
              width: '340px',
              top: '0',
              bottom: '48px'
            }}
          >
            {/* XP Title Bar */}
            <div className="xp-title-bar">
              <div className="flex items-center gap-1.5">
                <Bookmark className="w-3.5 h-3.5 text-white" />
                <span className="text-white text-xs font-bold">{t.savedNews}</span>
              </div>
            </div>



            {/* Menu Content - Scrollable */}
            <div className="bg-white p-3 overflow-y-auto" style={{ height: 'calc(100% - 72px)' }}>
            {savedNews.size === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Bookmark className="w-12 h-12 text-gray-300 dark:text-white/40 mb-3" />
                <p className="text-gray-500 dark:text-white/60 text-sm text-center">
                  {t.noSavedNews}
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {(() => {
                    // Load saved news from localStorage first (for old news not in current feed)
                    const savedNewsMap = new Map<string, CryptoNews>();
                    
                    try {
                      const savedNewsData = localStorage.getItem('savedNewsData');
                      if (savedNewsData) {
                        const data = JSON.parse(savedNewsData) as Record<string, CryptoNews>;
                        Object.entries(data).forEach(([id, newsItem]) => {
                          if (savedNews.has(id)) {
                            savedNewsMap.set(id, newsItem);
                          }
                        });
                      }
                    } catch (error) {
                      console.error('Error loading saved news data:', error);
                    }
                    
                    // Add any saved news from current news feed (for newly saved items)
                    news.forEach(item => {
                      if (savedNews.has(item.id)) {
                        savedNewsMap.set(item.id, item);
                      }
                    });
                    
                    // Convert to array and sort by date (newest first)
                    let savedNewsArray = Array.from(savedNewsMap.values());
                    savedNewsArray = savedNewsArray.sort((a, b) => {
                      const dateA = new Date(a.publishedDate || 0).getTime();
                      const dateB = new Date(b.publishedDate || 0).getTime();
                      return dateB - dateA;
                    });
                    
                    const itemsPerPageSaved = 10;
                    const totalPagesSaved = Math.ceil(savedNewsArray.length / itemsPerPageSaved);
                    const startIndexSaved = (savedNewsPage - 1) * itemsPerPageSaved;
                    const endIndexSaved = startIndexSaved + itemsPerPageSaved;
                    const paginatedSavedNews = savedNewsArray.slice(startIndexSaved, endIndexSaved);
                    
                    return paginatedSavedNews.map((item) => {
                      const summary = translations[item.id]?.summary || item.title;
                      const sentiment = translations[item.id]?.sentiment;
                      
                      return (
                        <div
                          key={item.id}
                          className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-white/20 p-3 cursor-pointer hover:shadow-md hover:border-blue-300 dark:hover:border-blue-500 transition-all active:scale-[0.98] relative"
                          style={{
                            fontFamily: 'Tahoma, sans-serif'
                          }}
                        >
                          {/* Remove Button - X Icon */}
                          <button
                            onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleSave(item);
                            }}
                            className="absolute top-2 right-2 w-6 h-6 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center transition-all shadow-md z-10"
                            title={language === 'tr' ? 'Kayıtlılardan Çıkar' : 'Remove from Saved'}
                          >
                            <X className="w-3.5 h-3.5 text-white" />
                          </button>

                          <div
                            onClick={(e: React.MouseEvent<HTMLDivElement>) => {
                              e.preventDefault();
                              e.stopPropagation();
                              // Encode the URL to make it safe for routing
                              const encodedId = encodeURIComponent(item.id);
                              router.push(`/news/${encodedId}`);
                            }}
                          >
                            {/* Image - Small */}
                            {item.image && (
                              <div className="mb-2 rounded overflow-hidden">
                                <img
                                  src={item.image}
                                  alt={item.title}
                                  className="w-full h-24 object-cover"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                  }}
                                />
                              </div>
                            )}
                            
                            {/* Content */}
                            <div className="space-y-2">
                              {/* Sentiment Badge */}
                              {sentiment && (
                                <div className="flex items-center gap-2">
                                  {sentiment === 'positive' && (
                                    <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded text-xs font-bold">
                                      📈 Bullish
                                    </span>
                                  )}
                                  {sentiment === 'negative' && (
                                    <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded text-xs font-bold">
                                      📉 Bearish
                                    </span>
                                  )}
                                  {sentiment === 'neutral' && (
                                    <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded text-xs font-bold">
                                      ⚖️ Neutral
                                    </span>
                                  )}
                                </div>
                              )}
                              
                              {/* Title/Summary */}
                              <h3 className="text-sm font-bold text-gray-900 dark:text-white line-clamp-2">
                                {summary}
                              </h3>
                            </div>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
                
                {/* Pagination for Saved News */}
                {(() => {
                  const savedNewsArray = news.filter(item => savedNews.has(item.id));
                  const itemsPerPageSaved = 10;
                  const totalPagesSaved = Math.ceil(savedNewsArray.length / itemsPerPageSaved);
                  
                  if (totalPagesSaved > 1) {
                    return (
                      <div className="flex items-center justify-center gap-2 mt-6">
                        {/* Previous Button */}
                        <button
                          onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setSavedNewsPage(prev => Math.max(1, prev - 1));
                          }}
                          disabled={savedNewsPage === 1}
                          className="px-3 py-1.5 rounded-lg bg-white dark:bg-black border border-gray-200 dark:border-white/20 hover:bg-gray-50 dark:hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                          <ChevronLeft className="w-4 h-4 text-gray-700 dark:text-white" />
                        </button>

                        {/* Page Numbers - Show only 3 */}
                        <div className="flex items-center gap-1">
                          {(() => {
                            const pages: React.JSX.Element[] = [];
                            let startPage = Math.max(1, savedNewsPage - 1);
                            let endPage = Math.min(totalPagesSaved, startPage + 2);
                            
                            if (endPage - startPage < 2) {
                              startPage = Math.max(1, endPage - 2);
                            }
                            
                            // Show page 1 button if not in range
                            if (startPage > 1) {
                              pages.push(
                                <button
                                  key={1}
                                  onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setSavedNewsPage(1);
                                  }}
                                  className="min-w-[32px] h-8 px-2 rounded-lg font-medium text-xs transition-all bg-white dark:bg-black border border-gray-200 dark:border-white/20 text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-white/5"
                                >
                                  1
                                </button>
                              );
                              
                              // Show ellipsis after page 1
                              if (startPage > 2) {
                                pages.push(
                                  <span key="start-ellipsis" className="px-2 text-gray-400 dark:text-gray-600 text-xs">
                                    •••
                                  </span>
                                );
                              }
                            }
                            
                            for (let page = startPage; page <= endPage; page++) {
                              const pageNum = page;
                              pages.push(
                                <button
                                  key={page}
                                  onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setSavedNewsPage(pageNum);
                                  }}
                                  className={`
                                    min-w-[32px] h-8 px-2 rounded-lg font-medium text-xs transition-all
                                    ${savedNewsPage === page
                                      ? 'bg-blue-600 text-white shadow-lg'
                                      : 'bg-white dark:bg-black border border-gray-200 dark:border-white/20 text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-white/5'
                                    }
                                  `}
                                >
                                  {page}
                                </button>
                              );
                            }
                            
                            // Show ellipsis before last page
                            if (endPage < totalPagesSaved - 1) {
                              pages.push(
                                <span key="end-ellipsis" className="px-2 text-gray-400 dark:text-gray-600 text-xs">
                                  •••
                                </span>
                              );
                            }
                            
                            // Show last page button if not in range
                            if (endPage < totalPagesSaved) {
                              pages.push(
                                <button
                                  key={totalPagesSaved}
                                  onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setSavedNewsPage(totalPagesSaved);
                                  }}
                                  className="min-w-[32px] h-8 px-2 rounded-lg font-medium text-xs transition-all bg-white dark:bg-black border border-gray-200 dark:border-white/20 text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-white/5"
                                >
                                  {totalPagesSaved}
                                </button>
                              );
                            }
                            
                            return pages;
                          })()}
                        </div>

                        {/* Next Button */}
                        <button
                          onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setSavedNewsPage(prev => Math.min(totalPagesSaved, prev + 1));
                          }}
                          disabled={savedNewsPage === totalPagesSaved}
                          className="px-3 py-1.5 rounded-lg bg-white dark:bg-black border border-gray-200 dark:border-white/20 hover:bg-gray-50 dark:hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                          <ChevronRight className="w-4 h-4 text-gray-700 dark:text-white" />
                        </button>
                      </div>
                    );
                  }
                  return null;
                })()}
              </>
            )}
            </div>
          </div>
        </div>
      )}

      {/* Beautiful Full Moon - Dark Mode Only */}
      {darkMode && (
        <div className="fixed top-16 right-12 z-10 pointer-events-none">
          <svg width="140" height="140" viewBox="0 0 140 140" xmlns="http://www.w3.org/2000/svg">
            <defs>
              {/* Enhanced Glow Effect */}
              <filter id="moonGlow" x="-150%" y="-150%" width="400%" height="400%">
                <feGaussianBlur stdDeviation="8" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
              {/* Radiant Moon Gradient */}
              <radialGradient id="moonGradient" cx="45%" cy="45%">
                <stop offset="0%" stopColor="#FFFACD" />
                <stop offset="30%" stopColor="#FFF8DC" />
                <stop offset="50%" stopColor="#FFE4B5" />
                <stop offset="75%" stopColor="#F4D03F" />
                <stop offset="100%" stopColor="#DAA520" />
              </radialGradient>
              {/* Crater Shadow Gradient */}
              <radialGradient id="craterGradient">
                <stop offset="0%" stopColor="#C5A028" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#8B7355" stopOpacity="0.3" />
              </radialGradient>
            </defs>
            
            {/* Outer Halo - Largest */}
            <circle cx="70" cy="70" r="60" fill="url(#moonGradient)" filter="url(#moonGlow)" opacity="0.08" />
            
            {/* Middle Halo */}
            <circle cx="70" cy="70" r="48" fill="url(#moonGradient)" filter="url(#moonGlow)" opacity="0.15" />
            
            {/* Inner Glow */}
            <circle cx="70" cy="70" r="40" fill="url(#moonGradient)" filter="url(#moonGlow)" opacity="0.25" />
            
            {/* Main Moon Body - Full Circle */}
            <circle cx="70" cy="70" r="35" fill="url(#moonGradient)" filter="url(#moonGlow)" opacity="1" />
            
            {/* Large Craters - More Prominent */}
            <circle cx="60" cy="60" r="6" fill="url(#craterGradient)" opacity="0.4" />
            <circle cx="75" cy="65" r="5" fill="url(#craterGradient)" opacity="0.35" />
            <circle cx="65" cy="78" r="4.5" fill="url(#craterGradient)" opacity="0.38" />
            <circle cx="80" cy="75" r="3.5" fill="url(#craterGradient)" opacity="0.3" />
            <circle cx="58" cy="72" r="3" fill="url(#craterGradient)" opacity="0.32" />
            
            {/* Medium Craters */}
            <circle cx="70" cy="55" r="2.5" fill="#C5A028" opacity="0.25" />
            <circle cx="85" cy="68" r="2" fill="#B8941F" opacity="0.3" />
            <circle cx="55" cy="68" r="2.2" fill="#D4AF37" opacity="0.28" />
            <circle cx="73" cy="82" r="2.8" fill="#C5A028" opacity="0.25" />
            
            {/* Small Crater Details */}
            <circle cx="67" cy="63" r="1.5" fill="#B8941F" opacity="0.35" />
            <circle cx="78" cy="60" r="1.3" fill="#C5A028" opacity="0.3" />
            <circle cx="62" cy="75" r="1.2" fill="#D4AF37" opacity="0.32" />
            <circle cx="82" cy="72" r="1" fill="#B8941F" opacity="0.28" />
            
            {/* Tiny Surface Details */}
            <circle cx="72" cy="70" r="0.8" fill="#FFFACD" opacity="0.2" />
            <circle cx="65" cy="67" r="0.7" fill="#FFF8DC" opacity="0.18" />
            <circle cx="76" cy="73" r="0.6" fill="#FFE4B5" opacity="0.15" />
          </svg>
        </div>
      )}

      {/* Main Content - With XP Window Chrome */}
      <main className={`max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 pb-20 sm:pb-16 transition-opacity duration-300 ${
        showNewsCards ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}>
        {/* Crypto Ticker - Full Width */}
        <div className="mb-6">
          <LiveCryptoTicker 
            hiddenNews={hiddenNews}
            onRestoreNews={handleRestoreNews}
            allNews={news}
            language={language}
          />
        </div>

        {/* Sentiment Bar - Theme-Aware */}
        <div className="mb-4">
          <div className="sentiment-bar-container relative h-3 overflow-hidden">
            {/* Green Section (Positive) */}
            <div 
              className="sentiment-bar-positive absolute left-0 top-0 bottom-0 transition-all duration-700 ease-out"
              style={{ width: `${positivePercentage}%` }}
            />
            {/* Red Section (Negative) */}
            <div 
              className="sentiment-bar-negative absolute right-0 top-0 bottom-0 transition-all duration-700 ease-out"
              style={{ width: `${100 - positivePercentage}%` }}
            />
            {/* Indicator Line */}
            <div 
              className="sentiment-bar-indicator absolute top-0 bottom-0 transition-all duration-700 z-10"
              style={{ left: `${positivePercentage}%` }}
            />
          </div>
          {/* Last Update Time */}
          <div className="flex items-center justify-end gap-1.5 text-xs opacity-70 mt-2">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-gray-600 dark:text-gray-400">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13h-1v6l5.25 3.15.75-1.23-4.5-2.7V7z"/>
            </svg>
            <span
              className="text-gray-600 dark:text-gray-400"
              style={{
                fontFamily: '-apple-system, SF Pro Text, system-ui, sans-serif'
              }}
            >
              {lastUpdate.toLocaleTimeString(language === 'tr' ? 'tr-TR' : 'en-US', { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </span>
          </div>
        </div>

        {/* News Grid */}
        {loading && news.length === 0 ? (
          // Skeleton Loaders
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <SkeletonCard variant="compact" />
            <SkeletonCard variant="compact" />
            <SkeletonCard variant="compact" />
            <SkeletonCard variant="compact" />
            <SkeletonCard variant="compact" />
            <SkeletonCard variant="compact" />
          </div>
        ) : news.length === 0 ? (
          // Empty State
          <div 
            className="flex flex-col items-center justify-center py-16 bg-white dark:bg-black dark:border dark:border-white/20 rounded-xl"
            style={{
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
            }}
          >
            <div className="w-12 h-12 bg-gray-100 dark:bg-black dark:border dark:border-white/20 rounded-full flex items-center justify-center mb-3">
              <RefreshCw className="w-6 h-6 text-gray-400" />
            </div>
            <h3 
              className="text-lg font-semibold text-gray-900 dark:text-white mb-1"
              style={{
                fontFamily: '-apple-system, SF Pro Display, system-ui, sans-serif'
              }}
            >
              {t.noConnection}
            </h3>
            <p 
              className="text-sm text-gray-600 dark:text-gray-400 mb-4"
              style={{
                fontFamily: '-apple-system, SF Pro Text, system-ui, sans-serif'
              }}
            >
              {t.tryAgain}
            </p>
            <button
              onClick={handleRefresh}
              className="px-5 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 active:scale-95 transition-all"
              style={{
                fontFamily: '-apple-system, SF Pro Text, system-ui, sans-serif'
              }}
            >
              {t.retry}
            </button>
          </div>
        ) : (
          <>
            {/* Son Dakika Haberi - Fire Variant (First page only, outside masonry) */}
            {currentPage === 1 && paginatedNews.length > 0 && (
              <div className="mb-4">
                <NewsCard
                  news={paginatedNews[0]}
                  summary={translations[paginatedNews[0].id]?.summary}
                  sentiment={translations[paginatedNews[0].id]?.sentiment}
                  onShare={handleShare}
                  isSharing={isSharing && sharingId === paginatedNews[0].id}
                  variant="fire"
                  isSaved={savedNews.has(paginatedNews[0].id)}
                  onSave={handleSave}
                  onHide={handleHideNews}
                  language={language}
                />
              </div>
            )}

            {/* Normal Haberler - Masonry Layout */}
            <div 
              className="masonry-container"
              style={{
                columnCount: 1,
                columnGap: '16px',
              }}
            >
              {paginatedNews
                .slice(currentPage === 1 ? 1 : 0) // Skip first item on page 1 (fire variant already shown)
                .map((item: CryptoNews) => {
                  return (
                    <div 
                      key={item.id}
                      className="masonry-item"
                      style={{
                        breakInside: 'avoid',
                        marginBottom: '16px',
                        display: 'inline-block',
                        width: '100%'
                      }}
                    >
                      <NewsCard
                        news={item}
                        summary={translations[item.id]?.summary}
                        sentiment={translations[item.id]?.sentiment}
                        onShare={handleShare}
                        isSharing={isSharing && sharingId === item.id}
                        variant="compact"
                        isSaved={savedNews.has(item.id)}
                        onSave={handleSave}
                        onHide={handleHideNews}
                        language={language}
                      />
                    </div>
                  );
                })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                {/* Previous Button */}
                <button
                  onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                    e.preventDefault();
                    setCurrentPage(prev => Math.max(1, prev - 1));
                  }}
                  disabled={currentPage === 1}
                  className="px-4 py-2 rounded-lg bg-white dark:bg-black border border-gray-200 dark:border-white/20 hover:bg-gray-50 dark:hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  aria-label={t.previousPage}
                >
                  <ChevronLeft className="w-5 h-5 text-gray-700 dark:text-white" />
                </button>

                {/* Page Numbers - Show only 3 pages at a time */}
                <div className="flex items-center gap-1">
                  {(() => {
                    const pages: React.JSX.Element[] = [];
                    
                    // Determine which 3 pages to show
                    let startPage = Math.max(1, currentPage - 1);
                    let endPage = Math.min(totalPages, startPage + 2);
                    
                    // Adjust if we're near the end
                    if (endPage - startPage < 2) {
                      startPage = Math.max(1, endPage - 2);
                    }
                    
                    // Show page 1 button if not in range
                    if (startPage > 1) {
                      pages.push(
                        <button
                          key={1}
                          onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                            e.preventDefault();
                            setCurrentPage(1);
                          }}
                          className="min-w-[40px] h-10 px-3 rounded-lg font-medium text-sm transition-all bg-white dark:bg-black border border-gray-200 dark:border-white/20 text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-white/5"
                          style={{
                            fontFamily: '-apple-system, SF Pro Text, system-ui, sans-serif'
                          }}
                        >
                          1
                        </button>
                      );
                      
                      // Show ellipsis after page 1
                      if (startPage > 2) {
                        pages.push(
                          <span key="start-ellipsis" className="px-2 text-gray-400 dark:text-gray-600">
                            •••
                          </span>
                        );
                      }
                    }
                    
                    // Show the 3 page buttons
                    for (let page = startPage; page <= endPage; page++) {
                      const pageNum = page; // Capture page value for closure
                      pages.push(
                        <button
                          key={page}
                          onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                            e.preventDefault();
                            setCurrentPage(pageNum);
                          }}
                          className={`
                            min-w-[40px] h-10 px-3 rounded-lg font-medium text-sm transition-all
                            ${currentPage === page
                              ? 'bg-blue-600 text-white shadow-lg'
                              : 'bg-white dark:bg-black border border-gray-200 dark:border-white/20 text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-white/5'
                            }
                          `}
                          style={{
                            fontFamily: '-apple-system, SF Pro Text, system-ui, sans-serif'
                          }}
                        >
                          {page}
                        </button>
                      );
                    }
                    
                    // Show ellipsis before last page
                    if (endPage < totalPages - 1) {
                      pages.push(
                        <span key="end-ellipsis" className="px-2 text-gray-400 dark:text-gray-600">
                          •••
                        </span>
                      );
                    }
                    
                    // Show last page button if not in range
                    if (endPage < totalPages) {
                      pages.push(
                        <button
                          key={totalPages}
                          onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                            e.preventDefault();
                            setCurrentPage(totalPages);
                          }}
                          className="min-w-[40px] h-10 px-3 rounded-lg font-medium text-sm transition-all bg-white dark:bg-black border border-gray-200 dark:border-white/20 text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-white/5"
                          style={{
                            fontFamily: '-apple-system, SF Pro Text, system-ui, sans-serif'
                          }}
                        >
                          {totalPages}
                        </button>
                      );
                    }
                    
                    return pages;
                  })()}
                </div>

                {/* Next Button */}
                <button
                  onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                    e.preventDefault();
                    setCurrentPage(prev => Math.min(totalPages, prev + 1));
                  }}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 rounded-lg bg-white dark:bg-black border border-gray-200 dark:border-white/20 hover:bg-gray-50 dark:hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  aria-label={t.nextPage}
                >
                  <ChevronRight className="w-5 h-5 text-gray-700 dark:text-white" />
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {}
      {/* Desktop Icons - Fixed Bottom Left */}
      <div className="fixed left-4 bottom-16 z-20 flex flex-col gap-2">
        {/* VoltMP Player */}
        <button
          onClick={() => {
            setShowWinamp(!showWinamp);
            if (!hasOpenedWinamp) {
              setHasOpenedWinamp(true);
            }
          }}
          className="flex flex-col items-center group hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg p-2 transition-all active:bg-blue-200 dark:active:bg-blue-800/40"
          title="VoltMP"
          style={{
            minWidth: '80px'
          }}
        >
          <div className="relative mb-1">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                {/* Theme-aware gradient */}
                <linearGradient id={`winampGradient-${theme}`} x1="0%" y1="0%" x2="100%" y2="100%">
                  {theme === 'vaporwave' ? (
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
                      <stop offset="0%" stopColor="#FF6B00" />
                      <stop offset="50%" stopColor="#FF8500" />
                      <stop offset="100%" stopColor="#FFA500" />
                    </>
                  )}
                </linearGradient>
                <filter id={`winampGlow-${theme}`} x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="2" result="blur"/>
                  <feFlood 
                    floodColor={theme === 'vaporwave' ? '#FF6FD8' : theme === 'win95' ? '#008080' : '#FF8500'} 
                    floodOpacity="0.5"
                  />
                  <feComposite in2="blur" operator="in"/>
                  <feMerge>
                    <feMergeNode/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>
              {/* Original VoltMP Lightning Bolt Logo */}
              <path 
                d="M28 8 L16 24 L22 24 L18 40 L32 20 L26 20 L28 8 Z" 
                fill={`url(#winampGradient-${theme})`} 
                stroke={theme === 'vaporwave' ? '#00D9FF' : theme === 'win95' ? '#00C0C0' : '#FFD700'} 
                strokeWidth="1.5" 
                filter={`url(#winampGlow-${theme})`}
              />
              {/* Sound Waves */}
              <circle cx="12" cy="18" r="2" fill={theme === 'vaporwave' ? '#00D9FF' : theme === 'win95' ? '#00C0C0' : '#FFD700'} opacity="0.6"/>
              <circle cx="10" cy="24" r="1.5" fill={theme === 'vaporwave' ? '#00D9FF' : theme === 'win95' ? '#00C0C0' : '#FFD700'} opacity="0.5"/>
              <circle cx="36" cy="18" r="2" fill={theme === 'vaporwave' ? '#00D9FF' : theme === 'win95' ? '#00C0C0' : '#FFD700'} opacity="0.6"/>
              <circle cx="38" cy="24" r="1.5" fill={theme === 'vaporwave' ? '#00D9FF' : theme === 'win95' ? '#00C0C0' : '#FFD700'} opacity="0.5"/>
            </svg>
          </div>
          <span 
            className="text-xs font-bold text-center"
            style={{
              fontFamily: 'Tahoma, sans-serif',
              color: darkMode ? '#FFFFFF' : '#111827',
              textShadow: darkMode ? '1px 1px 2px rgba(0, 0, 0, 0.8)' : '1px 1px 2px rgba(255, 255, 255, 0.8)'
            }}
          >
            VoltMP
          </span>
        </button>

        {/* Recycle Bin */}
        <button
          onClick={() => setShowTrashModal(true)}
          className="flex flex-col items-center group hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg p-2 transition-all active:bg-blue-200 dark:active:bg-blue-800/40"
          title="Çöp Kutusu"
          style={{
            minWidth: '80px'
          }}
        >
          <div className="relative mb-1">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="binGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#E8E8E8" />
                  <stop offset="50%" stopColor="#C0C0C0" />
                  <stop offset="100%" stopColor="#A0A0A0" />
                </linearGradient>
                <linearGradient id="lidGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#D0D0D0" />
                  <stop offset="100%" stopColor="#909090" />
                </linearGradient>
              </defs>
              {/* Main Bin Body */}
              <path d="M13 16 L11 42 C11 43.1 11.9 44 13 44 L35 44 C36.1 44 37 43.1 37 42 L35 16 Z" fill="url(#binGradient)" stroke="#707070" strokeWidth="1.5"/>
              {/* Bin Rim */}
              <rect x="10" y="14" width="28" height="3" rx="1" fill="url(#lidGradient)" stroke="#606060" strokeWidth="1"/>
              {/* Lid Handle */}
              <path d="M18 8 C18 6 20 5 24 5 C28 5 30 6 30 8 L30 14 L18 14 Z" fill="url(#lidGradient)" stroke="#505050" strokeWidth="1.5"/>
              {/* Vertical Lines */}
              <line x1="19" y1="20" x2="18" y2="38" stroke="#909090" strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="24" y1="20" x2="23.5" y2="38" stroke="#909090" strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="29" y1="20" x2="29" y2="38" stroke="#909090" strokeWidth="1.5" strokeLinecap="round"/>
              {/* Highlights */}
              <ellipse cx="15" cy="20" rx="2" ry="1" fill="white" opacity="0.4"/>
              <ellipse cx="33" cy="20" rx="2" ry="1" fill="white" opacity="0.4"/>
              {/* Shadow */}
              <ellipse cx="24" cy="44.5" rx="13" ry="1.5" fill="black" opacity="0.15"/>
            </svg>
            {hiddenNews.size > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold shadow-lg">
                {hiddenNews.size}
              </span>
            )}
          </div>
          <span 
            className="text-xs font-bold text-center"
            style={{
              fontFamily: 'Tahoma, sans-serif',
              color: darkMode ? '#FFFFFF' : '#111827',
              textShadow: darkMode ? '1px 1px 2px rgba(0, 0, 0, 0.8)' : '1px 1px 2px rgba(255, 255, 255, 0.8)'
            }}
          >
            {language === 'tr' ? 'Çöp Kutusu' : 'Recycle Bin'}
          </span>
        </button>
      </div>

      {/* VoltMP Player - Only load when first opened (lazy loading) */}
      {hasOpenedWinamp && (
        <WinampPlayer 
          isOpen={showWinamp} 
          onClose={() => setShowWinamp(false)}
          theme={theme}
        />
      )}

      {/* Trash Modal - Hidden News */}
      {showTrashModal && (
        <div className="fixed inset-0 z-[70] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div 
            className="xp-window max-w-2xl w-full max-h-[80vh] overflow-hidden"
            style={{
              animation: 'scaleIn 0.3s ease-out'
            }}
          >
            {/* XP Title Bar */}
            <div className="xp-title-bar">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-white rounded-sm flex items-center justify-center">
                  <Trash2 className="w-3 h-3 text-gray-700" />
                </div>
                <span className="text-white text-sm font-bold">{language === 'tr' ? 'Çöp Kutusu - Kapatılan Haberler' : 'Recycle Bin - Hidden News'}</span>
              </div>
              <button className="xp-control-btn xp-close-btn" onClick={() => setShowTrashModal(false)}>
                <X className="w-3 h-3 text-white" />
              </button>
            </div>

            {/* Content */}
            <div className="bg-white p-6 max-h-[60vh] overflow-y-auto">
              {hiddenNews.size === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Trash2 className="w-12 h-12 text-gray-300 mb-3" />
                  <p className="text-gray-500 text-sm text-center">
                    {language === 'tr' ? 'Çöp kutusu boş' : 'Recycle bin is empty'}
                  </p>
                </div>
              ) : (
                <>
                  {/* Clear Trash Button */}
                  <div className="mb-4">
                    <button
                      onClick={() => {
                        setHiddenNews(new Map());
                        setShowTrashModal(false);
                      }}
                      className="w-full px-4 py-2.5 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-lg transition-all shadow-sm hover:shadow-md active:scale-95"
                      style={{
                        fontFamily: '-apple-system, SF Pro Text, system-ui, sans-serif'
                      }}
                    >
                      🗑️ {language === 'tr' ? 'Çöp Kutusunu Temizle' : 'Empty Recycle Bin'}
                    </button>
                  </div>
                  <div className="space-y-3">
                    {Array.from(hiddenNews.entries()).map(([newsId, newsData]) => {
                    const newsItem = news.find(item => item.id === newsId);
                    if (!newsItem) return null;
                    
                    return (
                      <div 
                        key={newsId}
                        className="bg-gray-50 rounded-lg p-4 flex items-center justify-between group hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex-1">
                          <h3 className="text-sm font-semibold text-gray-900 mb-1">
                            {newsData.summary}
                          </h3>
                          {newsItem.publishedDate && (
                            <p className="text-xs text-gray-500">
                              {new Date(newsItem.publishedDate).toLocaleDateString(newsData.language === 'tr' ? 'tr-TR' : 'en-US', { 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric' 
                              })}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => {
                            handleRestoreNews(newsId);
                          }}
                          className="xp-button-green px-3 py-2 ml-4"
                          title={language === 'tr' ? 'Geri Getir' : 'Restore'}
                        >
                          ↩️ {language === 'tr' ? 'Geri Getir' : 'Restore'}
                        </button>
                      </div>
                    );
                  })}</div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Share Dialog - Central Modal */}
      {shareDialogNews && (
        <ShareDialog
          isOpen={true}
          onClose={() => setShareDialogNews(null)}
          news={shareDialogNews}
          summary={translations[shareDialogNews.id]?.summary}
        />
      )}



      {/* Personalization Modal - XP Style */}
      {showPersonalizationModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm" onClick={() => setShowPersonalizationModal(false)}>
          <div 
            className="xp-window max-w-2xl w-full max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            style={{
              animation: 'scaleIn 0.3s ease-out'
            }}
          >
            {/* XP Title Bar */}
            <div className="xp-title-bar">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-white rounded-sm flex items-center justify-center">
                  <span className="text-base">✨</span>
                </div>
                <span className="text-white text-sm font-bold">{t.personalFeed}</span>
              </div>
              <button className="xp-control-btn xp-close-btn" onClick={() => setShowPersonalizationModal(false)}>
                <X className="w-3 h-3 text-white" />
              </button>
            </div>
            
            {/* Modal Content - XP Window Body */}
            <div className="bg-white overflow-y-auto max-h-[calc(90vh-32px)] p-6">
              <PersonalizationFeed 
                onTopicFollow={handleTopicFollow} 
                onClose={() => setShowPersonalizationModal(false)}
              />
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        
        @keyframes shimmer {
          0%, 100% {
            filter: brightness(1);
          }
          50% {
            filter: brightness(1.2);
          }
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
        
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(100%);
          }
          to {
            opacity: 1;
            transform: translateX(0);
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

        /* Masonry Layout - Responsive */
        @media (max-width: 640px) {
          .masonry-container {
            column-count: 1 !important;
          }
        }

        @media (min-width: 641px) and (max-width: 1024px) {
          .masonry-container {
            column-count: 2 !important;
          }
        }

        @media (min-width: 1025px) {
          .masonry-container {
            column-count: 3 !important;
          }
        }

        /* Mobile Taskbar Visibility */
        @media (max-width: 640px) {
          .xp-taskbar {
            display: flex !important;
            visibility: visible !important;
          }
          .xp-start-button span {
            display: none;
          }
          .xp-system-tray > * {
            font-size: 10px;
          }
        }

        /* Prevent overflow on mobile */
        @media (max-width: 640px) {
          body {
            overflow-x: hidden;
          }
          .masonry-item {
            width: 100% !important;
            max-width: 100% !important;
          }
        }
      `}</style>
    </div>
  );
}
