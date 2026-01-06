'use client';

import { useState, useCallback, useEffect } from 'react';

export type CameraMode = 'flight' | 'freeLook' | 'cinematic' | 'photo';

export interface CameraModeState {
  mode: CameraMode;
  previousMode: CameraMode;
  isFlightEnabled: boolean;
  isOrbitEnabled: boolean;
  showUI: boolean;
}

interface UseCameraModeOptions {
  onModeChange?: (newMode: CameraMode, prevMode: CameraMode) => void;
}

export function useCameraMode(options: UseCameraModeOptions = {}) {
  const [state, setState] = useState<CameraModeState>({
    mode: 'flight',
    previousMode: 'flight',
    isFlightEnabled: true,
    isOrbitEnabled: false,
    showUI: true,
  });

  const setMode = useCallback((newMode: CameraMode) => {
    setState(prev => {
      if (prev.mode === newMode) return prev;
      
      const newState: CameraModeState = {
        mode: newMode,
        previousMode: prev.mode,
        isFlightEnabled: newMode === 'flight',
        isOrbitEnabled: newMode === 'freeLook' || newMode === 'photo',
        showUI: newMode !== 'photo',
      };
      
      options.onModeChange?.(newMode, prev.mode);
      return newState;
    });
  }, [options]);

  const toggleMode = useCallback((mode: CameraMode) => {
    setState(prev => {
      // If already in this mode, go back to previous or flight
      if (prev.mode === mode) {
        const targetMode = prev.previousMode !== mode ? prev.previousMode : 'flight';
        return {
          mode: targetMode,
          previousMode: prev.mode,
          isFlightEnabled: targetMode === 'flight',
          isOrbitEnabled: targetMode === 'freeLook' || targetMode === 'photo',
          showUI: targetMode !== 'photo',
        };
      }
      
      // Switch to new mode
      return {
        mode: mode,
        previousMode: prev.mode,
        isFlightEnabled: mode === 'flight',
        isOrbitEnabled: mode === 'freeLook' || mode === 'photo',
        showUI: mode !== 'photo',
      };
    });
  }, []);

  const returnToFlight = useCallback(() => {
    setMode('flight');
  }, [setMode]);

  // Handle keyboard shortcuts for camera modes
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const keyLower = e.key.toLowerCase();
      
      switch (keyLower) {
        case 'i':
          e.preventDefault();
          console.log('I key pressed - toggling freeLook mode');
          toggleMode('freeLook');
          break;
        case 'c':
          e.preventDefault();
          // Only cycle to cinematic if in flight mode
          if (state.mode === 'flight') {
            console.log('C key pressed - entering cinematic mode');
            setMode('cinematic');
          } else if (state.mode === 'cinematic') {
            console.log('C key pressed - returning to flight mode');
            setMode('flight');
          }
          break;
        case 'p':
          // Photo mode now requires Shift+P to avoid conflict with phasers
          if (e.shiftKey) {
            e.preventDefault();
            console.log('Shift+P pressed - toggling photo mode');
            toggleMode('photo');
          }
          break;
        case 'h':
          // H key - if in freeLook or cinematic, return to flight
          if (state.mode === 'freeLook' || state.mode === 'cinematic') {
            e.preventDefault();
            console.log('H key pressed - returning to flight mode');
            setMode('flight');
          }
          // If already in flight, the helm toggle is handled in page.tsx
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [state.mode, toggleMode, setMode]);

  return {
    ...state,
    setMode,
    toggleMode,
    returnToFlight,
  };
}

// Helper to get mode display name
export function getCameraModeDisplayName(mode: CameraMode): string {
  switch (mode) {
    case 'flight': return 'FLIGHT';
    case 'freeLook': return 'INSPECT MODE';
    case 'cinematic': return 'CINEMATIC';
    case 'photo': return 'PHOTO MODE';
    default: return 'UNKNOWN';
  }
}

// Helper to get mode description
export function getCameraModeDescription(mode: CameraMode): string {
  switch (mode) {
    case 'flight': return 'Chase camera follows ship. WASD to fly.';
    case 'freeLook': return 'View ship from any angle. Drag to rotate, scroll to zoom.';
    case 'cinematic': return 'Auto-orbiting camera. Sit back and enjoy.';
    case 'photo': return 'Free camera for screenshots. All UI hidden. (Shift+P)';
    default: return '';
  }
}
