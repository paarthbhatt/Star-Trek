'use client';

import { useEffect, useCallback, useRef } from 'react';

export interface KeyState {
  forward: boolean;      // W
  backward: boolean;     // S
  left: boolean;         // A
  right: boolean;        // D
  pitchUp: boolean;      // R
  pitchDown: boolean;    // F
  rollLeft: boolean;     // Q
  rollRight: boolean;    // E
  engageWarp: boolean;   // Space
  fullStop: boolean;     // X
  destinations: boolean; // N
  skipTravel: boolean;   // T
  togglePanels: boolean; // Tab
  warpLevel: number;     // 1-9
}

const initialKeyState: KeyState = {
  forward: false,
  backward: false,
  left: false,
  right: false,
  pitchUp: false,
  pitchDown: false,
  rollLeft: false,
  rollRight: false,
  engageWarp: false,
  fullStop: false,
  destinations: false,
  skipTravel: false,
  togglePanels: false,
  warpLevel: 0,
};

type KeyCallback = (key: string, pressed: boolean) => void;

export function useKeyboard(onKeyAction?: KeyCallback) {
  const keysRef = useRef<KeyState>({ ...initialKeyState });
  const pressedKeysRef = useRef<Set<string>>(new Set());

  const updateKeyState = useCallback((key: string, pressed: boolean) => {
    const keyLower = key.toLowerCase();
    
    switch (keyLower) {
      case 'w':
        keysRef.current.forward = pressed;
        break;
      case 's':
        keysRef.current.backward = pressed;
        break;
      case 'a':
        keysRef.current.left = pressed;
        break;
      case 'd':
        keysRef.current.right = pressed;
        break;
      case 'r':
        keysRef.current.pitchUp = pressed;
        break;
      case 'f':
        keysRef.current.pitchDown = pressed;
        break;
      case 'q':
        keysRef.current.rollLeft = pressed;
        break;
      case 'e':
        keysRef.current.rollRight = pressed;
        break;
      case ' ':
        keysRef.current.engageWarp = pressed;
        break;
      case 'x':
        keysRef.current.fullStop = pressed;
        break;
      case 'n':
        keysRef.current.destinations = pressed;
        break;
      case 't':
        keysRef.current.skipTravel = pressed;
        break;
      case 'tab':
        keysRef.current.togglePanels = pressed;
        break;
      default:
        // Handle number keys 1-9 for warp levels
        if (pressed && /^[1-9]$/.test(key)) {
          keysRef.current.warpLevel = parseInt(key, 10);
        }
        break;
    }

    if (onKeyAction) {
      onKeyAction(keyLower, pressed);
    }
  }, [onKeyAction]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent default for game controls
      if (['w', 'a', 's', 'd', 'q', 'e', 'r', 'f', ' ', 'x', 'n', 't', 'Tab'].includes(e.key) ||
          /^[1-9]$/.test(e.key)) {
        e.preventDefault();
      }

      // Only fire once per key press (not on repeat)
      if (!pressedKeysRef.current.has(e.key)) {
        pressedKeysRef.current.add(e.key);
        updateKeyState(e.key, true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      pressedKeysRef.current.delete(e.key);
      updateKeyState(e.key, false);
    };

    // Handle window blur - release all keys
    const handleBlur = () => {
      pressedKeysRef.current.clear();
      keysRef.current = { ...initialKeyState };
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, [updateKeyState]);

  const getKeys = useCallback(() => keysRef.current, []);
  
  const isKeyPressed = useCallback((key: keyof Omit<KeyState, 'warpLevel'>) => {
    return keysRef.current[key];
  }, []);

  const getWarpLevel = useCallback(() => keysRef.current.warpLevel, []);

  return {
    getKeys,
    isKeyPressed,
    getWarpLevel,
  };
}
