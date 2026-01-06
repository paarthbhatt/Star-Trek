'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShipComponent } from '@/types';

interface ComponentMenuProps {
  onSelectComponent: (component: ShipComponent) => void;
  openPanels: ShipComponent[];
}

const components: { id: ShipComponent; name: string; icon: string }[] = [
  { id: 'saucer', name: 'Saucer Section', icon: '◯' },
  { id: 'engineering', name: 'Engineering Hull', icon: '▮' },
  { id: 'nacelles', name: 'Warp Nacelles', icon: '═' },
  { id: 'deflector', name: 'Deflector Dish', icon: '◎' },
  { id: 'mission', name: 'Mission History', icon: '★' },
];

export function ComponentMenu({ onSelectComponent, openPanels }: ComponentMenuProps) {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <motion.div
      initial={{ x: -100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.8, delay: 1 }}
      className="fixed left-6 top-1/2 z-40 -translate-y-1/2 flex flex-col gap-3 py-4 px-2"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
        {/* Decorative line */}
        <div className="absolute left-0 top-0 bottom-0 w-[1px] bg-gradient-to-b from-transparent via-blue-500/20 to-transparent -ml-6" />

        {components.map((component, index) => {
          const isOpen = openPanels.includes(component.id);
          
          return (
            <motion.button
              key={component.id}
              layout
              initial={{ width: 48 }}
              animate={{ 
                width: isHovered ? 240 : 48,
                backgroundColor: isOpen ? 'rgba(59, 130, 246, 0.2)' : 'rgba(0, 5, 16, 0.4)',
                borderColor: isOpen ? 'rgba(96, 165, 250, 0.5)' : 'rgba(255, 255, 255, 0.1)'
              }}
              whileHover={{ 
                backgroundColor: 'rgba(59, 130, 246, 0.3)',
                borderColor: 'rgba(96, 165, 250, 0.8)',
                boxShadow: '0 0 15px rgba(59, 130, 246, 0.3)'
              }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelectComponent(component.id)}
              className={`
                relative h-12 flex items-center overflow-hidden rounded-lg backdrop-blur-md border transition-shadow
                ${isOpen ? 'shadow-[0_0_10px_rgba(59,130,246,0.2)]' : ''}
              `}
            >
              {/* Icon Container */}
              <div className="min-w-[48px] h-full flex items-center justify-center shrink-0 z-10">
                <span className={`text-lg ${isOpen ? 'text-blue-400 drop-shadow-[0_0_5px_rgba(59,130,246,0.8)]' : 'text-blue-200/70'}`}>
                  {component.icon}
                </span>
              </div>

              {/* Label Container */}
              <motion.div 
                className="flex items-center whitespace-nowrap overflow-hidden"
                animate={{ opacity: isHovered ? 1 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <div className="flex flex-col items-start pl-2">
                    <span className={`text-xs font-bold tracking-[0.15em] uppercase ${isOpen ? 'text-white' : 'text-blue-100/60'}`}>
                        {component.name}
                    </span>
                    <span className="text-[9px] font-mono text-blue-400/50 tracking-widest uppercase">
                        {isOpen ? 'ONLINE' : 'SYSTEM READY'}
                    </span>
                </div>
              </motion.div>

              {/* Active Indicator Bar */}
              {isOpen && (
                <motion.div
                  layoutId="active-glow"
                  className="absolute left-0 top-0 bottom-0 w-[2px] bg-blue-400 shadow-[0_0_10px_rgba(59,130,246,1)]"
                />
              )}
              
              {/* Tech Accents - Only visible when hovered */}
              <AnimatePresence>
                {isHovered && (
                    <>
                        <motion.div 
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="absolute top-1 right-1 w-1 h-1 border-t border-r border-blue-400/30" 
                        />
                        <motion.div 
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="absolute bottom-1 right-1 w-1 h-1 border-b border-r border-blue-400/30" 
                        />
                    </>
                )}
              </AnimatePresence>

            </motion.button>
          );
        })}
    </motion.div>
  );
}
