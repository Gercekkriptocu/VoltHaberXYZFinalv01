'use client';

import type React from 'react';
import { useState, useEffect } from 'react';
import { Usb, Power } from 'lucide-react';
import { useNFTMint, setWalletNotificationCallback } from '@/hooks/useNFTMint';

interface WalletConnectionProps {
  language?: 'tr' | 'en';
}

export function WalletConnection({ language = 'tr' }: WalletConnectionProps): React.JSX.Element {
  const { account, connectWallet, isConnecting } = useNFTMint();
  const [showChatBubble, setShowChatBubble] = useState<boolean>(false);
  const [chatMessage, setChatMessage] = useState<string>('');

  const texts = {
    tr: {
      connect: 'Cüzdan Bağla',
      disconnect: 'Bağlantıyı Kes',
      connected: 'EVM Cüzdanı Bağlandı! 🎉',
      disconnected: 'Cüzdan Bağlantısı Kesildi',
      connecting: 'Bağlanıyor...'
    },
    en: {
      connect: 'Connect Wallet',
      disconnect: 'Disconnect',
      connected: 'EVM Wallet Connected! 🎉',
      disconnected: 'Wallet Disconnected',
      connecting: 'Connecting...'
    }
  };

  const t = texts[language];

  // Register notification callback
  useEffect(() => {
    setWalletNotificationCallback((message: string) => {
      setChatMessage(message);
      setShowChatBubble(true);
      
      // Hide after 4 seconds
      setTimeout(() => {
        setShowChatBubble(false);
      }, 4000);
    });
  }, []);

  // Show chat bubble when wallet connects
  useEffect(() => {
    if (account && !isConnecting) {
      setChatMessage(t.connected);
      setShowChatBubble(true);
      
      // Hide after 4 seconds
      const timer = setTimeout(() => {
        setShowChatBubble(false);
      }, 4000);

      return () => clearTimeout(timer);
    }
  }, [account, isConnecting, t.connected]);

  const handleClick = async (): Promise<void> => {
    if (account) {
      // Disconnect - reload page to clear state
      window.location.reload();
    } else {
      // Connect
      try {
        await connectWallet();
      } catch (error) {
        console.error('Wallet connection error:', error);
      }
    }
  };

  return (
    <div className="relative">
      <button
        onClick={handleClick}
        disabled={isConnecting}
        className={`p-1 hover:bg-white/10 rounded transition-colors ${
          account ? 'text-green-400' : 'text-white'
        }`}
        title={account ? t.disconnect : t.connect}
      >
        {isConnecting ? (
          <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white"></div>
        ) : account ? (
          <Power className="w-3.5 h-3.5" />
        ) : (
          <Usb className="w-3.5 h-3.5" />
        )}
      </button>

      {/* Chat Bubble Notification */}
      {showChatBubble && (
        <div
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50"
          style={{
            animation: 'chatBubbleIn 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)'
          }}
        >
          {/* Chat Bubble */}
          <div
            className="relative bg-gradient-to-br from-green-500 to-emerald-600 text-white px-4 py-2 rounded-lg shadow-lg"
            style={{
              minWidth: '200px',
              maxWidth: '280px'
            }}
          >
            <p className="text-xs font-bold text-center whitespace-nowrap">
              {chatMessage}
            </p>
            
            {/* Tail/Arrow pointing down to USB icon */}
            <div
              className="absolute top-full left-1/2 -translate-x-1/2"
              style={{
                width: 0,
                height: 0,
                borderLeft: '8px solid transparent',
                borderRight: '8px solid transparent',
                borderTop: '8px solid #059669'
              }}
            />
          </div>

          {/* Sparkle Effect */}
          <div className="absolute -top-1 -right-1">
            <span className="text-xl animate-ping">✨</span>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes chatBubbleIn {
          0% {
            opacity: 0;
            transform: translateX(-50%) scale(0.3) translateY(20px);
          }
          50% {
            transform: translateX(-50%) scale(1.1) translateY(-5px);
          }
          100% {
            opacity: 1;
            transform: translateX(-50%) scale(1) translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
