'use client';

import { useState, useCallback, useRef } from 'react';
import * as THREE from 'three';
import { Destination, ScanData, getDestination } from '@/data/destinations';

export interface ScannerState {
  isScanning: boolean;
  scanProgress: number; // 0-100
  targetId: string | null;
  scanData: ScanData | null;
  scanComplete: boolean;
  error: string | null;
}

interface UseScannerOptions {
  scanDuration?: number; // ms
  maxScanDistance?: number;
  onScanComplete?: (data: ScanData) => void;
  onScanStart?: () => void;
}

const DEFAULT_OPTIONS = {
  scanDuration: 3000,
  maxScanDistance: 100,
};

export function useScanner(options: UseScannerOptions = {}) {
  const { scanDuration, maxScanDistance, onScanComplete, onScanStart } = { ...DEFAULT_OPTIONS, ...options };

  const [state, setState] = useState<ScannerState>({
    isScanning: false,
    scanProgress: 0,
    targetId: null,
    scanData: null,
    scanComplete: false,
    error: null,
  });

  const stateRef = useRef(state);
  stateRef.current = state;

  // Start scanning a target
  const startScan = useCallback((target: Destination, shipPosition: THREE.Vector3) => {
    // Check distance
    const distance = shipPosition.distanceTo(target.position);
    if (distance > maxScanDistance) {
      setState(prev => ({
        ...prev,
        error: 'Target out of range',
        isScanning: false
      }));
      return false;
    }

    if (onScanStart) onScanStart();

    setState({
      isScanning: true,
      scanProgress: 0,
      targetId: target.id,
      scanData: null,
      scanComplete: false,
      error: null,
    });

    return true;
  }, [maxScanDistance, onScanStart]);

  // Cancel scanning
  const cancelScan = useCallback(() => {
    setState(prev => ({
      ...prev,
      isScanning: false,
      scanProgress: 0,
      scanComplete: false,
    }));
  }, []);

  // Reset scanner
  const resetScanner = useCallback(() => {
    setState({
      isScanning: false,
      scanProgress: 0,
      targetId: null,
      scanData: null,
      scanComplete: false,
      error: null,
    });
  }, []);

  // Update loop (call in useFrame)
  const updateScanner = useCallback((delta: number, shipPosition: THREE.Vector3, target: Destination | null) => {
    const current = stateRef.current;

    if (!current.isScanning || !target || target.id !== current.targetId) {
      if (current.isScanning) cancelScan();
      return;
    }

    // Check distance again (if ship moved away)
    const distance = shipPosition.distanceTo(target.position);
    if (distance > maxScanDistance) {
      setState(prev => ({
        ...prev,
        isScanning: false,
        error: 'Target signal lost - out of range'
      }));
      return;
    }

    // Increment progress
    // Delta is in seconds, scanDuration is in ms
    const progressIncrement = (delta * 1000 / scanDuration) * 100;
    const newProgress = Math.min(current.scanProgress + progressIncrement, 100);

    if (newProgress >= 100) {
      // Scan complete
      const data = target.scanData || {
        population: 'Unknown',
        resources: ['Unknown'],
        atmosphereDetails: 'Standard',
        threatLevel: 'Unknown',
        lifeSigns: 'Inconclusive',
        tacticalAnalysis: 'No tactical data available.'
      };

      setState(prev => ({
        ...prev,
        isScanning: false,
        scanProgress: 100,
        scanComplete: true,
        scanData: data as ScanData
      }));

      if (onScanComplete) onScanComplete(data as ScanData);
    } else {
      setState(prev => ({
        ...prev,
        scanProgress: newProgress
      }));
    }
  }, [maxScanDistance, scanDuration, cancelScan, onScanComplete]);

  return {
    scannerState: state,
    startScan,
    cancelScan,
    resetScanner,
    updateScanner
  };
}
