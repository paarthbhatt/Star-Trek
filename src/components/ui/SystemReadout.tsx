'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { CameraMode } from '@/hooks/useCameraMode';
import { WarpState } from '@/hooks/useWarpDrive';
import { LCARS_COLORS } from './lcars/LCARSColors';
import { WeaponsState } from '@/hooks/useWeapons';

interface SystemReadoutProps {
  cameraMode?: CameraMode;
  warpState?: WarpState;
  weaponsState?: WeaponsState | null;
}

export function SystemReadout({ cameraMode = 'flight', warpState = 'idle', weaponsState }: SystemReadoutProps) {
  return (
    <>
        {/* Weapons Display removed for simulator focus */}
        {/* <WeaponsDisplay weaponsState={weaponsState} /> */}
        {/* Existing Hints Display */}
        <HintsDisplay cameraMode={cameraMode} warpState={warpState} />
    </>
  );
}

function WeaponsDisplay({ weaponsState }: { weaponsState?: WeaponsState | null }) {
  if (!weaponsState) return null;

  const { torpedoCount, maxTorpedoes, phaserHeat, target, phaserOverheated, torpedoLoading } = weaponsState;

  // Calculate health bars for target
  const targetHealthPercent = target && target.maxHealth ? (target.health || 0) / target.maxHealth * 100 : 0;
  const targetShieldPercent = target && target.maxShields ? (target.shields || 0) / target.maxShields * 100 : 0;

  return (
    <div className="fixed bottom-8 right-8 z-40 flex flex-col items-end gap-4 pointer-events-none">
       {/* Target Info */}
       <AnimatePresence>
         {target && (
           <motion.div 
             initial={{ opacity: 0, x: 50 }}
             animate={{ opacity: 1, x: 0 }}
             exit={{ opacity: 0, x: 50 }}
             className="bg-black/80 border-r-4 border-t border-b border-l-0 border-r-red-500/80 rounded-l-lg p-4 w-64 backdrop-blur-md"
           >
             <div className="flex justify-between items-baseline mb-2">
               <span className="text-red-400 font-bold tracking-widest text-sm uppercase">Target Lock</span>
               <span className="text-gray-400 text-xs font-mono">{target.distance ? Math.round(target.distance) : 0}km</span>
             </div>
             <div className="text-white text-lg font-bold mb-3 truncate">{target.name}</div>
             
             {/* Shields */}
             <div className="flex items-center gap-2 mb-1">
               <div className="text-cyan-400 text-xs w-12 font-mono">SHLD</div>
               <div className="flex-1 h-2 bg-gray-900 rounded-full overflow-hidden">
                 <div 
                   className="h-full bg-cyan-500 transition-all duration-300"
                   style={{ width: `${targetShieldPercent}%` }}
                 />
               </div>
             </div>
             
             {/* Hull */}
             <div className="flex items-center gap-2">
               <div className="text-red-400 text-xs w-12 font-mono">HULL</div>
               <div className="flex-1 h-2 bg-gray-900 rounded-full overflow-hidden">
                 <div 
                   className="h-full bg-red-600 transition-all duration-300"
                   style={{ width: `${targetHealthPercent}%` }}
                 />
               </div>
             </div>
           </motion.div>
         )}
       </AnimatePresence>

       {/* Weapons Status */}
       <div className="flex gap-4 items-end">
          {/* Phasers */}
          <div className="bg-black/60 backdrop-blur border-b-2 border-orange-500/50 p-3 rounded-t-lg">
             <div className="text-orange-400 text-xs font-mono mb-1 tracking-wider">PHASERS</div>
             <div className="w-4 h-24 bg-gray-900 rounded-full relative overflow-hidden flex flex-col justify-end border border-gray-800">
                <div 
                  className={`w-full transition-all duration-200 ${phaserOverheated ? 'bg-red-500 animate-pulse' : 'bg-orange-500'}`}
                  style={{ height: `${phaserHeat}%` }}
                />
             </div>
             <div className="text-center text-xs text-orange-400 mt-1 font-mono">{Math.round(phaserHeat)}%</div>
          </div>

          {/* Torpedoes */}
          <div className="bg-black/60 backdrop-blur border-b-2 border-red-500/50 p-3 rounded-t-lg">
             <div className="text-red-400 text-xs font-mono mb-1 tracking-wider">TORPEDO</div>
             <div className="text-3xl font-bold text-red-500 font-mono text-center">
               {torpedoCount}
               <span className="text-xs text-gray-500 ml-1">/ {maxTorpedoes}</span>
             </div>
             <div className="mt-2 text-center">
               {torpedoLoading ? (
                 <span className="text-yellow-500 text-xs animate-pulse">LOADING</span>
               ) : (
                 <span className="text-green-500 text-xs">READY</span>
               )}
             </div>
          </div>
       </div>
    </div>
  );
}

function HintsDisplay({ cameraMode, warpState }: { cameraMode: CameraMode, warpState: WarpState }) {
  // Get context-aware hints based on camera mode
  const getHints = () => {
    switch (cameraMode) {
      case 'flight':
        return [
          { icon: '⌨', label: 'Helm', description: 'WASD' },
          { icon: '↺', label: 'Roll', description: 'Q / E' },
          { icon: '⚡', label: 'Engage', description: 'SPACE' },
          { icon: '👁', label: 'View', description: 'I Key' },
          { icon: '🎯', label: 'Fire', description: 'Mouse 1/2' }, // Added Fire hint
        ];
      case 'freeLook':
        return [
          { icon: '↻', label: 'Pan', description: 'Mouse' },
          { icon: '⇕', label: 'Zoom', description: 'Scroll' },
          { icon: '↩', label: 'Reset', description: 'I Key' },
        ];
      case 'cinematic':
        return [
          { icon: '🎬', label: 'Auto', description: 'Orbiting' },
          { icon: '↩', label: 'Exit', description: 'C Key' },
        ];
      case 'photo':
        return [];
      default:
        return [
          { icon: '↻', label: 'Cam', description: 'Mouse' },
          { icon: '⇕', label: 'Zoom', description: 'Scroll' },
          { icon: '◉', label: 'Scan', description: 'Click' },
        ];
    }
  };

  const hints = getHints();

  if (cameraMode === 'photo' || hints.length === 0 || warpState !== 'idle') {
    return null;
  }

  return (
    <motion.div
      initial={{ y: 50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, delay: 1.5 }}
      className="fixed bottom-32 left-1/2 z-40 -translate-x-1/2"
    >
      <div className="flex items-center gap-1">
        {/* Left End Cap */}
        <div className="h-10 w-4 rounded-l-full" style={{ backgroundColor: LCARS_COLORS.orange }}></div>
        
        {/* Main Bar */}
        <div className="flex items-center gap-8 bg-black/80 px-8 py-2 border-y-2" style={{ borderColor: LCARS_COLORS.orange }}>
           {hints.map((hint, index) => (
            <div key={hint.label} className="flex items-center gap-3">
              {index > 0 && <div className="h-6 w-px bg-gray-700" />}
              <ControlHint icon={hint.icon} label={hint.label} description={hint.description} />
            </div>
          ))}
        </div>

        {/* Right End Cap */}
        <div className="h-10 w-4 rounded-r-full" style={{ backgroundColor: LCARS_COLORS.orange }}></div>
      </div>
    </motion.div>
  );
}

function ControlHint({ 
  icon, 
  label, 
  description 
}: { 
  icon: string; 
  label: string; 
  description: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xl" style={{ color: LCARS_COLORS.gold }}>{icon}</span>
      <div>
        <p className="text-[10px] tracking-widest uppercase font-bold" style={{ color: LCARS_COLORS.textMuted }}>{label}</p>
        <p className="text-xs font-mono uppercase" style={{ color: LCARS_COLORS.text }}>{description}</p>
      </div>
    </div>
  );
}

export function CornerDecorations() {
  const LCARS_BLACK = '#000000'; // Defined locally since it's not in the export

  return (
    <>
      {/* Top left - LCARS Corner */}
      <div className="fixed left-0 top-0 z-30 pointer-events-none">
        <svg width="300" height="200" viewBox="0 0 300 200" className="opacity-60">
           {/* Top Bar */}
           <path d="M 140 10 L 290 10" stroke={LCARS_COLORS.orange} strokeWidth="2" fill="none" />
           {/* Corner Curve */}
           <path d="M 120 10 Q 90 10 90 40 L 90 180" stroke={LCARS_COLORS.gold} strokeWidth="12" fill="none" />
           <rect x="96" y="100" width="40" height="6" fill={LCARS_BLACK} />
           <rect x="96" y="108" width="40" height="6" fill={LCARS_BLACK} />
        </svg>
      </div>

      {/* Top right - LCARS Corner */}
      <div className="fixed right-0 top-0 z-30 pointer-events-none">
        <svg width="300" height="200" viewBox="0 0 300 200" className="opacity-60">
             <path d="M 10 10 L 160 10" stroke={LCARS_COLORS.salmon} strokeWidth="2" fill="none" />
             <path d="M 180 10 Q 210 10 210 40 L 210 180" stroke={LCARS_COLORS.salmon} strokeWidth="12" fill="none" />
             <rect x="164" y="100" width="40" height="6" fill={LCARS_BLACK} />
             <rect x="164" y="108" width="40" height="6" fill={LCARS_BLACK} />
        </svg>
      </div>

      {/* Bottom Left - LCARS Corner */}
      <div className="fixed left-0 bottom-0 z-30 pointer-events-none">
         <svg width="300" height="200" viewBox="0 0 300 200" className="opacity-60">
            <path d="M 90 20 L 90 160 Q 90 190 120 190 L 290 190" stroke={LCARS_COLORS.blue} strokeWidth="12" fill="none" />
             <rect x="96" y="80" width="40" height="6" fill={LCARS_BLACK} />
           <rect x="96" y="88" width="40" height="6" fill={LCARS_BLACK} />
         </svg>
      </div>

      {/* Bottom Right - LCARS Corner */}
      <div className="fixed right-0 bottom-0 z-30 pointer-events-none">
         <svg width="300" height="200" viewBox="0 0 300 200" className="opacity-60">
            <path d="M 210 20 L 210 160 Q 210 190 180 190 L 10 190" stroke={LCARS_COLORS.pink} strokeWidth="12" fill="none" />
            <rect x="164" y="80" width="40" height="6" fill={LCARS_BLACK} />
            <rect x="164" y="88" width="40" height="6" fill={LCARS_BLACK} />
         </svg>
      </div>

      {/* Scan lines animation */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.05 }}
        transition={{ delay: 2 }}
        className="pointer-events-none fixed inset-0 z-50"
        style={{
          background: `repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            ${LCARS_COLORS.blue} 2px,
            ${LCARS_COLORS.blue} 4px
          )`,
          mixBlendMode: 'screen'
        }}
      />
    </>
  );
}
