'use client';

import { useState, useEffect, useCallback } from 'react';

export type QualityLevel = 'auto' | 'low' | 'medium' | 'high';

export interface QualitySettings {
  starCount: number;
  asteroidCount: number;
  planetSegments: number;
  noiseOctaves: number;
  postProcessing: 'none' | 'bloom' | 'full';
  shadowMapSize: number;
  shadowsEnabled: boolean;
}

export interface Settings {
  quality: QualityLevel;
  audioEnabled: boolean;
  audioVolume: number;
  showFPS: boolean;
  showMinimap: boolean;
  tutorialCompleted: boolean;
  // Accessibility
  reducedMotion: boolean;
  highContrast: boolean;
  // Performance
  lowPerformanceMode: boolean;
}

const DEFAULT_SETTINGS: Settings = {
  quality: 'auto',
  audioEnabled: true,
  audioVolume: 0.7,
  showFPS: false,
  showMinimap: false,
  tutorialCompleted: false,
  reducedMotion: false,
  highContrast: false,
  lowPerformanceMode: false,
};

// Quality presets
export const QUALITY_PRESETS: Record<Exclude<QualityLevel, 'auto'>, QualitySettings> = {
  low: {
    starCount: 2000,
    asteroidCount: 300,
    planetSegments: 24,
    noiseOctaves: 2,
    postProcessing: 'none',
    shadowMapSize: 0,
    shadowsEnabled: false,
  },
  medium: {
    starCount: 5000,
    asteroidCount: 800,
    planetSegments: 32,
    noiseOctaves: 3,
    postProcessing: 'bloom',
    shadowMapSize: 512,
    shadowsEnabled: false,
  },
  high: {
    starCount: 10000,
    asteroidCount: 1500,
    planetSegments: 48,
    noiseOctaves: 5,
    postProcessing: 'full',
    shadowMapSize: 1024,
    shadowsEnabled: true,
  },
};

const STORAGE_KEY = 'startrek-settings';

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setSettings(prev => ({ ...prev, ...parsed }));
      }
    } catch (e) {
      console.warn('Failed to load settings from localStorage:', e);
    }
    setIsLoaded(true);
  }, []);

  // Save settings to localStorage when they change
  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (e) {
      console.warn('Failed to save settings to localStorage:', e);
    }
  }, [settings, isLoaded]);

  const updateSetting = useCallback(<K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
  }, []);

  const getQualitySettings = useCallback((currentFps?: number): QualitySettings => {
    // Force low quality if lowPerformanceMode is enabled
    if (settings.lowPerformanceMode) {
      return QUALITY_PRESETS.low;
    }
    
    if (settings.quality === 'auto' && currentFps !== undefined) {
      // Auto-select based on FPS with hysteresis to prevent rapid switching
      if (currentFps >= 55) return QUALITY_PRESETS.high;
      if (currentFps >= 30) return QUALITY_PRESETS.medium;
      return QUALITY_PRESETS.low;
    }
    
    const level = settings.quality === 'auto' ? 'high' : settings.quality;
    return QUALITY_PRESETS[level];
  }, [settings.quality, settings.lowPerformanceMode]);

  return {
    settings,
    isLoaded,
    updateSetting,
    resetSettings,
    getQualitySettings,
  };
}
