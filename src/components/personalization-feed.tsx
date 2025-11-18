'use client';

import type React from 'react';
import { useState, useEffect } from 'react';
import { Zap, Heart, Rocket, Globe, SkipForward, Coins, Image, Bitcoin, Hexagon, Dog, Cpu, Scale, Gamepad2, Gift, Plus, X } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface PersonalizationFeedProps {
  onTopicFollow: (topic: string) => void;
  onClose?: () => void;
}

interface UserPreferences {
  topics: string[];
  customKeywords: string[];
  readHistory: string[];
  sentimentPreference: 'bullish' | 'bearish' | 'neutral';
}

export function PersonalizationFeed({ onTopicFollow, onClose }: PersonalizationFeedProps): React.JSX.Element {
  const [prefs, setPrefs] = useState<UserPreferences>({
    topics: [],
    customKeywords: [],
    readHistory: [],
    sentimentPreference: 'neutral',
  });
  const [showPersonalization, setShowPersonalization] = useState<boolean>(true);
  const [language, setLanguage] = useState<'tr' | 'en'>('tr');
  const [showKeywordInput, setShowKeywordInput] = useState<boolean>(false);
  const [keywordInput, setKeywordInput] = useState<string>('');

  useEffect(() => {
    // Load user preferences from localStorage
    const saved = localStorage.getItem('userPreferences');
    if (saved) {
      setPrefs(JSON.parse(saved));
    }

    // Load language preference
    const savedLang = localStorage.getItem('preferredLanguage');
    if (savedLang === 'en' || savedLang === 'tr') {
      setLanguage(savedLang);
    }
  }, []);

  const texts = {
    tr: {
      title: '✨ Kişisel Feed\'ini Oluştur',
      subtitle: 'İlgi alanlarına göre haberler',
      completed: 'tamamlandı',
      selectTopics: '🎯 İlgi Alanlarını Seç',
      selectDesc: 'Favori konularını seç, feed\'in sana özel olsun',
      following: 'Takiptesin',
      followingCount: 'Takip edilen konu:',
      personalization: 'Kişiselleştirme',
      emptyState: 'Başlamak için bir konu seç!',
      skipButton: 'Atla',
      defaultFeed: 'Varsayılan feed kullanılıyor',
      customKeywords: 'Özel Anahtar Kelimeler',
      addKeyword: 'Anahtar Kelime Ekle',
      keywordPlaceholder: 'Örn: Base, Solana, NFT...',
      addButton: 'Ekle',
    },
    en: {
      title: '✨ Create Your Personal Feed',
      subtitle: 'News based on your interests',
      completed: 'completed',
      selectTopics: '🎯 Select Your Interests',
      selectDesc: 'Choose your favorite topics for a personalized feed',
      following: 'Following',
      followingCount: 'Topics followed:',
      personalization: 'Personalization',
      emptyState: 'Select a topic to get started!',
      skipButton: 'Skip',
      defaultFeed: 'Using default feed',
      customKeywords: 'Custom Keywords',
      addKeyword: 'Add Keyword',
      keywordPlaceholder: 'E.g: Base, Solana, NFT...',
      addButton: 'Add',
    },
  };

  const t = texts[language];

  const topicSuggestions = [
    { 
      name: 'DeFi', 
      icon: Coins, 
      color: 'from-blue-500 to-cyan-500', 
      bgColor: 'bg-blue-500',
      preview: language === 'tr' ? 'Yield farming ve likidite havuzları' : 'Yield farming and liquidity pools'
    },
    { 
      name: 'NFT', 
      icon: Image, 
      color: 'from-purple-500 to-pink-500', 
      bgColor: 'bg-purple-500',
      preview: language === 'tr' ? 'Dijital sanat ve koleksiyonlar' : 'Digital art and collectibles'
    },
    { 
      name: 'BTC', 
      icon: Bitcoin, 
      color: 'from-yellow-500 to-orange-500', 
      bgColor: 'bg-yellow-500',
      preview: language === 'tr' ? 'Bitcoin piyasası ve gelişmeleri' : 'Bitcoin market and developments'
    },
    { 
      name: 'ETH', 
      icon: Hexagon, 
      color: 'from-blue-500 to-indigo-500', 
      bgColor: 'bg-blue-500',
      preview: language === 'tr' ? 'Ethereum ekosistemi' : 'Ethereum ecosystem'
    },
    { 
      name: 'Memecoins', 
      icon: Dog, 
      color: 'from-yellow-400 to-orange-400', 
      bgColor: 'bg-yellow-500',
      preview: language === 'tr' ? 'Viral kripto trendleri' : 'Viral crypto trends'
    },
    { 
      name: 'AI & Crypto', 
      icon: Cpu, 
      color: 'from-green-500 to-emerald-500', 
      bgColor: 'bg-green-500',
      preview: language === 'tr' ? 'Yapay zeka ile blockchain' : 'AI meets blockchain'
    },
    { 
      name: 'Regulation', 
      icon: Scale, 
      color: 'from-red-500 to-rose-500', 
      bgColor: 'bg-red-500',
      preview: language === 'tr' ? 'Hukuki düzenlemeler' : 'Legal regulations'
    },
    { 
      name: 'Gaming', 
      icon: Gamepad2, 
      color: 'from-pink-500 to-purple-500', 
      bgColor: 'bg-pink-500',
      preview: language === 'tr' ? 'Play-to-earn oyunlar' : 'Play-to-earn games'
    },
    { 
      name: 'Airdrop', 
      icon: Gift, 
      color: 'from-cyan-500 to-teal-500', 
      bgColor: 'bg-cyan-500',
      preview: language === 'tr' ? 'Ücretsiz token dağıtımları' : 'Free token distributions'
    },
  ];

  const toggleTopic = (topic: string): void => {
    const newTopics = prefs.topics.includes(topic)
      ? prefs.topics.filter((t) => t !== topic)
      : [...prefs.topics, topic];

    const newPrefs = { ...prefs, topics: newTopics };
    setPrefs(newPrefs);
    localStorage.setItem('userPreferences', JSON.stringify(newPrefs));
    onTopicFollow(topic);
  };

  const handleSkip = (): void => {
    // Save current selected topics (empty if none selected)
    const newPrefs = { ...prefs, topics: prefs.topics, customKeywords: prefs.customKeywords };
    setPrefs(newPrefs);
    localStorage.setItem('userPreferences', JSON.stringify(newPrefs));
    setShowPersonalization(false);
    
    // Close the modal
    if (onClose) {
      onClose();
    }
  };

  const addCustomKeyword = (): void => {
    const trimmedKeyword = keywordInput.trim();
    if (trimmedKeyword && !prefs.customKeywords.includes(trimmedKeyword)) {
      const newKeywords = [...prefs.customKeywords, trimmedKeyword];
      const newPrefs = { ...prefs, customKeywords: newKeywords };
      setPrefs(newPrefs);
      localStorage.setItem('userPreferences', JSON.stringify(newPrefs));
      setKeywordInput('');
      setShowKeywordInput(false);
    }
  };

  const removeCustomKeyword = (keyword: string): void => {
    const newKeywords = prefs.customKeywords.filter(k => k !== keyword);
    const newPrefs = { ...prefs, customKeywords: newKeywords };
    setPrefs(newPrefs);
    localStorage.setItem('userPreferences', JSON.stringify(newPrefs));
  };



  return (
    <>
      {/* Topic Selection - XP Window Style */}
      {showPersonalization && (
        <div 
          className="xp-window mb-6"
          style={{
            animation: 'slideDown 0.3s ease-out'
          }}
        >
          {/* XP Title Bar */}
          <div className="xp-title-bar">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-white rounded-sm flex items-center justify-center">
                <Zap className="w-3 h-3 text-yellow-600" />
              </div>
              <span className="text-white text-sm font-bold">{t.selectTopics}</span>
            </div>
          </div>
          
          {/* Window Content */}
          <div className="bg-white p-4">
          {/* Header with Skip Button */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs text-gray-600" style={{ fontFamily: 'Tahoma, sans-serif' }}>
                {t.selectDesc}
              </p>
            </div>
            
            {/* Skip Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleSkip();
              }}
              className="xp-button flex items-center gap-1.5 px-2 py-1 text-xs"
              aria-label={t.skipButton}
            >
              <SkipForward className="w-3 h-3" />
              <span>{t.skipButton}</span>
            </button>
          </div>

          {/* Topic Grid with Tooltips - Compact Design */}
          <TooltipProvider>
            <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
              {topicSuggestions.map((topic) => {
                const isFollowing = prefs.topics.includes(topic.name);
                return (
                  <Tooltip key={topic.name}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => toggleTopic(topic.name)}
                        className={`
                          group relative p-3 rounded-lg transition-all duration-200 border
                          ${
                            isFollowing
                              ? `bg-gradient-to-br ${topic.color} text-white border-transparent shadow-lg scale-105`
                              : 'bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-300 dark:border-gray-600 hover:border-gray-400 hover:shadow-md hover:bg-gray-100 dark:hover:bg-gray-700'
                          }
                        `}
                        aria-label={`${isFollowing ? 'Unfollow' : 'Follow'} ${topic.name}`}
                      >
                        {/* XP-Style Icon */}
                        <div className="flex items-center justify-center mb-1.5">
                          <topic.icon className={`w-6 h-6 ${
                            isFollowing ? 'text-white' : 'text-gray-600 dark:text-gray-400'
                          }`} strokeWidth={2} />
                        </div>
                        
                        {/* Topic Name */}
                        <div
                          className="font-bold text-[10px]"
                          style={{
                            fontFamily: 'Tahoma, sans-serif',
                          }}
                        >
                          {topic.name}
                        </div>
                        
                        {/* Following Badge */}
                        {isFollowing && (
                          <Heart className="w-3 h-3 fill-white absolute top-1 right-1" />
                        )}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="bg-gray-900 text-white px-3 py-2 rounded-lg text-xs">
                      <p className="font-semibold mb-0.5">{topic.name}</p>
                      <p className="text-gray-300">{topic.preview}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </TooltipProvider>

          {/* Custom Keywords Section */}
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-gray-700 dark:text-gray-300" style={{ fontFamily: 'Tahoma, sans-serif' }}>
                {t.customKeywords}
              </h3>
              <button
                onClick={() => setShowKeywordInput(!showKeywordInput)}
                className="xp-button flex items-center gap-1 px-2 py-1 text-xs"
              >
                <Plus className="w-3 h-3" />
                <span>{t.addKeyword}</span>
              </button>
            </div>

            {/* Keyword Input */}
            {showKeywordInput && (
              <div className="mb-3 flex gap-2">
                <input
                  type="text"
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      addCustomKeyword();
                    }
                  }}
                  placeholder={t.keywordPlaceholder}
                  className="flex-1 px-3 py-2 text-xs border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                  style={{ fontFamily: 'Tahoma, sans-serif' }}
                  autoFocus
                />
                <button
                  onClick={addCustomKeyword}
                  className="xp-button-blue px-3 py-2 text-xs"
                >
                  {t.addButton}
                </button>
              </div>
            )}

            {/* Display Custom Keywords */}
            {prefs.customKeywords.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {prefs.customKeywords.map((keyword) => (
                  <div
                    key={keyword}
                    className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 shadow-md"
                    style={{ fontFamily: 'Tahoma, sans-serif' }}
                  >
                    <span>{keyword}</span>
                    <button
                      onClick={() => removeCustomKeyword(keyword)}
                      className="hover:bg-white/20 rounded-full p-0.5 transition-colors"
                      aria-label={`Remove ${keyword}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Stats - Compact */}
          {prefs.topics.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/30 rounded-lg p-2">
                <div className="flex items-center justify-center gap-2">
                  <span className="text-lg">🎉</span>
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    {t.followingCount}
                  </span>
                  <span className="text-sm font-bold text-purple-600 dark:text-purple-400">
                    {prefs.topics.length}/{topicSuggestions.length}
                  </span>
                </div>
              </div>
            </div>
          )}


        </div>
        </div>
      )}

      <style jsx>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </>
  );
}
