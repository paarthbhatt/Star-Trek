'use client';

import { useState, useCallback, useRef } from 'react';

export type DamageState = 
  | 'healthy'     // 100-70% health
  | 'damaged'     // 70-30% health  
  | 'critical'    // 30-0% health
  | 'exploding'   // Health <= 0, playing explosion animation
  | 'debris'      // Post-explosion debris field
  | 'respawning'; // Fading back in

export interface PlanetHealth {
  id: string;
  name: string;
  health: number;           // 0-100
  maxHealth: number;
  damageState: DamageState;
  destroyedAt: number | null;
  respawnAt: number | null;
  explosionProgress: number; // 0-1 during explosion
  respawnProgress: number;   // 0-1 during respawn
}

interface UsePlanetHealthOptions {
  respawnTime?: number;      // ms, default 120000 (2 minutes)
  explosionDuration?: number; // ms, default 2000
  debrisDuration?: number;   // ms, default 30000
  onPlanetDestroyed?: (planetId: string, planetName: string) => void;
  onPlanetRespawned?: (planetId: string) => void;
}

const DEFAULT_OPTIONS = {
  respawnTime: 120000,       // 2 minutes
  explosionDuration: 2000,   // 2 seconds
  debrisDuration: 30000,     // 30 seconds of debris before respawn
};

export function usePlanetHealth(options: UsePlanetHealthOptions = {}) {
  const { 
    respawnTime = DEFAULT_OPTIONS.respawnTime,
    explosionDuration = DEFAULT_OPTIONS.explosionDuration,
    debrisDuration = DEFAULT_OPTIONS.debrisDuration,
    onPlanetDestroyed,
    onPlanetRespawned,
  } = options;

  const [planets, setPlanets] = useState<Map<string, PlanetHealth>>(new Map());
  const planetsRef = useRef(planets);
  planetsRef.current = planets;

  // Initialize or update a planet
  const initPlanet = useCallback((id: string, name: string, maxHealth: number = 100) => {
    setPlanets(prev => {
      const newMap = new Map(prev);
      if (!newMap.has(id)) {
        newMap.set(id, {
          id,
          name,
          health: maxHealth,
          maxHealth,
          damageState: 'healthy',
          destroyedAt: null,
          respawnAt: null,
          explosionProgress: 0,
          respawnProgress: 0,
        });
      }
      return newMap;
    });
  }, []);

  // Get damage state based on health percentage
  const getDamageState = (health: number, maxHealth: number): DamageState => {
    const percent = (health / maxHealth) * 100;
    if (percent > 70) return 'healthy';
    if (percent > 30) return 'damaged';
    if (percent > 0) return 'critical';
    return 'exploding';
  };

  // Apply damage to a planet
  const damagePlanet = useCallback((planetId: string, damage: number) => {
    setPlanets(prev => {
      const planet = prev.get(planetId);
      if (!planet) return prev;
      
      // Can't damage if already destroyed or respawning
      if (planet.damageState === 'exploding' || 
          planet.damageState === 'debris' || 
          planet.damageState === 'respawning') {
        return prev;
      }

      const newHealth = Math.max(0, planet.health - damage);
      const newDamageState = getDamageState(newHealth, planet.maxHealth);
      
      const newMap = new Map(prev);
      
      // Check if planet just died
      if (newHealth <= 0 && planet.health > 0) {
        const now = Date.now();
        newMap.set(planetId, {
          ...planet,
          health: 0,
          damageState: 'exploding',
          destroyedAt: now,
          respawnAt: now + respawnTime,
          explosionProgress: 0,
        });
        
        if (onPlanetDestroyed) {
          onPlanetDestroyed(planetId, planet.name);
        }
      } else {
        newMap.set(planetId, {
          ...planet,
          health: newHealth,
          damageState: newDamageState,
        });
      }
      
      return newMap;
    });
  }, [respawnTime, onPlanetDestroyed]);

  // Update explosion and respawn timers (call every frame)
  const update = useCallback((delta: number) => {
    const now = Date.now();
    
    setPlanets(prev => {
      let changed = false;
      const newMap = new Map(prev);
      
      for (const [id, planet] of newMap) {
        // Update explosion progress
        if (planet.damageState === 'exploding') {
          const newProgress = planet.explosionProgress + (delta * 1000 / explosionDuration);
          
          if (newProgress >= 1) {
            // Explosion complete, transition to debris
            newMap.set(id, {
              ...planet,
              damageState: 'debris',
              explosionProgress: 1,
            });
            changed = true;
          } else {
            newMap.set(id, {
              ...planet,
              explosionProgress: newProgress,
            });
            changed = true;
          }
        }
        
        // Check for respawn
        if (planet.damageState === 'debris' && planet.respawnAt) {
          // Check if debris duration has passed
          const debrisEndTime = (planet.destroyedAt || 0) + explosionDuration + debrisDuration;
          
          if (now >= debrisEndTime) {
            // Start respawning
            newMap.set(id, {
              ...planet,
              damageState: 'respawning',
              respawnProgress: 0,
            });
            changed = true;
          }
        }
        
        // Update respawn progress
        if (planet.damageState === 'respawning') {
          const respawnDuration = 2000; // 2 second fade-in
          const newProgress = planet.respawnProgress + (delta * 1000 / respawnDuration);
          
          if (newProgress >= 1) {
            // Respawn complete
            newMap.set(id, {
              ...planet,
              health: planet.maxHealth,
              damageState: 'healthy',
              destroyedAt: null,
              respawnAt: null,
              explosionProgress: 0,
              respawnProgress: 0,
            });
            changed = true;
            
            if (onPlanetRespawned) {
              onPlanetRespawned(id);
            }
          } else {
            newMap.set(id, {
              ...planet,
              respawnProgress: newProgress,
            });
            changed = true;
          }
        }
      }
      
      return changed ? newMap : prev;
    });
  }, [explosionDuration, debrisDuration, onPlanetRespawned]);

  // Get planet health state
  const getPlanet = useCallback((planetId: string): PlanetHealth | undefined => {
    return planetsRef.current.get(planetId);
  }, []);

  // Check if planet is destroyed (not targetable)
  const isDestroyed = useCallback((planetId: string): boolean => {
    const planet = planetsRef.current.get(planetId);
    if (!planet) return false;
    return planet.damageState === 'exploding' || 
           planet.damageState === 'debris' || 
           planet.damageState === 'respawning';
  }, []);

  // Get all planets as array
  const getAllPlanets = useCallback((): PlanetHealth[] => {
    return Array.from(planetsRef.current.values());
  }, []);

  // Get health percentage
  const getHealthPercent = useCallback((planetId: string): number => {
    const planet = planetsRef.current.get(planetId);
    if (!planet) return 100;
    return (planet.health / planet.maxHealth) * 100;
  }, []);

  return {
    planets,
    initPlanet,
    damagePlanet,
    update,
    getPlanet,
    isDestroyed,
    getAllPlanets,
    getHealthPercent,
  };
}
