'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as THREE from 'three';
import { DESTINATIONS, Destination, calculateDistance, calculateWarpETA, formatETA, getNavigableDestinations } from '@/data/destinations';
import { LCARS_COLORS } from './lcars/LCARSColors';
import { LcarsFrame, LcarsButton } from './lcars/LcarsComponents';

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

// 3D Star Map Visualization Component (Internal)
function StarMapPreview({ 
    destinations, 
    currentPosition, 
    selectedId,
    onSelect
}: { 
    destinations: Destination[]; 
    currentPosition: THREE.Vector3; 
    selectedId: string | null;
    onSelect?: (id: string) => void;
}) {
    // Simple 2D orthographic projection of the system
    const canvasSize = 200;
    const center = { x: canvasSize / 2, y: canvasSize / 2 };
    const scale = 0.08; // Map unit scale

    return (
        <div className="w-full h-full relative bg-black/80 rounded-lg overflow-hidden border border-white/5 group">
            {/* Grid Lines */}
            <div className="absolute inset-0 grid grid-cols-4 grid-rows-4 opacity-10 pointer-events-none">
                <div className="border-r border-b border-blue-500" />
                <div className="border-r border-b border-blue-500" />
                <div className="border-r border-b border-blue-500" />
                <div className="border-b border-blue-500" />
                <div className="border-r border-b border-blue-500" />
                <div className="border-r border-b border-blue-500" />
                <div className="border-r border-b border-blue-500" />
                <div className="border-b border-blue-500" />
            </div>

            {/* Sun Center */}
            <div 
                className="absolute w-4 h-4 -ml-2 -mt-2 bg-yellow-400 rounded-full shadow-[0_0_20px_#fbbf24] z-10"
                style={{ top: '50%', left: '50%' }}
            />

            {/* Planets */}
            {destinations.map(dest => {
                // Project 3D pos to 2D top-down map
                // Origin (0,0,0) is center screen.
                // We only care about X/Z for top down.
                const x = center.x + (dest.position.x * scale);
                const y = center.y + (dest.position.z * scale);
                
                // Keep within bounds roughly or clip
                if (x < 0 || x > canvasSize || y < 0 || y > canvasSize) return null;

                const isSelected = selectedId === dest.id;

                return (
                    <div
                        key={dest.id}
                        onClick={() => onSelect && onSelect(dest.id)}
                        className={`absolute rounded-full transition-all duration-300 cursor-pointer
                            ${isSelected 
                                ? 'w-3 h-3 -ml-1.5 -mt-1.5 z-20 bg-white shadow-[0_0_10px_white] scale-125' 
                                : 'w-1.5 h-1.5 -ml-0.75 -mt-0.75 bg-blue-400/50 hover:bg-blue-300 hover:scale-150 z-10'}`}
                        style={{ left: `${(x/canvasSize)*100}%`, top: `${(y/canvasSize)*100}%` }}
                    >
                         {/* Tooltip on hover */}
                         <div className="opacity-0 hover:opacity-100 absolute bottom-full mb-1 left-1/2 -translate-x-1/2 whitespace-nowrap bg-black/80 px-2 py-0.5 text-[8px] rounded border border-white/20 pointer-events-none transition-opacity">
                             {dest.name}
                         </div>
                    </div>
                );
            })}

            {/* Current Ship Position */}
            <div
                className="absolute w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[8px] border-b-green-500 -ml-1 -mt-2 z-30"
                style={{ 
                    left: `${((center.x + currentPosition.x * scale)/canvasSize)*100}%`, 
                    top: `${((center.y + currentPosition.z * scale)/canvasSize)*100}%`,
                    transform: 'rotate(0deg)' // Dynamic rotation could be added
                }}
            >
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 text-[8px] text-green-500 font-mono opacity-0 group-hover:opacity-100 transition-opacity">YOU</div>
            </div>
        </div>
    );
}

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
  
  // Handler for map clicks
  const handleMapSelect = (id: string) => {
      setHoveredDestination(id);
      // Optional: Auto scroll to card?
      const element = document.getElementById(`dest-card-${id}`);
      if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop with Scanlines */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 overflow-hidden"
            onClick={onClose}
          >
             <div className="absolute inset-0 bg-[url('/scanlines.png')] opacity-20 pointer-events-none" />
             <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black pointer-events-none" />
          </motion.div>

          {/* Main Holographic Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 
                       md:w-[1000px] md:h-[700px] z-50 flex flex-col pointer-events-none"
          >
            <div className="pointer-events-auto w-full h-full flex flex-col glass-holographic rounded-3xl overflow-hidden border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                
                {/* Header Area */}
                <div className="flex items-center justify-between p-6 border-b border-white/10 bg-white/5 relative">
                    {/* Decorative Top Line */}
                    <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50" />

                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full border border-blue-400/30 flex items-center justify-center bg-blue-500/10">
                             <div className="w-8 h-8 rounded-full border-2 border-blue-400 animate-pulse" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold tracking-[0.2em] text-white uppercase text-glow-blue">
                                Astrometrics
                            </h2>
                            <div className="text-xs font-mono text-blue-300 tracking-widest uppercase opacity-70">
                                Select Destination for Warp Trajectory
                            </div>
                        </div>
                    </div>

                    <button 
                        onClick={onClose}
                        className="w-10 h-10 rounded-full border border-white/20 hover:bg-red-500/20 hover:border-red-500 hover:text-red-400 transition-all flex items-center justify-center text-white/50"
                    >
                        ✕
                    </button>
                </div>

                {/* Main Content Area */}
                <div className="flex flex-1 min-h-0">
                    
                    {/* Sidebar Filters */}
                    <div className="w-64 border-r border-white/10 p-4 flex flex-col gap-2 bg-black/20">
                         <div className="mb-4 h-48 w-full relative">
                            {/* Mini Map Preview */}
                            <StarMapPreview 
                                destinations={navigableDestinations} 
                                currentPosition={currentPosition}
                                selectedId={hoveredDestination}
                                onSelect={handleMapSelect}
                            />
                         </div>

                         <div className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-2 pl-2">
                             System Filtering
                         </div>
                         {categories.map((category) => (
                            <button
                                key={category}
                                onClick={() => setSelectedCategory(category === 'all' ? null : category)}
                                className={`
                                    w-full text-left px-4 py-3 rounded-lg text-xs font-bold uppercase tracking-wider
                                    transition-all duration-200 border border-transparent
                                    ${(category === 'all' && !selectedCategory) || selectedCategory === category 
                                        ? 'bg-blue-500/20 text-blue-200 border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.1)]' 
                                        : 'hover:bg-white/5 text-white/50 hover:text-white'}
                                `}
                            >
                                {category === 'all' ? 'All Systems' : CATEGORY_LABELS[category] || category}
                            </button>
                         ))}
                    </div>

                    {/* Grid Content */}
                    <div className="flex-1 p-6 overflow-y-auto custom-scrollbar bg-gradient-to-br from-transparent to-blue-900/10">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredDestinations.map((dest, index) => {
                                const distance = calculateDistance(currentPosition, dest.position);
                                const eta = calculateWarpETA(distance, warpLevel);
                                const isHovered = hoveredDestination === dest.id;

                                return (
                                    <motion.div
                                        key={dest.id}
                                        id={`dest-card-${dest.id}`}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                        onClick={() => {
                                            onSelect(dest);
                                            onClose();
                                        }}
                                        onMouseEnter={() => setHoveredDestination(dest.id)}
                                        onMouseLeave={() => setHoveredDestination(null)}
                                        className={`
                                            relative group cursor-pointer h-40 rounded-xl overflow-hidden
                                            border transition-all duration-300
                                            ${isHovered 
                                                ? 'border-blue-400/60 bg-blue-900/20 shadow-[0_0_30px_rgba(59,130,246,0.2)] scale-[1.02]' 
                                                : 'border-white/10 bg-black/40 hover:border-white/30'}
                                        `}
                                    >
                                        {/* Background Visual Element */}
                                        <div 
                                            className="absolute -right-8 -bottom-8 w-32 h-32 rounded-full opacity-20 blur-xl transition-all duration-500 group-hover:opacity-40 group-hover:scale-150"
                                            style={{ background: dest.color }}
                                        />

                                        {/* Card Content */}
                                        <div className="relative z-10 p-4 h-full flex flex-col justify-between">
                                            
                                            <div className="flex justify-between items-start">
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-mono text-blue-300/70 mb-1">
                                                        {TYPE_LABELS[dest.type] || dest.type}
                                                    </span>
                                                    <h3 className="text-lg font-bold uppercase tracking-widest text-white group-hover:text-glow-blue transition-all">
                                                        {dest.name}
                                                    </h3>
                                                </div>
                                                {/* Mini Planet Preview */}
                                                <div 
                                                    className="w-8 h-8 rounded-full border border-white/20 shadow-inner"
                                                    style={{ 
                                                        background: `radial-gradient(circle at 30% 30%, ${dest.color}, #000)` 
                                                    }}
                                                />
                                            </div>

                                            <div className="space-y-1">
                                                <div className="flex justify-between text-[10px] font-mono uppercase tracking-wider text-white/60 group-hover:text-white transition-colors">
                                                    <span>Dist</span>
                                                    <span>{distance.toFixed(1)} AU</span>
                                                </div>
                                                <div className="flex justify-between text-[10px] font-mono uppercase tracking-wider text-white/60 group-hover:text-white transition-colors">
                                                    <span>ETA</span>
                                                    <span className={isHovered ? 'text-green-400' : ''}>{formatETA(eta)}</span>
                                                </div>
                                                
                                                {/* Hover Action Line */}
                                                <div className={`
                                                    h-[2px] w-full bg-blue-500 mt-2 transform origin-left transition-transform duration-300
                                                    ${isHovered ? 'scale-x-100' : 'scale-x-0'}
                                                `} />
                                            </div>

                                        </div>

                                        {/* Corner Brackets (Tech feel) */}
                                        <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-white/20" />
                                        <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-white/20" />
                                        <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-white/20" />
                                        <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-white/20" />
                                    </motion.div>
                                );
                            })}
                        </div>
                    </div>


                                    {/* Footer Info */}
                                    <div className="h-10 border-t border-white/10 bg-black/40 flex items-center justify-between px-6 text-[10px] font-mono uppercase text-white/30 shrink-0">
                                        <span>LCARS 45-C • NAVIGATIONAL DATABASE</span>
                                        <span className={warpLevel > 0 ? 'text-blue-400 animate-pulse' : ''}>
                                             Warp Factor {warpLevel} {warpLevel > 0 ? 'ENGAGED' : 'STANDBY'}
                                        </span>
                                    </div>
                                </div>
                            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
