'use client';

import type React from 'react';
import { useState, useEffect, memo } from 'react';
import { TrendingUp, TrendingDown, Trash2, X } from 'lucide-react';

interface CryptoPrice {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
}

// CoinGecko API coin IDs
const COINS = [
  { id: 'ethereum', symbol: 'ETH', name: 'Ethereum' },
  { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin' },
  { id: 'solana', symbol: 'SOL', name: 'Solana' },
  { id: 'linea', symbol: 'LINEA', name: 'Linea' },
  { id: 'zksync', symbol: 'ZK', name: 'zkSync' },
  { id: 'zcash', symbol: 'ZCASH', name: 'Zcash' },
  { id: 'mina-protocol', symbol: 'MINA', name: 'Mina' },
  { id: 'ripple', symbol: 'XRP', name: 'Ripple' },
  { id: 'binancecoin', symbol: 'BNB', name: 'BNB' },
  { id: 'polkadot', symbol: 'DOT', name: 'Polkadot' },
  { id: 'arbitrum', symbol: 'ARB', name: 'Arbitrum' },
  { id: 'pengu', symbol: 'PENGU', name: 'Pengu' },
];

interface LiveCryptoTickerProps {
  hiddenNews?: Set<string>;
  onRestoreNews?: (newsId: string) => void;
  allNews?: Array<{ id: string; title: string; publishedDate?: string }>;
  language?: 'tr' | 'en';
}

export const LiveCryptoTicker = memo(function LiveCryptoTicker({ hiddenNews = new Set(), onRestoreNews, allNews = [], language = 'tr' }: LiveCryptoTickerProps): React.JSX.Element {
  const [prices, setPrices] = useState<CryptoPrice[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchPrices = async (): Promise<void> => {
    try {
      const coinIds = COINS.map(c => c.id).join(',');
      
      const response = await fetch('/api/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          protocol: 'https',
          origin: 'api.coingecko.com',
          path: `/api/v3/simple/price?ids=${coinIds}&vs_currencies=usd&include_24hr_change=true`,
          method: 'GET',
          headers: {},
        }),
      });

      const data = await response.json();

      if (data && typeof data === 'object') {
        const formattedPrices: CryptoPrice[] = COINS.map(coin => {
          const coinData = data[coin.id];
          return {
            symbol: coin.symbol,
            name: coin.name,
            price: coinData?.usd || 0,
            change24h: coinData?.usd_24h_change || 0,
          };
        }).filter(p => p.price > 0);

        setPrices(formattedPrices);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching crypto prices:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    // Lazy loading: Wait 10 seconds before initial fetch
    const initialTimeout = setTimeout(() => {
      fetchPrices();
    }, 10000);

    // Update every 60 seconds (reduced from 30)
    const interval = setInterval(() => {
      fetchPrices();
    }, 60000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, []);

  if (loading) {
    return (
      <div
        className="mb-6 rounded overflow-hidden w-full crypto-ticker-window"
        style={{
          background: 'linear-gradient(180deg, #ECE9D8 0%, #E3DED4 100%)',
          border: '2px solid #0054E3',
          boxShadow: '0 4px 8px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.5)'
        }}
      >
        <style>{`
          html.dark .crypto-ticker-window {
            background: linear-gradient(180deg, #4A5568 0%, #2D3748 100%) !important;
            border-color: #718096 !important;
          }
          html.dark .crypto-ticker-titlebar {
            background: linear-gradient(180deg, #4A5568 0%, #2D3748 100%) !important;
            border-bottom-color: #718096 !important;
          }
          
          /* 80's Theme - ASCII Terminal Green */
          [data-theme="80s"] .crypto-ticker-window {
            background: rgba(0, 0, 0, 0.85) !important;
            border: 2px solid #00FF00 !important;
            box-shadow: 0 0 10px rgba(0, 255, 0, 0.6), 0 0 20px rgba(0, 255, 0, 0.4), inset 0 0 30px rgba(0, 255, 0, 0.05) !important;
          }
          [data-theme="80s"] .crypto-ticker-titlebar {
            background: rgba(0, 0, 0, 0.95) !important;
            border-bottom: 2px solid #00FF00 !important;
            box-shadow: 0 0 15px rgba(0, 255, 0, 0.5), inset 0 0 20px rgba(0, 255, 0, 0.1) !important;
          }
          [data-theme="80s"] .crypto-ticker-titlebar span {
            color: #00FF00 !important;
            text-shadow: 0 0 10px rgba(0, 255, 0, 0.8) !important;
          }
          [data-theme="80s"] .crypto-ticker-content {
            background: rgba(0, 0, 0, 0.9) !important;
          }
          [data-theme="80s"] .crypto-ticker-symbol {
            color: #00FF00 !important;
            text-shadow: 0 0 10px rgba(0, 255, 0, 0.8) !important;
            font-family: 'Courier New', monospace !important;
          }
          [data-theme="80s"] .crypto-ticker-price {
            color: #00FF00 !important;
            text-shadow: 0 0 8px rgba(0, 255, 0, 0.6) !important;
            font-family: 'Courier New', monospace !important;
          }
          [data-theme="80s"] .crypto-ticker-change-up {
            color: #00FF00 !important;
            text-shadow: 0 0 10px rgba(0, 255, 0, 0.8) !important;
            font-family: 'Courier New', monospace !important;
          }
          [data-theme="80s"] .crypto-ticker-change-down {
            color: #00FF00 !important;
            opacity: 0.5;
            text-shadow: 0 0 8px rgba(0, 255, 0, 0.4) !important;
            font-family: 'Courier New', monospace !important;
          }
          
          /* Vaporwave Theme */
          [data-theme="vaporwave"] .crypto-ticker-window {
            background: rgba(255, 255, 255, 0.15) !important;
            border: 2px solid !important;
            border-image: linear-gradient(135deg, #FF6FD8, #00D9FF, #C471F5, #FFA6C9) 1 !important;
            box-shadow: 0 0 30px rgba(255, 111, 216, 0.4), 0 0 50px rgba(0, 217, 255, 0.3), inset 0 0 40px rgba(196, 113, 245, 0.1) !important;
            backdrop-filter: blur(10px) !important;
          }
          [data-theme="vaporwave"] .crypto-ticker-titlebar {
            background: linear-gradient(135deg, #FF6FD8 0%, #C471F5 50%, #00D9FF 100%) !important;
            border-bottom: 2px solid rgba(255, 255, 255, 0.4) !important;
            box-shadow: 0 0 20px rgba(255, 111, 216, 0.5), inset 0 0 25px rgba(0, 217, 255, 0.2) !important;
          }
          [data-theme="vaporwave"] .crypto-ticker-titlebar span {
            color: #FFFFFF !important;
            text-shadow: 0 0 10px rgba(0, 217, 255, 1), 0 0 20px rgba(255, 111, 216, 0.6) !important;
          }
          [data-theme="vaporwave"] .crypto-ticker-content {
            background: rgba(255, 255, 255, 0.95) !important;
            backdrop-filter: blur(5px) !important;
          }
          html.dark[data-theme="vaporwave"] .crypto-ticker-content {
            background: rgba(255, 255, 255, 0.95) !important;
            backdrop-filter: blur(5px) !important;
          }
          [data-theme="vaporwave"] .crypto-ticker-symbol {
            color: #FF6FD8 !important;
            text-shadow: 0 0 10px rgba(255, 111, 216, 0.8) !important;
            font-weight: 700 !important;
          }
          [data-theme="vaporwave"] .crypto-ticker-price {
            color: #00D9FF !important;
            text-shadow: 0 0 8px rgba(0, 217, 255, 0.6) !important;
            font-weight: 600 !important;
          }
          [data-theme="vaporwave"] .crypto-ticker-change-up {
            color: #00D9FF !important;
            text-shadow: 0 0 10px rgba(0, 217, 255, 0.8) !important;
          }
          [data-theme="vaporwave"] .crypto-ticker-change-down {
            color: #FF6FD8 !important;
            text-shadow: 0 0 8px rgba(255, 111, 216, 0.6) !important;
          }
          
          /* Windows 95 Theme */
          [data-theme="win95"] .crypto-ticker-window {
            background: #C0C0C0 !important;
            border: none !important;
            box-shadow: inset -2px -2px 0 #000000, inset 2px 2px 0 #FFFFFF, inset -3px -3px 0 #808080, inset 3px 3px 0 #DFDFDF !important;
            border-radius: 0 !important;
          }
          [data-theme="win95"] .crypto-ticker-titlebar {
            background: linear-gradient(90deg, #000080 0%, #1084D0 100%) !important;
            border-radius: 0 !important;
            border-bottom: none !important;
            box-shadow: none !important;
            padding: 2px 4px !important;
          }
          [data-theme="win95"] .crypto-ticker-titlebar span {
            color: #FFFFFF !important;
            text-shadow: none !important;
            font-family: 'MS Sans Serif', 'Tahoma', sans-serif !important;
            font-size: 11px !important;
          }
          [data-theme="win95"] .crypto-ticker-content {
            background: #FFFFFF !important;
          }
          [data-theme="win95"] .crypto-ticker-symbol {
            color: #000000 !important;
            text-shadow: none !important;
            font-family: 'MS Sans Serif', 'Tahoma', sans-serif !important;
            font-weight: bold !important;
          }
          [data-theme="win95"] .crypto-ticker-price {
            color: #000000 !important;
            text-shadow: none !important;
            font-family: 'MS Sans Serif', 'Tahoma', sans-serif !important;
          }
          [data-theme="win95"] .crypto-ticker-change-up {
            color: #008000 !important;
            text-shadow: none !important;
            font-family: 'MS Sans Serif', 'Tahoma', sans-serif !important;
          }
          [data-theme="win95"] .crypto-ticker-change-down {
            color: #C00000 !important;
            text-shadow: none !important;
            font-family: 'MS Sans Serif', 'Tahoma', sans-serif !important;
          }
        `}</style>
      <div className="crypto-ticker-window">
        {/* XP Title Bar */}
        <div 
          className="px-2 py-1 flex items-center crypto-ticker-titlebar"
          style={{
            background: 'linear-gradient(180deg, #0058D0 0%, #0041A8 100%)',
            borderBottom: '1px solid #003C74'
          }}
        >
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 bg-white rounded-sm flex items-center justify-center">
              <span className="text-[10px]">📊</span>
            </div>
            <span className="text-white text-[11px] font-bold" style={{ fontFamily: 'Tahoma, sans-serif' }}>
              {language === 'tr' ? 'Anlık Kripto Fiyatları' : 'Live Crypto Prices'}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white dark:bg-gray-800 px-4 py-2 crypto-ticker-content">
          <div className="text-sm text-gray-500 dark:text-gray-300 crypto-ticker-symbol">Fiyatlar yükleniyor...</div>
        </div>
      </div>
      </div>
    );
  }



  return (
    <>
    <div className="mb-6">
      {/* Crypto Ticker */}
      <div
        className="rounded overflow-hidden crypto-ticker-window"
        style={{
          background: 'linear-gradient(180deg, #ECE9D8 0%, #E3DED4 100%)',
          border: '2px solid #0054E3',
          boxShadow: '0 4px 8px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.5)'
        }}
      >
        <style>{`
          /* Dark Mode */
          html.dark .crypto-ticker-window {
            background: linear-gradient(180deg, #4A5568 0%, #2D3748 100%) !important;
            border-color: #718096 !important;
          }
          html.dark .crypto-ticker-titlebar {
            background: linear-gradient(180deg, #4A5568 0%, #2D3748 100%) !important;
            border-bottom-color: #718096 !important;
          }
          html.dark .crypto-ticker-symbol {
            color: #FFFFFF !important;
          }
          html.dark .crypto-ticker-price {
            color: #FFFFFF !important;
          }
          html.dark .crypto-ticker-change-up {
            color: #FFFFFF !important;
          }
          html.dark .crypto-ticker-change-down {
            color: #FFFFFF !important;
          }
          
          /* 80's Theme - ASCII Terminal Green */
          [data-theme="80s"] .crypto-ticker-window {
            background: rgba(0, 0, 0, 0.85) !important;
            border: 2px solid #00FF00 !important;
            box-shadow: 0 0 10px rgba(0, 255, 0, 0.6), 0 0 20px rgba(0, 255, 0, 0.4), inset 0 0 30px rgba(0, 255, 0, 0.05) !important;
          }
          [data-theme="80s"] .crypto-ticker-titlebar {
            background: rgba(0, 0, 0, 0.95) !important;
            border-bottom: 2px solid #00FF00 !important;
            box-shadow: 0 0 15px rgba(0, 255, 0, 0.5), inset 0 0 20px rgba(0, 255, 0, 0.1) !important;
          }
          [data-theme="80s"] .crypto-ticker-titlebar span {
            color: #00FF00 !important;
            text-shadow: 0 0 10px rgba(0, 255, 0, 0.8) !important;
          }
          [data-theme="80s"] .crypto-ticker-content {
            background: rgba(0, 0, 0, 0.9) !important;
          }
          [data-theme="80s"] .crypto-ticker-symbol {
            color: #00FF00 !important;
            text-shadow: 0 0 10px rgba(0, 255, 0, 0.8) !important;
            font-family: 'Courier New', monospace !important;
          }
          [data-theme="80s"] .crypto-ticker-price {
            color: #00FF00 !important;
            text-shadow: 0 0 8px rgba(0, 255, 0, 0.6) !important;
            font-family: 'Courier New', monospace !important;
          }
          [data-theme="80s"] .crypto-ticker-change-up {
            color: #00FF00 !important;
            text-shadow: 0 0 10px rgba(0, 255, 0, 0.8) !important;
            font-family: 'Courier New', monospace !important;
          }
          [data-theme="80s"] .crypto-ticker-change-down {
            color: #00FF00 !important;
            opacity: 0.5;
            text-shadow: 0 0 8px rgba(0, 255, 0, 0.4) !important;
            font-family: 'Courier New', monospace !important;
          }
          
          /* Vaporwave Theme */
          [data-theme="vaporwave"] .crypto-ticker-window {
            background: rgba(255, 255, 255, 0.15) !important;
            border: 2px solid !important;
            border-image: linear-gradient(135deg, #FF6FD8, #00D9FF, #C471F5, #FFA6C9) 1 !important;
            box-shadow: 0 0 30px rgba(255, 111, 216, 0.4), 0 0 50px rgba(0, 217, 255, 0.3), inset 0 0 40px rgba(196, 113, 245, 0.1) !important;
            backdrop-filter: blur(10px) !important;
          }
          [data-theme="vaporwave"] .crypto-ticker-titlebar {
            background: linear-gradient(135deg, #FF6FD8 0%, #C471F5 50%, #00D9FF 100%) !important;
            border-bottom: 2px solid rgba(255, 255, 255, 0.4) !important;
            box-shadow: 0 0 20px rgba(255, 111, 216, 0.5), inset 0 0 25px rgba(0, 217, 255, 0.2) !important;
          }
          [data-theme="vaporwave"] .crypto-ticker-titlebar span {
            color: #FFFFFF !important;
            text-shadow: 0 0 10px rgba(0, 217, 255, 1), 0 0 20px rgba(255, 111, 216, 0.6) !important;
          }
          [data-theme="vaporwave"] .crypto-ticker-content {
            background: rgba(255, 255, 255, 0.95) !important;
            backdrop-filter: blur(5px) !important;
          }
          html.dark[data-theme="vaporwave"] .crypto-ticker-content {
            background: rgba(255, 255, 255, 0.95) !important;
            backdrop-filter: blur(5px) !important;
          }
          [data-theme="vaporwave"] .crypto-ticker-symbol {
            color: #FF6FD8 !important;
            text-shadow: 0 0 10px rgba(255, 111, 216, 0.8) !important;
            font-weight: 700 !important;
          }
          [data-theme="vaporwave"] .crypto-ticker-price {
            color: #00D9FF !important;
            text-shadow: 0 0 8px rgba(0, 217, 255, 0.6) !important;
            font-weight: 600 !important;
          }
          [data-theme="vaporwave"] .crypto-ticker-change-up {
            color: #00D9FF !important;
            text-shadow: 0 0 10px rgba(0, 217, 255, 0.8) !important;
          }
          [data-theme="vaporwave"] .crypto-ticker-change-down {
            color: #FF6FD8 !important;
            text-shadow: 0 0 8px rgba(255, 111, 216, 0.6) !important;
          }
          
          /* Windows 95 Theme */
          [data-theme="win95"] .crypto-ticker-window {
            background: #C0C0C0 !important;
            border: none !important;
            box-shadow: inset -2px -2px 0 #000000, inset 2px 2px 0 #FFFFFF, inset -3px -3px 0 #808080, inset 3px 3px 0 #DFDFDF !important;
            border-radius: 0 !important;
          }
          [data-theme="win95"] .crypto-ticker-titlebar {
            background: linear-gradient(90deg, #000080 0%, #1084D0 100%) !important;
            border-radius: 0 !important;
            border-bottom: none !important;
            box-shadow: none !important;
            padding: 2px 4px !important;
          }
          [data-theme="win95"] .crypto-ticker-titlebar span {
            color: #FFFFFF !important;
            text-shadow: none !important;
            font-family: 'MS Sans Serif', 'Tahoma', sans-serif !important;
            font-size: 11px !important;
          }
          [data-theme="win95"] .crypto-ticker-content {
            background: #FFFFFF !important;
          }
          [data-theme="win95"] .crypto-ticker-symbol {
            color: #000000 !important;
            text-shadow: none !important;
            font-family: 'MS Sans Serif', 'Tahoma', sans-serif !important;
            font-weight: bold !important;
          }
          [data-theme="win95"] .crypto-ticker-price {
            color: #000000 !important;
            text-shadow: none !important;
            font-family: 'MS Sans Serif', 'Tahoma', sans-serif !important;
          }
          [data-theme="win95"] .crypto-ticker-change-up {
            color: #008000 !important;
            text-shadow: none !important;
            font-family: 'MS Sans Serif', 'Tahoma', sans-serif !important;
          }
          [data-theme="win95"] .crypto-ticker-change-down {
            color: #C00000 !important;
            text-shadow: none !important;
            font-family: 'MS Sans Serif', 'Tahoma', sans-serif !important;
          }
        `}</style>
        {/* XP Title Bar */}
        <div 
          className="px-2 py-1 flex items-center crypto-ticker-titlebar"
          style={{
            background: 'linear-gradient(180deg, #0058D0 0%, #0041A8 100%)',
            borderBottom: '1px solid #003C74'
          }}
        >
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 bg-white rounded-sm flex items-center justify-center">
              <span className="text-[10px]">📊</span>
            </div>
            <span className="text-white text-[11px] font-bold" style={{ fontFamily: 'Tahoma, sans-serif' }}>
              {language === 'tr' ? 'Anlık Kripto Fiyatları' : 'Live Crypto Prices'}
            </span>
          </div>
        </div>

      {/* Content - Scrolling Ticker */}
      <div className="bg-white dark:bg-gray-800 overflow-hidden py-2 crypto-ticker-content">
        <div className="flex animate-ticker gap-4 px-4">
          {/* Duplicate for seamless loop */}
          {[...prices, ...prices].map((coin, index) => (
            <div
              key={index}
              className="flex items-center gap-2 whitespace-nowrap"
              style={{
                fontFamily: 'Tahoma, sans-serif',
              }}
            >
              <span className="font-bold text-gray-900 text-sm crypto-ticker-symbol">{coin.symbol}</span>
              <span className="font-semibold text-gray-700 text-sm crypto-ticker-price">
                ${coin.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span
                className={`flex items-center gap-0.5 font-medium text-xs ${
                  coin.change24h >= 0 ? 'text-green-600 crypto-ticker-change-up' : 'text-red-600 crypto-ticker-change-down'
                }`}
              >
                {coin.change24h >= 0 ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                {Math.abs(coin.change24h).toFixed(2)}%
              </span>
            </div>
          ))}
        </div>
      </div>

      </div>
    </div>
    </>
  );
});
