'use client';

import type React from 'react';
import { useState, useRef, useEffect } from 'react';
import { X, Minimize2, Play, Pause, Square, SkipForward, SkipBack } from 'lucide-react';

interface WinampPlayerProps {
  isOpen: boolean;
  onClose: () => void;
  onPlayingChange?: (isPlaying: boolean) => void;
  theme?: 'xp' | '80s' | 'vaporwave' | 'win95';
}

declare global {
  interface Window {
    SC: any;
  }
}

const FM_STATIONS = [
  {
    name: 'NON STOP POP FM',
    url: 'https://w.soundcloud.com/player/?url=https%3A//soundcloud.com/user-182820366/gta-v-non-stop-pop-fm&color=%23ff5500&auto_play=false&hide_related=true&show_comments=false&show_user=false&show_reposts=false&show_teaser=false',
  },
  {
    name: 'THE BEAT 102.7',
    url: 'https://w.soundcloud.com/player/?url=https%3A//soundcloud.com/tobii-tick-tock/gta-iv-beat-1027&color=%23ff5500&auto_play=false&hide_related=true&show_comments=false&show_user=false&show_reposts=false&show_teaser=false',
  },
  {
    name: 'HEAD RADIO',
    url: 'https://w.soundcloud.com/player/?url=https%3A//soundcloud.com/furtheram-10/grand-theft-auto-iii-gta-3&color=%23ff5500&auto_play=false&hide_related=true&show_comments=false&show_user=false&show_reposts=false&show_teaser=false',
  },
  {
    name: 'FLASH FM',
    url: 'https://w.soundcloud.com/player/?url=https%3A//soundcloud.com/tiprat911/flash-fm-gta-vice-city-full&color=%23ff5500&auto_play=false&hide_related=true&show_comments=false&show_user=false&show_reposts=false&show_teaser=false',
  },
  {
    name: 'LITHIUM FM',
    url: 'https://w.soundcloud.com/player/?url=https%3A//soundcloud.com/furtheram/sets/grand-theft-auto-2-gta-2-radio&color=%23ff5500&auto_play=false&hide_related=true&show_comments=false&show_user=false&show_reposts=false&show_teaser=false',
  },
];

export function WinampPlayer({ isOpen, onClose, onPlayingChange, theme = 'xp' }: WinampPlayerProps): React.JSX.Element | null {
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [widgets, setWidgets] = useState<any[]>([]);
  const [widgetsReady, setWidgetsReady] = useState<boolean[]>([]);
  const [currentStation, setCurrentStation] = useState<number>(0);
  const iframeRefs = useRef<(HTMLIFrameElement | null)[]>([]);

  // Draggable state
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 8, y: 100 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const windowRef = useRef<HTMLDivElement>(null);

  // Set initial position based on window height (client-side only)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setPosition({ x: 8, y: window.innerHeight - 250 });
    }
  }, []);

  // Load SoundCloud Widget API and initialize all widgets
  useEffect(() => {
    if (!isOpen) return;

    // Check if script already exists
    const existingScript = document.querySelector('script[src="https://w.soundcloud.com/player/api.js"]');
    
    const initWidgets = () => {
      if (window.SC) {
        const newWidgets: any[] = [];
        
        const readyStates: boolean[] = [];
        
        iframeRefs.current.forEach((iframe, index) => {
          if (iframe) {
            const scWidget = window.SC.Widget(iframe);
            newWidgets[index] = scWidget;
            readyStates[index] = false;
            
            // Bind events for each widget
            scWidget.bind(window.SC.Widget.Events.READY, () => {
              console.log(`Widget ${index} (${FM_STATIONS[index].name}) is ready`);
              setWidgetsReady(prev => {
                const updated = [...prev];
                updated[index] = true;
                return updated;
              });
            });
            
            // Listen to PLAY event
            scWidget.bind(window.SC.Widget.Events.PLAY, () => {
              if (index === currentStation) {
                setIsPlaying(true);
              }
            });
            
            // Listen to PAUSE event
            scWidget.bind(window.SC.Widget.Events.PAUSE, () => {
              if (index === currentStation) {
                setIsPlaying(false);
              }
            });
          }
        });
        
        setWidgets(newWidgets);
        setWidgetsReady(readyStates);
      }
    };

    if (existingScript) {
      // Script already loaded, just init widgets
      if (window.SC) {
        initWidgets();
      } else {
        // Wait for it to load
        existingScript.addEventListener('load', initWidgets);
      }
    } else {
      // Load script for the first time
      const script = document.createElement('script');
      script.src = 'https://w.soundcloud.com/player/api.js';
      script.async = true;
      document.body.appendChild(script);

      script.onload = initWidgets;
    }
  }, [isOpen]); // Only run once when opened

  // Update playing state when station changes
  useEffect(() => {
    if (widgets.length === 0) return;
    
    const currentWidget = widgets[currentStation];
    if (currentWidget) {
      // Check if current widget is playing
      currentWidget.isPaused((paused: boolean) => {
        setIsPlaying(!paused);
      });
    }
  }, [currentStation, widgets]);

  // Draggable functionality
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent): void => {
      if (!isDragging) return;
      
      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;
      
      // Keep window within viewport bounds
      const maxX = window.innerWidth - 275;
      const maxY = window.innerHeight - 300;
      
      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY))
      });
    };

    const handleMouseUp = (): void => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>): void => {
    if (!windowRef.current) return;
    
    const rect = windowRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
    setIsDragging(true);
  };

  if (!isOpen) return null;

  const getCurrentWidget = () => widgets[currentStation];

  const handlePlay = (): void => {
    const widget = getCurrentWidget();
    if (widget) {
      // Check if widget is ready
      if (widgetsReady[currentStation]) {
        // Widget is ready, play immediately
        widget.play();
        setIsPlaying(true);
        onPlayingChange?.(true);
      } else {
        // Widget not ready yet, wait for READY event then play
        const playWhenReady = () => {
          widget.play();
          setIsPlaying(true);
          onPlayingChange?.(true);
          widget.unbind(window.SC.Widget.Events.READY);
        };
        widget.bind(window.SC.Widget.Events.READY, playWhenReady);
      }
    }
  };

  const handlePause = (): void => {
    const widget = getCurrentWidget();
    if (widget) {
      widget.pause();
      setIsPlaying(false);
      onPlayingChange?.(false);
    }
  };

  const handleStop = (): void => {
    const widget = getCurrentWidget();
    if (widget) {
      widget.pause();
      widget.seekTo(0);
      setIsPlaying(false);
      onPlayingChange?.(false);
    }
  };

  const nextStation = (): void => {
    const wasPlaying = isPlaying;
    
    // Pause current station if playing
    const currentWidget = getCurrentWidget();
    if (currentWidget && wasPlaying) {
      currentWidget.pause();
    }

    // Switch to next station
    const nextIndex = (currentStation + 1) % FM_STATIONS.length;
    setCurrentStation(nextIndex);

    // If was playing, start playing the new station
    if (wasPlaying) {
      setTimeout(() => {
        const nextWidget = widgets[nextIndex];
        if (nextWidget) {
          nextWidget.play();
          setIsPlaying(true);
        }
      }, 100);
    } else {
      // Update state to reflect new station's paused state
      setTimeout(() => {
        const nextWidget = widgets[nextIndex];
        if (nextWidget) {
          nextWidget.isPaused((paused: boolean) => {
            setIsPlaying(!paused);
          });
        }
      }, 100);
    }
  };

  const prevStation = (): void => {
    const wasPlaying = isPlaying;
    
    // Pause current station if playing
    const currentWidget = getCurrentWidget();
    if (currentWidget && wasPlaying) {
      currentWidget.pause();
    }

    // Switch to previous station
    const prevIndex = (currentStation - 1 + FM_STATIONS.length) % FM_STATIONS.length;
    setCurrentStation(prevIndex);

    // If was playing, start playing the new station
    if (wasPlaying) {
      setTimeout(() => {
        const prevWidget = widgets[prevIndex];
        if (prevWidget) {
          prevWidget.play();
          setIsPlaying(true);
        }
      }, 100);
    } else {
      // Update state to reflect new station's paused state
      setTimeout(() => {
        const prevWidget = widgets[prevIndex];
        if (prevWidget) {
          prevWidget.isPaused((paused: boolean) => {
            setIsPlaying(!paused);
          });
        }
      }, 100);
    }
  };

  if (isMinimized) {
    return (
      <div className="fixed bottom-12 left-2 z-30" style={{ width: '200px' }}>
        <div 
          className="bg-gradient-to-r from-[#3F51B5] to-[#283593] rounded px-3 py-1.5 cursor-pointer shadow-lg border border-[#1A237E] flex items-center justify-between"
          onClick={() => setIsMinimized(false)}
        >
          <span className="text-white text-xs font-bold" style={{ fontFamily: 'Tahoma, sans-serif' }}>
            🎵 VoltMP
          </span>
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div 
        ref={windowRef}
        className="fixed z-30"
        style={{ 
          width: '275px',
          left: `${position.x}px`,
          top: `${position.y}px`,
          animation: 'slideInUp 0.3s ease-out',
          cursor: isDragging ? 'grabbing' : 'default'
        }}
      >
        {/* Classic VoltMP Window */}
        <div 
          className="rounded overflow-hidden"
          style={{
            background: 'linear-gradient(180deg, #4A4A4A 0%, #2B2B2B 100%)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
            border: '1px solid #1a1a1a'
          }}
        >
          {/* Title Bar - Draggable */}
          <div 
            className="px-2 py-1 flex items-center justify-between"
            style={{
              background: 'linear-gradient(180deg, #5294E2 0%, #1E57A3 100%)',
              borderBottom: '1px solid #0D3D7F',
              cursor: 'grab'
            }}
            onMouseDown={handleMouseDown}
          >
            <div className="flex items-center gap-2">
              {/* Theme-aware Winamp Logo in title bar */}
              <svg width="14" height="14" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id={`winampLogoGradient-${theme}`} x1="0%" y1="0%" x2="100%" y2="100%">
                    {theme === '80s' ? (
                      <>
                        <stop offset="0%" stopColor="#39FF14" />
                        <stop offset="100%" stopColor="#00FF00" />
                      </>
                    ) : theme === 'vaporwave' ? (
                      <>
                        <stop offset="0%" stopColor="#FF6FD8" />
                        <stop offset="100%" stopColor="#00D9FF" />
                      </>
                    ) : theme === 'win95' ? (
                      <>
                        <stop offset="0%" stopColor="#008080" />
                        <stop offset="100%" stopColor="#00C0C0" />
                      </>
                    ) : (
                      <>
                        <stop offset="0%" stopColor="#FF8500" />
                        <stop offset="100%" stopColor="#FFA500" />
                      </>
                    )}
                  </linearGradient>
                </defs>
                <path d="M28 8 L16 24 L22 24 L18 40 L32 20 L26 20 L28 8 Z" fill={`url(#winampLogoGradient-${theme})`} stroke="white" strokeWidth="1"/>
              </svg>
              <span className="text-white text-xs font-bold" style={{ fontFamily: 'Tahoma, sans-serif', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
                VoltMP
              </span>
            </div>
            <div className="flex gap-1">
              <button 
                className="w-4 h-4 bg-gradient-to-b from-blue-400 to-blue-600 hover:from-blue-300 hover:to-blue-500 rounded-sm flex items-center justify-center transition-all border border-blue-800"
                onClick={() => setIsMinimized(true)}
                onMouseDown={(e) => e.stopPropagation()}
                title="Minimize"
              >
                <Minimize2 className="w-2 h-2 text-white" />
              </button>
              <button 
                className="w-4 h-4 bg-gradient-to-b from-red-400 to-red-600 hover:from-red-300 hover:to-red-500 rounded-sm flex items-center justify-center transition-all border border-red-800"
                onClick={onClose}
                onMouseDown={(e) => e.stopPropagation()}
                title="Close"
              >
                <X className="w-2 h-2 text-white" />
              </button>
            </div>
          </div>

          {/* Main Content */}
          <div className="p-2">
            {/* LED Display Screen */}
            <div 
              className="rounded mb-2 p-2 relative overflow-hidden"
              style={{
                background: '#000000',
                border: '2px solid #1a1a1a',
                boxShadow: 'inset 0 2px 8px rgba(0, 0, 0, 0.8)'
              }}
            >
              {/* LED Grid Pattern */}
              <div 
                className="absolute inset-0 opacity-5"
                style={{
                  backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(0,255,0,0.03) 1px, rgba(0,255,0,0.03) 2px)',
                }}
              />
              
              {/* Song Title - LED Style */}
              <div 
                className="text-center mb-1 relative z-10"
                style={{
                  fontFamily: 'Courier New, monospace',
                  fontSize: '10px',
                  fontWeight: 'bold',
                  color: '#00FF00',
                  textShadow: '0 0 8px #00FF00, 0 0 12px #00FF00',
                  letterSpacing: '0.5px'
                }}
              >
                {FM_STATIONS[currentStation].name}
              </div>
              
              {/* Status Indicator */}
              <div className="flex items-center justify-center gap-2">
                {isPlaying ? (
                  <div 
                    className="flex items-center gap-1"
                    style={{
                      fontFamily: 'Courier New, monospace',
                      fontSize: '9px',
                      color: '#00FF00',
                      textShadow: '0 0 6px #00FF00'
                    }}
                  >
                    <span>▶</span>
                    <span className="animate-pulse">PLAYING</span>
                    <div className="flex gap-0.5">
                      <div className="w-1 h-2 bg-green-400 animate-pulse" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-1 h-3 bg-green-400 animate-pulse" style={{ animationDelay: '100ms' }}></div>
                      <div className="w-1 h-4 bg-green-400 animate-pulse" style={{ animationDelay: '200ms' }}></div>
                      <div className="w-1 h-3 bg-green-400 animate-pulse" style={{ animationDelay: '300ms' }}></div>
                      <div className="w-1 h-2 bg-green-400 animate-pulse" style={{ animationDelay: '400ms' }}></div>
                    </div>
                  </div>
                ) : (
                  <div 
                    style={{
                      fontFamily: 'Courier New, monospace',
                      fontSize: '9px',
                      color: '#00CC00',
                      textShadow: '0 0 4px #00CC00'
                    }}
                  >
                    ⏸ PAUSED
                  </div>
                )}
              </div>
            </div>

            {/* Only render active SoundCloud Player - saves CPU/Memory */}
            <div className="absolute" style={{ left: '-9999px' }}>
              <iframe
                key={currentStation}
                ref={(el) => { iframeRefs.current[currentStation] = el; }}
                width="100%"
                height="166"
                scrolling="no"
                frameBorder="no"
                allow="autoplay"
                src={FM_STATIONS[currentStation].url}
              ></iframe>
            </div>

            {/* FM Station Switcher */}
            <div className="flex items-center justify-center gap-1 mb-2">
              <button
                onClick={prevStation}
                className="group relative"
                style={{
                  width: '24px',
                  height: '24px',
                  background: 'linear-gradient(180deg, #4a4a4a 0%, #2a2a2a 100%)',
                  border: '1px solid #1a1a1a',
                  borderRadius: '2px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
                }}
                title="Previous Station"
              >
                <div className="absolute inset-0 flex items-center justify-center">
                  <SkipBack 
                    className="w-3 h-3"
                    style={{
                      color: '#00AAFF',
                      filter: 'drop-shadow(0 0 3px #00AAFF)',
                      fill: '#00AAFF'
                    }}
                  />
                </div>
              </button>

              <div 
                className="px-3 py-1 rounded"
                style={{
                  background: '#0a0a0a',
                  border: '1px solid #1a1a1a',
                  fontFamily: 'Courier New, monospace',
                  fontSize: '8px',
                  color: '#00FF00',
                  textShadow: '0 0 3px #00FF00'
                }}
              >
                FM {currentStation + 1}/{FM_STATIONS.length}
              </div>

              <button
                onClick={nextStation}
                className="group relative"
                style={{
                  width: '24px',
                  height: '24px',
                  background: 'linear-gradient(180deg, #4a4a4a 0%, #2a2a2a 100%)',
                  border: '1px solid #1a1a1a',
                  borderRadius: '2px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
                }}
                title="Next Station"
              >
                <div className="absolute inset-0 flex items-center justify-center">
                  <SkipForward 
                    className="w-3 h-3"
                    style={{
                      color: '#00AAFF',
                      filter: 'drop-shadow(0 0 3px #00AAFF)',
                      fill: '#00AAFF'
                    }}
                  />
                </div>
              </button>
            </div>

            {/* Control Buttons - Classic VoltMP Style */}
            <div className="flex items-center justify-center gap-1.5">
              {/* Play Button */}
              <button
                onClick={handlePlay}
                disabled={isPlaying}
                className="group relative"
                style={{
                  width: '28px',
                  height: '28px',
                  background: isPlaying 
                    ? 'linear-gradient(180deg, #2a2a2a 0%, #1a1a1a 100%)'
                    : 'linear-gradient(180deg, #4a4a4a 0%, #2a2a2a 100%)',
                  border: '1px solid #1a1a1a',
                  borderRadius: '2px',
                  boxShadow: isPlaying 
                    ? 'inset 0 1px 3px rgba(0,0,0,0.6)' 
                    : '0 1px 3px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
                }}
                title="Play"
              >
                <div className="absolute inset-0 flex items-center justify-center">
                  <Play 
                    className="w-4 h-4 transition-colors"
                    style={{
                      color: isPlaying ? '#00AA00' : '#00FF00',
                      filter: isPlaying ? 'drop-shadow(0 0 2px #00FF00)' : 'drop-shadow(0 0 4px #00FF00)',
                      fill: isPlaying ? '#00AA00' : '#00FF00'
                    }}
                  />
                </div>
              </button>

              {/* Pause Button */}
              <button
                onClick={handlePause}
                disabled={!isPlaying}
                className="group relative"
                style={{
                  width: '28px',
                  height: '28px',
                  background: !isPlaying 
                    ? 'linear-gradient(180deg, #2a2a2a 0%, #1a1a1a 100%)'
                    : 'linear-gradient(180deg, #4a4a4a 0%, #2a2a2a 100%)',
                  border: '1px solid #1a1a1a',
                  borderRadius: '2px',
                  boxShadow: !isPlaying 
                    ? 'inset 0 1px 3px rgba(0,0,0,0.6)' 
                    : '0 1px 3px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
                }}
                title="Pause"
              >
                <div className="absolute inset-0 flex items-center justify-center">
                  <Pause 
                    className="w-4 h-4 transition-colors"
                    style={{
                      color: !isPlaying ? '#666666' : '#FFD700',
                      filter: !isPlaying ? 'none' : 'drop-shadow(0 0 4px #FFD700)',
                      fill: !isPlaying ? '#666666' : '#FFD700'
                    }}
                  />
                </div>
              </button>

              {/* Stop Button */}
              <button
                onClick={handleStop}
                className="group relative"
                style={{
                  width: '28px',
                  height: '28px',
                  background: 'linear-gradient(180deg, #4a4a4a 0%, #2a2a2a 100%)',
                  border: '1px solid #1a1a1a',
                  borderRadius: '2px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
                }}
                title="Stop"
              >
                <div className="absolute inset-0 flex items-center justify-center">
                  <Square 
                    className="w-3.5 h-3.5 transition-colors"
                    style={{
                      color: '#FF4444',
                      filter: 'drop-shadow(0 0 4px #FF4444)',
                      fill: '#FF4444'
                    }}
                  />
                </div>
              </button>
            </div>

            {/* Bottom Info Bar */}
            <div 
              className="mt-2 px-2 py-1 rounded text-center"
              style={{
                background: '#1a1a1a',
                border: '1px solid #0a0a0a'
              }}
            >
              <p 
                className="text-[9px] font-bold"
                style={{ 
                  fontFamily: 'Tahoma, sans-serif',
                  color: '#00CC00',
                  textShadow: '0 0 3px #00CC00'
                }}
              >
                VOLTMP v5.666
              </p>
            </div>
          </div>
        </div>

        <style jsx>{`
          @keyframes slideInUp {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}</style>
      </div>
    </>
  );
}
