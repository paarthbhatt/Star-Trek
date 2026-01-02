'use client';

import { motion } from 'framer-motion';
import { CameraMode } from '@/hooks/useCameraMode';
import { WarpState } from '@/hooks/useWarpDrive';

interface SystemReadoutProps {
  cameraMode?: CameraMode;
  warpState?: WarpState;
}

export function SystemReadout({ cameraMode = 'flight', warpState = 'idle' }: SystemReadoutProps) {
  // Get context-aware hints based on camera mode
  const getHints = () => {
    switch (cameraMode) {
      case 'flight':
        return [
          { icon: '⌨', label: 'Move', description: 'WASD + QE' },
          { icon: '⚡', label: 'Warp', description: 'SPACE' },
          { icon: '👁', label: 'Free Look', description: 'I' },
        ];
      case 'freeLook':
        return [
          { icon: '↻', label: 'Rotate', description: 'Click + Drag' },
          { icon: '⇕', label: 'Zoom', description: 'Scroll' },
          { icon: '↩', label: 'Return', description: 'I or H' },
        ];
      case 'cinematic':
        return [
          { icon: '🎬', label: 'Auto', description: 'Orbiting' },
          { icon: '↩', label: 'Return', description: 'C or H' },
        ];
      case 'photo':
        // Photo mode hides UI, but just in case
        return [];
      default:
        return [
          { icon: '↻', label: 'Rotate', description: 'Click + Drag' },
          { icon: '⇕', label: 'Zoom', description: 'Scroll' },
          { icon: '◉', label: 'Select', description: 'Click Component' },
        ];
    }
  };

  const hints = getHints();

  // Don't show in photo mode or during warp
  if (cameraMode === 'photo' || hints.length === 0 || warpState !== 'idle') {
    return null;
  }

  return (
    <motion.div
      initial={{ y: 50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, delay: 1.5 }}
      className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2"
    >
      <div className="flex items-center gap-8 rounded-full border border-[#4da6ff]/20 bg-[#001428]/60 px-6 py-3 backdrop-blur-md">
        {/* Controls hint */}
        <div className="flex items-center gap-4">
          {hints.map((hint, index) => (
            <div key={hint.label} className="flex items-center gap-4">
              {index > 0 && <div className="h-6 w-px bg-[#4da6ff]/20" />}
              <ControlHint icon={hint.icon} label={hint.label} description={hint.description} />
            </div>
          ))}
        </div>
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
    <div className="flex items-center gap-2">
      <span className="text-lg text-[#4da6ff]">{icon}</span>
      <div>
        <p className="text-[10px] tracking-wider text-[#88aacc]">{label}</p>
        <p className="text-[9px] text-[#4da6ff]">{description}</p>
      </div>
    </div>
  );
}

export function CornerDecorations() {
  return (
    <>
      {/* Top left */}
      <div className="fixed left-4 top-24 z-30">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.5 }}
          className="h-20 w-20"
        >
          <svg viewBox="0 0 80 80" className="h-full w-full text-[#4da6ff]/20">
            <path d="M0 40 L0 0 L40 0" fill="none" stroke="currentColor" strokeWidth="1" />
            <path d="M0 30 L0 10 L20 10" fill="none" stroke="currentColor" strokeWidth="1" />
            <circle cx="5" cy="5" r="2" fill="currentColor" />
          </svg>
        </motion.div>
      </div>

      {/* Top right */}
      <div className="fixed right-4 top-24 z-30">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.6 }}
          className="h-20 w-20"
        >
          <svg viewBox="0 0 80 80" className="h-full w-full text-[#4da6ff]/20">
            <path d="M80 40 L80 0 L40 0" fill="none" stroke="currentColor" strokeWidth="1" />
            <path d="M80 30 L80 10 L60 10" fill="none" stroke="currentColor" strokeWidth="1" />
            <circle cx="75" cy="5" r="2" fill="currentColor" />
          </svg>
        </motion.div>
      </div>

      {/* Bottom left */}
      <div className="fixed bottom-20 left-4 z-30">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.7 }}
          className="h-20 w-20"
        >
          <svg viewBox="0 0 80 80" className="h-full w-full text-[#4da6ff]/20">
            <path d="M0 40 L0 80 L40 80" fill="none" stroke="currentColor" strokeWidth="1" />
            <path d="M0 50 L0 70 L20 70" fill="none" stroke="currentColor" strokeWidth="1" />
            <circle cx="5" cy="75" r="2" fill="currentColor" />
          </svg>
        </motion.div>
      </div>

      {/* Bottom right */}
      <div className="fixed bottom-20 right-4 z-30">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.8 }}
          className="h-20 w-20"
        >
          <svg viewBox="0 0 80 80" className="h-full w-full text-[#4da6ff]/20">
            <path d="M80 40 L80 80 L40 80" fill="none" stroke="currentColor" strokeWidth="1" />
            <path d="M80 50 L80 70 L60 70" fill="none" stroke="currentColor" strokeWidth="1" />
            <circle cx="75" cy="75" r="2" fill="currentColor" />
          </svg>
        </motion.div>
      </div>

      {/* Scan lines animation */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.03 }}
        transition={{ delay: 2 }}
        className="pointer-events-none fixed inset-0 z-50"
        style={{
          background: `repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            rgba(77, 166, 255, 0.03) 2px,
            rgba(77, 166, 255, 0.03) 4px
          )`,
        }}
      />
    </>
  );
}
