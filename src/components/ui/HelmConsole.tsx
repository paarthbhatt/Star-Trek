'use client';

import { motion } from 'framer-motion';
import { FlightState } from '@/hooks/useFlightControls';
import { LCARS_COLORS } from './lcars/LCARSColors';
import { useEffect, useState } from 'react';

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
  
  // Dynamic UI State
  const [activeColor, setActiveColor] = useState<string>(LCARS_COLORS.orange);
  
  useEffect(() => {
    if (isWarping) {
      setActiveColor(LCARS_COLORS.warp);
    } else if (impulsePercent > 0) {
      setActiveColor(LCARS_COLORS.impulse);
    } else {
      setActiveColor(LCARS_COLORS.orange);
    }
  }, [isWarping, impulsePercent]);

  // Shake effect variants
  const containerVariants = {
    idle: { x: '-50%', y: 0 },
    warping: { 
      x: ['-50%', '-50.2%', '-49.8%', '-50%'],
      y: [0, 1, -1, 0],
      transition: { repeat: Infinity, duration: 0.1 } 
    }
  };

  return (
    <motion.div
      initial={{ y: 100, opacity: 0, x: '-50%' }}
      animate={isWarping ? "warping" : "idle"}
      variants={containerVariants}
      className="fixed bottom-6 left-1/2 z-40 flex items-end pointer-events-none select-none"
    >
        {/* Left Elbow Connector */}
        <div className="flex flex-col items-end mr-1 pb-1">
            <div className="h-4 w-16 rounded-tl-full bg-orange-500/80 mb-1"></div>
            <div className="h-24 w-8 rounded-l-full bg-blue-400/60 relative overflow-hidden">
                <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
            </div>
        </div>

        {/* MAIN CONSOLE CONTAINER */}
        <div className="glass-holographic bg-black/80 border border-white/10 rounded-tr-2xl rounded-tl-2xl p-1 flex items-end gap-1 shadow-[0_0_30px_rgba(0,0,0,0.5)] backdrop-blur-md">
            
            {/* 1. POWER / SPEED COLUMN */}
            <div className="w-64 bg-black/40 rounded-tl-xl rounded-bl-lg border border-white/5 p-3 flex flex-col gap-2">
                <div className="flex justify-between items-center border-b border-white/10 pb-1 mb-1">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-orange-400">Propulsion</span>
                    <span className={`text-[10px] font-mono ${isWarping ? 'text-blue-300 animate-pulse' : 'text-gray-500'}`}>
                        {isWarping ? 'WARP FIELD ACTIVE' : 'IMPULSE DRIVE'}
                    </span>
                </div>

                {/* Speed Bar Graph */}
                <div className="h-12 flex gap-1 items-end">
                    {[...Array(10)].map((_, i) => {
                        const threshold = (i + 1) * 10;
                        const currentVal = isWarping ? (warpLevel / 9) * 100 : impulsePercent;
                        const active = currentVal >= threshold;
                        
                        return (
                            <div key={i} className="flex-1 flex flex-col gap-0.5 h-full justify-end">
                                <div 
                                    className={`w-full transition-all duration-300 rounded-sm ${active ? 'opacity-100 shadow-[0_0_5px_currentColor]' : 'opacity-20'}`}
                                    style={{ 
                                        backgroundColor: active ? activeColor : '#fff',
                                        height: active ? '100%' : '20%'
                                    }}
                                />
                            </div>
                        );
                    })}
                </div>

                <div className="flex justify-between items-baseline mt-1">
                    <span className="text-4xl font-mono font-bold leading-none" style={{ color: activeColor }}>
                        {isWarping ? warpLevel.toFixed(1) : Math.round(impulsePercent)}
                        <span className="text-sm ml-1 opacity-50">{isWarping ? 'WF' : '%'}</span>
                    </span>
                    <div className="text-right">
                        <div className="text-[9px] uppercase text-gray-400 tracking-wider">Velocity</div>
                        <div className="text-xs font-mono text-white">{speed.toFixed(0)} <span className="text-gray-500">km/s</span></div>
                    </div>
                </div>
            </div>

            {/* 2. NAVIGATION / HEADING CENTER */}
            <div className="w-80 h-32 bg-black/40 border border-white/5 p-3 flex flex-col relative overflow-hidden">
                {/* Scanline overlay */}
                <div className="absolute inset-0 bg-[url('/scanlines.png')] opacity-10 pointer-events-none" />
                
                <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-blue-400">Navigation</span>
                    {destination && <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_5px_#22c55e]" />}
                </div>

                <div className="flex-1 flex flex-col justify-center items-center text-center">
                    {destination ? (
                        <>
                            <div className="text-[10px] uppercase tracking-[0.3em] text-gray-400 mb-1">Current Heading</div>
                            <div className="text-xl font-bold uppercase text-white tracking-widest text-glow-blue mb-2 truncate max-w-full px-2">
                                {destination}
                            </div>
                            <div className="flex items-center gap-4 text-xs font-mono">
                                <div className="px-2 py-0.5 rounded bg-blue-900/30 text-blue-300 border border-blue-500/30">
                                    ETA: {eta || '--:--'}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="text-white/20 font-mono text-sm tracking-widest uppercase">
                            - Station Keeping -
                        </div>
                    )}
                </div>
            </div>

            {/* 3. WARP CONTROL INDICATORS */}
            <div className="w-40 bg-black/40 rounded-tr-xl rounded-br-lg border border-white/5 p-3 flex flex-col gap-2">
                <div className="text-[10px] uppercase font-bold tracking-widest text-purple-400 text-right border-b border-white/10 pb-1 mb-1">
                    Warp Matrix
                </div>
                
                <div className="grid grid-cols-3 gap-1">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((level) => (
                        <div 
                            key={level}
                            className={`
                                h-6 flex items-center justify-center text-[10px] font-bold font-mono rounded-sm transition-all duration-300
                                ${warpLevel === level 
                                    ? 'bg-purple-500 text-black shadow-[0_0_10px_#a855f7]' 
                                    : 'bg-purple-900/20 text-purple-500/50 border border-purple-500/20'}
                            `}
                        >
                            {level}
                        </div>
                    ))}
                </div>
                <div className="mt-auto text-[9px] text-right text-gray-500 font-mono">
                    MAT-IND-44
                </div>
            </div>

        </div>

        {/* Right Elbow Connector */}
        <div className="flex flex-col items-start ml-1 pb-1">
            <div className="h-4 w-16 rounded-tr-full bg-red-500/80 mb-1"></div>
            <div className="h-24 w-8 rounded-r-full bg-pink-400/60"></div>
        </div>

    </motion.div>
  );
}

// Controls overlay showing WASD keys - Modernized
export function ControlsOverlay({ visible }: { visible: boolean }) {
  if (!visible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="fixed bottom-40 right-10 pointer-events-none z-30"
    >
      <div className="glass-holographic p-4 rounded-xl border-l-4 border-b-0 border-orange-500/50 bg-black/60 backdrop-blur-sm">
        <div className="flex justify-between items-center mb-3 border-b border-white/10 pb-1">
            <div className="text-[10px] uppercase font-bold tracking-[0.2em] text-orange-400">
                Manual Override
            </div>
        </div>
        
        <div className="grid grid-cols-3 gap-1 mb-3">
          <div />
          <Key label="W" active />
          <div />
          <Key label="A" active />
          <Key label="S" active />
          <Key label="D" active />
        </div>
        <div className="flex justify-center gap-2 border-t border-white/10 pt-2">
          <Key label="SPACE" wide labelSmall="WARP" />
          <Key label="X" labelSmall="STOP" />
        </div>
      </div>
    </motion.div>
  );
}

function Key({ label, labelSmall, wide, active }: { label: string; labelSmall?: string; wide?: boolean; active?: boolean }) {
  return (
    <div className={`
      flex flex-col items-center justify-center 
      border rounded transition-all duration-300
      ${wide ? 'w-auto px-4 h-10' : 'w-10 h-10'}
      ${active ? 'bg-white/10 border-white/20' : 'bg-black/40 border-white/5'}
    `}>
      <span className="text-white font-mono font-bold text-xs">{label}</span>
      {labelSmall && <span className="text-[7px] text-orange-300 tracking-wider mt-0.5">{labelSmall}</span>}
    </div>
  );
}
