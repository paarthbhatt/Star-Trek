'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export type PhotoFilter = 'none' | 'cinematic' | 'vintage' | 'noir' | 'cool' | 'warm' | 'dramatic';

interface PhotoModeProps {
  visible: boolean;
  onExit: () => void;
  canvasRef?: React.RefObject<HTMLCanvasElement | null>;
}

const FILTERS: { id: PhotoFilter; name: string; css: string }[] = [
  { id: 'none', name: 'None', css: '' },
  { id: 'cinematic', name: 'Cinematic', css: 'contrast(1.1) saturate(1.2)' },
  { id: 'vintage', name: 'Vintage', css: 'sepia(0.3) contrast(1.1) brightness(1.1)' },
  { id: 'noir', name: 'Noir', css: 'grayscale(1) contrast(1.3)' },
  { id: 'cool', name: 'Cool', css: 'saturate(1.1) hue-rotate(-10deg) brightness(1.05)' },
  { id: 'warm', name: 'Warm', css: 'saturate(1.2) hue-rotate(10deg) sepia(0.1)' },
  { id: 'dramatic', name: 'Dramatic', css: 'contrast(1.3) saturate(1.3) brightness(0.9)' },
];

export function PhotoMode({ visible, onExit, canvasRef }: PhotoModeProps) {
  const [activeFilter, setActiveFilter] = useState<PhotoFilter>('none');
  const [showControls, setShowControls] = useState(true);
  const [isCapturing, setIsCapturing] = useState(false);
  const [showFlash, setShowFlash] = useState(false);
  const hideControlsTimer = useRef<NodeJS.Timeout | null>(null);

  // Auto-hide controls after inactivity
  useEffect(() => {
    if (!visible) return;

    const resetTimer = () => {
      setShowControls(true);
      if (hideControlsTimer.current) {
        clearTimeout(hideControlsTimer.current);
      }
      hideControlsTimer.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    };

    const handleMouseMove = () => resetTimer();
    window.addEventListener('mousemove', handleMouseMove);
    resetTimer();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (hideControlsTimer.current) {
        clearTimeout(hideControlsTimer.current);
      }
    };
  }, [visible]);

  // Apply filter to canvas
  useEffect(() => {
    if (!visible) return;
    
    const canvas = document.querySelector('canvas');
    if (canvas) {
      const filter = FILTERS.find(f => f.id === activeFilter);
      canvas.style.filter = filter?.css || '';
    }

    return () => {
      const canvas = document.querySelector('canvas');
      if (canvas) {
        canvas.style.filter = '';
      }
    };
  }, [visible, activeFilter]);

  const captureScreenshot = useCallback(async () => {
    setIsCapturing(true);
    setShowFlash(true);
    
    // Hide controls for capture
    setShowControls(false);
    
    // Wait for UI to hide
    await new Promise(resolve => setTimeout(resolve, 100));
    
    try {
      const canvas = document.querySelector('canvas');
      if (!canvas) {
        console.error('No canvas found');
        return;
      }

      // Create a temporary canvas to apply filter
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      const ctx = tempCanvas.getContext('2d');
      
      if (ctx) {
        // Apply filter
        const filter = FILTERS.find(f => f.id === activeFilter);
        if (filter?.css) {
          ctx.filter = filter.css;
        }
        
        ctx.drawImage(canvas, 0, 0);
        
        // Download image
        const link = document.createElement('a');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        link.download = `enterprise-${timestamp}.png`;
        link.href = tempCanvas.toDataURL('image/png');
        link.click();
      }
    } catch (error) {
      console.error('Screenshot capture failed:', error);
    } finally {
      // Remove flash
      setTimeout(() => {
        setShowFlash(false);
        setIsCapturing(false);
        setShowControls(true);
      }, 200);
    }
  }, [activeFilter]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!visible) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Enter':
        case ' ':
          e.preventDefault();
          captureScreenshot();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          setActiveFilter(prev => {
            const idx = FILTERS.findIndex(f => f.id === prev);
            return FILTERS[(idx - 1 + FILTERS.length) % FILTERS.length].id;
          });
          break;
        case 'ArrowRight':
          e.preventDefault();
          setActiveFilter(prev => {
            const idx = FILTERS.findIndex(f => f.id === prev);
            return FILTERS[(idx + 1) % FILTERS.length].id;
          });
          break;
        case 'Tab':
          e.preventDefault();
          setShowControls(prev => !prev);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [visible, captureScreenshot]);

  if (!visible) return null;

  return (
    <>
      {/* Camera Flash Effect */}
      <AnimatePresence>
        {showFlash && (
          <motion.div
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-white z-[100] pointer-events-none"
          />
        )}
      </AnimatePresence>

      {/* Photo Mode UI */}
      <AnimatePresence>
        {showControls && !isCapturing && (
          <>
            {/* Top Bar - Mode indicator */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="fixed top-4 left-1/2 -translate-x-1/2 z-50"
            >
              <div className="bg-black/80 backdrop-blur-sm border border-cyan-500/50 rounded-lg px-6 py-3 flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="text-cyan-400 font-bold tracking-wider">PHOTO MODE</span>
                </div>
                <div className="w-px h-6 bg-cyan-500/30" />
                <button
                  onClick={onExit}
                  className="text-gray-400 hover:text-white text-sm flex items-center gap-1 transition-colors"
                >
                  <kbd className="bg-gray-800 px-1.5 py-0.5 rounded text-xs">P</kbd>
                  <span>Exit</span>
                </button>
              </div>
            </motion.div>

            {/* Bottom Controls */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50"
            >
              <div className="bg-black/80 backdrop-blur-sm border border-cyan-500/50 rounded-lg p-4">
                {/* Filter Selection */}
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-gray-400 text-sm mr-2">Filter:</span>
                  {FILTERS.map((filter) => (
                    <button
                      key={filter.id}
                      onClick={() => setActiveFilter(filter.id)}
                      className={`px-3 py-1.5 rounded text-sm font-mono transition-all ${
                        activeFilter === filter.id
                          ? 'bg-cyan-500/30 text-cyan-400 border border-cyan-500/50'
                          : 'bg-gray-800/50 text-gray-400 border border-gray-700 hover:border-gray-500'
                      }`}
                    >
                      {filter.name}
                    </button>
                  ))}
                </div>

                {/* Capture Button */}
                <div className="flex items-center justify-center gap-4">
                  <button
                    onClick={captureScreenshot}
                    disabled={isCapturing}
                    className="group relative px-8 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded-lg transition-all disabled:opacity-50"
                  >
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="text-white font-bold tracking-wide">CAPTURE</span>
                    </div>
                    <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-gray-500 text-xs whitespace-nowrap">
                      Press <kbd className="bg-gray-800 px-1 rounded">ENTER</kbd> or <kbd className="bg-gray-800 px-1 rounded">SPACE</kbd>
                    </div>
                  </button>
                </div>

                {/* Hints */}
                <div className="mt-6 pt-3 border-t border-gray-700 flex justify-center gap-6 text-xs text-gray-500">
                  <span><kbd className="bg-gray-800 px-1 rounded">←</kbd> <kbd className="bg-gray-800 px-1 rounded">→</kbd> Change filter</span>
                  <span><kbd className="bg-gray-800 px-1 rounded">TAB</kbd> Toggle controls</span>
                  <span>Drag to rotate | Scroll to zoom</span>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Viewfinder Frame */}
      <div className="fixed inset-0 pointer-events-none z-40">
        {/* Corner brackets */}
        <div className="absolute top-8 left-8 w-12 h-12 border-l-2 border-t-2 border-cyan-500/30" />
        <div className="absolute top-8 right-8 w-12 h-12 border-r-2 border-t-2 border-cyan-500/30" />
        <div className="absolute bottom-8 left-8 w-12 h-12 border-l-2 border-b-2 border-cyan-500/30" />
        <div className="absolute bottom-8 right-8 w-12 h-12 border-r-2 border-b-2 border-cyan-500/30" />
        
        {/* Center crosshair */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="w-8 h-px bg-cyan-500/20" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-px h-8 bg-cyan-500/20" />
        </div>

        {/* Rule of thirds grid (subtle) */}
        <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-10">
          <div className="border-r border-b border-white" />
          <div className="border-r border-b border-white" />
          <div className="border-b border-white" />
          <div className="border-r border-b border-white" />
          <div className="border-r border-b border-white" />
          <div className="border-b border-white" />
          <div className="border-r border-white" />
          <div className="border-r border-white" />
          <div />
        </div>
      </div>
    </>
  );
}

// Export filter for external use
export function getFilterCSS(filter: PhotoFilter): string {
  return FILTERS.find(f => f.id === filter)?.css || '';
}
