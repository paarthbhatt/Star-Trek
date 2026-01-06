
'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { ScannerState } from '@/hooks/useScanner';
import { LCARS_COLORS } from './lcars/LCARSColors';
import { useState } from 'react';

interface ScannerDisplayProps {
  scannerState: ScannerState;
  onEnterOrbit?: () => void;
  onInspect?: () => void;
}

export function ScannerDisplay({ scannerState, onEnterOrbit, onInspect }: ScannerDisplayProps) {
  const { isScanning, scanProgress, scanData, scanComplete, error } = scannerState;

  // Don't render if nothing is happening and no data to show
  if (!isScanning && !scanData && !error) return null;

  return (
    <AnimatePresence mode="wait">
      {/* Scanning Progress Overlay */}
      {isScanning && (
        <motion.div
          key="scanning"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.1, filter: 'blur(10px)' }}
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 w-[400px]"
        >
          <div className="glass-holographic bg-black/90 border-x-2 border-cyan-500/50 rounded-lg p-6 shadow-[0_0_50px_rgba(6,182,212,0.2)] relative overflow-hidden">
            {/* Scanlines */}
            <div className="absolute inset-0 bg-[url('/scanlines.png')] opacity-20 pointer-events-none" />
            
            {/* Animated Header */}
            <div className="flex justify-between items-center mb-6 border-b border-cyan-500/30 pb-2">
                 <h3 className="text-cyan-400 text-lg font-bold tracking-[0.3em] uppercase animate-pulse">
                  Sensor Sweep
                </h3>
                <div className="text-xs font-mono text-cyan-600">SCN-99</div>
            </div>
           
            {/* Central Analysis Graphic (Abstract) */}
            <div className="h-24 mb-6 relative border border-cyan-900/50 bg-cyan-900/10 rounded overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center gap-1">
                    {[...Array(20)].map((_, i) => (
                        <motion.div
                            key={i}
                            className="w-1 bg-cyan-500/50"
                            animate={{ 
                                height: [10, Math.random() * 80, 10],
                                opacity: [0.3, 1, 0.3]
                            }}
                            transition={{ 
                                repeat: Infinity, 
                                duration: 0.5 + Math.random() * 0.5,
                                ease: "easeInOut" 
                            }}
                        />
                    ))}
                </div>
                {/* Horizontal Scan Line */}
                 <motion.div 
                    className="absolute top-0 w-full h-0.5 bg-white/50 shadow-[0_0_10px_white]"
                    animate={{ top: ['0%', '100%'] }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                 />
            </div>

            {/* Progress Bar */}
            <div className="relative">
                <div className="h-2 bg-gray-900 rounded-full overflow-hidden border border-cyan-900">
                <div 
                    className="h-full bg-cyan-500 relative transition-all duration-200 ease-out"
                    style={{ width: `${scanProgress}%` }}
                >
                    <div className="absolute right-0 top-0 bottom-0 w-2 bg-white/80 shadow-[0_0_10px_white]" />
                </div>
                </div>
                <div className="flex justify-between mt-2 text-[10px] font-mono text-cyan-300 uppercase tracking-wider">
                <span>Data Acquisition</span>
                <span>{Math.floor(scanProgress)}%</span>
                </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Scan Results Panel */}
      {scanComplete && scanData && (
        <motion.div
          key="results"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 50 }}
          className="fixed top-24 right-8 z-40 w-80 pointer-events-auto" // Right side panel
        >
          <div className="glass-holographic bg-black/80 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden shadow-2xl relative">
            
            {/* Decorative Side Bar */}
            <div className="absolute left-0 top-0 bottom-0 w-2 bg-orange-500/80"></div>
            
            {/* Header */}
            <div className="pl-4 pr-4 pt-4 pb-2 flex justify-between items-start border-b border-white/10 bg-white/5">
                <div>
                    <div className="text-[10px] text-orange-400 font-bold uppercase tracking-widest mb-1">
                        LCARS ANALYSIS
                    </div>
                    <div className="text-xl text-white font-bold uppercase tracking-wider">
                        Report
                    </div>
                </div>
                <div className="text-right">
                     <div className="inline-block px-2 py-0.5 rounded bg-orange-500/20 text-orange-300 text-[10px] font-bold border border-orange-500/30">
                        COMPLETE
                     </div>
                </div>
            </div>

            {/* Content */}
            <div className="p-5 pl-6 space-y-5">
              
              {/* Vital Stats Grid */}
              <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                     <div className="text-[9px] text-gray-400 uppercase tracking-widest">Threat Analysis</div>
                     <div className={`text-sm font-bold font-mono px-2 py-1 rounded border ${
                         scanData.threatLevel === 'None' ? 'bg-green-500/10 border-green-500/30 text-green-400' :
                         scanData.threatLevel === 'Low' ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' :
                         scanData.threatLevel === 'Medium' ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400' :
                         'bg-red-500/10 border-red-500/30 text-red-500 animate-pulse'
                     }`}>
                         {scanData.threatLevel || 'UNKNOWN'}
                     </div>
                  </div>
                  <div className="space-y-1">
                     <div className="text-[9px] text-gray-400 uppercase tracking-widest">Population</div>
                     <div className="text-sm font-mono text-white border-b border-white/20 pb-1">
                         {scanData.population || '0'}
                     </div>
                  </div>
              </div>

              {/* Atmosphere */}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-400"></div>
                    <div className="text-[9px] text-gray-400 uppercase tracking-widest">Atmospheric Composition</div>
                </div>
                <div className="text-cyan-200 font-mono text-xs leading-relaxed pl-3.5 border-l border-white/10">
                  {scanData.atmosphereDetails || 'Standard N2/O2 Mix'}
                </div>
              </div>

              {/* Resources */}
              {scanData.resources && scanData.resources.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                     <div className="w-1.5 h-1.5 rounded-full bg-purple-400"></div>
                     <div className="text-[9px] text-gray-400 uppercase tracking-widest">Detected Resources</div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pl-3.5">
                    {scanData.resources.map((r, i) => (
                      <span key={i} className="text-[9px] px-2 py-1 rounded-sm bg-purple-900/30 text-purple-200 border border-purple-500/30 font-mono tracking-wider">
                        {r}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Tactical / Footer Note */}
              <div className="bg-white/5 rounded p-2 border border-white/10">
                  <div className="text-[9px] text-orange-300 uppercase tracking-wider mb-1 opacity-70">Tactical Summary</div>
                  <div className="text-[10px] text-gray-300 font-mono leading-relaxed">
                    {scanData.tacticalAnalysis || 'No immediate tactical advantage or threat detected.'}
                  </div>
              </div>
              
              {/* Action Buttons for Inspection */}
              {(onEnterOrbit || onInspect) && (
                <div className="flex gap-2 pt-2 border-t border-white/10">
                  {onEnterOrbit && (
                    <button 
                      onClick={onEnterOrbit}
                      className="flex-1 px-3 py-2 bg-cyan-900/50 hover:bg-cyan-800/80 border border-cyan-500/30 text-cyan-100 text-[10px] font-bold uppercase tracking-wider rounded transition-colors"
                    >
                      Enter Orbit
                    </button>
                  )}
                  {onInspect && (
                    <button 
                      onClick={onInspect}
                      className="flex-1 px-3 py-2 bg-purple-900/50 hover:bg-purple-800/80 border border-purple-500/30 text-purple-100 text-[10px] font-bold uppercase tracking-wider rounded transition-colors"
                    >
                      Inspect Visuals
                    </button>
                  )}
                </div>
              )}

            </div>
            
            {/* Decorative Footer */}
            <div className="h-2 bg-gradient-to-r from-orange-500/50 to-transparent"></div>
          </div>
        </motion.div>
      )}

      {/* Error Message */}
      {error && (
        <motion.div
          key="error"
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50"
        >
          <div className="bg-red-950/90 border-l-4 border-red-500 rounded-r-lg px-8 py-4 shadow-[0_0_30px_rgba(220,38,38,0.4)] backdrop-blur-md">
            <div className="flex items-center gap-3">
                <div className="text-2xl">⚠️</div>
                <div>
                    <div className="text-red-500 font-bold tracking-widest uppercase text-xs mb-1">System Alert</div>
                    <div className="text-red-100 font-bold tracking-wider">{error.toUpperCase()}</div>
                </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
