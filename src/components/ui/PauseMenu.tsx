'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface PauseMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onResume: () => void;
  onSettings: () => void;
  onQuit: () => void;
}

export function PauseMenu({
  isOpen,
  onClose,
  onResume,
  onSettings,
  onQuit,
}: PauseMenuProps) {
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showQuitConfirm) {
          setShowQuitConfirm(false);
        } else {
          onClose();
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, showQuitConfirm, onClose]);

  if (!isOpen) return null;

  const menuItems = [
    { label: 'Resume', action: onResume, icon: '▶' },
    { label: 'Settings', action: onSettings, icon: '⚙' },
    { label: 'Quit to Menu', action: () => setShowQuitConfirm(true), icon: '🚪', danger: true },
  ];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center"
      >
        {/* Backdrop */}
        <div 
          className="absolute inset-0 bg-black/80 backdrop-blur-md"
          onClick={onClose}
        />

        {/* Menu Content */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className="relative z-10 w-full max-w-md"
        >
          {/* LCARS-style header */}
          <div className="bg-gradient-to-r from-cyan-600 to-blue-600 rounded-t-xl px-6 py-4">
            <h1 className="text-white text-2xl font-bold tracking-widest">PAUSED</h1>
            <div className="text-cyan-200 text-xs mt-1">USS Enterprise NCC-1701</div>
          </div>

          {/* Menu Items */}
          <div className="bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-b-xl">
            {menuItems.map((item, index) => (
              <button
                key={item.label}
                onClick={item.action}
                className={`
                  w-full px-6 py-4 flex items-center gap-4 text-left
                  transition-colors duration-150
                  ${item.danger 
                    ? 'text-red-400 hover:bg-red-900/30' 
                    : 'text-white hover:bg-cyan-900/30'
                  }
                  ${index < menuItems.length - 1 ? 'border-b border-gray-800' : ''}
                `}
              >
                <span className="text-xl">{item.icon}</span>
                <span className="flex-1 font-semibold tracking-wide">{item.label}</span>
              </button>
            ))}
          </div>

          {/* Controls hint */}
          <div className="text-center text-gray-500 text-xs mt-4">
            Press <kbd className="bg-gray-800 px-2 py-0.5 rounded">ESC</kbd> to resume
          </div>
        </motion.div>

        {/* Quit Confirmation Dialog */}
        <AnimatePresence>
          {showQuitConfirm && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="fixed inset-0 z-20 flex items-center justify-center"
            >
              <div 
                className="absolute inset-0 bg-black/50"
                onClick={() => setShowQuitConfirm(false)}
              />
              <div className="relative bg-gray-900 border border-red-500/50 rounded-xl p-6 max-w-sm">
                <h3 className="text-red-400 text-lg font-bold mb-4">Quit to Menu?</h3>
                <p className="text-gray-400 text-sm mb-6">
                  Any unsaved progress will be lost. Are you sure?
                </p>
                <div className="flex gap-4">
                  <button
                    onClick={() => setShowQuitConfirm(false)}
                    className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={onQuit}
                    className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded transition-colors"
                  >
                    Quit
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}

// Simplified pause button for corner of screen
export function PauseButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="fixed top-4 left-4 z-40 p-2 bg-black/50 hover:bg-black/70 border border-gray-700 rounded-lg transition-colors"
      title="Pause (ESC)"
    >
      <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    </button>
  );
}
