'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import * as THREE from 'three';

export interface Torpedo {
  id: string;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  targetId: string;
  targetPosition: THREE.Vector3;
  createdAt: number;
}

export interface WeaponsState {
  // Phaser state
  phaserFiring: boolean;
  phaserCharge: number;           // 0-100%, depletes while firing, recharges when not
  phaserOverheated: boolean;
  
  // Targeting
  targetId: string | null;        // Auto-selected planet ID, cleared on destroy
  targetPosition: THREE.Vector3 | null;
  targetDistance: number;
  targetName: string | null;
  
  // Torpedo state
  torpedoCount: number;           // Starts at 64
  torpedoReloading: boolean;
  torpedoReloadProgress: number;  // 0-100%, 2 sec reload
  activeTorpedoes: Torpedo[];     // Max 3 in flight
  
  // Status
  weaponsEnabled: boolean;        // Disabled during warp
}

export interface PlanetTarget {
  id: string;
  name: string;
  position: THREE.Vector3;
  radius: number;
  destroyed: boolean;
}

interface UseWeaponsOptions {
  onPhaserHit?: (targetId: string, damage: number) => void;
  onTorpedoHit?: (targetId: string, torpedoId: string) => void;
  onTargetDestroyed?: (targetId: string) => void;
}

const PHASER_RANGE = 500;           // Max targeting range
const PHASER_CHARGE_RATE = 15;      // % per second recharge
const PHASER_DRAIN_RATE = 25;       // % per second while firing
const PHASER_OVERHEAT_THRESHOLD = 5; // Overheat when charge drops below this
const PHASER_OVERHEAT_RECOVERY = 30; // Must reach this % to fire again after overheat
const PHASER_DPS = 5;               // Damage per second (20 sec to destroy)

const TORPEDO_SPEED = 150;          // Units per second
const TORPEDO_RELOAD_TIME = 2;      // Seconds between shots
const TORPEDO_MAX_IN_FLIGHT = 3;    // Max torpedoes flying at once
const TORPEDO_MAX_COUNT = 64;       // Starting torpedo count
const TORPEDO_DAMAGE = 10;          // Damage per hit (10 hits to destroy)

export function useWeapons(options: UseWeaponsOptions = {}) {
  const { onPhaserHit, onTorpedoHit, onTargetDestroyed } = options;

  const [state, setState] = useState<WeaponsState>({
    phaserFiring: false,
    phaserCharge: 100,
    phaserOverheated: false,
    targetId: null,
    targetPosition: null,
    targetDistance: 0,
    targetName: null,
    torpedoCount: TORPEDO_MAX_COUNT,
    torpedoReloading: false,
    torpedoReloadProgress: 100,
    activeTorpedoes: [],
    weaponsEnabled: true,
  });

  const stateRef = useRef(state);
  stateRef.current = state;

  const planetsRef = useRef<PlanetTarget[]>([]);
  const shipPositionRef = useRef(new THREE.Vector3());
  const shipQuaternionRef = useRef(new THREE.Quaternion());
  const torpedoIdCounter = useRef(0);

  // Update planets list (called from scene)
  const updatePlanets = useCallback((planets: PlanetTarget[]) => {
    planetsRef.current = planets;
  }, []);

  // Update ship position and rotation (called from scene)
  const updateShipPosition = useCallback((position: THREE.Vector3, quaternion?: THREE.Quaternion) => {
    shipPositionRef.current.copy(position);
    if (quaternion) {
      shipQuaternionRef.current.copy(quaternion);
    }
  }, []);

  // Enable/disable weapons (disabled during warp)
  const setWeaponsEnabled = useCallback((enabled: boolean) => {
    setState(prev => {
      // If disabling, also stop firing
      if (!enabled && prev.phaserFiring) {
        return { ...prev, weaponsEnabled: enabled, phaserFiring: false };
      }
      return { ...prev, weaponsEnabled: enabled };
    });
  }, []);

  // Auto-target nearest non-destroyed planet within range
  const autoTarget = useCallback(() => {
    const current = stateRef.current;
    if (!current.weaponsEnabled) return;

    const planets = planetsRef.current.filter(p => !p.destroyed);
    if (planets.length === 0) {
      // No targets available
      if (current.targetId !== null) {
        setState(prev => ({
          ...prev,
          targetId: null,
          targetPosition: null,
          targetDistance: 0,
          targetName: null,
        }));
      }
      return;
    }

    // Find nearest planet within range
    let nearest: PlanetTarget | null = null;
    let nearestDist = Infinity;

    for (const planet of planets) {
      const dist = shipPositionRef.current.distanceTo(planet.position);
      if (dist <= PHASER_RANGE && dist < nearestDist) {
        nearest = planet;
        nearestDist = dist;
      }
    }

    if (nearest && nearest.id !== current.targetId) {
      setState(prev => ({
        ...prev,
        targetId: nearest!.id,
        targetPosition: nearest!.position.clone(),
        targetDistance: nearestDist,
        targetName: nearest!.name,
      }));
    } else if (!nearest && current.targetId !== null) {
      // No target in range
      setState(prev => ({
        ...prev,
        targetId: null,
        targetPosition: null,
        targetDistance: 0,
        targetName: null,
      }));
    }
  }, []);

  // Manually select a target
  const selectTarget = useCallback((planetId: string) => {
    const planet = planetsRef.current.find(p => p.id === planetId && !p.destroyed);
    if (planet) {
      const dist = shipPositionRef.current.distanceTo(planet.position);
      setState(prev => ({
        ...prev,
        targetId: planet.id,
        targetPosition: planet.position.clone(),
        targetDistance: dist,
        targetName: planet.name,
      }));
    }
  }, []);

  // Clear current target
  const clearTarget = useCallback(() => {
    setState(prev => ({
      ...prev,
      targetId: null,
      targetPosition: null,
      targetDistance: 0,
      targetName: null,
    }));
  }, []);

  // Called when a target is destroyed - clears target and requires re-targeting
  const handleTargetDestroyed = useCallback((destroyedId: string) => {
    const current = stateRef.current;
    if (current.targetId === destroyedId) {
      setState(prev => ({
        ...prev,
        targetId: null,
        targetPosition: null,
        targetDistance: 0,
        targetName: null,
        phaserFiring: false, // Stop firing when target destroyed
      }));
      if (onTargetDestroyed) {
        onTargetDestroyed(destroyedId);
      }
    }
  }, [onTargetDestroyed]);

  // Start firing phasers (called on F key down)
  const firePhasers = useCallback(() => {
    const current = stateRef.current;
    if (!current.weaponsEnabled) return;
    if (!current.targetId) return; // No target
    if (current.phaserOverheated) return; // Overheated
    if (current.phaserCharge < PHASER_OVERHEAT_THRESHOLD) return; // Too low

    setState(prev => ({ ...prev, phaserFiring: true }));
  }, []);

  // Stop firing phasers (called on F key up)
  const stopPhasers = useCallback(() => {
    setState(prev => ({ ...prev, phaserFiring: false }));
  }, []);

  // Fire a torpedo (called on G key press)
  const fireTorpedo = useCallback(() => {
    const current = stateRef.current;
    if (!current.weaponsEnabled) return false;
    if (!current.targetId || !current.targetPosition) return false; // No target
    if (current.torpedoCount <= 0) return false; // No torpedoes
    if (current.torpedoReloadProgress < 100) return false; // Still reloading
    if (current.activeTorpedoes.length >= TORPEDO_MAX_IN_FLIGHT) return false; // Max in flight

    const torpedoId = `torpedo_${++torpedoIdCounter.current}`;
    const startPos = shipPositionRef.current.clone();
    
    // Calculate forward offset in ship's local space, then rotate to world space
    // Fire from torpedo bay (aft of engineering hull)
    const forwardOffset = new THREE.Vector3(0, -0.05, 0.4); 
    forwardOffset.applyQuaternion(shipQuaternionRef.current);
    
    // Calculate velocity toward target
    const direction = current.targetPosition.clone().sub(startPos).normalize();
    const velocity = direction.multiplyScalar(TORPEDO_SPEED);

    const newTorpedo: Torpedo = {
      id: torpedoId,
      position: startPos.clone().add(forwardOffset), // Start in front of ship with correct rotation
      velocity,
      targetId: current.targetId,
      targetPosition: current.targetPosition.clone(),
      createdAt: Date.now(),
    };

    setState(prev => ({
      ...prev,
      torpedoCount: prev.torpedoCount - 1,
      torpedoReloadProgress: 0,
      torpedoReloading: true,
      activeTorpedoes: [...prev.activeTorpedoes, newTorpedo],
    }));

    return true;
  }, []);

  // Remove a torpedo (called when it hits or times out)
  const removeTorpedo = useCallback((torpedoId: string) => {
    setState(prev => ({
      ...prev,
      activeTorpedoes: prev.activeTorpedoes.filter(t => t.id !== torpedoId),
    }));
  }, []);

  // Update weapons state (call every frame)
  const update = useCallback((delta: number) => {
    const current = stateRef.current;

    setState(prev => {
      let newState = { ...prev };
      
      // Update target distance
      if (prev.targetId && prev.targetPosition) {
        newState.targetDistance = shipPositionRef.current.distanceTo(prev.targetPosition);
        
        // Clear target if out of range
        if (newState.targetDistance > PHASER_RANGE * 1.5) {
          newState.targetId = null;
          newState.targetPosition = null;
          newState.targetDistance = 0;
          newState.targetName = null;
          newState.phaserFiring = false;
        }
      }

      // Phaser charge management
      if (prev.phaserFiring && prev.weaponsEnabled && prev.targetId) {
        // Drain charge while firing
        newState.phaserCharge = Math.max(0, prev.phaserCharge - PHASER_DRAIN_RATE * delta);
        
        // Check for overheat
        if (newState.phaserCharge < PHASER_OVERHEAT_THRESHOLD) {
          newState.phaserOverheated = true;
          newState.phaserFiring = false;
        }
        
        // Deal damage to target
        if (onPhaserHit && prev.targetId) {
          onPhaserHit(prev.targetId, PHASER_DPS * delta);
        }
      } else {
        // Recharge when not firing
        newState.phaserCharge = Math.min(100, prev.phaserCharge + PHASER_CHARGE_RATE * delta);
        
        // Clear overheat when charge recovers
        if (prev.phaserOverheated && newState.phaserCharge >= PHASER_OVERHEAT_RECOVERY) {
          newState.phaserOverheated = false;
        }
      }

      // Torpedo reload
      if (prev.torpedoReloading) {
        const reloadPercent = (100 / TORPEDO_RELOAD_TIME) * delta;
        newState.torpedoReloadProgress = Math.min(100, prev.torpedoReloadProgress + reloadPercent);
        
        if (newState.torpedoReloadProgress >= 100) {
          newState.torpedoReloading = false;
        }
      }

      // Update torpedo positions
      const updatedTorpedoes: Torpedo[] = [];
      for (const torpedo of prev.activeTorpedoes) {
        // Move torpedo
        const newPos = torpedo.position.clone().add(
          torpedo.velocity.clone().multiplyScalar(delta)
        );
        
        // Check if torpedo reached target
        const targetPlanet = planetsRef.current.find(p => p.id === torpedo.targetId);
        if (targetPlanet) {
          const distToTarget = newPos.distanceTo(targetPlanet.position);
          
          if (distToTarget <= targetPlanet.radius + 2) {
            // Hit!
            if (onTorpedoHit) {
              onTorpedoHit(torpedo.targetId, torpedo.id);
            }
            // Don't add to updated list (remove it)
            continue;
          }
        }
        
        // Check if torpedo has traveled too far (timeout after 10 seconds)
        if (Date.now() - torpedo.createdAt > 10000) {
          continue; // Remove old torpedoes
        }
        
        // Update position and keep torpedo
        updatedTorpedoes.push({
          ...torpedo,
          position: newPos,
        });
      }
      newState.activeTorpedoes = updatedTorpedoes;

      return newState;
    });
  }, [onPhaserHit, onTorpedoHit]);

  // Get phaser beam endpoint (for rendering)
  const getPhaserEndpoint = useCallback((): THREE.Vector3 | null => {
    const current = stateRef.current;
    if (!current.phaserFiring || !current.targetPosition) return null;
    return current.targetPosition.clone();
  }, []);

  return {
    state,
    updatePlanets,
    updateShipPosition,
    setWeaponsEnabled,
    autoTarget,
    selectTarget,
    clearTarget,
    handleTargetDestroyed,
    firePhasers,
    stopPhasers,
    fireTorpedo,
    removeTorpedo,
    update,
    getPhaserEndpoint,
    // Constants for UI
    PHASER_RANGE,
    TORPEDO_MAX_COUNT,
  };
}
