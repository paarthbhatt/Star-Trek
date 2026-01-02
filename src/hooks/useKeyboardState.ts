'use client';

import { useState, useEffect, useCallback } from 'react';

export interface KeyboardState {
  w: boolean;
  a: boolean;
  s: boolean;
  d: boolean;
  q: boolean;
  e: boolean;
  space: boolean;
  shift: boolean;
}

const DEFAULT_STATE: KeyboardState = {
  w: false,
  a: false,
  s: false,
  d: false,
  q: false,
  e: false,
  space: false,
  shift: false,
};

export function useKeyboardState() {
  const [keys, setKeys] = useState<KeyboardState>(DEFAULT_STATE);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const key = e.key.toLowerCase();
    
    setKeys(prev => {
      const newState = { ...prev };
      
      if (key === 'w') newState.w = true;
      else if (key === 'a') newState.a = true;
      else if (key === 's') newState.s = true;
      else if (key === 'd') newState.d = true;
      else if (key === 'q') newState.q = true;
      else if (key === 'e') newState.e = true;
      else if (e.code === 'Space') newState.space = true;
      else if (e.shiftKey) newState.shift = true;
      
      return newState;
    });
  }, []);

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    const key = e.key.toLowerCase();
    
    setKeys(prev => {
      const newState = { ...prev };
      
      if (key === 'w') newState.w = false;
      else if (key === 'a') newState.a = false;
      else if (key === 's') newState.s = false;
      else if (key === 'd') newState.d = false;
      else if (key === 'q') newState.q = false;
      else if (key === 'e') newState.e = false;
      else if (e.code === 'Space') newState.space = false;
      else if (!e.shiftKey) newState.shift = false;
      
      return newState;
    });
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    // Reset all keys when window loses focus
    const handleBlur = () => setKeys(DEFAULT_STATE);
    window.addEventListener('blur', handleBlur);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, [handleKeyDown, handleKeyUp]);

  const isAnyPressed = Object.values(keys).some(v => v);

  return {
    keys,
    isAnyPressed,
  };
}
