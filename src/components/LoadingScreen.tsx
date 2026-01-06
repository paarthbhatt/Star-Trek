'use client';

import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

interface LoadingScreenProps {
  onLoadingComplete: () => void;
}

export function LoadingScreen({ onLoadingComplete }: LoadingScreenProps) {
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('Initializing systems...');

  useEffect(() => {
    const statuses = [
      'Initializing systems...',
      'Loading warp core...',
      'Calibrating deflector array...',
      'Synchronizing navigational sensors...',
      'Establishing subspace link...',
      'Systems online. Welcome aboard.',
    ];

    const interval = setInterval(() => {
      setProgress((prev) => {
        const newProgress = Math.min(prev + Math.random() * 15 + 5, 100);
        const statusIndex = Math.min(
          Math.floor((newProgress / 100) * statuses.length),
          statuses.length - 1
        );
        setStatusText(statuses[statusIndex]);
        return newProgress;
      });
    }, 200);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (progress >= 100) {
      const timeout = setTimeout(() => {
        onLoadingComplete();
      }, 800);
      return () => clearTimeout(timeout);
    }
  }, [progress, onLoadingComplete]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8 }}
    >
      {/* Starfleet logo / Enterprise silhouette */}
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1, ease: 'easeOut' }}
        className="mb-8"
      >
        <svg
          width="120"
          height="120"
          viewBox="0 0 120 120"
          className="text-[#4da6ff]"
        >
          {/* Starfleet delta shape */}
          <path
            d="M60 10 L95 100 L60 80 L25 100 Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="drop-shadow-[0_0_10px_#4da6ff]"
          />
          <path
            d="M60 25 L85 90 L60 75 L35 90 Z"
            fill="currentColor"
            opacity="0.3"
          />
          {/* Star */}
          <circle
            cx="60"
            cy="50"
            r="8"
            fill="currentColor"
            className="drop-shadow-[0_0_15px_#4da6ff]"
          />
        </svg>
      </motion.div>

      {/* Title */}
      <motion.h1
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.3 }}
        className="mb-2 text-4xl font-light tracking-[0.3em] text-[#4da6ff] drop-shadow-[0_0_20px_#4da6ff]"
        style={{ fontFamily: 'system-ui, sans-serif' }}
      >
        USS ENTERPRISE
      </motion.h1>

      <motion.p
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.5 }}
        className="mb-12 text-xl tracking-[0.5em] text-[#ffaa00]"
      >
        NCC-1701
      </motion.p>

      {/* Progress bar container */}
      <motion.div
        initial={{ scaleX: 0, opacity: 0 }}
        animate={{ scaleX: 1, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.7 }}
        className="relative mb-4 h-1 w-80 overflow-hidden rounded-full bg-[#0a1628]"
      >
        {/* Progress bar fill */}
        <motion.div
          className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-[#4da6ff] to-[#88ccff]"
          style={{ width: `${progress}%` }}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
        {/* Glow effect */}
        <motion.div
          className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-[#4da6ff] to-[#88ccff] blur-sm"
          style={{ width: `${progress}%` }}
        />
      </motion.div>

      {/* Percentage */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="mb-6 font-mono text-sm tracking-wider text-[#4da6ff]"
      >
        {Math.floor(progress)}%
      </motion.p>

      {/* Status text */}
      <motion.p
        key={statusText}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="font-mono text-xs tracking-wider text-[#88aacc]"
      >
        {statusText}
      </motion.p>

      {/* Decorative lines */}
      <div className="absolute bottom-20 left-0 right-0 flex justify-center gap-2">
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{ delay: 1 + i * 0.1, duration: 0.3 }}
            className="h-8 w-px bg-gradient-to-t from-transparent via-[#4da6ff] to-transparent opacity-50"
          />
        ))}
      </div>

      {/* Corner decorations */}
      <div className="absolute left-8 top-8 h-16 w-16 border-l-2 border-t-2 border-[#4da6ff]/30" />
      <div className="absolute right-8 top-8 h-16 w-16 border-r-2 border-t-2 border-[#4da6ff]/30" />
      <div className="absolute bottom-8 left-8 h-16 w-16 border-b-2 border-l-2 border-[#4da6ff]/30" />
      <div className="absolute bottom-8 right-8 h-16 w-16 border-b-2 border-r-2 border-[#4da6ff]/30" />
    </motion.div>
  );
}
