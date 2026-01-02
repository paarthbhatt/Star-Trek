'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as THREE from 'three';
import { DESTINATIONS, Destination } from '@/data/destinations';

interface RadarDisplayProps {
  shipPosition: THREE.Vector3;
  shipRotation?: THREE.Euler;
  targetId?: string | null;
  visible: boolean;
  range?: number; // How far to show (in units)
}

export function RadarDisplay({ 
  shipPosition, 
  shipRotation,
  targetId,
  visible,
  range = 500,
}: RadarDisplayProps) {
  // Calculate nearby objects within range
  const nearbyObjects = useMemo(() => {
    return DESTINATIONS
      .map(dest => ({
        ...dest,
        distance: shipPosition.distanceTo(dest.position),
        relativePos: new THREE.Vector3().subVectors(dest.position, shipPosition),
      }))
      .filter(obj => obj.distance <= range && obj.distance > 1) // Filter by range, exclude self
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 20); // Limit to 20 nearest
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
          <div className="bg-black/70 backdrop-blur-sm border border-cyan-500/30 rounded-lg p-3">
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-cyan-400/70 text-xs font-mono uppercase tracking-wider">Tactical</span>
              <span className="text-gray-500 text-[10px] font-mono">{range}u range</span>
            </div>

            {/* Radar circle */}
            <div className="relative w-[140px] h-[140px]">
              {/* Background rings */}
              <svg className="absolute inset-0 w-full h-full" viewBox="-70 -70 140 140">
                {/* Outer ring */}
                <circle cx="0" cy="0" r="60" fill="none" stroke="rgba(34, 211, 238, 0.1)" strokeWidth="1" />
                {/* Middle ring */}
                <circle cx="0" cy="0" r="40" fill="none" stroke="rgba(34, 211, 238, 0.08)" strokeWidth="1" />
                {/* Inner ring */}
                <circle cx="0" cy="0" r="20" fill="none" stroke="rgba(34, 211, 238, 0.05)" strokeWidth="1" />
                
                {/* Cross lines */}
                <line x1="-60" y1="0" x2="60" y2="0" stroke="rgba(34, 211, 238, 0.1)" strokeWidth="0.5" />
                <line x1="0" y1="-60" x2="0" y2="60" stroke="rgba(34, 211, 238, 0.1)" strokeWidth="0.5" />

                {/* Ship indicator (center) */}
                <polygon 
                  points="0,-8 4,4 0,2 -4,4" 
                  fill="rgba(34, 211, 238, 0.8)" 
                  stroke="rgba(34, 211, 238, 1)"
                  strokeWidth="0.5"
                />

                {/* Objects */}
                {radarObjects.map(obj => (
                  <g key={obj.id}>
                    {/* Object dot */}
                    <circle
                      cx={obj.radarX}
                      cy={obj.radarY}
                      r={getObjectSize(obj)}
                      fill={getObjectColor(obj, targetId)}
                      opacity={0.9}
                    />
                    {/* Target indicator ring */}
                    {targetId === obj.id && (
                      <circle
                        cx={obj.radarX}
                        cy={obj.radarY}
                        r={getObjectSize(obj) + 4}
                        fill="none"
                        stroke="#ff4444"
                        strokeWidth="1.5"
                        className="animate-pulse"
                      />
                    )}
                  </g>
                ))}
              </svg>

              {/* Sweep animation */}
              <motion.div
                className="absolute inset-0 pointer-events-none"
                animate={{ rotate: 360 }}
                transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
              >
                <svg className="w-full h-full" viewBox="-70 -70 140 140">
                  <defs>
                    <linearGradient id="sweepGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="rgba(34, 211, 238, 0)" />
                      <stop offset="100%" stopColor="rgba(34, 211, 238, 0.3)" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M 0,0 L 0,-60 A 60,60 0 0,1 42.4,-42.4 Z"
                    fill="url(#sweepGradient)"
                  />
                </svg>
              </motion.div>
            </div>

            {/* Legend */}
            <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[8px] font-mono">
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-yellow-400" />
                <span className="text-gray-500">Star</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-cyan-400" />
                <span className="text-gray-500">Planet</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-gray-400" />
                <span className="text-gray-500">Moon</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-purple-400" />
                <span className="text-gray-500">Station</span>
              </div>
            </div>

            {/* Nearest object info */}
            {radarObjects.length > 0 && (
              <div className="mt-2 pt-2 border-t border-cyan-500/20">
                <div className="text-gray-500 text-[8px] font-mono">NEAREST:</div>
                <div className="text-cyan-400 text-xs font-mono truncate">
                  {radarObjects[0].name}
                </div>
                <div className="text-gray-400 text-[10px] font-mono">
                  {radarObjects[0].distance.toFixed(0)}u
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function getObjectColor(obj: Destination & { normalizedDist: number }, targetId?: string | null): string {
  if (targetId === obj.id) return '#ff4444';
  
  switch (obj.type) {
    case 'star': return '#ffdd44';
    case 'planet': return '#22d3ee';
    case 'moon': return '#a0a0a0';
    case 'station': return '#a855f7';
    case 'dwarf': return '#d97706';
    case 'asteroid': return '#737373';
    default: return '#888888';
  }
}

function getObjectSize(obj: Destination & { normalizedDist: number }): number {
  // Base size by type
  let size = 3;
  switch (obj.type) {
    case 'star': size = 6; break;
    case 'planet': size = 4; break;
    case 'station': size = 3; break;
    case 'moon': size = 2.5; break;
    case 'dwarf': size = 3; break;
    default: size = 2;
  }
  
  // Scale slightly by actual radius
  size *= Math.min(Math.max(obj.radius / 10, 0.5), 1.5);
  
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
