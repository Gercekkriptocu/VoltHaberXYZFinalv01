'use client';

import { useState, useEffect } from 'react';
import type { CryptoNews } from '../lib/news-service';

interface DegenModeProps {
  news: CryptoNews[];
  translations: Record<string, { summary: string; sentiment: 'positive' | 'negative' | 'neutral' }>;
  onClose: () => void;
  language: 'tr' | 'en';
}

// Boot sequence stages
type BootStage = 'blackscreen' | 'booting' | 'announcing' | 'ready';

// Beep sound types
type BeepType = 'classic' | 'radar' | 'digital' | 'glitch';

// Beep sound generator with different types
function playBeep(type: BeepType = 'classic'): void {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  // Different beep types
  switch (type) {
    case 'classic':
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
      break;
    
    case 'radar':
      oscillator.frequency.value = 1200;
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.08, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.15);
      // Second beep
      setTimeout(() => {
        const osc2 = audioContext.createOscillator();
        const gain2 = audioContext.createGain();
        osc2.connect(gain2);
        gain2.connect(audioContext.destination);
        osc2.frequency.value = 1200;
        osc2.type = 'sine';
        gain2.gain.setValueAtTime(0.08, audioContext.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
        osc2.start(audioContext.currentTime);
        osc2.stop(audioContext.currentTime + 0.15);
      }, 150);
      break;
    
    case 'digital':
      oscillator.frequency.value = 1500;
      oscillator.type = 'square';
      gainNode.gain.setValueAtTime(0.05, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.08);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.08);
      break;
    
    case 'glitch':
      // Hacker-style glitch sound with rapid frequency changes
      oscillator.frequency.setValueAtTime(2000, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(400, audioContext.currentTime + 0.03);
      oscillator.frequency.setValueAtTime(1800, audioContext.currentTime + 0.06);
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.09);
      oscillator.frequency.setValueAtTime(1500, audioContext.currentTime + 0.12);
      oscillator.type = 'square';
      gainNode.gain.setValueAtTime(0.08, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.15);
      // Add noise burst effect
      setTimeout(() => {
        const noiseOsc = audioContext.createOscillator();
        const noiseGain = audioContext.createGain();
        noiseOsc.connect(noiseGain);
        noiseGain.connect(audioContext.destination);
        noiseOsc.frequency.value = 100;
        noiseOsc.type = 'sawtooth';
        noiseGain.gain.setValueAtTime(0.04, audioContext.currentTime);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.05);
        noiseOsc.start(audioContext.currentTime);
        noiseOsc.stop(audioContext.currentTime + 0.05);
      }, 80);
      break;
  }
}

// TV Shutdown sound generator - Old CRT TV effect
function playTVShutdownSound(): void {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Start with high frequency and drop quickly (CRT shutdown effect)
    oscillator.frequency.setValueAtTime(1000, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 0.3);
    oscillator.type = 'sine';
    
    // Volume envelope - fade out
    gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  } catch (error) {
    console.error('Error playing TV shutdown sound:', error);
  }
}

function TypewriterText({ text, speed = 30, delay = 0 }: { text: string; speed?: number; delay?: number }): React.JSX.Element {
  const [displayedText, setDisplayedText] = useState<string>('');
  const [currentIndex, setCurrentIndex] = useState<number>(0);

  useEffect(() => {
    const startDelay = setTimeout(() => {
      if (currentIndex < text.length) {
        const timeout = setTimeout(() => {
          setDisplayedText((prev) => prev + text[currentIndex]);
          setCurrentIndex((prev) => prev + 1);
        }, speed);
        return () => clearTimeout(timeout);
      }
    }, delay);

    return () => clearTimeout(startDelay);
  }, [currentIndex, text, speed, delay]);

  return <span>{displayedText}<span className="animate-pulse">|</span></span>;
}

function BootSequence({ language }: { language: 'tr' | 'en' }): React.JSX.Element {
  const [visibleMessages, setVisibleMessages] = useState<number>(0);

  const bootMessages = language === 'tr' ? [
    '> Sistem başlatılıyor...',
    '> Sunucuya bağlanılıyor...',
    '> Şifreleme doğrulandı...',
    '> Degen protokolü başlatıldı...',
    '> Sistem hazır.'
  ] : [
    '> System initializing...',
    '> Connecting to server...',
    '> Encryption verified...',
    '> Degen protocol initiated...',
    '> System ready.'
  ];

  useEffect(() => {
    if (visibleMessages < bootMessages.length) {
      const timeout = setTimeout(() => {
        setVisibleMessages((prev) => prev + 1);
      }, 200); // Show each message every 200ms
      return () => clearTimeout(timeout);
    }
  }, [visibleMessages, bootMessages.length]);

  return (
    <div className="fixed inset-0 bg-black z-[101] flex items-center justify-center degen-mode-cursor">
      <div className="max-w-2xl w-full px-6">
        <div className="space-y-2">
          {bootMessages.slice(0, visibleMessages).map((msg, i) => (
            <div
              key={i}
              className="text-green-500 font-mono text-sm"
              style={{
                textShadow: '0 0 10px rgba(0, 255, 0, 0.6)',
                animation: 'fadeIn 0.2s ease-in'
              }}
            >
              {msg}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DegenModeAnnouncement({ language }: { language: 'tr' | 'en' }): React.JSX.Element {
  const message = 'DEGEN MODE';

  return (
    <div className="fixed inset-0 bg-black z-[101] flex items-center justify-center overflow-hidden degen-mode-cursor">
      <div className="relative">
        {/* Glitch background effect */}
        <div 
          className="absolute inset-0 text-6xl md:text-8xl font-bold tracking-wider opacity-20"
          style={{
            color: '#00ff00',
            animation: 'glitchBg 0.5s ease-in-out infinite',
            transform: 'translate(-2px, 2px)'
          }}
        >
          {message}
        </div>
        
        {/* Main text */}
        <div
          className="relative text-6xl md:text-8xl font-bold tracking-wider text-center px-6"
          style={{
            color: '#00ff00',
            textShadow: '0 0 10px #00ff00, 0 0 20px #00ff00, 0 0 40px #00ff00, 0 0 80px #00ff00',
            animation: 'dramaticEntry 1.5s ease-out forwards',
            fontFamily: 'monospace',
            letterSpacing: '0.2em'
          }}
        >
          {message}
        </div>
        
        {/* Scanline effect */}
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'repeating-linear-gradient(0deg, rgba(0, 255, 0, 0.1) 0px, transparent 2px, transparent 4px)',
            animation: 'scanline 0.5s linear infinite'
          }}
        />
      </div>
      
      <style jsx>{`
        @keyframes dramaticEntry {
          0% {
            opacity: 0;
            transform: scale(0.3) rotateX(90deg);
            filter: blur(20px);
          }
          50% {
            opacity: 1;
            transform: scale(1.2) rotateX(0deg);
            filter: blur(0px);
          }
          70% {
            transform: scale(0.95);
          }
          100% {
            opacity: 1;
            transform: scale(1);
            filter: blur(0px);
          }
        }
        
        @keyframes glitchBg {
          0%, 100% {
            transform: translate(-2px, 2px);
            opacity: 0.2;
          }
          25% {
            transform: translate(2px, -2px);
            opacity: 0.3;
          }
          50% {
            transform: translate(-2px, -2px);
            opacity: 0.1;
          }
          75% {
            transform: translate(2px, 2px);
            opacity: 0.25;
          }
        }
        
        @keyframes scanline {
          0% {
            transform: translateY(-100%);
          }
          100% {
            transform: translateY(100%);
          }
        }
      `}</style>
    </div>
  );
}

function BinaryStream({ position }: { position: number }): React.JSX.Element {
  const [streams, setStreams] = useState<string[]>([]);

  useEffect(() => {
    const generateBinary = () => {
      const binary = Array.from({ length: 30 }, () => 
        Math.random() > 0.5 ? '1' : '0'
      ).join('');
      setStreams((prev) => [...prev.slice(-10), binary]);
    };

    const interval = setInterval(generateBinary, 100);
    return () => clearInterval(interval);
  }, []);

  return (
    <div 
      className="fixed top-0 bottom-0 w-16 overflow-hidden opacity-20"
      style={{ left: `${position}%` }}
    >
      {streams.map((stream, i) => (
        <div
          key={i}
          className="text-green-500 font-mono text-xs"
          style={{
            animation: 'fall 2s linear infinite',
            animationDelay: `${i * 0.1}s`
          }}
        >
          {stream}
        </div>
      ))}
    </div>
  );
}

function ApiHealthMonitor({ language }: { language: 'tr' | 'en' }): React.JSX.Element {
  const [apiStatuses, setApiStatuses] = useState<Array<{ name: string; initial: string; status: 'online' | 'syncing' | 'offline'; latency: number }>>([
    { name: 'Api 1', initial: '1', status: 'online', latency: 45 },
    { name: 'Api 2', initial: '2', status: 'online', latency: 52 },
    { name: 'Api 3', initial: '3', status: 'syncing', latency: 89 },
    { name: 'Api 4', initial: '4', status: 'online', latency: 38 }
  ]);

  useEffect(() => {
    const updateStatuses = () => {
      setApiStatuses((prev) =>
        prev.map((api) => {
          const newLatency = Math.floor(Math.random() * 100) + 30;
          const newStatus = Math.random() > 0.85 ? (Math.random() > 0.5 ? 'syncing' : 'offline') : 'online';
          return {
            ...api,
            latency: newLatency,
            status: newStatus
          };
        })
      );
    };

    const interval = setInterval(updateStatuses, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed bottom-16 left-4 max-w-xs space-y-1">
      <div className="text-green-500 font-mono text-xs opacity-70 mb-2">
        {language === 'tr' ? '> API DURUM' : '> API STATUS'}
      </div>
      {apiStatuses.map((api, i) => {
        const dotColor = api.status === 'online' 
          ? 'text-green-500' 
          : api.status === 'syncing' 
          ? 'text-yellow-500' 
          : 'text-red-500';
        
        return (
          <div
            key={i}
            className="text-green-500 font-mono text-xs opacity-60 flex items-center gap-2"
            style={{ animation: 'fadeIn 0.3s ease-in' }}
          >
            <span className={`${dotColor} ${api.status === 'online' ? 'animate-pulse' : ''}`}>
              {api.status === 'offline' ? '●' : api.status === 'syncing' ? '◐' : '●'}
            </span>
            <span>{api.initial}</span>
            <span className="opacity-40">{api.latency}ms</span>
          </div>
        );
      })}
    </div>
  );
}

function NetworkStatus({ language, newsCount }: { language: 'tr' | 'en'; newsCount: number }): React.JSX.Element {
  const [cpuLoad, setCpuLoad] = useState<number>(0);
  const [uptime, setUptime] = useState<number>(0);

  useEffect(() => {
    const updateStats = () => {
      setCpuLoad(Math.floor(Math.random() * 40) + 30); // 30-70%
      setUptime((prev) => prev + 1);
    };

    updateStats();
    const interval = setInterval(updateStats, 2000);
    return () => clearInterval(interval);
  }, []);

  const formatUptime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div className="fixed top-28 right-4 text-green-500 font-mono text-xs opacity-70 flex gap-4">
      <div>UPTIME: {formatUptime(uptime)}</div>
      <div>CPU LOAD: {cpuLoad}%</div>
      <div>NEWS: {newsCount}</div>
    </div>
  );
}

function GlitchOverlay(): React.JSX.Element {
  const [show, setShow] = useState<boolean>(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setShow(true);
      setTimeout(() => setShow(false), 100);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  if (!show) return <></>;

  return (
    <div 
      className="fixed inset-0 pointer-events-none z-50"
      style={{
        background: 'linear-gradient(90deg, transparent 0%, rgba(255, 0, 0, 0.1) 25%, rgba(0, 255, 255, 0.1) 50%, transparent 100%)',
        animation: 'glitchSweep 0.1s ease-in-out'
      }}
    />
  );
}

function TVShutdownOverlay({ onComplete }: { onComplete: () => void }): React.JSX.Element {
  useEffect(() => {
    // Complete after animation
    const timeout = setTimeout(onComplete, 800);
    return () => clearTimeout(timeout);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-[102] bg-black pointer-events-none">
      <div 
        className="absolute inset-0 bg-white"
        style={{
          animation: 'tvShutdown 0.8s cubic-bezier(0.4, 0.0, 0.2, 1) forwards'
        }}
      />
    </div>
  );
}

export function DegenMode({ news, translations, onClose, language }: DegenModeProps): React.JSX.Element {
  const [bootStage, setBootStage] = useState<BootStage>('blackscreen');
  const [visibleNewsCount, setVisibleNewsCount] = useState<number>(1);
  const [latestNewsId, setLatestNewsId] = useState<string>('');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [beepType, setBeepType] = useState<BeepType>('glitch');
  const [isClosing, setIsClosing] = useState<boolean>(false);
  const [showSoundModal, setShowSoundModal] = useState<boolean>(false);

  // Boot sequence
  useEffect(() => {
    // Black screen for 500ms
    const blackScreenTimeout = setTimeout(() => {
      setBootStage('booting');
    }, 500);

    // Boot messages for ~1.5 seconds (5 messages * 200ms)
    const bootingTimeout = setTimeout(() => {
      setBootStage('announcing');
    }, 1700);

    // Announcement for ~1.5 seconds (5 lines * 250ms + 250ms delay)
    const announcingTimeout = setTimeout(() => {
      setBootStage('ready');
    }, 3200);

    return () => {
      clearTimeout(blackScreenTimeout);
      clearTimeout(bootingTimeout);
      clearTimeout(announcingTimeout);
    };
  }, []);

  // Get latest news for pinned display
  const latestNews = news[0];
  const latestSummary = translations[latestNews?.id]?.summary || latestNews?.title || '';

  // Sequential loading of news - starts after boot ready
  useEffect(() => {
    if (bootStage === 'ready' && visibleNewsCount < news.length) {
      const timeout = setTimeout(() => {
        setVisibleNewsCount((prev) => prev + 1);
      }, 2000); // New news every 2 seconds
      return () => clearTimeout(timeout);
    }
  }, [visibleNewsCount, news.length, bootStage]);

  // Detect new breaking news - beep when news ID changes after boot is ready
  useEffect(() => {
    if (bootStage === 'ready' && latestNews?.id) {
      // If we have a previous ID and it's different from current, play beep
      if (latestNewsId && latestNewsId !== latestNews.id) {
        if (soundEnabled) {
          playBeep(beepType);
        }
        const element = document.getElementById('breaking-news-text');
        if (element) {
          element.style.animation = 'none';
          setTimeout(() => {
            element.style.animation = 'slideInRight 0.5s ease-out';
          }, 10);
        }
      }
      // Update the latest news ID
      if (latestNewsId !== latestNews.id) {
        setLatestNewsId(latestNews.id);
      }
    }
  }, [latestNews?.id, bootStage, soundEnabled, beepType, latestNewsId]);

  const handleClose = (): void => {
    if (soundEnabled) {
      playTVShutdownSound();
    }
    setIsClosing(true);
  };

  const handleShutdownComplete = (): void => {
    onClose();
  };

  const scrollingNews = news.slice(1, visibleNewsCount + 1);

  // Black screen stage
  if (bootStage === 'blackscreen') {
    return <div className="fixed inset-0 bg-black z-[100] degen-mode-cursor" />;
  }

  // Boot sequence stage
  if (bootStage === 'booting') {
    return <BootSequence language={language} />;
  }

  // Announcing stage - DEGEN MODE AÇILDI
  if (bootStage === 'announcing') {
    return <DegenModeAnnouncement language={language} />;
  }

  // Main Degen Mode UI
  return (
    <div className="fixed inset-0 z-[100] bg-black overflow-hidden degen-mode-cursor">
      {/* TV Shutdown Overlay */}
      {isClosing && <TVShutdownOverlay onComplete={handleShutdownComplete} />}

      {/* Binary Streams */}
      <BinaryStream position={10} />
      <BinaryStream position={30} />
      <BinaryStream position={50} />
      <BinaryStream position={70} />
      <BinaryStream position={90} />

      {/* Network Status - Top Right */}
      <NetworkStatus language={language} newsCount={visibleNewsCount} />

      {/* Sound Button - Same size as X */}
      <button
        onClick={() => setShowSoundModal(!showSoundModal)}
        className="fixed bottom-4 right-24 z-10 w-16 px-3 py-2 bg-black hover:bg-green-900/50 text-green-500 rounded border border-green-500 font-bold transition-all uppercase tracking-wider text-xs"
        style={{
          fontFamily: 'monospace',
          textShadow: '0 0 10px rgba(0, 255, 0, 0.8)',
          boxShadow: '0 0 15px rgba(0, 255, 0, 0.4)'
        }}
        title={language === 'tr' ? 'Ses Ayarları' : 'Sound Settings'}
      >
        [♪]
      </button>

      {/* Sound Control Modal */}
      {showSoundModal && (
        <div className="fixed inset-0 z-[101] bg-black/50 flex items-center justify-center" onClick={() => setShowSoundModal(false)}>
          <div 
            className="bg-black border border-green-500 rounded p-4 max-w-xs w-full mx-4"
            onClick={(e) => e.stopPropagation()}
            style={{
              fontFamily: 'monospace',
              boxShadow: '0 0 20px rgba(0, 255, 0, 0.5)'
            }}
          >
            {/* Modal Header */}
            <div className="text-green-500 font-bold text-sm mb-4 text-center uppercase tracking-wider">
              {language === 'tr' ? 'SES AYARLARI' : 'SOUND SETTINGS'}
            </div>

            {/* Sound Toggle Button */}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="w-full px-3 py-2 bg-black hover:bg-green-900/50 text-green-500 rounded border border-green-500/50 font-bold transition-all uppercase tracking-wider text-xs mb-4"
              style={{
                textShadow: '0 0 10px rgba(0, 255, 0, 0.6)'
              }}
              title={soundEnabled ? 'Sound ON' : 'Sound OFF'}
            >
              {soundEnabled ? '[🔊 ON]' : '[🔇 OFF]'}
            </button>

            {/* Sound Type Selector Label */}
            <div className="text-green-500 text-xs text-center mb-2 opacity-70">
              {language === 'tr' ? 'SES TİPİ' : 'SOUND TYPE'}
            </div>

            {/* Sound Type Buttons */}
            <div className="space-y-1">
              <button
                onClick={() => {
                  setBeepType('glitch');
                  playBeep('glitch');
                }}
                className={`w-full px-3 py-1 text-xs font-mono transition-all rounded ${
                  beepType === 'glitch' 
                    ? 'bg-green-900/50 text-green-300 border border-green-500' 
                    : 'text-green-500 hover:bg-green-900/30 border border-green-500/30'
                }`}
                style={{
                  textShadow: beepType === 'glitch' ? '0 0 10px rgba(0, 255, 0, 0.8)' : 'none'
                }}
              >
                {language === 'tr' ? 'GLITCH' : 'GLITCH'}
              </button>
              <button
                onClick={() => {
                  setBeepType('radar');
                  playBeep('radar');
                }}
                className={`w-full px-3 py-1 text-xs font-mono transition-all rounded ${
                  beepType === 'radar' 
                    ? 'bg-green-900/50 text-green-300 border border-green-500' 
                    : 'text-green-500 hover:bg-green-900/30 border border-green-500/30'
                }`}
                style={{
                  textShadow: beepType === 'radar' ? '0 0 10px rgba(0, 255, 0, 0.8)' : 'none'
                }}
              >
                {language === 'tr' ? 'RADAR' : 'RADAR'}
              </button>
              <button
                onClick={() => {
                  setBeepType('digital');
                  playBeep('digital');
                }}
                className={`w-full px-3 py-1 text-xs font-mono transition-all rounded ${
                  beepType === 'digital' 
                    ? 'bg-green-900/50 text-green-300 border border-green-500' 
                    : 'text-green-500 hover:bg-green-900/30 border border-green-500/30'
                }`}
                style={{
                  textShadow: beepType === 'digital' ? '0 0 10px rgba(0, 255, 0, 0.8)' : 'none'
                }}
              >
                {language === 'tr' ? 'DİJİTAL' : 'DIGITAL'}
              </button>
              <button
                onClick={() => {
                  setBeepType('classic');
                  playBeep('classic');
                }}
                className={`w-full px-3 py-1 text-xs font-mono transition-all rounded ${
                  beepType === 'classic' 
                    ? 'bg-green-900/50 text-green-300 border border-green-500' 
                    : 'text-green-500 hover:bg-green-900/30 border border-green-500/30'
                }`}
                style={{
                  textShadow: beepType === 'classic' ? '0 0 10px rgba(0, 255, 0, 0.8)' : 'none'
                }}
              >
                {language === 'tr' ? 'KLASİK' : 'CLASSIC'}
              </button>
            </div>

            {/* Close Button */}
            <button
              onClick={() => setShowSoundModal(false)}
              className="w-full mt-4 px-3 py-2 bg-black hover:bg-red-900/50 text-red-500 rounded border border-red-500 font-bold transition-all uppercase tracking-wider text-xs"
              style={{
                textShadow: '0 0 10px rgba(255, 0, 0, 0.6)'
              }}
            >
              {language === 'tr' ? '[KAPAT]' : '[CLOSE]'}
            </button>
          </div>
        </div>
      )}

      {/* Hacker-style Exit Button - Bottom Right */}
      <button
        onClick={handleClose}
        className="fixed bottom-4 right-4 z-10 w-16 px-3 py-2 bg-black hover:bg-red-900/50 text-red-500 rounded border border-red-500 font-bold transition-all uppercase tracking-wider text-xs"
        style={{
          fontFamily: 'monospace',
          textShadow: '0 0 10px rgba(255, 0, 0, 0.8)',
          boxShadow: '0 0 15px rgba(255, 0, 0, 0.4)',
          animation: 'pulse 2s infinite'
        }}
      >
        [X]
      </button>

      {/* Pinned Latest News - Top (Yellow) with Typewriter Effect - Clickable */}
      <a
        href={latestNews?.url}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute top-0 left-0 right-0 bg-black py-4 px-6 z-10 cursor-pointer hover:bg-yellow-900/10 transition-colors"
        title={language === 'tr' ? 'Kaynağa git' : 'Go to source'}
      >
        <div className="flex items-center gap-4">
          <span 
            className="text-yellow-500 font-bold text-sm uppercase tracking-wider"
            style={{
              fontFamily: 'monospace',
              textShadow: '0 0 10px rgba(255, 255, 0, 0.8)',
              animation: 'flashAlert 1s ease-in-out infinite'
            }}
          >
            {language === 'tr' ? '⚠ SON DAKİKA ⚠' : '⚠ BREAKING ⚠'}
          </span>
          <div 
            id="breaking-news-text"
            className="flex-1 text-yellow-400 font-bold text-xl"
            style={{
              fontFamily: 'monospace',
              textShadow: '0 0 15px rgba(255, 255, 0, 0.6)'
            }}
          >
            <TypewriterText text={latestSummary} speed={50} />
          </div>
        </div>
      </a>

      {/* Hacker Terminal Header */}
      <div className="absolute top-28 left-0 right-0 border-b border-green-900">
        <div className="flex items-center justify-between px-6 py-2">
          <div className="flex items-center gap-4 text-green-500 font-mono text-xs">
            <span className="animate-pulse">◉ LIVE</span>
            <span className="opacity-60">STREAM ACTIVE</span>
          </div>
        </div>
      </div>

      {/* Scrolling News */}
      <div className="absolute top-40 left-0 right-0 bottom-0 overflow-y-auto overflow-x-hidden px-6 scrollbar-hide">
        <div className="flex flex-col gap-6 py-4">
          {scrollingNews.map((newsItem, index) => {
            const summary = translations[newsItem.id]?.summary || newsItem.title;
            const sentiment = translations[newsItem.id]?.sentiment;
            
            return (
              <a
                key={newsItem.id}
                href={newsItem.url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full border-l-2 border-green-900 pl-4 cursor-pointer hover:border-green-400 transition-all"
                style={{
                  fontFamily: 'monospace',
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  color: sentiment === 'positive' 
                    ? '#00FF00' 
                    : sentiment === 'negative' 
                    ? '#FF4444' 
                    : '#00DD00',
                  textShadow: sentiment === 'positive'
                    ? '0 0 10px rgba(0, 255, 0, 0.8)'
                    : sentiment === 'negative'
                    ? '0 0 10px rgba(255, 68, 68, 0.8)'
                    : '0 0 10px rgba(0, 221, 0, 0.6)',
                  opacity: 0.9,
                  letterSpacing: '0.05em',
                  wordBreak: 'break-word',
                  animation: 'fadeInUp 0.5s ease-out',
                  textDecoration: 'none'
                }}
              >
                <div className="text-green-700 text-xs mb-1 flex items-center gap-2">
                  <span>[{String(index + 1).padStart(3, '0')}]</span>
                  <span>{new Date().toLocaleTimeString('en-US', { hour12: false })}</span>
                </div>
                <div>▸ {summary}</div>
              </a>
            );
          })}
        </div>
      </div>

      {/* API Health Monitor - Bottom Left */}
      <ApiHealthMonitor language={language} />

      {/* Grid Background Effect */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-10"
        style={{
          backgroundImage: 'linear-gradient(0deg, transparent 24%, rgba(0, 255, 0, .05) 25%, rgba(0, 255, 0, .05) 26%, transparent 27%, transparent 74%, rgba(0, 255, 0, .05) 75%, rgba(0, 255, 0, .05) 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, rgba(0, 255, 0, .05) 25%, rgba(0, 255, 0, .05) 26%, transparent 27%, transparent 74%, rgba(0, 255, 0, .05) 75%, rgba(0, 255, 0, .05) 76%, transparent 77%, transparent)',
          backgroundSize: '50px 50px'
        }}
      />

      {/* Scanline Effect */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'repeating-linear-gradient(0deg, rgba(0, 255, 0, 0.03) 0px, transparent 1px, transparent 2px, rgba(0, 255, 0, 0.03) 3px)',
          animation: 'scanline 8s linear infinite'
        }}
      />

      {/* Glitch Overlay */}
      <GlitchOverlay />

      {/* CPU/Memory Bars - Bottom Center */}
      <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 flex gap-4 text-green-500 font-mono text-xs">
        <div className="flex items-center gap-2">
          <span>CPU</span>
          <div className="w-24 h-2 bg-green-900 rounded overflow-hidden">
            <div 
              className="h-full bg-green-500"
              style={{ 
                width: '75%',
                animation: 'pulse 2s infinite'
              }}
            />
          </div>
          <span>75%</span>
        </div>
        <div className="flex items-center gap-2">
          <span>MEM</span>
          <div className="w-24 h-2 bg-green-900 rounded overflow-hidden">
            <div 
              className="h-full bg-green-500"
              style={{ 
                width: '60%',
                animation: 'pulse 2s infinite 0.5s'
              }}
            />
          </div>
          <span>60%</span>
        </div>
      </div>

      <style jsx>{`
        @keyframes blink {
          0%, 49%, 100% {
            opacity: 1;
          }
          50%, 99% {
            opacity: 0.3;
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 0.6;
          }
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 0.9;
            transform: translateY(0);
          }
        }

        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(100%);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes fall {
          from {
            transform: translateY(-100%);
            opacity: 0;
          }
          to {
            transform: translateY(100vh);
            opacity: 1;
          }
        }

        @keyframes scanline {
          0% {
            transform: translateY(0);
          }
          100% {
            transform: translateY(50px);
          }
        }

        @keyframes glitchSweep {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }

        @keyframes glitchText {
          0%, 100% {
            transform: translateX(0);
          }
          25% {
            transform: translateX(-2px);
          }
          75% {
            transform: translateX(2px);
          }
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.7;
          }
        }

        @keyframes tvShutdown {
          0% {
            transform: scaleY(1) scaleX(1);
            opacity: 1;
          }
          50% {
            transform: scaleY(0.01) scaleX(1);
            opacity: 0.8;
          }
          100% {
            transform: scaleY(0) scaleX(0);
            opacity: 0;
          }
        }

        @keyframes flashAlert {
          0%, 100% {
            opacity: 1;
            text-shadow: 0 0 10px rgba(255, 255, 0, 0.8);
          }
          50% {
            opacity: 0.6;
            text-shadow: 0 0 20px rgba(255, 255, 0, 1);
          }
        }

        @keyframes slideInFromRight {
          0% {
            transform: translateX(100%);
            opacity: 0;
          }
          100% {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
