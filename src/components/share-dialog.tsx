'use client';

import type React from 'react';
import { X, Copy } from 'lucide-react';
import type { CryptoNews } from '../lib/news-service';

interface ShareDialogProps {
  isOpen: boolean;
  onClose: () => void;
  news: CryptoNews;
  summary?: string;
}

// Social Media Logo Components
const XLogo: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

const FarcasterLogo: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 1000 1000" className={className} fill="currentColor">
    <path d="M257.778 155.556H742.222V844.444H671.111V528.889H670.414C662.554 441.677 589.258 373.333 500 373.333C410.742 373.333 337.446 441.677 329.586 528.889H328.889V844.444H257.778V155.556Z"/>
    <path d="M128.889 253.333L157.778 351.111H182.222V844.444H128.889V253.333Z"/>
    <path d="M871.111 253.333L842.222 351.111H817.778V844.444H871.111V253.333Z"/>
  </svg>
);



export function ShareDialog({ isOpen, onClose, news, summary }: ShareDialogProps): React.JSX.Element | null {
  if (!isOpen) return null;

  const shareText = encodeURIComponent(summary || news.title);
  // Create unique URL for this news item
  const newsUrl = `https://www.voltnews.xyz/news/${encodeURIComponent(news.id)}`;
  const shareUrl = encodeURIComponent(newsUrl);

  const platforms = [
    {
      name: 'X (Twitter)',
      icon: XLogo,
      iconColor: '#000000',
      url: `https://twitter.com/intent/tweet?text=${shareText}&url=${shareUrl}`,
      action: 'share' as const
    },
    {
      name: 'Farcaster',
      icon: FarcasterLogo,
      iconColor: '#8A63D2',
      url: `https://warpcast.com/~/compose?text=${shareText}%20${shareUrl}`,
      action: 'share' as const
    },

    {
      name: 'Link Kopyala',
      icon: Copy,
      iconColor: '#666666',
      url: newsUrl,
      action: 'copy' as const
    },
  ];

  const handleShare = (url: string): void => {
    window.open(url, '_blank', 'width=600,height=400');
  };

  const handleCopy = (url: string): void => {
    navigator.clipboard.writeText(url);
    alert('Link kopyalandı! / Link copied!');
  };

  return (
    <div 
      className="fixed inset-0 z-[80] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="xp-window max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
        style={{
          animation: 'scaleIn 0.2s ease-out'
        }}
      >
        {/* XP Title Bar */}
        <div className="xp-title-bar">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-white rounded-sm flex items-center justify-center">
              <span className="text-xs">📤</span>
            </div>
            <span className="text-white text-sm font-bold">Paylaş / Share</span>
          </div>
          <button 
            className="xp-control-btn xp-close-btn"
            onClick={onClose}
          >
            <X className="w-3 h-3 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="bg-white dark:bg-gray-900 p-6">
          <h3 
            className="text-gray-900 dark:text-white text-sm font-bold mb-4 line-clamp-2"
            style={{ fontFamily: 'Tahoma, sans-serif' }}
          >
            {summary || news.title}
          </h3>

          {/* Platform Grid */}
          <div className="grid grid-cols-2 gap-3">
            {platforms.map((platform) => {
              const IconComponent = platform.icon;
              return (
                <button
                  key={platform.name}
                  onClick={() => platform.action === 'copy' ? handleCopy(platform.url) : handleShare(platform.url)}
                  className="xp-button flex items-center gap-3 p-4 justify-start hover:scale-105 transition-transform bg-gray-50 dark:bg-gray-800"
                  style={{
                    border: '2px solid #ccc',
                    fontWeight: 'bold'
                  }}
                >
                  <IconComponent className="w-6 h-6" style={{ color: platform.iconColor }} />
                  <span className="text-sm font-bold text-black dark:text-white">{platform.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

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
      `}</style>
    </div>
  );
}
