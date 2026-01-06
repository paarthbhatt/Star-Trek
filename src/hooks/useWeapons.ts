import { useState, useCallback, useRef } from 'react';
import * as THREE from 'three';
import { Destination, DESTINATIONS } from '@/data/destinations';

export interface WeaponTarget {
  id: string;
  type: 'planet' | 'ship' | 'station' | 'asteroid' | 'enemy';
  position: THREE.Vector3;
  name: string;
  radius: number;
  health?: number;
  maxHealth?: number;
  shields?: number;
  maxShields?: number;
  distance?: number;
}

export interface WeaponsState {
  phaserHeat: number;
  phaserOverheated: boolean;
  torpedoCount: number;
  maxTorpedoes: number;
  torpedoLoading: boolean;
  targetId: string | null;
  target: WeaponTarget | null;
  isFiringPhasers: boolean;
}

interface UseWeaponsProps {
  shipPosition: THREE.Vector3;
  shipRotation: THREE.Euler;
  onFirePhaser?: () => void;
  onFireTorpedo?: () => void;
  onTargetChange?: (target: WeaponTarget | null) => void;
}

// Mock enemies removed for simulator focus
const MOCK_ENEMIES: WeaponTarget[] = [];

export function useWeapons({
  shipPosition,
  shipRotation,
  onFirePhaser,
  onFireTorpedo,
  onTargetChange,
}: UseWeaponsProps) {
  const [state, setState] = useState<WeaponsState>({
    phaserHeat: 0,
    phaserOverheated: false,
    torpedoCount: 100,
    maxTorpedoes: 100,
    torpedoLoading: false,
    targetId: null,
    target: null,
    isFiringPhasers: false,
  });

  const lastFireTime = useRef(0);
  const phaserSoundRef = useRef<boolean>(false);

  // Cycle through available targets (planets, stations, and enemies)
  const cycleTarget = useCallback(() => {
    setState(prev => {
      // 1. Convert destinations to WeaponTargets
      const destinationTargets: WeaponTarget[] = DESTINATIONS.map(d => ({
        id: d.id,
        type: d.type === 'station' ? 'station' : 'planet',
        position: d.position,
        name: d.name,
        radius: d.radius
      }));

      // 2. Combine with enemies
      // Update enemy distances based on current ship position
      const enemyTargets = MOCK_ENEMIES.map(e => ({
        ...e,
        distance: e.position.distanceTo(shipPosition)
      }));

      const allTargets = [...enemyTargets, ...destinationTargets];

      // 3. Filter targets that are too far away (e.g., > 1000 units) to reduce noise, 
      // but keep current target if valid
      const relevantTargets = allTargets.filter(t => t.position.distanceTo(shipPosition) < 2000);

      // 4. Sort by distance
      relevantTargets.sort((a, b) => 
        a.position.distanceTo(shipPosition) - b.position.distanceTo(shipPosition)
      );

      if (relevantTargets.length === 0) return prev;

      // 5. Find current index
      const currentIndex = prev.targetId 
        ? relevantTargets.findIndex(t => t.id === prev.targetId)
        : -1;

      // 6. Select next
      const nextIndex = (currentIndex + 1) % relevantTargets.length;
      const nextTarget = relevantTargets[nextIndex];

      if (onTargetChange) onTargetChange(nextTarget);

      return {
        ...prev,
        targetId: nextTarget.id,
        target: nextTarget
      };
    });
  }, [shipPosition, onTargetChange]);

  const firePhasers = useCallback((active: boolean) => {
    setState(prev => {
      if (prev.phaserOverheated) return { ...prev, isFiringPhasers: false };
      
      const isFiring = active && prev.phaserHeat < 100;
      
      if (isFiring !== prev.isFiringPhasers) {
         if (isFiring && onFirePhaser) onFirePhaser();
      }

      return {
        ...prev,
        isFiringPhasers: isFiring
      };
    });
  }, [onFirePhaser]);

  const fireTorpedo = useCallback(() => {
    let fired = false;
    setState(prev => {
      if (prev.torpedoCount <= 0 || prev.torpedoLoading) return prev;

      fired = true;
      return {
        ...prev,
        torpedoCount: prev.torpedoCount - 1,
        torpedoLoading: true
      };
    });

    if (fired) {
        if (onFireTorpedo) onFireTorpedo();
        // Reload time
        setTimeout(() => {
            setState(prev => ({ ...prev, torpedoLoading: false }));
        }, 2000);
    }
  }, [onFireTorpedo]);

  // Update loop for heat/cooling
  const updateWeapons = useCallback((delta: number) => {
    setState(prev => {
      let { phaserHeat, phaserOverheated, isFiringPhasers } = prev;

      if (isFiringPhasers) {
        phaserHeat += delta * 25; // Heat up rate
        if (phaserHeat >= 100) {
          phaserHeat = 100;
          phaserOverheated = true;
          isFiringPhasers = false; // Force stop
        }
      } else {
        phaserHeat -= delta * 15; // Cooldown rate
        if (phaserHeat <= 0) {
          phaserHeat = 0;
          phaserOverheated = false;
        }
      }

      // Only update if changed significantly to avoid re-renders
      if (
        Math.abs(phaserHeat - prev.phaserHeat) > 0.1 ||
        phaserOverheated !== prev.phaserOverheated ||
        isFiringPhasers !== prev.isFiringPhasers
      ) {
        return {
          ...prev,
          phaserHeat,
          phaserOverheated,
          isFiringPhasers
        };
      }
      return prev;
    });
  }, []);

  return {
    weaponsState: state,
    cycleTarget,
    firePhasers,
    fireTorpedo,
    updateWeapons,
    enemies: MOCK_ENEMIES // Export enemies so we can render them
  };
}
