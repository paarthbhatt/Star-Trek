'use client';

import { motion } from 'framer-motion';

export function Header() {
  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 1, delay: 0.5 }}
      className="fixed left-0 right-0 top-0 z-40 pointer-events-none"
    >
      <div className="flex items-center justify-between px-8 py-6">
        {/* Left side - Ship name */}
        <div className="pointer-events-auto">
          <motion.div
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="flex items-center gap-4"
          >
            {/* Starfleet insignia */}
            <svg
              width="40"
              height="40"
              viewBox="0 0 40 40"
              className="text-[#4da6ff] drop-shadow-[0_0_10px_#4da6ff]"
            >
              <path
                d="M20 5 L32 35 L20 28 L8 35 Z"
                fill="currentColor"
                opacity="0.8"
              />
              <circle cx="20" cy="18" r="3" fill="#ffaa00" />
            </svg>

            <div>
              <h1 className="text-xl font-light tracking-[0.2em] text-white drop-shadow-[0_0_10px_rgba(77,166,255,0.5)]">
                USS ENTERPRISE
              </h1>
              <p className="text-xs tracking-[0.3em] text-[#ffaa00]">
                NCC-1701 • CONSTITUTION CLASS
              </p>
            </div>
          </motion.div>
        </div>

        {/* Center - Status indicators */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="hidden md:flex items-center gap-6"
        >
          <StatusIndicator label="WARP" value="STANDBY" color="blue" />
          <StatusIndicator label="SHIELDS" value="NOMINAL" color="green" />
          <StatusIndicator label="SYSTEMS" value="ONLINE" color="green" />
        </motion.div>

        {/* Right side - Stardate */}
        <motion.div
          initial={{ x: 50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="text-right pointer-events-auto"
        >
          <p className="text-xs tracking-wider text-[#88aacc]">STARDATE</p>
          <p className="font-mono text-lg tracking-wider text-[#4da6ff]">
            {getStardate()}
          </p>
        </motion.div>
      </div>

      {/* Decorative line */}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 1, delay: 1 }}
        className="mx-8 h-px bg-gradient-to-r from-transparent via-[#4da6ff]/50 to-transparent"
      />
    </motion.header>
  );
}

function StatusIndicator({ 
  label, 
  value, 
  color 
}: { 
  label: string; 
  value: string; 
  color: 'blue' | 'green' | 'red' | 'yellow';
}) {
  const colorClasses = {
    blue: 'text-[#4da6ff] bg-[#4da6ff]',
    green: 'text-[#44ff88] bg-[#44ff88]',
    red: 'text-[#ff4444] bg-[#ff4444]',
    yellow: 'text-[#ffaa00] bg-[#ffaa00]',
  };

  return (
    <div className="flex items-center gap-2">
      <motion.div
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity }}
        className={`h-2 w-2 rounded-full ${colorClasses[color].split(' ')[1]}`}
      />
      <div>
        <p className="text-[10px] tracking-wider text-[#88aacc]">{label}</p>
        <p className={`text-xs font-medium tracking-wider ${colorClasses[color].split(' ')[0]}`}>
          {value}
        </p>
      </div>
    </div>
  );
}

function getStardate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const start = new Date(year, 0, 0);
  const diff = now.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);
  const fraction = Math.floor((now.getHours() * 60 + now.getMinutes()) / 1.44);
  
  // Convert to Star Trek style stardate (roughly year + day fraction)
  const stardate = ((year - 2000) * 1000 + dayOfYear + fraction / 100).toFixed(1);
  return stardate;
}
