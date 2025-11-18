'use client';

import type React from 'react';
import { useState, useEffect } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';
import type { CryptoNews } from '../lib/news-service';

interface FarcasterShareProps {
  news: CryptoNews;
  translatedTitle: string;
  onComplete: () => void;
}

export function useFarcasterShare(): {
  shareNews: (news: CryptoNews, translatedTitle: string) => Promise<void>;
  isSharing: boolean;
  error: string | null;
} {
  const [isSharing, setIsSharing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const shareNews = async (
    news: CryptoNews,
    translatedTitle: string
  ): Promise<void> => {
    setIsSharing(true);
    setError(null);

    try {
      // Check if we're in a Farcaster Mini App
      const isInApp = await sdk.isInMiniApp();
      
      if (!isInApp) {
        // Get current app URL and create news detail link
        const appUrl = typeof window !== 'undefined' ? window.location.origin : '';
        const newsDetailUrl = `${appUrl}/news/${news.id}`;
        
        // If not in Farcaster app, open URL in new tab with our app link
        window.open(
          `https://warpcast.com/~/compose?text=${encodeURIComponent(`🚀 ${translatedTitle}\n\n${newsDetailUrl}\n\n#crypto #blockchain`)}`,
          '_blank'
        );
        return;
      }

      // Get current app URL and create news detail link
      const appUrl = typeof window !== 'undefined' ? window.location.origin : '';
      const newsDetailUrl = `${appUrl}/news/${news.id}`;

      // Prepare the cast text with our app link
      const castText = `🚀 ${translatedTitle}\n\n${newsDetailUrl}\n\n#crypto #blockchain`;

      // Open compose cast dialog
      const result = await sdk.actions.composeCast({
        text: castText,
        embeds: [newsDetailUrl]
      });

      if (result?.cast) {
        // Successfully shared
        try {
          await sdk.haptics.notificationOccurred('success');
        } catch {
          // Ignore haptics error
        }
      }
    } catch (err) {
      console.error('Farcaster share error:', err);
      setError(err instanceof Error ? err.message : 'Paylaşım başarısız oldu');
      
      try {
        await sdk.haptics.notificationOccurred('error');
      } catch {
        // Ignore haptics error
      }
      
      // Fallback: Open Warpcast compose in new tab with our app link
      if (news.url) {
        const appUrl = typeof window !== 'undefined' ? window.location.origin : '';
        const newsDetailUrl = `${appUrl}/news/${news.id}`;
        
        window.open(
          `https://warpcast.com/~/compose?text=${encodeURIComponent(`🚀 ${translatedTitle}\n\n${newsDetailUrl}\n\n#crypto #blockchain`)}`,
          '_blank'
        );
      }
    } finally {
      setIsSharing(false);
    }
  };

  return { shareNews, isSharing, error };
}

export function FarcasterStatus(): React.JSX.Element {
  const [isInApp, setIsInApp] = useState<boolean>(false);
  const [user, setUser] = useState<{ fid: number; username?: string } | null>(null);

  useEffect(() => {
    const checkFarcasterStatus = async (): Promise<void> => {
      try {
        const inApp = await sdk.isInMiniApp();
        setIsInApp(inApp);

        if (inApp && sdk.context) {
          setUser(sdk.context.user);
        }
      } catch (error) {
        console.error('Farcaster status check error:', error);
      }
    };

    checkFarcasterStatus();
  }, []);

  if (!isInApp) {
    return (
      <div className="text-xs text-gray-500 text-center py-2">
        Farcaster paylaşımı için uygulamayı Farcaster içinde açın
      </div>
    );
  }

  return (
    <div className="text-xs text-green-600 text-center py-2 flex items-center justify-center gap-2">
      <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
      Farcaster&apos;a bağlı
      {user?.username && ` • @${user.username}`}
    </div>
  );
}
