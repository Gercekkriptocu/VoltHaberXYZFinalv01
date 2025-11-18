'use client';

import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';

interface InfiniteScrollProps {
  onLoadMore: () => Promise<void>;
  hasMore: boolean;
  children: React.ReactNode;
}

export function InfiniteScroll({ onLoadMore, hasMore, children }: InfiniteScrollProps): React.JSX.Element {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          loadMore();
        }
      },
      { threshold: 0.5 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasMore, isLoading]);

  const loadMore = async (): Promise<void> => {
    setIsLoading(true);
    try {
      await onLoadMore();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {children}

      {/* Loading Indicator */}
      <div ref={observerTarget} className="flex justify-center py-8">
        {isLoading ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            <p
              className="text-sm text-gray-600 dark:text-gray-400 font-medium"
              style={{
                fontFamily: '-apple-system, SF Pro Text, system-ui, sans-serif',
              }}
            >
              Daha fazla haber yükleniyor...
            </p>
          </div>
        ) : hasMore ? (
          <div className="text-center">
            <p
              className="text-sm text-gray-500 dark:text-gray-500 italic"
              style={{
                fontFamily: '-apple-system, SF Pro Text, system-ui, sans-serif',
              }}
            >
              Daha fazla haber için aşağı kaydır
            </p>
          </div>
        ) : (
          <div
            className="bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-900/30 dark:to-blue-900/30 rounded-2xl p-6 text-center"
            style={{
              maxWidth: '500px',
            }}
          >
            <p
              className="text-lg font-bold text-gray-900 dark:text-white mb-2"
              style={{
                fontFamily: '-apple-system, SF Pro Display, system-ui, sans-serif',
              }}
            >
              🎉 Hepsini okudun!
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Tüm haberleri gördün. Yeni içerik için birkaç dakika sonra tekrar gel!
            </p>
          </div>
        )}
      </div>
    </>
  );
}
