'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { VoiceLine } from '@/data/voiceLines';
import { getAnnouncementColor } from '@/hooks/useAnnouncements';

type AlertLevel = 'green' | 'yellow' | 'red';

interface AlertOverlayProps {
  alertLevel: AlertLevel;
  showFlash?: boolean;
}

export function AlertOverlay({ alertLevel, showFlash = false }: AlertOverlayProps) {
  const [flashVisible, setFlashVisible] = useState(false);

  // Trigger flash when alert level changes to red or yellow
  useEffect(() => {
    if (showFlash && (alertLevel === 'red' || alertLevel === 'yellow')) {
      setFlashVisible(true);
      const timer = setTimeout(() => setFlashVisible(false), 500);
      return () => clearTimeout(timer);
    }
  }, [alertLevel, showFlash]);

  if (alertLevel === 'green') return null;

  const colors = {
    red: {
      border: 'border-red-500',
      bg: 'bg-red-900/10',
      shadow: 'shadow-[inset_0_0_100px_rgba(239,68,68,0.1)]',
      glow: 'rgba(239, 68, 68, 0.3)',
    },
    yellow: {
      border: 'border-yellow-500',
      bg: 'bg-yellow-900/5',
      shadow: 'shadow-[inset_0_0_80px_rgba(234,179,8,0.1)]',
      glow: 'rgba(234, 179, 8, 0.2)',
    },
  };

  const config = colors[alertLevel];

  return (
    <>
      {/* Vignette overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={`fixed inset-0 pointer-events-none z-30 ${config.bg} ${config.shadow}`}
        style={{
          background: `radial-gradient(ellipse at center, transparent 40%, ${config.glow} 100%)`,
        }}
      />

      {/* Animated border */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: alertLevel === 'red' ? [0.3, 0.7, 0.3] : [0.2, 0.5, 0.2] }}
        transition={{
          duration: alertLevel === 'red' ? 0.8 : 1.2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className={`fixed inset-0 pointer-events-none z-30 border-4 ${config.border}`}
        style={{
          boxShadow: `inset 0 0 30px ${config.glow}`,
        }}
      />

      {/* Flash effect */}
      <AnimatePresence>
        {flashVisible && (
          <motion.div
            initial={{ opacity: 0.5 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className={`fixed inset-0 pointer-events-none z-40 ${
              alertLevel === 'red' ? 'bg-red-500/30' : 'bg-yellow-500/20'
            }`}
          />
        )}
      </AnimatePresence>

      {/* Corner warning indicators */}
      {alertLevel === 'red' && (
        <>
          <motion.div
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 0.5, repeat: Infinity }}
            className="fixed top-4 left-4 w-4 h-4 bg-red-500 rounded-full z-40"
          />
          <motion.div
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 0.5, repeat: Infinity, delay: 0.25 }}
            className="fixed top-4 right-4 w-4 h-4 bg-red-500 rounded-full z-40"
          />
          <motion.div
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 0.5, repeat: Infinity, delay: 0.25 }}
            className="fixed bottom-4 left-4 w-4 h-4 bg-red-500 rounded-full z-40"
          />
          <motion.div
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 0.5, repeat: Infinity }}
            className="fixed bottom-4 right-4 w-4 h-4 bg-red-500 rounded-full z-40"
          />
        </>
      )}
    </>
  );
}

// Announcement Toast Component
interface AnnouncementToastProps {
  announcement: {
    line: VoiceLine;
  } | null;
  visible?: boolean;
}

export function AnnouncementToast({ announcement, visible = true }: AnnouncementToastProps) {
  if (!announcement || !visible) return null;

  const priorityStyles = {
    critical: 'border-red-500/70 bg-red-900/40',
    high: 'border-orange-500/50 bg-orange-900/30',
    medium: 'border-cyan-500/50 bg-cyan-900/30',
    low: 'border-gray-500/30 bg-gray-900/30',
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={announcement.line.id}
        initial={{ opacity: 0, y: -30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="fixed top-24 left-1/2 -translate-x-1/2 z-50 max-w-lg"
      >
        <div 
          className={`
            backdrop-blur-md rounded-lg px-6 py-3 border-2
            ${priorityStyles[announcement.line.priority]}
          `}
        >
          <div className="flex items-center gap-3">
            {/* Priority indicator */}
            <div className={`
              w-2 h-2 rounded-full
              ${announcement.line.priority === 'critical' ? 'bg-red-500 animate-pulse' : ''}
              ${announcement.line.priority === 'high' ? 'bg-orange-500' : ''}
              ${announcement.line.priority === 'medium' ? 'bg-cyan-500' : ''}
              ${announcement.line.priority === 'low' ? 'bg-gray-500' : ''}
            `} />
            
            {/* Text */}
            <span className={`
              font-mono text-sm tracking-wide
              ${getAnnouncementColor(announcement.line.priority)}
            `}>
              {announcement.line.text}
            </span>
          </div>
          
          {/* Category label */}
          <div className="text-gray-500 text-xs uppercase tracking-widest mt-1 text-center">
            {announcement.line.category}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// Combined Alert System Component
interface AlertSystemProps {
  alertLevel: AlertLevel;
  announcement: {
    line: VoiceLine;
  } | null;
  showAnnouncements?: boolean;
}

export function AlertSystem({ alertLevel, announcement, showAnnouncements = true }: AlertSystemProps) {
  return (
    <>
      <AlertOverlay alertLevel={alertLevel} showFlash />
      <AnnouncementToast announcement={announcement} visible={showAnnouncements} />
    </>
  );
}
