'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as THREE from 'three';
import { DESTINATIONS, Destination, calculateDistance, calculateWarpETA, formatETA, getNavigableDestinations } from '@/data/destinations';

interface DestinationSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (destination: Destination) => void;
  currentPosition: THREE.Vector3;
  warpLevel: number;
}

// Category display names
const CATEGORY_LABELS: Record<string, string> = {
  inner: 'Inner System',
  outer: 'Outer System',
  belt: 'Asteroid Belt',
  dwarf: 'Dwarf Planets',
  kuiper: 'Kuiper Belt',
  station: 'Stations',
};

// Type display names
const TYPE_LABELS: Record<string, string> = {
  star: 'Star',
  planet: 'Planet',
  dwarf: 'Dwarf Planet',
  moon: 'Moon',
  station: 'Station',
  asteroid: 'Asteroid',
};

export function DestinationSelector({
  isOpen,
  onClose,
  onSelect,
  currentPosition,
  warpLevel,
}: DestinationSelectorProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [hoveredDestination, setHoveredDestination] = useState<string | null>(null);

  // Get navigable destinations (exclude moons from main list for cleaner nav)
  const navigableDestinations = useMemo(() => getNavigableDestinations(), []);

  // Sort destinations by distance from current position
  const sortedDestinations = useMemo(() => {
    return [...navigableDestinations].sort((a, b) => {
      const distA = calculateDistance(currentPosition, a.position);
      const distB = calculateDistance(currentPosition, b.position);
      return distA - distB;
    });
  }, [currentPosition, navigableDestinations]);

  // Filter by selected category
  const filteredDestinations = useMemo(() => {
    if (!selectedCategory) return sortedDestinations;
    return sortedDestinations.filter(d => d.category === selectedCategory);
  }, [sortedDestinations, selectedCategory]);

  // Get unique categories from destinations
  const categories = useMemo(() => {
    const cats = new Set(navigableDestinations.map(d => d.category));
    return ['all', ...Array.from(cats)];
  }, [navigableDestinations]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 
                       md:w-[700px] md:max-h-[80vh] bg-gray-900/95 border border-cyan-500/40 
                       rounded-lg shadow-2xl z-50 overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="p-4 border-b border-cyan-500/30 flex items-center justify-between">
              <div>
                <h2 className="text-cyan-400 font-bold text-lg tracking-wider">NAVIGATION</h2>
                <p className="text-gray-500 text-xs font-mono">Sol System - {filteredDestinations.length} destinations</p>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white transition-colors p-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Category Filter */}
            <div className="p-3 border-b border-cyan-500/20 flex gap-2 overflow-x-auto">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category === 'all' ? null : category)}
                  className={`px-3 py-1.5 rounded text-xs font-mono uppercase tracking-wider transition-all whitespace-nowrap
                    ${(category === 'all' && !selectedCategory) || selectedCategory === category
                      ? 'bg-cyan-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                >
                  {category === 'all' ? 'All' : CATEGORY_LABELS[category] || category}
                </button>
              ))}
            </div>

            {/* Destination List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {filteredDestinations.map((dest) => {
                const distance = calculateDistance(currentPosition, dest.position);
                const eta = calculateWarpETA(distance, warpLevel);
                const isHovered = hoveredDestination === dest.id;

                return (
                  <motion.button
                    key={dest.id}
                    onClick={() => {
                      onSelect(dest);
                      onClose();
                    }}
                    onMouseEnter={() => setHoveredDestination(dest.id)}
                    onMouseLeave={() => setHoveredDestination(null)}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    className={`w-full p-4 rounded-lg border transition-all text-left flex gap-4
                      ${isHovered 
                        ? 'bg-cyan-900/30 border-cyan-500/50' 
                        : 'bg-gray-800/50 border-gray-700/50 hover:border-gray-600'
                      }`}
                  >
                    {/* Planet Visual */}
                    <div 
                      className="w-12 h-12 rounded-full flex-shrink-0 relative"
                      style={{ 
                        background: `radial-gradient(circle at 30% 30%, ${dest.color}, #111)`,
                        boxShadow: dest.atmosphere ? `0 0 15px ${dest.atmosphere}40` : undefined,
                      }}
                    >
                      {dest.hasRings && (
                        <div 
                          className="absolute inset-0 rounded-full border-2 transform -rotate-12"
                          style={{ 
                            borderColor: dest.ringColor,
                            transform: 'rotateX(70deg)',
                            top: '40%',
                          }}
                        />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between mb-1">
                        <h3 className="text-white font-semibold truncate">{dest.name}</h3>
                        <span className="text-cyan-400 text-xs font-mono uppercase ml-2">
                          {TYPE_LABELS[dest.type] || dest.type}
                        </span>
                      </div>
                      <p className="text-gray-400 text-xs line-clamp-2 mb-2">
                        {dest.description}
                      </p>
                      <div className="flex gap-4 text-xs font-mono flex-wrap">
                        <span className="text-gray-500">
                          DIST: <span className="text-yellow-400">{distance.toFixed(0)} units</span>
                        </span>
                        <span className="text-gray-500">
                          ETA @ W{warpLevel}: <span className="text-green-400">{formatETA(eta)}</span>
                        </span>
                        {dest.starfleetPresence && (
                          <span className="text-gray-500">
                            <span className="text-blue-400">Starfleet</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Select indicator */}
                    <div className="flex items-center">
                      <svg 
                        className={`w-5 h-5 transition-all ${isHovered ? 'text-cyan-400' : 'text-gray-600'}`} 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </motion.button>
                );
              })}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-cyan-500/20 flex justify-between items-center">
              <div className="text-gray-500 text-xs font-mono">
                Current Warp Factor: <span className="text-purple-400">{warpLevel}</span>
              </div>
              <div className="text-gray-500 text-xs font-mono">
                Press <kbd className="text-cyan-400">1-9</kbd> to change warp level
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
