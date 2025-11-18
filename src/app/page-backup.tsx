'use client';

import type React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';
import { fetchCryptoNews, type CryptoNews } from '../lib/news-service';
import { summarizeAndTranslate } from '../lib/translation-service';
import { EnhancedNewsCard } from '../components/enhanced-news-card';
import { SkeletonCard } from '../components/skeleton-card';
import { useFarcasterShare } from '../components/farcaster-share';
import { HeroCarousel } from '../components/hero-carousel';
import { PullToRefresh } from '../components/pull-to-refresh';
import { BottomNavigation } from '../components/bottom-navigation';
import { LiveCryptoTicker } from '../components/live-crypto-ticker';
import { PersonalizationFeed } from '../components/personalization-feed';
import { GamificationBadge } from '../components/gamification-badge';
import { InfiniteScroll } from '../components/infinite-scroll';
import { SegmentedControl } from '../components/segmented-control';
import { RefreshCw, Search, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { X } from 'lucide-react';

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
  const [viewMode, setViewMode] = useState<string>('Haberler');
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [displayedNews, setDisplayedNews] = useState<number>(20);
  const [countdown, setCountdown] = useState<number>(60);

  const loadNews = useCallback(async (isRefresh = false): Promise<void> => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const fetchedNews = await fetchCryptoNews();
      setNews(fetchedNews);
      setLastUpdate(new Date());

      // Load cached translations from localStorage
      const cachedTranslations: Record<string, TranslatedNews> = {};
      try {
        const cached = localStorage.getItem('newsTranslations');
        if (cached) {
          Object.assign(cachedTranslations, JSON.parse(cached));
        }
      } catch (error) {
        console.error('Error loading cached translations:', error);
      }

      // Start summarizing and translating in background
      if (fetchedNews.length > 0) {
        setTranslations(cachedTranslations);
        
        const newsToTranslate = fetchedNews.filter(item => !cachedTranslations[item.id]);
        
        if (newsToTranslate.length > 0) {
          // Translate in background without blocking UI
          Promise.all(
            newsToTranslate.map(async (item): Promise<[string, TranslatedNews]> => {
              const result = await summarizeAndTranslate(item.title, item.text);
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
            const allTranslations = { ...cachedTranslations, ...newTranslations };
            
            setTranslations(allTranslations);
            
            // Save to localStorage
            try {
              localStorage.setItem('newsTranslations', JSON.stringify(allTranslations));
            } catch (error) {
              console.error('Error saving translations to cache:', error);
            }
          }).catch(error => {
            console.error('Error translating news:', error);
          });
        }
      }
    } catch (error) {
      console.error('Error loading news:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    // Initial load
    loadNews();

    // Auto-refresh every 1 minute
    const refreshInterval = setInterval(() => {
      loadNews(true);
      setCountdown(60); // Reset countdown
    }, 60 * 1000);

    // Countdown timer - updates every second
    const countdownInterval = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 60));
    }, 1000);

    // Mark app as ready for Farcaster
    sdk.actions.ready();

    return () => {
      clearInterval(refreshInterval);
      clearInterval(countdownInterval);
    };
  }, [loadNews]);

  const handleShare = async (newsItem: CryptoNews): Promise<void> => {
    setSharingId(newsItem.id);
    const summary = translations[newsItem.id]?.summary || newsItem.title;
    await shareNews(newsItem, summary);
    setSharingId(null);
  };

  const handleRefresh = async (): Promise<void> => {
    await loadNews(true);
    setCountdown(60); // Reset countdown on manual refresh
  };

  const handleLoadMore = async (): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    setDisplayedNews(prev => prev + 20);
    if (displayedNews >= news.length) {
      setHasMore(false);
    }
  };

  const handleTopicFollow = (topic: string): void => {
    console.log('Following topic:', topic);
    // Topic filtering logic can be added here
  };

  // Count sentiments
  const positiveCount = Object.values(translations).filter(t => t.sentiment === 'positive').length;
  const negativeCount = Object.values(translations).filter(t => t.sentiment === 'negative').length;

  // Search filtering
  const filteredNews = searchQuery.trim()
    ? news.filter((item) => {
        const query = searchQuery.toLowerCase();
        const title = item.title.toLowerCase();
        const summary = translations[item.id]?.summary?.toLowerCase() || '';
        const text = item.text?.toLowerCase() || '';
        return title.includes(query) || summary.includes(query) || text.includes(query);
      })
    : news;

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="min-h-screen bg-gray-50 dark:bg-black pb-20 md:pb-0">
        {/* Top Navigation Bar - Apple Style */}
        <nav 
          className="sticky top-0 z-50 backdrop-blur-xl border-b pt-12 md:pt-0"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            borderColor: 'rgba(0, 0, 0, 0.1)'
          }}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16 gap-3">
              {/* Left Side - Logo or Search Input */}
              <div className="flex items-center gap-3 flex-1">
                {searchOpen ? (
                  // Search Mode - Input on the left
                  <div className="flex items-center gap-2 flex-1 max-w-md">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        type="text"
                        placeholder="Haber ara..."
                        value={searchQuery}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                        className="pl-10 h-10 text-sm bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm"
                        autoFocus
                        style={{
                          fontFamily: '-apple-system, SF Pro Text, system-ui, sans-serif'
                        }}
                      />
                    </div>
                    <button
                      onClick={() => {
                        setSearchOpen(false);
                        setSearchQuery('');
                      }}
                      className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                      aria-label="Kapat"
                    >
                      <X className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                    </button>
                  </div>
                ) : (
                  // Normal Mode - Logo
                  <h1 className="retro-logo">
                    Fast
                  </h1>
                )}
              </div>

              {/* Right Actions */}
              <div className="flex items-center gap-3">
                {/* Search Button - Only show when not in search mode */}
                {!searchOpen && (
                  <button
                    onClick={() => setSearchOpen(true)}
                    className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    aria-label="Ara"
                  >
                    <Search className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                  </button>
                )}
                {/* Countdown Timer */}
                <div 
                  className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800"
                  style={{
                    fontFamily: '-apple-system, SF Pro Text, system-ui, sans-serif'
                  }}
                >
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    {countdown}s
                  </span>
                </div>
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  aria-label="Yenile"
                >
                  <RefreshCw className={`w-5 h-5 text-gray-700 dark:text-gray-300 ${refreshing ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Gamification Badge */}
          <GamificationBadge />

          {/* View Mode Selector */}
          <div className="flex items-center justify-between mb-6">
            <SegmentedControl
              options={['Haberler', 'Piyasalar', 'Kişisel']}
              selected={viewMode}
              onChange={setViewMode}
            />
            <button
              className="p-2 rounded-xl bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border border-gray-200 dark:border-gray-700"
              aria-label="Filtrele"
            >
              <Filter className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            </button>
          </div>

          {/* Live Crypto Ticker */}
          <LiveCryptoTicker />

          {/* Personalization Feed */}
          {viewMode === 'Kişisel' && <PersonalizationFeed onTopicFollow={handleTopicFollow} />}

          {/* Hero Carousel */}
          {viewMode === 'Haberler' && news.length > 0 && (
            <HeroCarousel news={news} translations={translations} onShare={handleShare} />
          )}

          {/* Stats Bar - Only for news view */}
          {viewMode === 'Haberler' && (
            <div className="stats-bar-apple rounded-2xl p-5 mb-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <span 
                    className="text-sm font-semibold"
                    style={{
                      color: '#30d158',
                      fontFamily: '-apple-system, SF Pro Text, system-ui, sans-serif'
                    }}
                  >
                    +{positiveCount} Pozitif
                  </span>
                  <span className="text-gray-400 dark:text-gray-600 opacity-50">•</span>
                  <span 
                    className="text-sm font-semibold"
                    style={{
                      color: '#ff453a',
                      fontFamily: '-apple-system, SF Pro Text, system-ui, sans-serif'
                    }}
                  >
                    -{negativeCount} Negatif
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm opacity-70">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-gray-600 dark:text-gray-400">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13h-1v6l5.25 3.15.75-1.23-4.5-2.7V7z"/>
                  </svg>
                  <span
                    className="text-gray-600 dark:text-gray-400"
                    style={{
                      fontFamily: '-apple-system, SF Pro Text, system-ui, sans-serif'
                    }}
                  >
                    {lastUpdate.toLocaleTimeString('tr-TR', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* News Grid */}
          {loading && news.length === 0 ? (
            // Skeleton Loaders
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <SkeletonCard variant="hero" />
              <SkeletonCard variant="medium" />
              <SkeletonCard variant="medium" />
              <SkeletonCard variant="compact" />
              <SkeletonCard variant="compact" />
              <SkeletonCard variant="compact" />
            </div>
          ) : news.length === 0 ? (
            // Empty State
            <div 
              className="flex flex-col items-center justify-center py-20 bg-white dark:bg-gray-900 rounded-2xl"
              style={{
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
              }}
            >
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                <RefreshCw className="w-8 h-8 text-gray-400" />
              </div>
              <h3 
                className="text-xl font-semibold text-gray-900 dark:text-white mb-2"
                style={{
                  fontFamily: '-apple-system, SF Pro Display, system-ui, sans-serif'
                }}
              >
                Şu an bağlantı yok
              </h3>
              <p 
                className="text-gray-600 dark:text-gray-400 mb-6"
                style={{
                  fontFamily: '-apple-system, SF Pro Text, system-ui, sans-serif'
                }}
              >
                Çekerek yenile veya Wi-Fi'ye bağlan
              </p>
              <button
                onClick={handleRefresh}
                className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 active:scale-95 transition-all"
                style={{
                  fontFamily: '-apple-system, SF Pro Text, system-ui, sans-serif'
                }}
              >
                Yeniden Dene
              </button>
            </div>
          ) : (
            <InfiniteScroll onLoadMore={handleLoadMore} hasMore={hasMore && displayedNews < filteredNews.length}>
              {/* Enhanced News Grid with Masonry Layout */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredNews.slice(0, displayedNews).map((item: CryptoNews, index: number) => {
                  const variant = index % 5 === 0 ? 'wide' : 'compact';
                  
                  return (
                    <EnhancedNewsCard
                      key={item.id}
                      news={item}
                      summary={translations[item.id]?.summary}
                      sentiment={translations[item.id]?.sentiment}
                      onShare={handleShare}
                      isSharing={isSharing && sharingId === item.id}
                      variant={variant}
                    />
                  );
                })}
              </div>
            </InfiniteScroll>
          )}
        </main>

        {/* Footer */}
        <footer 
          className="border-t mt-12"
          style={{
            borderColor: 'rgba(0, 0, 0, 0.1)',
            backgroundColor: 'rgba(255, 255, 255, 0.8)'
          }}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="text-center">
              <p 
                className="text-sm font-medium text-gray-900 dark:text-white mb-1"
                style={{
                  fontFamily: '-apple-system, SF Pro Text, system-ui, sans-serif'
                }}
              >
                Fast • Kripto Dünyasını Takip Et
              </p>
              <p 
                className="text-xs text-gray-600 dark:text-gray-400"
                style={{
                  fontFamily: '-apple-system, SF Pro Text, system-ui, sans-serif'
                }}
              >
                Tree of Alpha • @AggrNews • Binance • OKX • Upbit • Bithumb
              </p>
            </div>
          </div>
        </footer>

        {/* Bottom Navigation for Mobile */}
        <BottomNavigation unreadCount={3} />
      </div>
    </PullToRefresh>
  );
}
