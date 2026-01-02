'use client';

import { motion } from 'framer-motion';
import { KeyboardState } from '@/hooks/useKeyboardState';

interface KeyboardIndicatorProps {
  keys: KeyboardState;
  visible: boolean;
  compact?: boolean;
}

export function KeyboardIndicator({ keys, visible, compact = false }: KeyboardIndicatorProps) {
  if (!visible) return null;

  if (compact) {
    return <CompactIndicator keys={keys} />;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed bottom-28 left-1/2 -translate-x-1/2 z-30 pointer-events-none"
    >
      <div className="bg-black/40 backdrop-blur-sm rounded-lg p-3 border border-cyan-500/20">
        <div className="flex flex-col items-center gap-1">
          {/* Top row: Q W E */}
          <div className="flex gap-1">
            <KeyCap label="Q" pressed={keys.q} subLabel="Roll L" />
            <KeyCap label="W" pressed={keys.w} subLabel="Thrust" />
            <KeyCap label="E" pressed={keys.e} subLabel="Roll R" />
          </div>
          
          {/* Middle row: A S D */}
          <div className="flex gap-1">
            <KeyCap label="A" pressed={keys.a} subLabel="Left" />
            <KeyCap label="S" pressed={keys.s} subLabel="Back" />
            <KeyCap label="D" pressed={keys.d} subLabel="Right" />
          </div>
          
          {/* Bottom: Space */}
          <div className="mt-1">
            <KeyCap label="SPACE" pressed={keys.space} wide subLabel="Warp" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function CompactIndicator({ keys }: { keys: KeyboardState }) {
  // Show a minimal indicator with directional arrows
  const hasMovement = keys.w || keys.a || keys.s || keys.d || keys.q || keys.e;
  
  if (!hasMovement) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 pointer-events-none"
    >
      <div className="flex items-center gap-2 bg-black/40 backdrop-blur-sm rounded-full px-4 py-2 border border-cyan-500/20">
        {keys.w && <Arrow direction="up" />}
        {keys.s && <Arrow direction="down" />}
        {keys.a && <Arrow direction="left" />}
        {keys.d && <Arrow direction="right" />}
        {keys.q && <span className="text-cyan-400 text-xs font-mono">Q</span>}
        {keys.e && <span className="text-cyan-400 text-xs font-mono">E</span>}
      </div>
    </motion.div>
  );
}

function KeyCap({ 
  label, 
  pressed, 
  subLabel,
  wide = false 
}: { 
  label: string; 
  pressed: boolean; 
  subLabel?: string;
  wide?: boolean;
}) {
  return (
    <div className={`
      flex flex-col items-center justify-center
      ${wide ? 'w-20' : 'w-10'} h-10
      rounded border transition-all duration-75
      ${pressed 
        ? 'bg-cyan-500/30 border-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.5)]' 
        : 'bg-gray-800/50 border-gray-700'
      }
    `}>
      <span className={`text-xs font-mono font-bold ${pressed ? 'text-cyan-300' : 'text-gray-400'}`}>
        {label}
      </span>
      {subLabel && (
        <span className={`text-[8px] ${pressed ? 'text-cyan-400/70' : 'text-gray-600'}`}>
          {subLabel}
        </span>
      )}
    </div>
  );
}

function Arrow({ direction }: { direction: 'up' | 'down' | 'left' | 'right' }) {
  const rotations = {
    up: 'rotate-0',
    down: 'rotate-180',
    left: '-rotate-90',
    right: 'rotate-90',
  };

  return (
    <svg 
      className={`w-4 h-4 text-cyan-400 ${rotations[direction]}`}
      fill="currentColor" 
      viewBox="0 0 20 20"
    >
      <path 
        fillRule="evenodd" 
        d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" 
        clipRule="evenodd" 
      />
    </svg>
  );
}

// Thruster indicator for the ship
export function ThrusterIndicator({ 
  forward, 
  backward, 
  left, 
  right, 
  rollLeft, 
  rollRight 
}: {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  rollLeft: boolean;
  rollRight: boolean;
}) {
  return (
    <div className="relative w-16 h-16">
      {/* Ship silhouette */}
      <div className="absolute inset-0 flex items-center justify-center">
        <svg viewBox="0 0 64 64" className="w-full h-full text-gray-600">
          {/* Simple ship shape */}
          <ellipse cx="32" cy="32" rx="12" ry="20" fill="currentColor" />
          <ellipse cx="32" cy="20" rx="20" ry="8" fill="currentColor" />
          <rect x="8" y="40" width="8" height="16" rx="2" fill="currentColor" />
          <rect x="48" y="40" width="8" height="16" rx="2" fill="currentColor" />
        </svg>
      </div>

      {/* Thruster indicators */}
      {forward && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 0.3, repeat: Infinity }}
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-6"
        >
          <div className="w-full h-full bg-gradient-to-t from-orange-500 to-transparent rounded-full blur-sm" />
        </motion.div>
      )}

      {backward && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 0.3, repeat: Infinity }}
          className="absolute top-0 left-1/2 -translate-x-1/2 w-4 h-6"
        >
          <div className="w-full h-full bg-gradient-to-b from-cyan-500 to-transparent rounded-full blur-sm" />
        </motion.div>
      )}

      {left && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 0.3, repeat: Infinity }}
          className="absolute right-0 top-1/2 -translate-y-1/2 w-6 h-4"
        >
          <div className="w-full h-full bg-gradient-to-l from-cyan-500 to-transparent rounded-full blur-sm" />
        </motion.div>
      )}

      {right && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 0.3, repeat: Infinity }}
          className="absolute left-0 top-1/2 -translate-y-1/2 w-6 h-4"
        >
          <div className="w-full h-full bg-gradient-to-r from-cyan-500 to-transparent rounded-full blur-sm" />
        </motion.div>
      )}

      {/* Roll indicators */}
      {rollLeft && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, rotate: -15 }}
          className="absolute inset-0 border-2 border-purple-500/50 rounded-full"
        />
      )}

      {rollRight && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, rotate: 15 }}
          className="absolute inset-0 border-2 border-purple-500/50 rounded-full"
        />
      )}
    </div>
  );
}
