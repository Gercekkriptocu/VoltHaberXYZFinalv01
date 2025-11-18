'use client';

import type React from 'react';
import { useState, useEffect, memo } from 'react';
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown } from 'lucide-react';
import type { CryptoNews } from '../lib/news-service';

interface HeroCarouselProps {
  news: CryptoNews[];
  translations: Record<string, { summary: string; sentiment: 'positive' | 'negative' | 'neutral' }>;
  onShare: (news: CryptoNews) => void;
}

export const HeroCarousel = memo(function HeroCarousel({ news, translations, onShare }: HeroCarouselProps): React.JSX.Element {
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState<boolean>(true);

  const topNews = news.slice(0, 3);

  useEffect(() => {
    if (!isAutoPlaying || topNews.length === 0) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % topNews.length);
    }, 10000); // Increased from 5 to 10 seconds

    return () => clearInterval(interval);
  }, [isAutoPlaying, topNews.length]);

  if (topNews.length === 0) return <></>;

  const currentNews = topNews[currentIndex];
  const translation = translations[currentNews?.id];
  const sentiment = translation?.sentiment || 'neutral';

  const getGradient = (): string => {
    switch (sentiment) {
      case 'positive':
        return 'from-green-500/90 to-emerald-600/90';
      case 'negative':
        return 'from-red-500/90 to-rose-600/90';
      default:
        return 'from-blue-500/90 to-indigo-600/90';
    }
  };

  const handlePrev = (): void => {
    setIsAutoPlaying(false);
    setCurrentIndex((prev) => (prev - 1 + topNews.length) % topNews.length);
  };

  const handleNext = (): void => {
    setIsAutoPlaying(false);
    setCurrentIndex((prev) => (prev + 1) % topNews.length);
  };

  return (
    <div className="relative w-full h-[400px] md:h-[500px] rounded-3xl overflow-hidden group mb-8">
      {/* Animated Background Gradient */}
      <div 
        className={`absolute inset-0 bg-gradient-to-br ${getGradient()} transition-all duration-700`}
        style={{
          backdropFilter: 'blur(100px)',
        }}
      />

      {/* Overlay Pattern */}
      <div 
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      {/* Content */}
      <div className="relative h-full flex flex-col justify-between p-8 md:p-12">
        {/* Top Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {sentiment === 'positive' && (
              <div className="flex items-center gap-2 bg-white/20 backdrop-blur-md px-4 py-2 rounded-full">
                <TrendingUp className="w-5 h-5 text-white" />
                <span className="text-white font-semibold text-sm">Yükseliş</span>
              </div>
            )}
            {sentiment === 'negative' && (
              <div className="flex items-center gap-2 bg-white/20 backdrop-blur-md px-4 py-2 rounded-full">
                <TrendingDown className="w-5 h-5 text-white" />
                <span className="text-white font-semibold text-sm">Düşüş</span>
              </div>
            )}
          </div>

          {/* Indicators */}
          <div className="flex gap-2">
            {topNews.map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  setCurrentIndex(index);
                  setIsAutoPlaying(false);
                }}
                className={`h-1 rounded-full transition-all duration-300 ${
                  index === currentIndex ? 'w-8 bg-white' : 'w-4 bg-white/50'
                }`}
                aria-label={`Haber ${index + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col justify-center max-w-4xl">
          <h2 
            className="text-3xl md:text-5xl font-bold text-white mb-4 leading-tight"
            style={{
              fontFamily: '-apple-system, SF Pro Display, system-ui, sans-serif',
              textShadow: '0 2px 12px rgba(0,0,0,0.3)'
            }}
          >
            {translation?.summary || currentNews?.title}
          </h2>

          {/* TL;DR Section */}
          {translation?.summary && (
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 mb-6 border border-white/20">
              <p className="text-white/90 text-sm md:text-base font-medium">
                💡 <span className="font-semibold">TL;DR:</span> {translation.summary.slice(0, 150)}...
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => window.open(currentNews?.url, '_blank')}
              className="px-8 py-4 bg-white text-gray-900 rounded-xl font-semibold text-sm md:text-base hover:bg-white/90 active:scale-95 transition-all shadow-lg"
            >
              Haberi Oku
            </button>
            <button
              onClick={() => currentNews && onShare(currentNews)}
              className="px-8 py-4 bg-white/20 backdrop-blur-md text-white border border-white/30 rounded-xl font-semibold text-sm md:text-base hover:bg-white/30 active:scale-95 transition-all"
            >
              Paylaş
            </button>
          </div>
        </div>

        {/* Navigation Arrows */}
        <div className="flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <button
            onClick={handlePrev}
            className="p-3 bg-white/20 backdrop-blur-md rounded-full hover:bg-white/30 transition-all border border-white/30"
            aria-label="Önceki"
          >
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
          <button
            onClick={handleNext}
            className="p-3 bg-white/20 backdrop-blur-md rounded-full hover:bg-white/30 transition-all border border-white/30"
            aria-label="Sonraki"
          >
            <ChevronRight className="w-6 h-6 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
});
