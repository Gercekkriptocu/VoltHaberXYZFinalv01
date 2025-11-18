'use client';

import type React from 'react';
import { useState, useEffect, useRef } from 'react';
import { RefreshCw } from 'lucide-react';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
}

export function PullToRefresh({ onRefresh, children }: PullToRefreshProps): React.JSX.Element {
  const [pullDistance, setPullDistance] = useState<number>(0);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [showConfetti, setShowConfetti] = useState<boolean>(false);
  const startY = useRef<number>(0);
  const pulling = useRef<boolean>(false);

  const threshold = 80;
  const maxPull = 120;

  const handleTouchStart = (e: TouchEvent): void => {
    if (window.scrollY === 0) {
      startY.current = e.touches[0].clientY;
      pulling.current = true;
    }
  };

  const handleTouchMove = (e: TouchEvent): void => {
    if (!pulling.current || isRefreshing) return;

    const currentY = e.touches[0].clientY;
    const distance = Math.min(currentY - startY.current, maxPull);

    if (distance > 0) {
      setPullDistance(distance);
    }
  };

  const handleTouchEnd = async (): Promise<void> => {
    if (!pulling.current) return;

    pulling.current = false;

    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      setShowConfetti(true);

      try {
        await onRefresh();
        
        // Hide confetti after 2 seconds
        setTimeout(() => {
          setShowConfetti(false);
        }, 2000);
      } finally {
        setIsRefreshing(false);
      }
    }

    setPullDistance(0);
  };

  useEffect(() => {
    window.addEventListener('touchstart', handleTouchStart as EventListener);
    window.addEventListener('touchmove', handleTouchMove as EventListener);
    window.addEventListener('touchend', handleTouchEnd as EventListener);

    return () => {
      window.removeEventListener('touchstart', handleTouchStart as EventListener);
      window.removeEventListener('touchmove', handleTouchMove as EventListener);
      window.removeEventListener('touchend', handleTouchEnd as EventListener);
    };
  });

  const progress = Math.min(pullDistance / threshold, 1);
  const rotation = progress * 360;
  const scale = 0.5 + (progress * 0.5);

  return (
    <>
      {/* Pull Indicator */}
      {pullDistance > 0 && (
        <div
          className="fixed top-0 left-0 right-0 flex items-center justify-center z-50 pointer-events-none"
          style={{
            transform: `translateY(${pullDistance}px)`,
            transition: pulling.current ? 'none' : 'transform 0.3s ease-out',
          }}
        >
          <div
            className="bg-white dark:bg-gray-900 rounded-full p-4 shadow-lg border border-gray-200 dark:border-gray-700"
            style={{
              transform: `scale(${scale}) rotate(${rotation}deg)`,
            }}
          >
            <RefreshCw
              className={`w-6 h-6 ${
                pullDistance >= threshold ? 'text-green-500' : 'text-gray-400'
              }`}
            />
          </div>
        </div>
      )}

      {/* Crypto Confetti Animation */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          {Array.from({ length: 30 }).map((_, i) => (
            <div
              key={i}
              className="absolute text-4xl animate-confetti"
              style={{
                left: `${Math.random() * 100}%`,
                top: '-50px',
                animationDelay: `${Math.random() * 0.5}s`,
                animationDuration: `${2 + Math.random() * 1}s`,
              }}
            >
              {['₿', '⟠', '💎', '🚀', '📈', '⚡', '🌟'][Math.floor(Math.random() * 7)]}
            </div>
          ))}
        </div>
      )}

      {children}

      <style jsx>{`
        @keyframes confetti {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }

        .animate-confetti {
          animation: confetti 2s ease-out forwards;
        }
      `}</style>
    </>
  );
}
