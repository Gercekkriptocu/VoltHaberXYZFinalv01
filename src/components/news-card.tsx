'use client';

import type React from 'react';
import { useState, useEffect, memo } from 'react';
import { ExternalLink, Share2, Clock, TrendingUp, TrendingDown, Bookmark, BookmarkCheck, Image as ImageIcon, Minimize2, Maximize2, X } from 'lucide-react';
import type { CryptoNews } from '../lib/news-service';
import { NFTMintButton } from './nft-mint-button';

interface NewsCardProps {
  news: CryptoNews;
  summary?: string;
  sentiment?: 'positive' | 'negative' | 'neutral';
  onShare: (news: CryptoNews) => void;
  isSharing?: boolean;
  variant?: 'hero' | 'medium' | 'compact' | 'fire';
  isSaved?: boolean;
  onSave?: (news: CryptoNews) => void;
  onHide?: (news: CryptoNews) => void;
  language?: 'tr' | 'en';
}

export const NewsCard = memo(function NewsCard({ 
  news, 
  summary, 
  sentiment = 'neutral',
  onShare,
  isSharing = false,
  variant = 'compact',
  isSaved = false,
  onSave,
  onHide,
  language = 'tr'
}: NewsCardProps): React.JSX.Element {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [imageError, setImageError] = useState<boolean>(false);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [showExpandedModal, setShowExpandedModal] = useState<boolean>(false);
  const [fullTranslation, setFullTranslation] = useState<string>('');
  const [translationLanguage, setTranslationLanguage] = useState<'tr' | 'en'>(language);
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const displaySummary = summary || news.title;
  const timeAgo = formatTimeAgo(news.fetchedAt || news.publishedDate, language);
  const addedToSiteTime = getAddedToSiteTime(news.id, language);
  const isHero = variant === 'hero';
  const isMedium = variant === 'medium';
  const isFire = variant === 'fire';
  const hasImage = news.image && !imageError;
  const isLongText = displaySummary.length > 150; // Check if text needs truncation
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [modalPosition, setModalPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const texts = {
    tr: {
      breaking: '🔥 SON DAKİKA',
      withImage: 'Görselli',
      detail: 'Detay',
      share: 'Paylaş',
      sharing: 'Paylaşılıyor...',
      cryptoNews: 'Kripto Haber',
      expand: 'Genişlet',
    },
    en: {
      breaking: '🔥 BREAKING',
      withImage: 'Image',
      detail: 'Details',
      share: 'Share',
      sharing: 'Sharing...',
      cryptoNews: 'Crypto News',
      expand: 'Expand',
    },
  };

  const t = texts[language];

  // Handle modal dragging
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>): void => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - modalPosition.x,
      y: e.clientY - modalPosition.y
    });
  };

  const handleMouseMove = (e: MouseEvent): void => {
    if (isDragging) {
      setModalPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = (): void => {
    setIsDragging(false);
  };

  // Add/remove mouse event listeners for dragging
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStart]);

  // Fetch full translation when modal opens or language changes
  useEffect(() => {
    const fetchTranslation = async (): Promise<void> => {
      if (showExpandedModal && news.text) {
        // If language changed, reset translation
        if (translationLanguage !== language) {
          setFullTranslation('');
          setTranslationLanguage(language);
        }
        
        // If translation already exists for this language, don't fetch again
        if (fullTranslation && translationLanguage === language) {
          return;
        }
        
        setIsTranslating(true);
        
        try {
          let textToTranslate = news.text;
          
          // Check if news.text is too short (likely just a summary)
          // If so, fetch full article from URL
          if (news.text.length < 300 && news.url) {
            try {
              const fullArticleResponse = await fetch('/api/fetch-full-article', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: news.url })
              });
              
              if (fullArticleResponse.ok) {
                const fullArticleData = await fullArticleResponse.json();
                if (fullArticleData.text && fullArticleData.text.length > textToTranslate.length) {
                  textToTranslate = fullArticleData.text;
                }
              }
            } catch (error) {
              console.log('Could not fetch full article, using summary:', error);
              // Continue with original news.text
            }
          }
          
          // If language is English, use original text (no translation needed)
          if (language === 'en') {
            setFullTranslation(textToTranslate);
            setTranslationLanguage('en');
            return;
          }
          
          // If language is Turkish, translate
          const response = await fetch('/api/translate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: textToTranslate })
          });
          
          if (response.ok) {
            const data = await response.json();
            const translatedText = data.translation || textToTranslate;
            
            // Validate that translation is actually Turkish
            const turkishChars = /[üğışöç]/i;
            const hasTurkishChars = turkishChars.test(translatedText);
            
            // Check if text contains common Turkish words
            const commonTurkishWords = ['bir', 'için', 'ile', 've', 'bu', 'olan', 'olarak', 'göre', 'daha', 'kadar'];
            const words = translatedText.toLowerCase().split(/\s+/);
            const turkishWordCount = words.filter(word => {
              // Check if word contains Turkish chars or is a common Turkish word
              return turkishChars.test(word) || commonTurkishWords.includes(word);
            }).length;
            const turkishWordPercentage = (turkishWordCount / Math.max(words.length, 1)) * 100;
            
            // Only accept translation if it has Turkish characteristics
            if (hasTurkishChars && turkishWordPercentage >= 15) {
              setFullTranslation(translatedText);
              setTranslationLanguage('tr');
            } else {
              console.warn('Translation validation failed - content is not Turkish');
              // Show original text instead
              setFullTranslation(textToTranslate);
              setTranslationLanguage('en');
            }
          } else {
            console.error('Translation API error:', response.status);
            setFullTranslation(textToTranslate);
          }
        } catch (error) {
          console.error('Translation error:', error);
          setFullTranslation(news.text);
        } finally {
          setIsTranslating(false);
        }
      }
    };

    fetchTranslation();
  }, [showExpandedModal, fullTranslation, news.text, news.url, language, translationLanguage]);

  // Get window title bar text based on sentiment
  const getWindowTitle = (): string => {
    if (isFire) return t.breaking;
    if (sentiment === 'positive') return '📈';
    if (sentiment === 'negative') return '📉';
    return '📰';
  };

  if (isMinimized) {
    return (
      <div className="xp-window p-1">
        <div className="xp-title-bar cursor-pointer" onClick={() => setIsMinimized(false)}>
          <span className="text-white text-sm font-bold">{getWindowTitle()}</span>
          <div className="flex gap-1">
            <button className="xp-control-btn" onClick={(e) => {
              e.stopPropagation();
              setIsMinimized(false);
            }}>
              <Maximize2 className="w-3 h-3 text-white" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <article 
        className={`
          xp-window
          transition-all duration-200 ease-out
          hover:translate-y-[-2px]
          ${isHero || isFire ? 'col-span-full' : isMedium ? 'md:col-span-1' : ''}
          w-full
          relative
        `}
        style={{
          transition: 'all 0.2s ease',
          minHeight: isMinimized ? 'auto' : '200px'
        }}
      >
        {/* XP Window Title Bar */}
        <div className="xp-title-bar">
          <div className="flex items-center gap-2">
            <span className="text-white text-sm font-bold truncate">{getWindowTitle()}</span>
          </div>
          
          {/* Window Control Buttons */}
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
              onClick={() => setShowExpandedModal(true)}
              title="Expand"
            >
              <Maximize2 className="w-3 h-3 text-white" />
            </button>
            <button 
              className="xp-control-btn xp-close-btn"
              onClick={() => {
                if (onHide) {
                  onHide(news);
                }
              }}
              title="Close"
            >
              <X className="w-3 h-3 text-white" />
            </button>
          </div>
        </div>

        {/* Window Content Area */}
        <div className="bg-white dark:bg-gray-900">
          {/* Image - Show if available from original source */}
          {hasImage && (
            <div className="relative w-full overflow-hidden border-b-2 border-[#C1BBAA]">
              <img
                src={news.image}
                alt={news.title}
                className="w-full h-48 object-cover"
                onError={() => setImageError(true)}
                style={{
                  objectFit: 'cover',
                  aspectRatio: '16/9'
                }}
              />
              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
            </div>
          )}

          <div className={`p-4 ${isHero || isFire ? 'md:p-6' : ''}`} style={{ width: '100%', boxSizing: 'border-box' }}>
            {/* Header: Sentiment + Added Time */}
            <header className="flex items-center justify-between mb-3 pb-2 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                {/* Sentiment Indicator */}
                {sentiment === 'positive' && (
                  <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-bold flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    Bullish
                  </span>
                )}
                {sentiment === 'negative' && (
                  <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-bold flex items-center gap-1">
                    <TrendingDown className="w-3 h-3" />
                    Bearish
                  </span>
                )}
              </div>
              {/* Added to Site Time */}
              {addedToSiteTime && (
                <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                  <Clock className="w-3 h-3" />
                  <span>{addedToSiteTime}</span>
                </div>
              )}
            </header>

            {/* Title/Summary - Expandable on hover for long text */}
            <div 
              onMouseEnter={() => isLongText && setIsHovered(true)}
              onMouseLeave={() => isLongText && setIsHovered(false)}
              style={{ transition: 'all 0.3s ease' }}
            >
              <h3 
                className={`
                  text-gray-900 dark:text-white leading-snug mb-4 cursor-pointer
                  ${isHero || isFire ? 'text-xl md:text-2xl font-bold' : isMedium ? 'text-base font-bold' : 'text-sm font-bold'}
                `}
                onClick={() => setShowExpandedModal(true)}
                style={{
                  fontFamily: 'Tahoma, system-ui, sans-serif',
                  lineHeight: '1.5',
                  wordWrap: 'break-word',
                  wordBreak: 'break-word',
                  overflowWrap: 'break-word',
                  hyphens: 'auto',
                  overflow: isLongText && !isHovered ? 'hidden' : 'visible',
                  display: isLongText && !isHovered ? '-webkit-box' : 'block',
                  WebkitLineClamp: isLongText && !isHovered ? (isHero || isFire ? 3 : 2) : 'unset',
                  WebkitBoxOrient: isLongText && !isHovered ? 'vertical' : undefined,
                  transition: 'all 0.3s ease',
                  whiteSpace: 'normal',
                  maxWidth: '100%'
                }}
              >
                {displaySummary}
              </h3>
            </div>

            {/* Action Buttons - XP Style */}
            <footer className="flex gap-2 mt-4">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  window.dispatchEvent(new Event('newsRead'));
                  window.open(news.url, '_blank');
                }}
                className="xp-button-blue flex-1 flex items-center justify-center gap-2"
              >
                <span>{t.detail}</span>
                <ExternalLink className="w-3 h-3" />
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onShare(news);
                }}
                className="xp-button-green flex-1 flex items-center justify-center gap-2"
              >
                <Share2 className="w-3 h-3" />
                <span className="hidden sm:inline">{t.share}</span>
              </button>
              {onSave && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onSave(news);
                  }}
                  className={`xp-button flex items-center justify-center gap-2 px-3 ${isSaved ? 'bg-yellow-200 border-yellow-600' : ''}`}
                  style={{ color: '#000000' }}
                >
                  {isSaved ? <BookmarkCheck className="w-3 h-3" /> : <Bookmark className="w-3 h-3" />}
                </button>
              )}
              <NFTMintButton news={news} language={language} />
            </footer>
          </div>
        </div>
      </article>

      {/* Expanded Modal - Full Screen View */}
      {showExpandedModal && (
        <div 
          className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowExpandedModal(false)}
          style={{
            animation: 'fadeIn 0.3s ease-out'
          }}
        >
          <div 
            className="xp-window max-w-4xl w-full max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            style={{
              animation: 'scaleIn 0.3s ease-out',
              transform: `translate(${modalPosition.x}px, ${modalPosition.y}px)`,
              transition: isDragging ? 'none' : 'transform 0.1s ease-out'
            }}
          >
            {/* XP Title Bar - Draggable */}
            <div 
              className="xp-title-bar cursor-move"
              onMouseDown={handleMouseDown}
              style={{
                userSelect: 'none'
              }}
            >
              <div className="flex items-center gap-2">
                <span className="text-white text-sm font-bold">{getWindowTitle()}</span>
              </div>
              <button 
                className="xp-control-btn xp-close-btn"
                onClick={() => setShowExpandedModal(false)}
              >
                <X className="w-3 h-3 text-white" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="bg-white dark:bg-gray-900 p-6 max-h-[80vh] overflow-y-auto">
              {/* Image */}
              {hasImage && (
                <div className="mb-6 rounded-lg overflow-hidden">
                  <img
                    src={news.image}
                    alt={news.title}
                    className="w-full h-auto max-h-[400px] object-cover"
                    style={{
                      objectFit: 'cover'
                    }}
                  />
                </div>
              )}

              {/* Sentiment Only */}
              <div className="flex items-center justify-between mb-4 pb-3 border-b-2 border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  {sentiment === 'positive' && (
                    <span className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm font-bold flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" />
                      Bullish
                    </span>
                  )}
                  {sentiment === 'negative' && (
                    <span className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-sm font-bold flex items-center gap-2">
                      <TrendingDown className="w-4 h-4" />
                      Bearish
                    </span>
                  )}
                </div>
              </div>

              {/* Title - Summary Only */}
              <h2 
                className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white mb-4 leading-tight"
                style={{
                  fontFamily: 'Tahoma, system-ui, sans-serif',
                  lineHeight: '1.4'
                }}
              >
                {displaySummary}
              </h2>

              {/* Full Translation of Original Text */}
              {news.text && (
                <div className="mb-6 pb-6 border-b-2 border-gray-200 dark:border-gray-700">
                  {isTranslating ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      <span className="ml-3 text-gray-600 dark:text-gray-300">Haber İçeriği Yükleniyor...</span>
                    </div>
                  ) : (
                    <p 
                      className="text-base md:text-lg text-gray-700 dark:text-gray-200 leading-relaxed"
                      style={{
                        fontFamily: 'Tahoma, system-ui, sans-serif',
                        lineHeight: '1.7',
                        whiteSpace: 'pre-wrap'
                      }}
                    >
                      {fullTranslation}
                    </p>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    window.dispatchEvent(new Event('newsRead'));
                    window.open(news.url, '_blank');
                  }}
                  className="xp-button-blue flex-1 flex items-center justify-center gap-2 py-3"
                >
                  <span>{t.detail}</span>
                  <ExternalLink className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowExpandedModal(false);
                    onShare(news);
                  }}
                  className="xp-button-green flex-1 flex items-center justify-center gap-2 py-3"
                >
                  <Share2 className="w-4 h-4" />
                  <span className="hidden sm:inline">{t.share}</span>
                </button>
                {onSave && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onSave(news);
                    }}
                    className={`xp-button flex items-center justify-center gap-2 px-4 py-3 ${isSaved ? 'bg-yellow-200 border-yellow-600' : ''}`}
                    style={{ color: '#000000' }}
                  >
                    {isSaved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                  </button>
                )}
                <NFTMintButton news={news} language={language} />
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        /* 80s Theme - Breaking News Badge */
        :global([data-theme="80s"]) .fire-badge {
          color: #FFFFFF !important;
          text-shadow: 0 0 10px rgba(0, 255, 0, 0.8) !important;
        }
      `}</style>
    </>
  );
});

function formatTimeAgo(dateString?: string, language: 'tr' | 'en' = 'tr'): string {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    const now = new Date();
    
    // Calculate time difference
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    // If fetched today, show time
    if (diffDays === 0) {
      const fetchTime = date.toLocaleTimeString(language === 'tr' ? 'tr-TR' : 'en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      return fetchTime;
    }
    
    // If fetched yesterday
    if (diffDays === 1) {
      const yesterdayText = language === 'tr' ? 'Dün' : 'Yesterday';
      const fetchTime = date.toLocaleTimeString(language === 'tr' ? 'tr-TR' : 'en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      return `${yesterdayText} ${fetchTime}`;
    }
    
    // If older, show date
    const now_year = now.getFullYear();
    const date_year = date.getFullYear();
    
    if (now_year === date_year) {
      // Same year: show "10 Jan"
      return date.toLocaleDateString(language === 'tr' ? 'tr-TR' : 'en-US', { 
        day: 'numeric', 
        month: 'short' 
      });
    } else {
      // Different year: show "10 Jan 2024"
      return date.toLocaleDateString(language === 'tr' ? 'tr-TR' : 'en-US', { 
        day: 'numeric', 
        month: 'short',
        year: 'numeric'
      });
    }
  } catch {
    return '';
  }
}

function getAddedToSiteTime(newsId: string, language: 'tr' | 'en' = 'tr'): string {
  try {
    const newsSeenTimes = localStorage.getItem('newsSeenTimes');
    if (!newsSeenTimes) return '';
    
    const seenTimes: Record<string, string> = JSON.parse(newsSeenTimes);
    const addedTime = seenTimes[newsId];
    
    if (!addedTime) return '';
    
    const added = new Date(addedTime);
    const now = new Date();
    const diffMs = now.getTime() - added.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    // Show relative time
    if (diffMins < 1) {
      return language === 'tr' ? 'Az önce' : 'Just now';
    } else if (diffMins < 60) {
      return language === 'tr' ? `${diffMins} dk önce` : `${diffMins}m ago`;
    } else if (diffHours < 24) {
      return language === 'tr' ? `${diffHours} saat önce` : `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return language === 'tr' ? `${diffDays} gün önce` : `${diffDays}d ago`;
    } else {
      // Show date if older than 7 days
      return added.toLocaleDateString(language === 'tr' ? 'tr-TR' : 'en-US', { 
        day: 'numeric', 
        month: 'short' 
      });
    }
  } catch {
    return '';
  }
}
