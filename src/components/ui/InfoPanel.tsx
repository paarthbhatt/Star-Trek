'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { ShipComponent, ComponentInfo, PanelState } from '@/types';
import { shipData } from '@/data/shipData';

interface InfoPanelProps {
  component: ShipComponent;
  panelState: PanelState;
  onClose: () => void;
  onToggleMinimize: () => void;
  index: number;
}

export function InfoPanel({ 
  component, 
  panelState, 
  onClose, 
  onToggleMinimize,
  index 
}: InfoPanelProps) {
  const info: ComponentInfo = shipData.components[component];
  const { isOpen, isMinimized } = panelState;

  if (!isOpen) return null;

  // Calculate position based on index to stack panels
  const rightOffset = 24 + index * 20;
  const topOffset = 120 + index * 30;

  return (
    <AnimatePresence>
      <motion.div
        key={component}
        initial={{ x: 100, opacity: 0, scale: 0.9 }}
        animate={{ 
          x: 0, 
          opacity: 1, 
          scale: 1,
          height: isMinimized ? 'auto' : 'auto'
        }}
        exit={{ x: 100, opacity: 0, scale: 0.9 }}
        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
        className="fixed z-50"
        style={{ right: rightOffset, top: topOffset }}
      >
        <div 
          className={`
            w-80 rounded-lg border border-[#4da6ff]/30 
            bg-[#001428]/80 backdrop-blur-xl
            shadow-[0_0_30px_rgba(77,166,255,0.15)]
            overflow-hidden
          `}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#4da6ff]/20 px-4 py-3">
            <div className="flex items-center gap-3">
              <motion.div
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="h-2 w-2 rounded-full bg-[#4da6ff]"
              />
              <div>
                <h3 className="text-sm font-medium tracking-wider text-white">
                  {info.name}
                </h3>
                <p className="text-[10px] tracking-wider text-[#ffaa00]">
                  {info.subtitle}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {/* Minimize button */}
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={onToggleMinimize}
                className="flex h-6 w-6 items-center justify-center rounded text-[#88aacc] hover:bg-[#4da6ff]/20 hover:text-[#4da6ff]"
              >
                <span className="text-xs">{isMinimized ? '▢' : '▬'}</span>
              </motion.button>

              {/* Close button */}
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="flex h-6 w-6 items-center justify-center rounded text-[#88aacc] hover:bg-[#ff3333]/20 hover:text-[#ff3333]"
              >
                <span className="text-xs">✕</span>
              </motion.button>
            </div>
          </div>

          {/* Content - collapsible */}
          <AnimatePresence>
            {!isMinimized && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                {/* Description */}
                <div className="border-b border-[#4da6ff]/10 px-4 py-3">
                  <p className="text-xs leading-relaxed text-[#aabbcc]">
                    {info.description}
                  </p>
                </div>

                {/* Specifications */}
                <div className="border-b border-[#4da6ff]/10 px-4 py-3">
                  <h4 className="mb-2 text-[10px] tracking-[0.2em] text-[#ffaa00]">
                    SPECIFICATIONS
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {info.specs.map((spec, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="rounded bg-[#0a1628]/50 px-2 py-1.5"
                      >
                        <p className="text-[9px] tracking-wider text-[#88aacc]">
                          {spec.label}
                        </p>
                        <p className="text-xs font-medium text-[#4da6ff]">
                          {spec.value}
                        </p>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Systems */}
                <div className="px-4 py-3">
                  <h4 className="mb-2 text-[10px] tracking-[0.2em] text-[#ffaa00]">
                    KEY SYSTEMS
                  </h4>
                  <div className="max-h-32 overflow-y-auto">
                    <ul className="space-y-1">
                      {info.systems.map((system, i) => (
                        <motion.li
                          key={i}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.3 + i * 0.03 }}
                          className="flex items-center gap-2 text-xs text-[#aabbcc]"
                        >
                          <span className="text-[#4da6ff]">▸</span>
                          {system}
                        </motion.li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Mission History - only for mission component */}
                {component === 'mission' && (
                  <div className="border-t border-[#4da6ff]/10 px-4 py-3">
                    <h4 className="mb-2 text-[10px] tracking-[0.2em] text-[#ffaa00]">
                      MISSION LOG
                    </h4>
                    <div className="max-h-40 space-y-2 overflow-y-auto">
                      {shipData.missions.map((mission, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.5 + i * 0.05 }}
                          className="rounded bg-[#0a1628]/50 p-2"
                        >
                          <div className="flex items-center justify-between">
                            <p className="text-[10px] text-[#88aacc]">
                              SD {mission.stardate}
                            </p>
                            <span 
                              className={`
                                text-[8px] tracking-wider px-1.5 py-0.5 rounded
                                ${mission.status === 'completed' ? 'bg-[#44ff88]/20 text-[#44ff88]' : ''}
                                ${mission.status === 'ongoing' ? 'bg-[#ffaa00]/20 text-[#ffaa00]' : ''}
                                ${mission.status === 'classified' ? 'bg-[#ff3333]/20 text-[#ff3333]' : ''}
                              `}
                            >
                              {mission.status.toUpperCase()}
                            </span>
                          </div>
                          <p className="text-xs font-medium text-white">
                            {mission.title}
                          </p>
                          <p className="text-[10px] text-[#88aacc]">
                            {mission.description}
                          </p>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Footer scan line effect */}
          <div className="h-px w-full bg-gradient-to-r from-transparent via-[#4da6ff]/30 to-transparent" />
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

interface InfoPanelsContainerProps {
  openPanels: ShipComponent[];
  panelStates: Record<ShipComponent, PanelState>;
  onClose: (component: ShipComponent) => void;
  onToggleMinimize: (component: ShipComponent) => void;
}

export function InfoPanelsContainer({
  openPanels,
  panelStates,
  onClose,
  onToggleMinimize,
}: InfoPanelsContainerProps) {
  return (
    <>
      {openPanels.map((component, index) => (
        <InfoPanel
          key={component}
          component={component}
          panelState={panelStates[component]}
          onClose={() => onClose(component)}
          onToggleMinimize={() => onToggleMinimize(component)}
          index={index}
        />
      ))}
    </>
  );
}
