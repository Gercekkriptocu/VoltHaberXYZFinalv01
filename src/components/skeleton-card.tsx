'use client';

import type React from 'react';

interface SkeletonCardProps {
  variant?: 'hero' | 'medium' | 'compact';
}

export function SkeletonCard({ variant = 'compact' }: SkeletonCardProps): React.JSX.Element {
  const isHero = variant === 'hero';
  const isMedium = variant === 'medium';

  return (
    <div 
      className={`
        bg-white dark:bg-gray-900 rounded-2xl overflow-hidden
        ${isHero ? 'col-span-full' : isMedium ? 'md:col-span-1' : ''}
        animate-pulse
      `}
      style={{
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
      }}
    >
      <div className={`p-6 ${isHero ? 'md:p-8' : ''}`}>
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <div className="h-6 w-24 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
          <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
        </div>

        {/* Title */}
        <div className="space-y-3 mb-4">
          <div className={`h-6 bg-gray-200 dark:bg-gray-700 rounded ${isHero ? 'w-5/6' : 'w-full'}`}></div>
          <div className={`h-6 bg-gray-200 dark:bg-gray-700 rounded ${isHero ? 'w-4/6' : 'w-5/6'}`}></div>
          {isHero && <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/6"></div>}
        </div>

        {/* Buttons */}
        <div className="flex gap-2 mt-6">
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-lg flex-1"></div>
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-lg flex-1"></div>
        </div>
      </div>
    </div>
  );
}
