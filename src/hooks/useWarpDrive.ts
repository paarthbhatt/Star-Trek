'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import * as THREE from 'three';

export type WarpState = 
  | 'idle'           // Not warping, normal flight
  | 'charging'       // Warp core charging (1-2 seconds)
  | 'accelerating'   // Entering warp (0.5 seconds)
  | 'cruising'       // At warp speed
  | 'decelerating'   // Exiting warp (0.5 seconds)
  | 'arriving';      // Arrived at destination (brief)

export interface WarpDriveState {
  state: WarpState;
  warpLevel: number;                    // 1-9
  warpSpeed: number;                    // Units per second at current warp
  progress: number;                     // 0-1 progress to destination
  destination: THREE.Vector3 | null;    // Target position (with buffer applied)
  destinationCenter: THREE.Vector3 | null; // Actual center of destination
  origin: THREE.Vector3 | null;         // Start position
  totalDistance: number;                // Total travel distance
  distanceRemaining: number;            // Distance left
  eta: number;                          // Seconds remaining
  stateTime: number;                    // Time in current state
}

interface UseWarpDriveOptions {
  onStateChange?: (state: WarpState, prevState: WarpState) => void;
  onArrival?: () => void;
  baseSpeed?: number;  // Units per second at Warp 1
}

// Warp speed calculation (Warp Factor ^ 3 * baseSpeed)
// At baseSpeed = 38.5, Warp 1 takes 10 seconds to reach Moon at 385 units
function calculateWarpSpeed(warpLevel: number, baseSpeed: number): number {
  return Math.pow(warpLevel, 3) * baseSpeed;
}

// Calculate ETA in seconds
function calculateETA(distance: number, speed: number): number {
  if (speed <= 0) return Infinity;
  return distance / speed;
}

const defaultOptions: Required<Omit<UseWarpDriveOptions, 'onStateChange' | 'onArrival'>> = {
  baseSpeed: 38.5,  // 10 seconds to Moon at Warp 1
};

export function useWarpDrive(options: UseWarpDriveOptions = {}) {
  const { baseSpeed, onStateChange, onArrival } = { ...defaultOptions, ...options };

  const [state, setState] = useState<WarpDriveState>({
    state: 'idle',
    warpLevel: 1,
    warpSpeed: 0,
    progress: 0,
    destination: null,
    destinationCenter: null,
    origin: null,
    totalDistance: 0,
    distanceRemaining: 0,
    eta: 0,
    stateTime: 0,
  });

  const stateRef = useRef(state);
  stateRef.current = state;

  // State timings (in seconds)
  const CHARGE_TIME = 2.5; // Extended to allow for voice lines
  const ACCELERATE_TIME = 1.0; // Extended for "brace for acceleration"
  const DECELERATE_TIME = 1.2; // Extended from 0.5 for better drop-out animation
  const ARRIVAL_TIME = 0.3;

  // Set warp level
  const setWarpLevel = useCallback((level: number) => {
    const clampedLevel = Math.max(1, Math.min(9, level));
    setState(prev => ({
      ...prev,
      warpLevel: clampedLevel,
      warpSpeed: prev.state === 'cruising' ? calculateWarpSpeed(clampedLevel, baseSpeed) : prev.warpSpeed,
    }));
  }, [baseSpeed]);

  // Engage warp to destination
  // destinationRadius is the radius of the target planet/moon - ship will stop at radius + ARRIVAL_BUFFER
  const ARRIVAL_BUFFER = 25; // Units of clearance from destination surface
  
  const engageWarp = useCallback((destination: THREE.Vector3, origin: THREE.Vector3, destinationRadius: number = 0) => {
    const currentState = stateRef.current;
    
    // Can't engage if already warping
    if (currentState.state !== 'idle') return false;

    // Calculate arrival position with buffer - stop before reaching the planet
    const direction = destination.clone().sub(origin).normalize();
    const arrivalOffset = destinationRadius + ARRIVAL_BUFFER;
    const actualDestination = destination.clone().sub(direction.multiplyScalar(arrivalOffset));
    
    const distance = origin.distanceTo(actualDestination);
    const warpSpeed = calculateWarpSpeed(currentState.warpLevel, baseSpeed);

    const prevState = currentState.state;
    setState(prev => ({
      ...prev,
      state: 'charging',
      destination: actualDestination,
      destinationCenter: destination.clone(),
      origin: origin.clone(),
      totalDistance: distance,
      distanceRemaining: distance,
      warpSpeed,
      eta: calculateETA(distance, warpSpeed),
      progress: 0,
      stateTime: 0,
    }));

    if (onStateChange) {
      onStateChange('charging', prevState);
    }

    return true;
  }, [baseSpeed, onStateChange]);

  // Skip directly to destination
  const skipToDestination = useCallback(() => {
    const currentState = stateRef.current;
    
    if (!currentState.destination || currentState.state === 'idle') return false;

    const prevState = currentState.state;
    setState(prev => ({
      ...prev,
      state: 'arriving',
      progress: 1,
      distanceRemaining: 0,
      stateTime: 0,
    }));

    if (onStateChange) {
      onStateChange('arriving', prevState);
    }

    return true;
  }, [onStateChange]);

  // Disengage warp (emergency stop)
  const disengageWarp = useCallback(() => {
    const currentState = stateRef.current;
    
    if (currentState.state === 'idle') return false;

    const prevState = currentState.state;
    setState(prev => ({
      ...prev,
      state: 'decelerating',
      stateTime: 0,
    }));

    if (onStateChange) {
      onStateChange('decelerating', prevState);
    }

    return true;
  }, [onStateChange]);

  // Update warp (call every frame)
  const updateWarp = useCallback((delta: number): { 
    position: THREE.Vector3 | null;
    completed: boolean;
    state: WarpState;
  } => {
    const current = stateRef.current;
    let newPosition: THREE.Vector3 | null = null;
    let completed = false;

    const newStateTime = current.stateTime + delta;

    switch (current.state) {
      case 'charging':
        if (newStateTime >= CHARGE_TIME) {
          const prevState = current.state;
          setState(prev => ({
            ...prev,
            state: 'accelerating',
            stateTime: 0,
          }));
          if (onStateChange) onStateChange('accelerating', prevState);
        } else {
          setState(prev => ({ ...prev, stateTime: newStateTime }));
        }
        break;

      case 'accelerating':
        if (newStateTime >= ACCELERATE_TIME) {
          const prevState = current.state;
          setState(prev => ({
            ...prev,
            state: 'cruising',
            stateTime: 0,
          }));
          if (onStateChange) onStateChange('cruising', prevState);
        } else {
          setState(prev => ({ ...prev, stateTime: newStateTime }));
        }
        break;

      case 'cruising':
        if (current.destination && current.origin) {
          const distanceTraveled = current.warpSpeed * delta;
          const newDistanceRemaining = Math.max(0, current.distanceRemaining - distanceTraveled);
          const newProgress = 1 - (newDistanceRemaining / current.totalDistance);

          // Calculate new position along the path
          newPosition = new THREE.Vector3().lerpVectors(
            current.origin,
            current.destination,
            newProgress
          );

          // Check if arrived - set position to exact destination
          if (newDistanceRemaining <= 0) {
            newPosition = current.destination.clone(); // Exact arrival position
            const prevState = current.state;
            setState(prev => ({
              ...prev,
              state: 'decelerating',
              progress: 1,
              distanceRemaining: 0,
              stateTime: 0,
            }));
            if (onStateChange) onStateChange('decelerating', prevState);
          } else {
            setState(prev => ({
              ...prev,
              progress: newProgress,
              distanceRemaining: newDistanceRemaining,
              eta: calculateETA(newDistanceRemaining, current.warpSpeed),
              stateTime: newStateTime,
            }));
          }
        }
        break;

      case 'decelerating':
        if (newStateTime >= DECELERATE_TIME) {
          const prevState = current.state;
          setState(prev => ({
            ...prev,
            state: 'arriving',
            stateTime: 0,
          }));
          if (onStateChange) onStateChange('arriving', prevState);
        } else {
          setState(prev => ({ ...prev, stateTime: newStateTime }));
        }
        break;

      case 'arriving':
        if (newStateTime >= ARRIVAL_TIME) {
          const prevState = current.state;
          completed = true;
          setState(prev => ({
            ...prev,
            state: 'idle',
            destination: null,
            destinationCenter: null,
            origin: null,
            progress: 0,
            totalDistance: 0,
            distanceRemaining: 0,
            eta: 0,
            stateTime: 0,
          }));
          if (onStateChange) onStateChange('idle', prevState);
          if (onArrival) onArrival();
        } else {
          setState(prev => ({ ...prev, stateTime: newStateTime }));
        }
        break;
    }

    return {
      position: newPosition,
      completed,
      state: current.state,
    };
  }, [onStateChange, onArrival]);

  // Format ETA as string
  const formatETA = useCallback((seconds: number): string => {
    if (!isFinite(seconds)) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  return {
    state,
    setWarpLevel,
    engageWarp,
    skipToDestination,
    disengageWarp,
    updateWarp,
    formatETA,
    isWarping: state.state !== 'idle',
  };
}
