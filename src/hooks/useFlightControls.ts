'use client';

import { useRef, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useKeyboard } from './useKeyboard';

export interface FlightState {
  position: THREE.Vector3;
  rotation: THREE.Euler;
  quaternion: THREE.Quaternion;
  velocity: THREE.Vector3;
  speed: number;          // Current speed (0-100 impulse, or warp speed)
  impulsePercent: number; // 0-100%
  isWarping: boolean;
  targetSpeed: number;
}

interface UseFlightControlsOptions {
  maxImpulseSpeed?: number;    // Units per second at full impulse
  acceleration?: number;       // How fast we accelerate
  deceleration?: number;       // How fast we slow down
  turnRate?: number;           // Radians per second
  rollRate?: number;           // Radians per second
  dampingFactor?: number;      // How much inertia
  onWarpEngage?: () => void;
  onFullStop?: () => void;
  enabled?: boolean;
}

const defaultOptions: Required<Omit<UseFlightControlsOptions, 'onWarpEngage' | 'onFullStop'>> = {
  maxImpulseSpeed: 15,     // Units per second at 100% impulse
  acceleration: 8,         // Acceleration rate
  deceleration: 5,         // Deceleration rate
  turnRate: 0.8,           // Yaw rate
  rollRate: 1.0,           // Roll rate
  dampingFactor: 0.98,     // Velocity damping
  enabled: true,
};

export function useFlightControls(options: UseFlightControlsOptions = {}) {
  const {
    maxImpulseSpeed,
    acceleration,
    deceleration,
    turnRate,
    rollRate,
    dampingFactor,
    onWarpEngage,
    onFullStop,
    enabled,
  } = { ...defaultOptions, ...options };

  const { getKeys } = useKeyboard();

  // Flight state
  const stateRef = useRef<FlightState>({
    position: new THREE.Vector3(0, 0, 0),
    rotation: new THREE.Euler(0, Math.PI * 0.1, 0),
    quaternion: new THREE.Quaternion(),
    velocity: new THREE.Vector3(),
    speed: 0,
    impulsePercent: 0,
    isWarping: false,
    targetSpeed: 0,
  });

  // Helper vectors (reused to avoid GC)
  const forward = useRef(new THREE.Vector3());
  const right = useRef(new THREE.Vector3());
  const up = useRef(new THREE.Vector3(0, 1, 0));

  // Track key events for one-shot actions
  const lastWarpPress = useRef(false);
  const lastStopPress = useRef(false);

  const updateFlight = useCallback((delta: number, shipRef?: THREE.Group | null) => {
    if (!enabled) return stateRef.current;

    const keys = getKeys();
    const state = stateRef.current;

    // Clamp delta to prevent huge jumps
    const dt = Math.min(delta, 0.1);

    // Get current quaternion from state
    state.quaternion.setFromEuler(state.rotation);

    // Calculate forward direction from quaternion
    // Ship model is rotated 180°, so forward is -Z in local space
    forward.current.set(0, 0, -1).applyQuaternion(state.quaternion);
    right.current.set(1, 0, 0).applyQuaternion(state.quaternion);

    // === ROTATION (YAW and ROLL) ===
    
    // Yaw (A/D keys)
    if (keys.left) {
      state.rotation.y += turnRate * dt;
    }
    if (keys.right) {
      state.rotation.y -= turnRate * dt;
    }

    // Pitch (R/F keys - commonly used in flight sims for up/down)
    if (keys.pitchUp) {
      state.rotation.x -= turnRate * dt;
    }
    if (keys.pitchDown) {
      state.rotation.x += turnRate * dt;
    }

    // Roll (Q/E keys)
    if (keys.rollLeft) {
      state.rotation.z += rollRate * dt;
    }
    if (keys.rollRight) {
      state.rotation.z -= rollRate * dt;
    }

    // Clamp roll to prevent excessive rolling
    state.rotation.z = THREE.MathUtils.clamp(state.rotation.z, -Math.PI / 4, Math.PI / 4);

    // === THROTTLE (W/S keys) ===
    
    if (keys.forward) {
      state.targetSpeed = Math.min(state.targetSpeed + acceleration * dt * 10, 100);
    } else if (keys.backward) {
      state.targetSpeed = Math.max(state.targetSpeed - deceleration * dt * 10, 0);
    }

    // Full stop (X key)
    if (keys.fullStop && !lastStopPress.current) {
      state.targetSpeed = 0;
      state.impulsePercent = 0;
      if (onFullStop) onFullStop();
    }
    lastStopPress.current = keys.fullStop;

    // Warp engage (Space key)
    if (keys.engageWarp && !lastWarpPress.current) {
      if (onWarpEngage) onWarpEngage();
    }
    lastWarpPress.current = keys.engageWarp;

    // === SPEED INTERPOLATION ===
    
    // Smoothly interpolate to target speed
    const speedDiff = state.targetSpeed - state.impulsePercent;
    if (Math.abs(speedDiff) > 0.1) {
      const rate = speedDiff > 0 ? acceleration : deceleration;
      state.impulsePercent += Math.sign(speedDiff) * rate * dt * 5;
      state.impulsePercent = THREE.MathUtils.clamp(state.impulsePercent, 0, 100);
    } else {
      state.impulsePercent = state.targetSpeed;
    }

    // Calculate actual speed from impulse percentage
    state.speed = (state.impulsePercent / 100) * maxImpulseSpeed;

    // === MOVEMENT ===
    
    if (!state.isWarping) {
      // Apply velocity based on forward direction and speed
      state.velocity.copy(forward.current).multiplyScalar(state.speed * dt);
      state.position.add(state.velocity);
    }

    // Apply damping when not accelerating
    if (!keys.forward && !keys.backward) {
      state.targetSpeed *= dampingFactor;
      if (state.targetSpeed < 0.5) state.targetSpeed = 0;
    }

    // === APPLY TO SHIP ===
    
    if (shipRef) {
      shipRef.position.copy(state.position);
      shipRef.rotation.copy(state.rotation);
    }

    return state;
  }, [enabled, getKeys, maxImpulseSpeed, acceleration, deceleration, turnRate, rollRate, dampingFactor, onWarpEngage, onFullStop]);

  // Set position externally (e.g., after warp jump)
  const setPosition = useCallback((pos: THREE.Vector3) => {
    stateRef.current.position.copy(pos);
  }, []);

  // Set warping state
  const setWarping = useCallback((isWarping: boolean) => {
    stateRef.current.isWarping = isWarping;
  }, []);

  // Get current state
  const getState = useCallback(() => stateRef.current, []);

  // Reset to initial state
  const reset = useCallback(() => {
    stateRef.current = {
      position: new THREE.Vector3(0, 0, 0),
      rotation: new THREE.Euler(0, Math.PI * 0.1, 0),
      quaternion: new THREE.Quaternion(),
      velocity: new THREE.Vector3(),
      speed: 0,
      impulsePercent: 0,
      isWarping: false,
      targetSpeed: 0,
    };
  }, []);

  return {
    updateFlight,
    setPosition,
    setWarping,
    getState,
    reset,
    stateRef,
  };
}
