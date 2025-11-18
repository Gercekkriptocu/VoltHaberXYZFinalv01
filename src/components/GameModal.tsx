'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Maximize2, Minimize2 } from 'lucide-react';

interface GameModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  icon: string;
  gameUrl: string;
}

export function GameModal({ isOpen, onClose, title, icon, gameUrl }: GameModalProps): React.JSX.Element | null {
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const modalRef = useRef<HTMLDivElement>(null);
  const dragStartPos = useRef<{ x: number; y: number; initialX: number; initialY: number }>({ 
    x: 0, 
    y: 0, 
    initialX: 0, 
    initialY: 0 
  });

  // Reset position when modal opens
  useEffect(() => {
    if (isOpen) {
      setPosition({ x: 0, y: 0 });
      setIsFullscreen(false);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent): void => {
      if (isDragging && !isFullscreen) {
        e.preventDefault();
        
        const deltaX = e.clientX - dragStartPos.current.x;
        const deltaY = e.clientY - dragStartPos.current.y;
        
        const newX = dragStartPos.current.initialX + deltaX;
        const newY = dragStartPos.current.initialY + deltaY;
        
        setPosition({ x: newX, y: newY });
      }
    };

    const handleMouseUp = (): void => {
      if (isDragging) {
        setIsDragging(false);
      }
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isFullscreen]);

  const handleTitleBarMouseDown = (e: React.MouseEvent<HTMLDivElement>): void => {
    if (!isFullscreen) {
      e.preventDefault();
      setIsDragging(true);
      
      dragStartPos.current = { 
        x: e.clientX, 
        y: e.clientY,
        initialX: position.x,
        initialY: position.y
      };
    }
  };

  const toggleFullscreen = (): void => {
    setIsFullscreen(!isFullscreen);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] bg-black/40 backdrop-blur-sm flex items-center justify-center" style={{ pointerEvents: 'auto' }}>
      <div
        ref={modalRef}
        className="xp-window overflow-hidden"
        style={{
          animation: 'scaleIn 0.3s ease-out',
          position: isFullscreen ? 'fixed' : 'absolute',
          left: isFullscreen ? '0' : position.x !== 0 ? `calc(50% + ${position.x}px)` : '50%',
          top: isFullscreen ? '0' : position.y !== 0 ? `calc(50% + ${position.y}px)` : '50%',
          transform: isFullscreen ? 'none' : 'translate(-50%, -50%)',
          width: isFullscreen ? '100%' : 'calc(100vw - 100px)',
          maxWidth: isFullscreen ? '100%' : '1200px',
          height: isFullscreen ? '100%' : 'calc(90vh)',
          zIndex: 90,
          transition: isFullscreen ? 'all 0.3s ease' : 'none',
          willChange: isDragging ? 'transform' : 'auto'
        }}
      >
        {/* XP Title Bar - Draggable */}
        <div
          className="xp-title-bar"
          onMouseDown={handleTitleBarMouseDown}
          style={{
            cursor: isFullscreen ? 'default' : isDragging ? 'grabbing' : 'grab',
            userSelect: 'none'
          }}
        >
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-white rounded-sm flex items-center justify-center">
              <span className="text-base">{icon}</span>
            </div>
            <span className="text-white text-sm font-bold">{title}</span>
          </div>
          <div className="flex items-center gap-1">
            {/* Fullscreen Toggle Button */}
            <button
              className="xp-control-btn hover:bg-blue-600"
              onClick={toggleFullscreen}
              onMouseDown={(e) => e.stopPropagation()}
              title={isFullscreen ? 'Küçült' : 'Tam Ekran'}
            >
              {isFullscreen ? (
                <Minimize2 className="w-3 h-3 text-white" />
              ) : (
                <Maximize2 className="w-3 h-3 text-white" />
              )}
            </button>
            {/* Close Button */}
            <button 
              className="xp-control-btn xp-close-btn" 
              onClick={onClose}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <X className="w-3 h-3 text-white" />
            </button>
          </div>
        </div>

        {/* Game Content */}
        <div
          className="bg-white"
          style={{
            height: 'calc(100% - 32px)',
            position: 'relative'
          }}
        >
          {/* iframe - Always receives mouse events */}
          <iframe
            src={gameUrl}
            className="w-full h-full border-0"
            title={title}
            allow="fullscreen; autoplay; gamepad; microphone; camera; pointer-lock"
            allowFullScreen
            style={{
              pointerEvents: 'auto',
              position: 'relative',
              zIndex: 1
            }}
          />
          {/* Dragging Overlay - Only visible when dragging to prevent iframe from capturing drag events */}
          {isDragging && (
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 999,
                cursor: 'grabbing',
                pointerEvents: 'auto',
                background: 'transparent'
              }}
            />
          )}
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
