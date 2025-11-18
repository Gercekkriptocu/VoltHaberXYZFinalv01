'use client';

import type React from 'react';
import { useState, useEffect } from 'react';
import { Download, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';
import { useNFTMint } from '@/hooks/useNFTMint';
import type { CryptoNews } from '@/lib/news-service';

interface NFTMintButtonProps {
  news: CryptoNews;
  language?: 'tr' | 'en';
}

export function NFTMintButton({ news, language = 'tr' }: NFTMintButtonProps): React.JSX.Element {
  const { isMinting, isConnecting, account, connectWallet, mintNFT, checkIfMinted, showWalletNotification } = useNFTMint();
  const [showToast, setShowToast] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string>('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [txHash, setTxHash] = useState<string>('');
  const [isMinted, setIsMinted] = useState<boolean>(false);

  // Check if this news was minted before
  useEffect(() => {
    try {
      const mintedNews = localStorage.getItem('mintedNews');
      if (mintedNews) {
        const minted = JSON.parse(mintedNews) as string[];
        setIsMinted(minted.includes(news.id));
      }
    } catch (error) {
      console.error('Error loading minted news:', error);
    }
  }, [news.id]);

  const texts = {
    tr: {
      mint: 'Mint Et',
      minting: 'Mint ediliyor...',
      connecting: 'Bağlanıyor...',
      minted: 'Mint Edildi',
      price: '0.00005 ETH',
      viewOnExplorer: 'BaseScan\'de Gör',
      mintSuccess: '🎉 Bu haberi mintlediniz!',
      connectingWallet: 'Cüzdan bağlanıyor...'
    },
    en: {
      mint: 'Mint NFT',
      minting: 'Minting...',
      connecting: 'Connecting...',
      minted: 'Minted',
      price: '0.00005 ETH',
      viewOnExplorer: 'View on BaseScan',
      mintSuccess: '🎉 You minted this news!',
      connectingWallet: 'Connecting wallet...'
    }
  };

  const t = texts[language];

  const handleMintClick = async (e: React.MouseEvent<HTMLButtonElement>): Promise<void> => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      // If wallet not connected, connect first
      if (!account) {
        await connectWallet();
        
        // Wait for wallet notification to show
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Now mint (metadata simplified)
      const metadata = {
        title: news.title,
        content: news.content || news.title,
        date: new Date(news.publishedDate || news.fetchedAt || Date.now()).toISOString()
      };

      const result = await mintNFT(news.id, metadata, language);

      if (result.success) {
        setToastMessage(t.mintSuccess);
        setToastType('success');
        setTxHash(result.txHash || '');
        setIsMinted(true);
        
        // Save to localStorage
        try {
          const mintedNews = localStorage.getItem('mintedNews');
          const minted = mintedNews ? JSON.parse(mintedNews) as string[] : [];
          if (!minted.includes(news.id)) {
            minted.push(news.id);
            localStorage.setItem('mintedNews', JSON.stringify(minted));
          }
        } catch (error) {
          console.error('Error saving minted news:', error);
        }
      } else {
        setToastMessage(result.error || 'Mint başarısız');
        setToastType('error');
      }

      setShowToast(true);
      setTimeout(() => setShowToast(false), 5000);
    } catch (error) {
      setToastMessage(error instanceof Error ? error.message : 'Bağlantı hatası');
      setToastType('error');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 5000);
    }
  };

  // Show loading state if connecting or minting
  const isLoading = isConnecting || isMinting;
  const buttonText = isConnecting ? t.connecting : isMinting ? t.minting : isMinted ? t.minted : t.mint;

  return (
    <>
      <button
        onClick={handleMintClick}
        disabled={isLoading}
        className={`xp-button flex items-center justify-center gap-2 px-3 ${
          isMinted ? 'bg-green-100 border-green-600' : 'bg-purple-100 border-purple-600'
        }`}
        style={{ color: isMinted ? '#059669' : '#4B0082' }}
        title={`${buttonText} (${t.price})`}
      >
        {isLoading ? (
          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-purple-600"></div>
        ) : isMinted ? (
          <CheckCircle className="w-3 h-3" />
        ) : (
          <Download className="w-3 h-3" />
        )}
      </button>

      {/* Toast Notification - NO hover effects, only BaseScan link clickable */}
      {showToast && (
        <div
          className="fixed pointer-events-none"
          style={{
            bottom: '48px',
            right: '8px',
            zIndex: 9999999,
            height: '40px',
            width: 'auto',
            maxWidth: '500px'
          }}
        >
          <div
            className="h-full flex items-center justify-center px-4 rounded-lg"
            style={{
              background: toastType === 'success' 
                ? 'linear-gradient(to right, #10b981, #059669)' 
                : 'linear-gradient(to right, #ef4444, #dc2626)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
              border: '1px solid rgba(255, 255, 255, 0.2)'
            }}
          >
            <div className="flex items-center gap-2">
              {toastType === 'success' ? (
                <CheckCircle className="w-4 h-4 text-white flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-white flex-shrink-0" />
              )}
              <p className="text-xs font-bold text-white whitespace-nowrap">{toastMessage}</p>
              {txHash && (
                <a
                  href={`https://basescan.org/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-white flex items-center gap-1 font-semibold pointer-events-auto"
                  onClick={(e) => e.stopPropagation()}
                >
                  {t.viewOnExplorer}
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
