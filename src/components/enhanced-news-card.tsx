'use client';

import type React from 'react';
import { useState } from 'react';
import { ExternalLink, Share2, Clock, TrendingUp, TrendingDown, Bookmark, BookmarkCheck } from 'lucide-react';
import type { CryptoNews } from '../lib/news-service';

interface EnhancedNewsCardProps {
  news: CryptoNews;
  summary?: string;
  sentiment?: 'positive' | 'negative' | 'neutral';
  onShare: (news: CryptoNews) => void;
  isSharing?: boolean;
  variant?: 'compact' | 'wide';
}

export function EnhancedNewsCard({
  news,
  summary,
  sentiment = 'neutral',
  onShare,
  isSharing = false,
  variant = 'compact',
}: EnhancedNewsCardProps): React.JSX.Element {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [touchStart, setTouchStart] = useState<number>(0);
  const [touchEnd, setTouchEnd] = useState<number>(0);

  const displaySummary = summary || news.title;
  const timeAgo = formatTimeAgo(news.publishedDate);

  // Generate TL;DR
  const tldr = summary ? `${summary.slice(0, 80)}...` : 'Özet hazırlanıyor...';

  const getCardStyle = (): string => {
    switch (sentiment) {
      case 'positive':
        return 'bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800';
      case 'negative':
        return 'bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 border-red-200 dark:border-red-800';
      default:
        return 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700';
    }
  };

  const getSentimentColor = (): string => {
    switch (sentiment) {
      case 'positive':
        return 'text-green-600 dark:text-green-400';
      case 'negative':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  // Swipe gesture handlers
  const handleTouchStart = (e: React.TouchEvent): void => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent): void => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = (): void => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) {
      // Left swipe = Save
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    } else if (isRightSwipe) {
      // Right swipe = Dismiss (not interested)
      console.log('Not interested in:', news.id);
    }

    setTouchStart(0);
    setTouchEnd(0);
  };

  return (
    <article
      className={`
        ${getCardStyle()}
        rounded-2xl border-2 overflow-hidden
        transition-all duration-300 ease-out
        hover:shadow-xl hover:-translate-y-1
        ${variant === 'wide' ? 'col-span-2' : ''}
      `}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
      }}
    >
      {/* Image Section - Show if available */}
      {news.image && (
        <div className="relative w-full h-48 overflow-hidden group">
          <img
            src={news.image}
            alt={news.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
            }}
          />
          {/* Gradient overlay for better text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
          
          {/* Image badge */}
          <div className="absolute top-3 right-3 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1">
            🖼️ Görselli
          </div>
        </div>
      )}

      <div className="p-5">
        {/* Header: Sentiment + Source + Time */}
        <header className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {sentiment === 'positive' && <TrendingUp className="w-4 h-4 text-green-600" />}
            {sentiment === 'negative' && <TrendingDown className="w-4 h-4 text-red-600" />}
          </div>
          {timeAgo && (
            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-500">
              <Clock className="w-3 h-3" />
              <span>{timeAgo}</span>
            </div>
          )}
        </header>

        {/* Title/Summary */}
        <h3
          className={`
            text-gray-900 dark:text-gray-100 leading-snug mb-3 cursor-pointer font-semibold
            ${variant === 'wide' ? 'text-xl' : 'text-base'}
          `}
          onClick={() => setIsExpanded(!isExpanded)}
          style={{
            fontFamily: '-apple-system, SF Pro Display, system-ui, sans-serif',
            lineHeight: '1.4',
            overflow: isExpanded ? 'visible' : 'hidden',
            display: isExpanded ? 'block' : '-webkit-box',
            WebkitLineClamp: isExpanded ? 'unset' : 4,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {displaySummary}
        </h3>

        {/* TL;DR Badge */}
        {summary && (
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/30 rounded-xl p-3 mb-4 border border-purple-200 dark:border-purple-800">
            <p className="text-xs font-medium text-purple-700 dark:text-purple-300">
              <span className="font-bold">💡 TL;DR:</span> {tldr}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <footer className="flex gap-2">
          <button
            onClick={() => window.open(news.url, '_blank')}
            className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-semibold text-sm hover:from-blue-600 hover:to-indigo-600 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-md"
          >
            <span>Detay</span>
            <ExternalLink className="w-4 h-4" />
          </button>
          <button
            onClick={() => onShare(news)}
            disabled={isSharing}
            className={`
              px-4 py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 shadow-md
              ${
                sentiment === 'positive'
                  ? 'bg-green-500 text-white hover:bg-green-600'
                  : sentiment === 'negative'
                  ? 'bg-red-500 text-white hover:bg-red-600'
                  : 'bg-gray-800 dark:bg-gray-700 text-white hover:bg-gray-900 dark:hover:bg-gray-600'
              }
              ${isSharing ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}
            `}
          >
            <Share2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsSaved(!isSaved)}
            className={`
              px-4 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-md
              ${
                isSaved
                  ? 'bg-yellow-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }
              active:scale-95
            `}
          >
            {isSaved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
          </button>
        </footer>

        {/* Swipe Hint (first time users) */}
        {!localStorage.getItem('swipeHintShown') && (
          <div className="mt-3 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-500 italic">
              👈 Sola kaydır: Kaydet • Sağa kaydır: İlgimi çekmiyor 👉
            </p>
          </div>
        )}
      </div>

      {/* Swipe Feedback */}
      {isSaved && (
        <div className="absolute inset-0 bg-yellow-500/20 backdrop-blur-sm flex items-center justify-center pointer-events-none">
          <div className="bg-yellow-500 text-white px-6 py-3 rounded-full font-bold text-lg shadow-lg">
            ⭐ Kaydedildi!
          </div>
        </div>
      )}
    </article>
  );
}

function formatTimeAgo(dateString?: string): string {
  if (!dateString) return '';

  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / 86400000);

    // Always show actual date instead of relative time
    if (diffDays === 0) {
      // If today, show time
      return date.toLocaleTimeString('tr-TR', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } else if (diffDays === 1) {
      // If yesterday
      return `Dün ${date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      // For older dates, show full date
      return date.toLocaleDateString('tr-TR', {
        month: 'short',
        day: 'numeric',
        year: diffDays > 365 ? 'numeric' : undefined
      });
    }
  } catch {
    return '';
  }
}
