'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as THREE from 'three';
import { DESTINATIONS, Destination } from '@/data/destinations';
import { LCARS_COLORS } from './lcars/LCARSColors';

interface RadarDisplayProps {
  shipPosition: THREE.Vector3;
  shipRotation?: THREE.Euler;
  visible: boolean;
  range?: number; // How far to show (in units)
  targetId?: string | null;
}

export function RadarDisplay({ 
  shipPosition, 
  shipRotation,
  visible,
  range = 500,
  targetId,
}: RadarDisplayProps) {
  // Calculate nearby objects within range
  const nearbyObjects = useMemo(() => {
      // 1. Map Destinations
    return DESTINATIONS
      .map(dest => ({
        ...dest,
        id: dest.id,
        name: dest.name,
        type: dest.type,
        distance: shipPosition.distanceTo(dest.position),
        relativePos: new THREE.Vector3().subVectors(dest.position, shipPosition),
      }))
      .filter(obj => obj.distance <= range && obj.distance > 1)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 30);
  }, [shipPosition, range]);

  // Calculate 2D radar position for each object
  const radarObjects = useMemo(() => {
    const radarSize = 120; // Radar diameter in pixels
    const radarRadius = radarSize / 2;

    return nearbyObjects.map(obj => {
      // Get relative 2D position (top-down view, ignoring Y)
      let x = obj.relativePos.x;
      let z = obj.relativePos.z;

      // Rotate by ship's heading if rotation is provided
      if (shipRotation) {
        const cos = Math.cos(-shipRotation.y);
        const sin = Math.sin(-shipRotation.y);
        const newX = x * cos - z * sin;
        const newZ = x * sin + z * cos;
        x = newX;
        z = newZ;
      }

      // Normalize to radar scale
      const normalizedDist = Math.min(obj.distance / range, 1);
      const angle = Math.atan2(x, z);
      
      // Convert to radar coordinates (center is ship)
      const radarX = Math.sin(angle) * normalizedDist * radarRadius;
      const radarY = -Math.cos(angle) * normalizedDist * radarRadius; // Flip Z to Y

      return {
        ...obj,
        radarX,
        radarY,
        normalizedDist,
      };
    });
  }, [nearbyObjects, range, shipRotation]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          className="fixed top-24 right-4 z-40"
        >
          <div className="glass-holographic rounded-full p-6 relative border border-blue-500/20 shadow-[0_0_30px_rgba(0,0,0,0.5)] group">
             {/* Scanline Overlay */}
             <div className="absolute inset-0 rounded-full overflow-hidden opacity-30 pointer-events-none">
                 <div className="w-full h-full bg-[linear-gradient(transparent_0%,rgba(0,255,255,0.1)_50%,transparent_100%)] bg-[length:100%_4px]" />
             </div>

             {/* Rotating Grid (Decorative) - REMOVED DOTTED LINES */}
             {/* <div className="absolute inset-0 rounded-full border border-blue-500/10 animate-[spin_10s_linear_infinite] opacity-50" 
                  style={{ borderStyle: 'dashed' }}/> */}
             
             {/* Use a solid ring instead for cleaner look */}
             <div className="absolute inset-0 rounded-full border border-blue-500/5 opacity-30" />

             {/* Header Label (Floating) */}
             <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-black/80 px-3 py-0.5 rounded-full border border-blue-500/30 backdrop-blur-md">
                <span className="text-[9px] font-bold text-blue-300 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                    Tactical
                </span>
             </div>

            {/* Radar circle */}
            <div className="relative w-[140px] h-[140px]">
              <svg className="absolute inset-0 w-full h-full overflow-visible" viewBox="-70 -70 140 140">
                {/* Outer ring */}
                <circle cx="0" cy="0" r="60" fill="none" stroke="rgba(59, 130, 246, 0.2)" strokeWidth="1" className="drop-shadow-[0_0_5px_rgba(59,130,246,0.3)]" />
                {/* Middle ring */}
                <circle cx="0" cy="0" r="40" fill="none" stroke="rgba(59, 130, 246, 0.1)" strokeWidth="0.5" />
                {/* Inner ring */}
                <circle cx="0" cy="0" r="20" fill="none" stroke="rgba(59, 130, 246, 0.05)" strokeWidth="0.5" />
                
                {/* Cross lines */}
                <line x1="-60" y1="0" x2="60" y2="0" stroke="rgba(59, 130, 246, 0.15)" strokeWidth="0.5" />
                <line x1="0" y1="-60" x2="0" y2="60" stroke="rgba(59, 130, 246, 0.15)" strokeWidth="0.5" />

                {/* Ship indicator (center) */}
                <polygon 
                  points="0,-6 4,4 0,2 -4,4" 
                  fill={LCARS_COLORS.gold}
                  className="drop-shadow-[0_0_8px_rgba(255,153,0,0.8)]"
                />

                    {/* Objects */}
                    {radarObjects.map(obj => (
                      <g key={obj.id}>
                        {/* Object dot */}
                        <circle
                          cx={obj.radarX}
                          cy={obj.radarY}
                          r={getObjectSize(obj)}
                          fill={obj.id === targetId ? '#ff3333' : getObjectColor(obj)}
                          opacity={0.8}
                          className="transition-all duration-300"
                        />
                        {/* Target Reticle if selected */}
                        {obj.id === targetId && (
                           <circle
                           cx={obj.radarX}
                           cy={obj.radarY}
                           r={getObjectSize(obj) + 2}
                           fill="none"
                           stroke="#ff3333"
                           strokeWidth="1"
                           opacity={0.8}
                           className="animate-pulse"
                         />
                        )}
                      </g>
                    ))}
              </svg>

              {/* Sweep animation */}
              <motion.div
                className="absolute inset-0 pointer-events-none rounded-full overflow-hidden"
                animate={{ rotate: 360 }}
                transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
              >
                  <div className="w-1/2 h-1/2 origin-bottom-right absolute top-0 left-0 bg-gradient-to-tl from-blue-500/20 to-transparent blur-sm" />
              </motion.div>
            </div>

            {/* Range Indicator */}
            <div className="absolute bottom-2 right-1/2 translate-x-1/2 text-[8px] font-mono text-blue-400/50">
                RANGE: {range}u
            </div>

            {/* Nearest Object Tooltip (Dynamic) */}
            {radarObjects.length > 0 && (
                <div className="absolute -left-32 top-1/2 -translate-y-1/2 w-28 text-right opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                     <div className="text-[9px] font-bold text-white uppercase tracking-wider mb-1">
                        Nearest Signal
                     </div>
                     <div className="text-[10px] text-blue-300 font-mono truncate border-r-2 border-blue-500 pr-2">
                        {radarObjects[0].name}
                     </div>
                     <div className="text-[9px] text-white/40 font-mono pr-2">
                        {radarObjects[0].distance.toFixed(1)} AU
                     </div>
                </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Helper Types
interface RadarObject {
    id: string;
    name: string;
    type: string;
    normalizedDist: number;
    radarX: number;
    radarY: number;
    distance: number;
}

function getObjectColor(obj: RadarObject): string {
  
  switch (obj.type) {
    case 'star': return '#fbbf24'; // Amber
    case 'planet': return '#38bdf8'; // Sky Blue
    case 'moon': return '#94a3b8'; // Slate
    case 'station': return '#c084fc'; // Purple
    case 'dwarf': return '#f97316'; // Orange
    case 'asteroid': return '#525252'; // Neutral
    default: return '#cbd5e1';
  }
}

function getObjectSize(obj: RadarObject): number {
  // Base size by type
  let size = 2;
  switch (obj.type) {
    case 'star': size = 4; break;
    case 'planet': size = 3; break;
    case 'station': size = 2.5; break;
    default: size = 1.5;
  }
  
  return size;
}

// Toggle key handler hook
export function useRadarToggle(initialVisible = false) {
  const [visible, setVisible] = useState(initialVisible);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'r') {
        setVisible(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return { visible, setVisible };
}
