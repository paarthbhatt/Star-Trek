'use client';

import { motion } from 'framer-motion';
import { FlightState } from '@/hooks/useFlightControls';

interface HelmConsoleProps {
  flightState: FlightState | null;
  warpLevel: number;
  destination: string | null;
  eta: string | null;
}

export function HelmConsole({ flightState, warpLevel, destination, eta }: HelmConsoleProps) {
  const impulsePercent = flightState?.impulsePercent ?? 0;
  const speed = flightState?.speed ?? 0;
  const isWarping = flightState?.isWarping ?? false;

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="fixed bottom-0 left-1/2 -translate-x-1/2 mb-4 z-50"
    >
      <div className="flex items-end gap-3">
        {/* Speed/Impulse Display */}
        <div className="bg-black/60 backdrop-blur-sm border border-cyan-500/30 rounded-lg p-3 min-w-[180px]">
          <div className="text-cyan-400/70 text-xs font-mono uppercase tracking-wider mb-1">
            {isWarping ? 'WARP SPEED' : 'IMPULSE POWER'}
          </div>
          
          {/* Speed bar */}
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden mb-2">
            <motion.div
              className={`h-full ${isWarping ? 'bg-gradient-to-r from-blue-500 to-purple-500' : 'bg-gradient-to-r from-orange-500 to-yellow-400'}`}
              initial={{ width: 0 }}
              animate={{ width: `${isWarping ? (warpLevel / 9) * 100 : impulsePercent}%` }}
              transition={{ duration: 0.1 }}
            />
          </div>
          
          <div className="flex justify-between items-baseline">
            <span className={`text-2xl font-bold font-mono ${isWarping ? 'text-purple-400' : 'text-orange-400'}`}>
              {isWarping ? `WARP ${warpLevel}` : `${impulsePercent.toFixed(0)}%`}
            </span>
            <span className="text-gray-400 text-xs font-mono">
              {speed.toFixed(1)} u/s
            </span>
          </div>
        </div>

        {/* Main Helm Display */}
        <div className="bg-black/70 backdrop-blur-sm border border-cyan-500/40 rounded-lg p-4 min-w-[280px]">
          <div className="flex items-center justify-between mb-3">
            <div className="text-cyan-300 font-bold tracking-wider text-sm">HELM CONTROL</div>
            <div className={`w-2 h-2 rounded-full ${impulsePercent > 0 || isWarping ? 'bg-green-500 animate-pulse' : 'bg-gray-600'}`} />
          </div>

          {/* Destination */}
          <div className="mb-2">
            <span className="text-gray-500 text-xs font-mono">DESTINATION: </span>
            <span className="text-cyan-400 font-mono text-sm">
              {destination || 'NOT SET'}
            </span>
          </div>

          {/* ETA */}
          {destination && eta && (
            <div>
              <span className="text-gray-500 text-xs font-mono">ETA: </span>
              <span className="text-yellow-400 font-mono text-sm">{eta}</span>
            </div>
          )}

          {/* Controls hint */}
          <div className="mt-3 pt-2 border-t border-cyan-500/20">
            <div className="text-gray-500 text-[10px] font-mono flex gap-3 flex-wrap">
              <span><kbd className="text-cyan-500">WASD</kbd> Move</span>
              <span><kbd className="text-cyan-500">QE</kbd> Roll</span>
              <span><kbd className="text-cyan-500">SPACE</kbd> Warp</span>
              <span><kbd className="text-cyan-500">X</kbd> Stop</span>
            </div>
          </div>
        </div>

        {/* Warp Level Selector */}
        <div className="bg-black/60 backdrop-blur-sm border border-cyan-500/30 rounded-lg p-3">
          <div className="text-cyan-400/70 text-xs font-mono uppercase tracking-wider mb-2">
            WARP FACTOR
          </div>
          <div className="grid grid-cols-3 gap-1">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((level) => (
              <div
                key={level}
                className={`w-7 h-7 flex items-center justify-center rounded text-xs font-bold font-mono transition-all
                  ${warpLevel === level 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
              >
                {level}
              </div>
            ))}
          </div>
          <div className="text-gray-500 text-[10px] font-mono mt-2 text-center">
            Press 1-9 to select
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Controls overlay showing WASD keys
export function ControlsOverlay({ visible }: { visible: boolean }) {
  if (!visible) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed bottom-32 left-1/2 -translate-x-1/2 pointer-events-none z-40"
    >
      <div className="bg-black/50 backdrop-blur-sm rounded-lg p-4 border border-cyan-500/20">
        <div className="grid grid-cols-3 gap-1 mb-2">
          <div />
          <Key label="W" subLabel="Forward" />
          <div />
          <Key label="A" subLabel="Left" />
          <Key label="S" subLabel="Back" />
          <Key label="D" subLabel="Right" />
        </div>
        <div className="flex justify-center gap-1">
          <Key label="Q" subLabel="Roll L" small />
          <Key label="E" subLabel="Roll R" small />
          <Key label="SPACE" subLabel="Warp" wide />
          <Key label="X" subLabel="Stop" small />
        </div>
      </div>
    </motion.div>
  );
}

function Key({ label, subLabel, small, wide }: { label: string; subLabel?: string; small?: boolean; wide?: boolean }) {
  return (
    <div className={`
      flex flex-col items-center justify-center 
      bg-gray-800/80 border border-gray-600 rounded
      ${wide ? 'px-4 py-1' : small ? 'w-10 h-10' : 'w-12 h-12'}
    `}>
      <span className="text-white font-mono font-bold text-sm">{label}</span>
      {subLabel && <span className="text-gray-400 text-[8px]">{subLabel}</span>}
    </div>
  );
}
