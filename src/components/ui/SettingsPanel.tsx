'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, QualityLevel, useSettings } from '@/hooks/useSettings';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentFps?: number;
  audioEnabled: boolean;
  onAudioToggle: (enabled: boolean) => void;
}

export function SettingsPanel({ 
  isOpen, 
  onClose, 
  currentFps,
  audioEnabled,
  onAudioToggle,
}: SettingsPanelProps) {
  const { settings, updateSetting, resetSettings, getQualitySettings } = useSettings();
  const [activeTab, setActiveTab] = useState<'graphics' | 'audio' | 'controls'>('graphics');

  const qualitySettings = getQualitySettings(currentFps);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 w-96 bg-gray-900/95 border-l border-cyan-500/30 z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-cyan-500/20">
              <h2 className="text-cyan-400 font-bold text-lg tracking-wider">SETTINGS</h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white transition-colors p-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-cyan-500/20">
              {(['graphics', 'audio', 'controls'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-3 text-sm font-mono uppercase tracking-wider transition-all
                    ${activeTab === tab 
                      ? 'text-cyan-400 border-b-2 border-cyan-400 bg-cyan-500/10' 
                      : 'text-gray-500 hover:text-gray-300'
                    }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="p-4 overflow-y-auto h-[calc(100%-140px)]">
              {activeTab === 'graphics' && (
                <GraphicsSettings 
                  settings={settings}
                  qualitySettings={qualitySettings}
                  currentFps={currentFps}
                  onUpdate={updateSetting}
                />
              )}
              {activeTab === 'audio' && (
                <AudioSettings 
                  settings={settings}
                  audioEnabled={audioEnabled}
                  onAudioToggle={onAudioToggle}
                  onUpdate={updateSetting}
                />
              )}
              {activeTab === 'controls' && (
                <ControlsSettings settings={settings} onUpdate={updateSetting} />
              )}
            </div>

            {/* Footer */}
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-cyan-500/20 bg-gray-900/95">
              <button
                onClick={resetSettings}
                className="w-full py-2 text-sm font-mono text-gray-400 hover:text-red-400 transition-colors border border-gray-700 hover:border-red-500/50 rounded"
              >
                RESET TO DEFAULTS
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Graphics Settings Tab
function GraphicsSettings({ 
  settings, 
  qualitySettings,
  currentFps,
  onUpdate,
}: { 
  settings: Settings;
  qualitySettings: ReturnType<typeof useSettings>['getQualitySettings'] extends (fps?: number) => infer R ? R : never;
  currentFps?: number;
  onUpdate: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
}) {
  const qualityOptions: { value: QualityLevel; label: string }[] = [
    { value: 'auto', label: 'Auto' },
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
  ];

  return (
    <div className="space-y-6">
      {/* FPS Display */}
      {currentFps !== undefined && (
        <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
          <span className="text-gray-400 text-sm">Current FPS</span>
          <span className={`text-lg font-mono font-bold ${
            currentFps >= 55 ? 'text-green-400' : currentFps >= 30 ? 'text-yellow-400' : 'text-red-400'
          }`}>
            {Math.round(currentFps)}
          </span>
        </div>
      )}

      {/* Quality Level */}
      <div>
        <label className="block text-gray-300 text-sm mb-2">Quality Level</label>
        <div className="grid grid-cols-4 gap-2">
          {qualityOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => onUpdate('quality', option.value)}
              disabled={settings.lowPerformanceMode}
              className={`py-2 px-3 text-xs font-mono rounded transition-all
                ${settings.quality === option.value && !settings.lowPerformanceMode
                  ? 'bg-cyan-500/30 text-cyan-400 border border-cyan-500'
                  : 'bg-gray-800 text-gray-400 border border-gray-700 hover:border-gray-500'
                }
                ${settings.lowPerformanceMode ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {option.label}
            </button>
          ))}
        </div>
        {settings.quality === 'auto' && !settings.lowPerformanceMode && (
          <p className="text-gray-500 text-xs mt-2">
            Automatically adjusts based on performance
          </p>
        )}
      </div>

      {/* Low Performance Mode - NEW */}
      <ToggleSetting
        label="Low Performance Mode"
        description="Force lowest quality for weak hardware"
        value={settings.lowPerformanceMode}
        onChange={(value) => onUpdate('lowPerformanceMode', value)}
      />

      {settings.lowPerformanceMode && (
        <div className="p-3 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
          <p className="text-yellow-400 text-xs">
            Low Performance Mode is active. Quality is locked to Low settings for best FPS.
          </p>
        </div>
      )}

      {/* Quality Details */}
      <div className="space-y-2 p-3 bg-gray-800/30 rounded-lg">
        <h4 className="text-gray-400 text-xs uppercase tracking-wider mb-2">Current Settings</h4>
        <QualityDetail label="Stars" value={qualitySettings.starCount.toLocaleString()} />
        <QualityDetail label="Asteroids" value={qualitySettings.asteroidCount.toLocaleString()} />
        <QualityDetail label="Planet Detail" value={`${qualitySettings.planetSegments} segments`} />
        <QualityDetail label="Shader Quality" value={`${qualitySettings.noiseOctaves} octaves`} />
        <QualityDetail label="Post-Processing" value={qualitySettings.postProcessing} />
        <QualityDetail label="Shadows" value={qualitySettings.shadowsEnabled ? `${qualitySettings.shadowMapSize}px` : 'Off'} />
      </div>

      {/* Show FPS Toggle */}
      <ToggleSetting
        label="Show FPS Counter"
        description="Display frames per second in corner"
        value={settings.showFPS}
        onChange={(value) => onUpdate('showFPS', value)}
      />

      {/* Reduced Motion */}
      <ToggleSetting
        label="Reduced Motion"
        description="Minimize animations for accessibility"
        value={settings.reducedMotion}
        onChange={(value) => onUpdate('reducedMotion', value)}
      />
    </div>
  );
}

// Audio Settings Tab
function AudioSettings({ 
  settings,
  audioEnabled,
  onAudioToggle,
  onUpdate,
}: { 
  settings: Settings;
  audioEnabled: boolean;
  onAudioToggle: (enabled: boolean) => void;
  onUpdate: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
}) {
  return (
    <div className="space-y-6">
      {/* Master Audio Toggle */}
      <ToggleSetting
        label="Enable Audio"
        description="Toggle all game sounds"
        value={audioEnabled}
        onChange={onAudioToggle}
      />

      {/* Volume Slider */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-gray-300 text-sm">Master Volume</label>
          <span className="text-cyan-400 font-mono text-sm">{Math.round(settings.audioVolume * 100)}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={settings.audioVolume}
          onChange={(e) => onUpdate('audioVolume', parseFloat(e.target.value))}
          disabled={!audioEnabled}
          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 
            [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyan-400
            disabled:opacity-50 disabled:cursor-not-allowed"
        />
      </div>

      {/* Audio Info */}
      <div className="p-3 bg-gray-800/30 rounded-lg">
        <h4 className="text-gray-400 text-xs uppercase tracking-wider mb-2">Audio Categories</h4>
        <ul className="text-gray-500 text-xs space-y-1">
          <li>- Engine and propulsion sounds</li>
          <li>- Weapon effects (phasers, torpedoes)</li>
          <li>- UI feedback and alerts</li>
          <li>- Warp drive effects</li>
          <li>- Environmental ambience</li>
        </ul>
      </div>
    </div>
  );
}

// Controls Settings Tab
function ControlsSettings({ 
  settings,
  onUpdate,
}: { 
  settings: Settings;
  onUpdate: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
}) {
  const controls = [
    { category: 'Flight', keys: [
      { key: 'WASD', action: 'Move ship' },
      { key: 'Q/E', action: 'Roll' },
      { key: 'R/F', action: 'Pitch (alternative)' },
    ]},
    { category: 'Warp', keys: [
      { key: 'SPACE', action: 'Engage warp drive' },
      { key: '1-9', action: 'Set warp factor' },
      { key: 'T', action: 'Skip to destination' },
      { key: 'X', action: 'Emergency stop' },
    ]},
    { category: 'Weapons', keys: [
      { key: 'F (hold)', action: 'Fire phasers' },
      { key: 'G', action: 'Launch torpedo' },
      { key: 'N', action: 'Cycle targets' },
    ]},
    { category: 'Camera', keys: [
      { key: 'I', action: 'Free look mode' },
      { key: 'C', action: 'Cycle camera' },
      { key: 'Shift+P', action: 'Photo mode' },
      { key: 'H', action: 'Return to flight / Toggle helm' },
    ]},
    { category: 'Interface', keys: [
      { key: 'V', action: 'Navigation panel' },
      { key: 'TAB', action: 'Toggle panels' },
      { key: 'M', action: 'Toggle audio' },
      { key: 'ESC', action: 'Close modals / Pause' },
      { key: '?', action: 'Controls help' },
    ]},
  ];

  return (
    <div className="space-y-6">
      {/* High Contrast */}
      <ToggleSetting
        label="High Contrast"
        description="Increase UI contrast for visibility"
        value={settings.highContrast}
        onChange={(value) => onUpdate('highContrast', value)}
      />

      {/* Controls Reference */}
      <div className="space-y-4">
        <h4 className="text-gray-300 text-sm">Keyboard Controls</h4>
        {controls.map((section) => (
          <div key={section.category} className="p-3 bg-gray-800/30 rounded-lg">
            <h5 className="text-cyan-400 text-xs uppercase tracking-wider mb-2">{section.category}</h5>
            <div className="space-y-1">
              {section.keys.map((control) => (
                <div key={control.key} className="flex items-center justify-between text-xs">
                  <kbd className="px-2 py-0.5 bg-gray-700 rounded text-cyan-300 font-mono">{control.key}</kbd>
                  <span className="text-gray-400">{control.action}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Reusable Components
function QualityDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-300 font-mono">{value}</span>
    </div>
  );
}

function ToggleSetting({ 
  label, 
  description, 
  value, 
  onChange 
}: { 
  label: string; 
  description: string; 
  value: boolean; 
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="text-gray-300 text-sm">{label}</div>
        <div className="text-gray-500 text-xs">{description}</div>
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`w-12 h-6 rounded-full transition-all relative ${
          value ? 'bg-cyan-500' : 'bg-gray-700'
        }`}
      >
        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${
          value ? 'left-7' : 'left-1'
        }`} />
      </button>
    </div>
  );
}

// Settings Gear Button
export function SettingsButton({ onClick }: { onClick: () => void }) {
  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 1 }}
      onClick={onClick}
      className="fixed bottom-4 right-4 z-40 p-3 bg-gray-900/80 backdrop-blur-sm border border-cyan-500/30 rounded-full
        hover:bg-gray-800 hover:border-cyan-500/60 transition-all group"
      title="Settings"
    >
      <svg 
        className="w-6 h-6 text-cyan-400 group-hover:rotate-90 transition-transform duration-300" 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={1.5} 
          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" 
        />
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={1.5} 
          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" 
        />
      </svg>
    </motion.button>
  );
}

// FPS Counter
export function FPSCounter({ fps, visible }: { fps: number; visible: boolean }) {
  if (!visible) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed top-4 left-4 z-40 px-2 py-1 bg-black/60 backdrop-blur-sm rounded font-mono text-xs"
    >
      <span className={`${
        fps >= 55 ? 'text-green-400' : fps >= 30 ? 'text-yellow-400' : 'text-red-400'
      }`}>
        {Math.round(fps)} FPS
      </span>
    </motion.div>
  );
}
