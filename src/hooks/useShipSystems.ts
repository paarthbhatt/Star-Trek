'use client';

import { useState, useCallback, useRef } from 'react';

export type SystemStatus = 'online' | 'damaged' | 'offline' | 'charging';

export interface ShipSystem {
  id: string;
  name: string;
  status: SystemStatus;
  power: number;        // Current power level 0-100
  maxPower: number;     // Maximum power capacity
  chargeRate: number;   // Power regeneration per second
  drainRate: number;    // Power drain per second when active
  isActive: boolean;    // Whether system is currently in use
  description: string;
}

export interface ShieldState {
  front: number;
  rear: number;
  port: number;      // Left
  starboard: number; // Right
  overall: number;   // Average of all shields
}

export interface ShipSystemsState {
  shields: ShieldState;
  shieldsOnline: boolean;
  hullIntegrity: number;
  systems: Map<string, ShipSystem>;
  alertLevel: 'green' | 'yellow' | 'red';
}

interface UseShipSystemsOptions {
  shieldRechargeRate?: number;    // % per second when not taking damage
  shieldDamageTimeout?: number;   // ms before shields start recharging after damage
  onShieldsDown?: () => void;
  onHullDamage?: (damage: number) => void;
  onSystemDamaged?: (systemId: string) => void;
}

const DEFAULT_OPTIONS = {
  shieldRechargeRate: 2,      // 2% per second
  shieldDamageTimeout: 3000,  // 3 seconds
};

// Default ship systems
const DEFAULT_SYSTEMS: ShipSystem[] = [
  {
    id: 'warp',
    name: 'Warp Drive',
    status: 'online',
    power: 100,
    maxPower: 100,
    chargeRate: 5,
    drainRate: 10,
    isActive: false,
    description: 'Faster-than-light propulsion system using warp field generation',
  },
  {
    id: 'impulse',
    name: 'Impulse Engines',
    status: 'online',
    power: 100,
    maxPower: 100,
    chargeRate: 10,
    drainRate: 5,
    isActive: false,
    description: 'Sublight propulsion via fusion-powered plasma thrust',
  },
  {
    id: 'shields',
    name: 'Deflector Shields',
    status: 'online',
    power: 100,
    maxPower: 100,
    chargeRate: 2,
    drainRate: 0,
    isActive: true,
    description: 'Electromagnetic force fields for defense against weapons and debris',
  },
  {
    id: 'phasers',
    name: 'Phaser Array',
    status: 'online',
    power: 100,
    maxPower: 100,
    chargeRate: 8,
    drainRate: 15,
    isActive: false,
    description: 'Directed energy weapons emitting nadion particle beams',
  },
  {
    id: 'torpedoes',
    name: 'Torpedo Systems',
    status: 'online',
    power: 100,
    maxPower: 100,
    chargeRate: 5,
    drainRate: 0,
    isActive: false,
    description: 'Photon torpedo launcher with antimatter warheads',
  },
  {
    id: 'sensors',
    name: 'Sensor Array',
    status: 'online',
    power: 100,
    maxPower: 100,
    chargeRate: 15,
    drainRate: 2,
    isActive: true,
    description: 'Long-range sensors for navigation and threat detection',
  },
  {
    id: 'lifesupport',
    name: 'Life Support',
    status: 'online',
    power: 100,
    maxPower: 100,
    chargeRate: 20,
    drainRate: 1,
    isActive: true,
    description: 'Environmental systems maintaining atmosphere and gravity',
  },
  {
    id: 'computer',
    name: 'Main Computer',
    status: 'online',
    power: 100,
    maxPower: 100,
    chargeRate: 25,
    drainRate: 3,
    isActive: true,
    description: 'Duotronic computer core for ship operations and analysis',
  },
];

export function useShipSystems(options: UseShipSystemsOptions = {}) {
  const {
    shieldRechargeRate = DEFAULT_OPTIONS.shieldRechargeRate,
    shieldDamageTimeout = DEFAULT_OPTIONS.shieldDamageTimeout,
    onShieldsDown,
    onHullDamage,
    onSystemDamaged,
  } = options;

  // Initialize shield state
  const [shields, setShields] = useState<ShieldState>({
    front: 100,
    rear: 100,
    port: 100,
    starboard: 100,
    overall: 100,
  });
  
  const [shieldsOnline, setShieldsOnline] = useState(true);
  const [hullIntegrity, setHullIntegrity] = useState(100);
  const [alertLevel, setAlertLevel] = useState<'green' | 'yellow' | 'red'>('green');
  
  // Initialize systems
  const [systems, setSystems] = useState<Map<string, ShipSystem>>(() => {
    const map = new Map<string, ShipSystem>();
    DEFAULT_SYSTEMS.forEach(sys => map.set(sys.id, { ...sys }));
    return map;
  });

  const lastDamageTime = useRef<number>(0);
  const shieldsRef = useRef(shields);
  shieldsRef.current = shields;

  // Calculate overall shield strength
  const calculateOverall = (s: Omit<ShieldState, 'overall'>): number => {
    return (s.front + s.rear + s.port + s.starboard) / 4;
  };

  // Update alert level based on ship status
  const updateAlertLevel = useCallback((shieldState: ShieldState, hull: number) => {
    if (hull < 50 || shieldState.overall < 25) {
      setAlertLevel('red');
    } else if (hull < 80 || shieldState.overall < 50) {
      setAlertLevel('yellow');
    } else {
      setAlertLevel('green');
    }
  }, []);

  // Damage shields (from debris collision or weapons)
  const damageShields = useCallback((damage: number, direction?: 'front' | 'rear' | 'port' | 'starboard') => {
    lastDamageTime.current = Date.now();
    
    setShields(prev => {
      const newShields = { ...prev };
      
      if (direction) {
        // Directional damage
        newShields[direction] = Math.max(0, prev[direction] - damage);
        
        // If that shield section is down, damage bleeds to adjacent and hull
        if (newShields[direction] <= 0 && prev[direction] > 0) {
          // Bleed damage to hull
          const bleedDamage = damage * 0.5;
          setHullIntegrity(h => {
            const newHull = Math.max(0, h - bleedDamage);
            if (onHullDamage && bleedDamage > 0) {
              onHullDamage(bleedDamage);
            }
            return newHull;
          });
        }
      } else {
        // Omnidirectional damage (split across all shields)
        const perShield = damage / 4;
        newShields.front = Math.max(0, prev.front - perShield);
        newShields.rear = Math.max(0, prev.rear - perShield);
        newShields.port = Math.max(0, prev.port - perShield);
        newShields.starboard = Math.max(0, prev.starboard - perShield);
      }
      
      newShields.overall = calculateOverall(newShields);
      
      // Check if all shields are down
      if (newShields.overall <= 0 && prev.overall > 0) {
        setShieldsOnline(false);
        if (onShieldsDown) {
          onShieldsDown();
        }
      }
      
      updateAlertLevel(newShields, hullIntegrity);
      
      return newShields;
    });
  }, [hullIntegrity, onShieldsDown, onHullDamage, updateAlertLevel]);

  // Damage hull directly (when shields are down)
  const damageHull = useCallback((damage: number) => {
    setHullIntegrity(prev => {
      const newHull = Math.max(0, prev - damage);
      if (onHullDamage) {
        onHullDamage(damage);
      }
      
      // Random chance to damage a system when hull takes damage
      if (damage > 5 && Math.random() < 0.3) {
        const systemIds = Array.from(systems.keys());
        const randomSystem = systemIds[Math.floor(Math.random() * systemIds.length)];
        damageSystem(randomSystem, damage * 0.5);
      }
      
      updateAlertLevel(shieldsRef.current, newHull);
      return newHull;
    });
  }, [systems, onHullDamage, updateAlertLevel]);

  // Damage a specific system
  const damageSystem = useCallback((systemId: string, damage: number) => {
    setSystems(prev => {
      const system = prev.get(systemId);
      if (!system) return prev;
      
      const newMap = new Map(prev);
      const newPower = Math.max(0, system.power - damage);
      
      let newStatus: SystemStatus = system.status;
      if (newPower <= 0) {
        newStatus = 'offline';
      } else if (newPower < 50) {
        newStatus = 'damaged';
      }
      
      newMap.set(systemId, {
        ...system,
        power: newPower,
        status: newStatus,
      });
      
      if (newStatus !== system.status && onSystemDamaged) {
        onSystemDamaged(systemId);
      }
      
      return newMap;
    });
  }, [onSystemDamaged]);

  // Repair a system
  const repairSystem = useCallback((systemId: string, amount: number) => {
    setSystems(prev => {
      const system = prev.get(systemId);
      if (!system) return prev;
      
      const newMap = new Map(prev);
      const newPower = Math.min(system.maxPower, system.power + amount);
      
      let newStatus: SystemStatus = 'online';
      if (newPower < 50) {
        newStatus = 'damaged';
      }
      
      newMap.set(systemId, {
        ...system,
        power: newPower,
        status: newStatus,
      });
      
      return newMap;
    });
  }, []);

  // Toggle system active state
  const toggleSystem = useCallback((systemId: string, active?: boolean) => {
    setSystems(prev => {
      const system = prev.get(systemId);
      if (!system || system.status === 'offline') return prev;
      
      const newMap = new Map(prev);
      newMap.set(systemId, {
        ...system,
        isActive: active !== undefined ? active : !system.isActive,
      });
      
      return newMap;
    });
  }, []);

  // Update function (call every frame)
  const update = useCallback((delta: number) => {
    const now = Date.now();
    const timeSinceDamage = now - lastDamageTime.current;
    
    // Recharge shields if enough time has passed since last damage
    if (shieldsOnline && timeSinceDamage > shieldDamageTimeout) {
      setShields(prev => {
        const rechargeAmount = shieldRechargeRate * delta;
        const newShields = {
          front: Math.min(100, prev.front + rechargeAmount),
          rear: Math.min(100, prev.rear + rechargeAmount),
          port: Math.min(100, prev.port + rechargeAmount),
          starboard: Math.min(100, prev.starboard + rechargeAmount),
          overall: 0,
        };
        newShields.overall = calculateOverall(newShields);
        
        // Don't update if nothing changed
        if (newShields.overall === prev.overall) return prev;
        
        return newShields;
      });
    }
    
    // Update system power based on charge/drain rates
    setSystems(prev => {
      let changed = false;
      const newMap = new Map(prev);
      
      for (const [id, system] of newMap) {
        if (system.status === 'offline') continue;
        
        let newPower = system.power;
        
        if (system.isActive && system.drainRate > 0) {
          // Drain power when active
          newPower = Math.max(0, system.power - system.drainRate * delta);
        } else if (!system.isActive || system.power < system.maxPower) {
          // Recharge when inactive or not at max
          newPower = Math.min(system.maxPower, system.power + system.chargeRate * delta);
        }
        
        if (newPower !== system.power) {
          changed = true;
          
          let newStatus: SystemStatus = system.status;
          if (newPower <= 0) {
            newStatus = 'offline';
          } else if (newPower < 50 && system.status !== 'damaged') {
            newStatus = 'damaged';
          } else if (newPower >= 50 && system.status === 'damaged') {
            newStatus = 'online';
          }
          
          newMap.set(id, {
            ...system,
            power: newPower,
            status: newStatus,
          });
        }
      }
      
      return changed ? newMap : prev;
    });
  }, [shieldsOnline, shieldRechargeRate, shieldDamageTimeout]);

  // Reset all systems to full
  const resetSystems = useCallback(() => {
    setShields({
      front: 100,
      rear: 100,
      port: 100,
      starboard: 100,
      overall: 100,
    });
    setShieldsOnline(true);
    setHullIntegrity(100);
    setAlertLevel('green');
    
    setSystems(() => {
      const map = new Map<string, ShipSystem>();
      DEFAULT_SYSTEMS.forEach(sys => map.set(sys.id, { ...sys }));
      return map;
    });
  }, []);

  // Get a specific system
  const getSystem = useCallback((systemId: string): ShipSystem | undefined => {
    return systems.get(systemId);
  }, [systems]);

  // Check if shields can absorb damage
  const canAbsorbDamage = useCallback((damage: number): boolean => {
    return shieldsOnline && shields.overall > 0;
  }, [shieldsOnline, shields.overall]);

  // Handle debris collision (convenience method)
  const handleDebrisCollision = useCallback(() => {
    const debrisDamage = 5; // 5% shield damage per debris hit
    
    if (canAbsorbDamage(debrisDamage)) {
      // Random direction
      const directions: ('front' | 'rear' | 'port' | 'starboard')[] = ['front', 'rear', 'port', 'starboard'];
      const randomDir = directions[Math.floor(Math.random() * directions.length)];
      damageShields(debrisDamage, randomDir);
    } else {
      // Direct hull damage
      damageHull(debrisDamage * 0.5);
    }
  }, [canAbsorbDamage, damageShields, damageHull]);

  return {
    // State
    shields,
    shieldsOnline,
    hullIntegrity,
    systems,
    alertLevel,
    
    // Actions
    damageShields,
    damageHull,
    damageSystem,
    repairSystem,
    toggleSystem,
    resetSystems,
    handleDebrisCollision,
    update,
    
    // Getters
    getSystem,
    canAbsorbDamage,
  };
}
