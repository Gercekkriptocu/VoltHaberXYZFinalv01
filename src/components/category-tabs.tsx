'use client';

import type React from 'react';
import { useState } from 'react';

interface CategoryTabsProps {
  language: 'tr' | 'en';
  onCategoryChange?: (category: string) => void;
}

export function CategoryTabs({ language, onCategoryChange }: CategoryTabsProps): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<string>('all');

  const texts = {
    tr: {
      title: '📂 Kategoriler',
      all: '🌐 Tümü',
      defi: '💎 DeFi',
      nft: '🎨 NFT',
      bitcoin: '₿ Bitcoin',
      ethereum: '⟠ Ethereum',
      regulation: '⚖️ Düzenleme',
      gaming: '🎮 Oyun',
      ai: '🤖 AI',
    },
    en: {
      title: '📂 Categories',
      all: '🌐 All',
      defi: '💎 DeFi',
      nft: '🎨 NFT',
      bitcoin: '₿ Bitcoin',
      ethereum: '⟠ Ethereum',
      regulation: '⚖️ Regulation',
      gaming: '🎮 Gaming',
      ai: '🤖 AI',
    },
  };

  const t = texts[language];

  const categories = [
    { id: 'all', label: t.all },
    { id: 'defi', label: t.defi },
    { id: 'nft', label: t.nft },
    { id: 'bitcoin', label: t.bitcoin },
    { id: 'ethereum', label: t.ethereum },
    { id: 'regulation', label: t.regulation },
    { id: 'gaming', label: t.gaming },
    { id: 'ai', label: t.ai },
  ];

  const handleTabClick = (categoryId: string): void => {
    setActiveTab(categoryId);
    if (onCategoryChange) {
      onCategoryChange(categoryId);
    }
  };

  return (
    <div
      className="mb-6 rounded overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, #ECE9D8 0%, #E3DED4 100%)',
        border: '2px solid #0054E3',
        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.5)'
      }}
    >
      {/* XP Title Bar */}
      <div 
        className="px-3 py-1.5 flex items-center justify-between"
        style={{
          background: 'linear-gradient(180deg, #0058D0 0%, #0041A8 100%)',
          borderBottom: '1px solid #003C74'
        }}
      >
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-white rounded-sm flex items-center justify-center">
            <span className="text-xs">📂</span>
          </div>
          <span className="text-white text-xs font-bold" style={{ fontFamily: 'Tahoma, sans-serif' }}>
            {t.title}
          </span>
        </div>
      </div>

      {/* Tabs Content */}
      <div className="bg-white p-3">
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => handleTabClick(category.id)}
              className={`
                px-4 py-2 rounded text-sm font-bold transition-all
                ${activeTab === category.id
                  ? 'bg-gradient-to-b from-blue-500 to-blue-700 text-white shadow-lg scale-105'
                  : 'bg-gradient-to-b from-gray-100 to-gray-200 text-gray-700 hover:from-gray-200 hover:to-gray-300'
                }
              `}
              style={{
                fontFamily: 'Tahoma, sans-serif',
                border: activeTab === category.id ? '2px solid #003C74' : '2px solid #A0A0A0',
                boxShadow: activeTab === category.id 
                  ? 'inset 0 1px 0 rgba(255,255,255,0.3), 0 2px 4px rgba(0,0,0,0.2)'
                  : 'inset 0 1px 0 rgba(255,255,255,0.5)',
              }}
            >
              {category.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
