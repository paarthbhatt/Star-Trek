'use client';

import { Suspense, useRef, useEffect, useCallback, useState, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerspectiveCamera, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { Enterprise } from './enterprise/Enterprise';
import { SpaceEnvironment } from './environment/SpaceEnvironment';
import { PostProcessing } from './effects/PostProcessing';
import { WarpBubble, WarpFlash, WarpTunnel } from './effects/WarpBubble';
import { WarpStreaks } from './effects/WarpStreaks';
import { DestructiblePlanet } from './environment/DestructiblePlanet';
import { PlanetExplosion } from './environment/PlanetExplosion';
import { DebrisField } from './environment/DebrisField';
import { Spacedock, DeepSpaceStation } from './environment/SpaceStations';
import { OrbitLines } from './environment/OrbitLines';
import { PhaserBeam } from './weapons/PhaserBeam';
import { PhotonTorpedoes } from './weapons/PhotonTorpedo';
import { useFlightControls, FlightState } from '@/hooks/useFlightControls';
import { useWarpDrive, WarpState } from '@/hooks/useWarpDrive';
import { useWeapons, WeaponsState, PlanetTarget } from '@/hooks/useWeapons';
import { usePlanetHealth, PlanetHealth } from '@/hooks/usePlanetHealth';
import { useShipSystems, ShieldState } from '@/hooks/useShipSystems';
import { useAudio } from '@/hooks/useAudio';
import { useAnnouncements } from '@/hooks/useAnnouncements';
import { WARP_LINES } from '@/data/voiceLines';
import { DESTINATIONS, Destination } from '@/data/destinations';
import { ShipComponent } from '@/types';
import { CameraMode } from '@/hooks/useCameraMode';
import { QualitySettings } from '@/hooks/useSettings';

interface SceneProps {
  onSelectComponent: (component: ShipComponent) => void;
  hoveredComponent: ShipComponent | null;
  onHoverComponent: (component: ShipComponent | null) => void;
  onFlightStateUpdate?: (state: FlightState) => void;
  onWarpStateUpdate?: (state: WarpState, warpLevel: number, destination: Destination | null) => void;
  onWeaponsStateUpdate?: (state: WeaponsState) => void;
  onShipSystemsUpdate?: (shields: ShieldState, hullIntegrity: number, alertLevel: 'green' | 'yellow' | 'red') => void;
  onPlanetDestroyed?: (planetName: string) => void;
  onPlanetClick?: (destination: Destination) => void;
  flightEnabled?: boolean;
  cameraMode?: CameraMode;
  isOrbitEnabled?: boolean;
  selectedDestination?: Destination | null;
  warpLevel?: number;
  audioEnabled?: boolean;
  phaserFiring?: boolean;
  torpedoFired?: boolean;
  targetNext?: boolean;
  showOrbitLines?: boolean;
  qualitySettings?: QualitySettings;
}

// Chase camera that follows behind the ship - smooth third-person view
function ChaseCamera({ 
  target, 
  enabled = true,
  warpState = 'idle' as WarpState,
}: { 
  target: React.RefObject<THREE.Group | null>;
  enabled?: boolean;
  warpState?: WarpState;
}) {
  const { camera } = useThree();
  const currentLookAt = useRef(new THREE.Vector3(0, 0, 0));
  const currentPosition = useRef(new THREE.Vector3(0, 2, 5));
  
  // Camera damping - higher = tighter following
  const getDampingFactor = () => {
    switch (warpState) {
      case 'charging': return 0.08;
      case 'accelerating': return 0.15;
      case 'cruising': return 0.1;
      case 'decelerating': return 0.15;
      case 'arriving': return 0.1;
      default: return 0.12; // Smooth following for normal flight
    }
  };

  useFrame(() => {
    if (!target.current || !enabled) return;

    const shipPos = new THREE.Vector3();
    const shipQuat = new THREE.Quaternion();
    target.current.getWorldPosition(shipPos);
    target.current.getWorldQuaternion(shipQuat);

    const dampingFactor = getDampingFactor();
    
    // Camera offset in ship's local space - behind and above
    // Ship faces -Z (forward), so camera should be at +Z (behind)
    const offset = new THREE.Vector3(0, 1.2, 4.0);
    const desiredPos = offset.clone().applyQuaternion(shipQuat).add(shipPos);
    
    // Look-ahead point - in front of ship
    const lookAhead = new THREE.Vector3(0, 0.3, -8.0).applyQuaternion(shipQuat).add(shipPos);
    
    // Smooth camera movement
    currentPosition.current.lerp(desiredPos, dampingFactor);
    currentLookAt.current.lerp(lookAhead, dampingFactor);
    
    camera.position.copy(currentPosition.current);
    camera.lookAt(currentLookAt.current);
  });

  return null;
}

// Cinematic camera that auto-orbits around the ship
function CinematicCamera({ 
  target,
}: { 
  target: React.RefObject<THREE.Group | null>;
}) {
  const { camera } = useThree();
  const angleRef = useRef(0);
  const currentPosition = useRef(new THREE.Vector3());
  
  useFrame((state, delta) => {
    if (!target.current) return;
    
    // Get ship position
    const shipPos = new THREE.Vector3();
    target.current.getWorldPosition(shipPos);
    
    // Slowly orbit around the ship
    angleRef.current += delta * 0.2; // Slow rotation
    
    // Vary radius and height for cinematic feel
    const time = state.clock.elapsedTime;
    const radius = 5.0 + Math.sin(time * 0.1) * 1.5;
    const height = 2.0 + Math.sin(time * 0.15) * 1.0;
    
    // Calculate camera position
    const x = shipPos.x + Math.cos(angleRef.current) * radius;
    const y = shipPos.y + height;
    const z = shipPos.z + Math.sin(angleRef.current) * radius;
    
    // Smooth camera movement
    const targetPos = new THREE.Vector3(x, y, z);
    currentPosition.current.lerp(targetPos, delta * 2);
    camera.position.copy(currentPosition.current);
    
    // Always look at ship
    camera.lookAt(shipPos);
  });
  
  return null;
}

// Warp cinematic camera - dramatic angles during warp sequence  
function WarpCinematicCamera({ 
  target,
  warpState,
  warpProgress,
}: { 
  target: React.RefObject<THREE.Group | null>;
  warpState: WarpState;
  warpProgress: number;
}) {
  const { camera } = useThree();
  const angleRef = useRef(Math.PI * 0.25); // Start from side angle
  const currentPosition = useRef(new THREE.Vector3());
  const currentLookAt = useRef(new THREE.Vector3());
  const phaseStartTime = useRef(0);
  const lastWarpState = useRef(warpState);
  
  useFrame((state, delta) => {
    if (!target.current) return;
    
    // Track phase changes
    if (warpState !== lastWarpState.current) {
      phaseStartTime.current = state.clock.elapsedTime;
      lastWarpState.current = warpState;
    }
    
    const phaseTime = state.clock.elapsedTime - phaseStartTime.current;
    
    // Get ship position and orientation
    const shipPos = new THREE.Vector3();
    const shipQuat = new THREE.Quaternion();
    target.current.getWorldPosition(shipPos);
    target.current.getWorldQuaternion(shipQuat);
    
    let targetPos: THREE.Vector3;
    let lookAtPos: THREE.Vector3;
    
    switch (warpState) {
      case 'charging':
        // Dramatic side angle, slowly orbiting
        angleRef.current += delta * 0.3;
        const chargeRadius = 6.0;
        const chargeHeight = 1.5 + Math.sin(phaseTime * 0.5) * 0.5;
        targetPos = new THREE.Vector3(
          shipPos.x + Math.cos(angleRef.current) * chargeRadius,
          shipPos.y + chargeHeight,
          shipPos.z + Math.sin(angleRef.current) * chargeRadius
        );
        lookAtPos = shipPos.clone();
        break;
        
      case 'accelerating':
        // Pull back dramatically as ship stretches into warp
        const accelProgress = Math.min(phaseTime / 1.0, 1.0);
        const pullBack = 4.0 + accelProgress * 8.0;
        const accelOffset = new THREE.Vector3(1.5, 2.0, pullBack);
        targetPos = accelOffset.applyQuaternion(shipQuat).add(shipPos);
        // Look slightly ahead of ship
        lookAtPos = new THREE.Vector3(0, 0, -5).applyQuaternion(shipQuat).add(shipPos);
        break;
        
      case 'cruising':
        // Dynamic camera during cruise - orbit and vary distance
        angleRef.current += delta * 0.15;
        const cruiseTime = state.clock.elapsedTime;
        const cruiseRadius = 5.0 + Math.sin(cruiseTime * 0.2) * 2.0;
        const cruiseHeight = 1.5 + Math.sin(cruiseTime * 0.3) * 1.0;
        
        // Mix between side view and behind view
        const behindOffset = new THREE.Vector3(0, cruiseHeight, cruiseRadius);
        const sideOffset = new THREE.Vector3(
          Math.cos(angleRef.current) * cruiseRadius,
          cruiseHeight,
          Math.sin(angleRef.current) * cruiseRadius
        );
        
        // Interpolate between positions based on time
        const mixFactor = (Math.sin(cruiseTime * 0.1) + 1) * 0.5;
        targetPos = behindOffset.clone().applyQuaternion(shipQuat).add(shipPos);
        targetPos.lerp(sideOffset.add(shipPos), mixFactor * 0.3);
        lookAtPos = shipPos.clone();
        break;
        
      case 'decelerating':
        // Swing around to front as ship drops out
        const decelProgress = Math.min(phaseTime / 1.2, 1.0);
        const frontAngle = Math.PI * decelProgress;
        const decelRadius = 6.0 - decelProgress * 2.0;
        const decelOffset = new THREE.Vector3(
          Math.sin(frontAngle) * 2.0,
          1.5,
          decelRadius
        );
        targetPos = decelOffset.applyQuaternion(shipQuat).add(shipPos);
        lookAtPos = shipPos.clone();
        break;
        
      case 'arriving':
        // Settle behind ship looking at destination
        const arriveOffset = new THREE.Vector3(0, 1.5, 5.0);
        targetPos = arriveOffset.applyQuaternion(shipQuat).add(shipPos);
        // Look past ship at destination
        lookAtPos = new THREE.Vector3(0, 0, -10).applyQuaternion(shipQuat).add(shipPos);
        break;
        
      default:
        // Fallback to behind ship
        const defaultOffset = new THREE.Vector3(0, 1.2, 4.0);
        targetPos = defaultOffset.applyQuaternion(shipQuat).add(shipPos);
        lookAtPos = shipPos.clone();
    }
    
    // Smooth camera transitions
    const smoothing = warpState === 'accelerating' ? 0.08 : 0.05;
    currentPosition.current.lerp(targetPos, smoothing);
    currentLookAt.current.lerp(lookAtPos, smoothing);
    
    camera.position.copy(currentPosition.current);
    camera.lookAt(currentLookAt.current);
  });
  
  return null;
}

// Orbit controls wrapper that properly updates target to follow ship
function OrbitControlsWrapper({ 
  shipRef,
  frozenPosition,
}: { 
  shipRef: React.RefObject<THREE.Group | null>;
  frozenPosition: THREE.Vector3 | null;
}) {
  const controlsRef = useRef<any>(null);
  const { camera } = useThree();
  const hasInitialized = useRef(false);
  
  // Set initial camera position for good viewing angle when entering orbit mode
  useEffect(() => {
    if (frozenPosition && !hasInitialized.current) {
      hasInitialized.current = true;
      // Position camera at a nice viewing angle
      const offset = new THREE.Vector3(2.5, 1.8, 3.5);
      camera.position.copy(frozenPosition).add(offset);
      camera.lookAt(frozenPosition);
    }
    
    // Reset when leaving orbit mode
    if (!frozenPosition) {
      hasInitialized.current = false;
    }
  }, [frozenPosition, camera]);
  
  useFrame(() => {
    if (!controlsRef.current) return;
    
    // Use frozen position if available, otherwise get ship's current position
    if (frozenPosition) {
      controlsRef.current.target.copy(frozenPosition);
    } else if (shipRef.current) {
      const shipPos = new THREE.Vector3();
      shipRef.current.getWorldPosition(shipPos);
      controlsRef.current.target.copy(shipPos);
    }
    controlsRef.current.update();
  });
  
  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.05}
      maxDistance={30}
      minDistance={0.5}
      enablePan={true}
      panSpeed={0.5}
      rotateSpeed={0.5}
      zoomSpeed={1.5}
      // Start at a nice angle
      minPolarAngle={0.1}
      maxPolarAngle={Math.PI - 0.1}
    />
  );
}

// Flight and warp controller component
function FlightWarpController({
  shipRef,
  onFlightStateUpdate,
  onWarpStateUpdate,
  enabled = true,
  selectedDestination,
  warpLevel = 1,
  audioEnabled = true,
  weaponsHook,
}: {
  shipRef: React.RefObject<THREE.Group | null>;
  onFlightStateUpdate?: (state: FlightState) => void;
  onWarpStateUpdate?: (state: WarpState, warpLevel: number, destination: Destination | null) => void;
  enabled?: boolean;
  selectedDestination?: Destination | null;
  warpLevel?: number;
  audioEnabled?: boolean;
  weaponsHook: ReturnType<typeof useWeapons>;
}) {
  const lastImpulseRef = useRef(0);
  const targetQuaternion = useRef(new THREE.Quaternion());
  const hasAlignedToDestination = useRef(false);
  const hasAnnouncedBrace = useRef(false);
  
  const audio = useAudio(audioEnabled);
  const announcements = useAnnouncements({
    enabled: audioEnabled,
    voiceEnabled: audioEnabled,
  });
  
  const { updateFlight, getState, setPosition, setWarping } = useFlightControls({
    enabled,
    maxImpulseSpeed: 20,
    acceleration: 10,
    turnRate: 0.6,
    rollRate: 0.8,
    onWarpEngage: () => {
      // Handled separately
    },
  });

  const { 
    state: warpDriveState, 
    engageWarp, 
    updateWarp, 
    skipToDestination,
    disengageWarp,
    setWarpLevel: setWarpDriveLevel,
  } = useWarpDrive({
    onStateChange: (newState, prevState) => {
      // Play appropriate sounds
      switch (newState) {
        case 'charging':
          audio.playWarpCharge();
          announcements.announce(WARP_LINES.warpCharging);
          // Disable weapons during warp
          weaponsHook.setWeaponsEnabled(false);
          // Reset alignment and announcement flags when starting new warp
          hasAlignedToDestination.current = false;
          hasAnnouncedBrace.current = false;
          break;
        case 'accelerating':
          audio.playWarpEngage();
          announcements.announce(WARP_LINES.warpEngage);
          break;
        case 'cruising':
          audio.playWarpCruise(warpLevel);
          break;
        case 'decelerating':
        case 'arriving':
          audio.playWarpDisengage();
          announcements.announce(WARP_LINES.warpDisengage);
          break;
        case 'idle':
          if (prevState !== 'idle') {
            audio.playEngineIdle();
            // Re-enable weapons after warp
            weaponsHook.setWeaponsEnabled(true);
          }
          break;
      }
    },
    onArrival: () => {
      audio.playUIConfirm();
      announcements.announce(WARP_LINES.arrivalDestination);
    },
  });

  // Update warp level when prop changes
  useEffect(() => {
    setWarpDriveLevel(warpLevel);
  }, [warpLevel, setWarpDriveLevel]);

  // Handle warp engagement via Space key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && selectedDestination && warpDriveState.state === 'idle') {
        e.preventDefault();
        const flightState = getState();
        // Pass destination radius for arrival buffer calculation
        engageWarp(selectedDestination.position, flightState.position, selectedDestination.radius);
        setWarping(true);
      }
      
      // Skip to destination with T
      if (e.key.toLowerCase() === 't' && warpDriveState.state === 'cruising') {
        skipToDestination();
      }
      
      // Emergency stop with X during warp
      if (e.key.toLowerCase() === 'x' && warpDriveState.state !== 'idle') {
        disengageWarp();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedDestination, warpDriveState.state, getState, engageWarp, setWarping, skipToDestination, disengageWarp]);

  useFrame((_, delta) => {
    if (!enabled) return;
    
    // Update flight controls (disabled during warp)
    const isWarping = warpDriveState.state !== 'idle';
    const flightState = updateFlight(delta, isWarping ? null : shipRef.current);
    
    // Update warp drive
    if (isWarping && shipRef.current) {
      const warpResult = updateWarp(delta);
      
      // Calculate target rotation toward destination at start of charging phase
      if (warpDriveState.state === 'charging' && warpDriveState.destination && !hasAlignedToDestination.current) {
        const shipPos = new THREE.Vector3();
        shipRef.current.getWorldPosition(shipPos);
        
        // Direction to destination
        const direction = warpDriveState.destination.clone().sub(shipPos).normalize();
        
        // Create rotation that points ship's forward (-Z local) toward destination
        // Since ship model faces -Z, we need to look in the opposite direction
        const lookAtPoint = shipPos.clone().sub(direction);
        const lookAtMatrix = new THREE.Matrix4();
        lookAtMatrix.lookAt(shipPos, lookAtPoint, new THREE.Vector3(0, 1, 0));
        targetQuaternion.current.setFromRotationMatrix(lookAtMatrix);
      }
      
      // Smoothly rotate ship toward destination during charging phase
      if (warpDriveState.state === 'charging' && warpDriveState.destination) {
        const currentQuat = shipRef.current.quaternion.clone();
        currentQuat.slerp(targetQuaternion.current, delta * 2.5); // Smooth rotation
        shipRef.current.quaternion.copy(currentQuat);
        
        // Check if aligned (within threshold)
        const dot = Math.abs(shipRef.current.quaternion.dot(targetQuaternion.current));
        if (dot > 0.999) {
          hasAlignedToDestination.current = true;
          
          // Announce "Brace for acceleration" once aligned
          if (!hasAnnouncedBrace.current && warpDriveState.stateTime > 1.0) {
            announcements.announceImmediate(WARP_LINES.braceForAcceleration);
            hasAnnouncedBrace.current = true;
          }
        }
      }
      
      // During acceleration and cruising, maintain orientation toward destination
      if (warpDriveState.state === 'accelerating' || warpDriveState.state === 'cruising') {
        shipRef.current.quaternion.copy(targetQuaternion.current);
        hasAlignedToDestination.current = true;
      }
      
      // During decelerating and arriving, keep orientation toward destination
      if (warpDriveState.state === 'decelerating' || warpDriveState.state === 'arriving') {
        shipRef.current.quaternion.copy(targetQuaternion.current);
      }
      
      // Update ship position during warp
      if (warpResult.position) {
        shipRef.current.position.copy(warpResult.position);
        setPosition(warpResult.position);
      }
      
      // Warp completed - update flight controls with final rotation
      if (warpResult.completed) {
        setWarping(false);
        hasAlignedToDestination.current = false;
        
        // Sync flight state rotation with ship's final orientation
        const euler = new THREE.Euler().setFromQuaternion(shipRef.current.quaternion);
        const flightState = getState();
        flightState.rotation.copy(euler);
        flightState.quaternion.copy(shipRef.current.quaternion);
      }
    }
    
    // Engine sound based on impulse - with debouncing to prevent rapid retriggering
    const impulsePercent = flightState.impulsePercent;
    if (!isWarping) {
      // Only update engine sound on significant changes (>20% difference) to prevent rapid retriggering
      if (impulsePercent > 5 && lastImpulseRef.current <= 5) {
        audio.playEngineImpulse(impulsePercent / 100);
      } else if (impulsePercent <= 5 && lastImpulseRef.current > 5) {
        audio.playEngineIdle();
      } else if (impulsePercent > 5 && Math.abs(impulsePercent - lastImpulseRef.current) > 20) {
        // Only update if change is significant enough (was 10, now 20)
        audio.playEngineImpulse(impulsePercent / 100);
      }
      lastImpulseRef.current = impulsePercent;
    }
    
    // Update ship position and rotation for weapons system
    if (shipRef.current) {
      const shipQuat = new THREE.Quaternion();
      shipRef.current.getWorldQuaternion(shipQuat);
      weaponsHook.updateShipPosition(flightState.position, shipQuat);
    }
    
    if (onFlightStateUpdate) {
      onFlightStateUpdate(flightState);
    }
    
    if (onWarpStateUpdate) {
      onWarpStateUpdate(warpDriveState.state, warpLevel, selectedDestination || null);
    }
  });

  return null;
}

// Warp effects wrapper - designed to be a child of the ship group
function WarpEffects({
  warpState,
  warpLevel,
}: {
  warpState: WarpState;
  warpLevel: number;
}) {
  const [showFlash, setShowFlash] = useState(false);

  // Trigger flash on warp state changes
  useEffect(() => {
    if (warpState === 'accelerating' || warpState === 'decelerating') {
      setShowFlash(true);
    }
  }, [warpState]);

  const isWarpActive = warpState !== 'idle';

  return (
    <group>
      {/* Warp bubble around ship */}
      <WarpBubble
        warpState={warpState}
        warpLevel={warpLevel}
        visible={isWarpActive}
      />
      
      {/* Star streaks during warp */}
      <WarpStreaks
        warpState={warpState}
        warpLevel={warpLevel}
      />
      
      {/* Warp tunnel particles */}
      <WarpTunnel
        warpState={warpState}
        warpLevel={warpLevel}
      />
      
      {/* Flash effect */}
      <WarpFlash
        active={showFlash}
        onComplete={() => setShowFlash(false)}
      />
    </group>
  );
}

function SceneContent({ 
  onSelectComponent, 
  hoveredComponent, 
  onHoverComponent,
  onFlightStateUpdate,
  onWarpStateUpdate,
  onWeaponsStateUpdate,
  onShipSystemsUpdate,
  onPlanetDestroyed,
  onPlanetClick,
  flightEnabled = true,
  cameraMode: cameraModeFromProps = 'flight',
  isOrbitEnabled = false,
  selectedDestination,
  warpLevel = 1,
  audioEnabled = true,
  phaserFiring = false,
  torpedoFired = false,
  targetNext = false,
  showOrbitLines = false,
  qualitySettings,
}: SceneProps) {
  const shipRef = useRef<THREE.Group>(null);
  // Use local camera state only for internal camera types (chase/cinematic), orbit is controlled by parent
  const [internalCameraType, setInternalCameraType] = useState<'chase' | 'cinematic'>('chase');
  const [currentWarpState, setCurrentWarpState] = useState<WarpState>('idle');
  const [warpProgress, setWarpProgress] = useState(0);
  const shipPositionRef = useRef(new THREE.Vector3());
  // Store frozen ship position when entering free look
  const frozenShipPosition = useRef<THREE.Vector3 | null>(null);
  
  // Check if we're in any warp phase (for cinematic camera)
  const isWarping = currentWarpState !== 'idle';
  
  const audio = useAudio(audioEnabled);

  // Planet health system
  const planetHealth = usePlanetHealth({
    respawnTime: 120000, // 2 minutes
    onPlanetDestroyed: (planetId, planetName) => {
      audio.playPlanetExplode();
      if (onPlanetDestroyed) {
        onPlanetDestroyed(planetName);
      }
      // Clear weapon target when planet destroyed
      weapons.handleTargetDestroyed(planetId);
    },
    onPlanetRespawned: (planetId) => {
      audio.playUIConfirm();
    },
  });

  // Ship systems (shields, etc.)
  const shipSystems = useShipSystems({
    shieldRechargeRate: 2,
    shieldDamageTimeout: 3000,
    onShieldsDown: () => {
      audio.playUIAlert();
    },
    onHullDamage: () => {
      audio.playShieldHit();
    },
  });

  // Weapons system
  const weapons = useWeapons({
    onPhaserHit: (targetId, damage) => {
      planetHealth.damagePlanet(targetId, damage);
      // Play damage sound occasionally
      if (Math.random() < 0.1) {
        audio.playPlanetDamage();
      }
    },
    onTorpedoHit: (targetId, torpedoId) => {
      planetHealth.damagePlanet(targetId, 10); // 10 damage per torpedo
      audio.playTorpedoImpact();
      weapons.removeTorpedo(torpedoId);
    },
    onTargetDestroyed: (targetId) => {
      audio.playTargetLock(); // Feedback sound
    },
  });

  // Initialize planets in health system
  useEffect(() => {
    DESTINATIONS.forEach(dest => {
      planetHealth.initPlanet(dest.id, dest.name, 100);
    });
  }, [planetHealth.initPlanet]);

  // Update planets list for weapons targeting
  useEffect(() => {
    const planetTargets: PlanetTarget[] = DESTINATIONS.map(dest => {
      const health = planetHealth.getPlanet(dest.id);
      return {
        id: dest.id,
        name: dest.name,
        position: dest.position,
        radius: dest.radius,
        destroyed: health ? planetHealth.isDestroyed(dest.id) : false,
      };
    });
    weapons.updatePlanets(planetTargets);
  }, [planetHealth.planets, weapons.updatePlanets, planetHealth.getPlanet, planetHealth.isDestroyed]);

  // Handle phaser firing from props
  const prevPhaserFiring = useRef(false);
  useEffect(() => {
    // Only act on changes
    if (phaserFiring !== prevPhaserFiring.current) {
      prevPhaserFiring.current = phaserFiring;
      
      if (phaserFiring) {
        weapons.firePhasers();
        if (weapons.state.targetId) {
          audio.playPhaserFire();
        }
      } else {
        // Always stop phaser sound when P is released
        audio.stopSound('phaser');
        audio.playPhaserStop();
        weapons.stopPhasers();
      }
    }
  }, [phaserFiring, weapons.state.targetId, audio, weapons]);

  // Handle torpedo firing from props
  useEffect(() => {
    if (torpedoFired) {
      const fired = weapons.fireTorpedo();
      if (fired) {
        audio.playTorpedoLaunch();
      }
    }
  }, [torpedoFired]);

  // Handle target selection from props
  useEffect(() => {
    if (targetNext) {
      weapons.autoTarget();
      if (weapons.state.targetId) {
        audio.playTargetLock();
      }
    }
  }, [targetNext]);

  // Update ship position ref for orbit controls target
  useFrame((_, delta) => {
    if (shipRef.current) {
      shipRef.current.getWorldPosition(shipPositionRef.current);
    }
    
    // Update weapons system
    weapons.update(delta);
    
    // Update planet health (explosion timers, etc.)
    planetHealth.update(delta);
    
    // Update ship systems (shield recharge, etc.)
    shipSystems.update(delta);
    
    // Report weapons state
    if (onWeaponsStateUpdate) {
      onWeaponsStateUpdate(weapons.state);
    }
    
    // Report ship systems state
    if (onShipSystemsUpdate) {
      onShipSystemsUpdate(shipSystems.shields, shipSystems.hullIntegrity, shipSystems.alertLevel);
    }
  });

  // Handle internal camera type toggle with 'C' key (only when in flight mode)
  // Note: The main camera mode (flight/freeLook/photo) is handled by useCameraMode in page.tsx
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // C key cycles between chase and cinematic when in flight mode
      // (freeLook mode is handled by the parent via isOrbitEnabled prop)
      if (e.key.toLowerCase() === 'c' && cameraModeFromProps === 'flight') {
        setInternalCameraType(prev => prev === 'chase' ? 'cinematic' : 'chase');
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [cameraModeFromProps]);

  // Freeze ship position when entering orbit mode (free look / photo)
  useEffect(() => {
    if (isOrbitEnabled && shipRef.current) {
      // Freeze ship position
      const pos = new THREE.Vector3();
      shipRef.current.getWorldPosition(pos);
      frozenShipPosition.current = pos.clone();
    } else {
      // Unfreeze
      frozenShipPosition.current = null;
    }
  }, [isOrbitEnabled]);

  // Track warp state for camera adjustments
  const handleWarpStateUpdate = useCallback((state: WarpState, level: number, dest: Destination | null) => {
    setCurrentWarpState(state);
    if (onWarpStateUpdate) {
      onWarpStateUpdate(state, level, dest);
    }
  }, [onWarpStateUpdate]);

  // Track warp progress for cinematic camera
  const handleWarpProgress = useCallback((progress: number) => {
    setWarpProgress(progress);
  }, []);

  // Handle debris collision
  const handleDebrisCollision = useCallback(() => {
    shipSystems.handleDebrisCollision();
    audio.playShieldHit();
  }, [shipSystems, audio]);

  // Get phaser beam origin (bottom of saucer, near impulse engines)
  const getPhaserOrigin = useCallback(() => {
    if (!shipRef.current) return new THREE.Vector3();
    const worldPos = new THREE.Vector3();
    shipRef.current.getWorldPosition(worldPos);
    // Offset to bottom center of saucer - scaled for tiny ship (0.01 scale)
    const offset = new THREE.Vector3(0, -0.05, 0.4); 
    const quat = new THREE.Quaternion();
    shipRef.current.getWorldQuaternion(quat);
    offset.applyQuaternion(quat);
    return worldPos.add(offset);
  }, []);

  return (
    <>
      {/* Camera */}
      <PerspectiveCamera makeDefault position={[0, 1.2, 4.0]} fov={75} />
      
      {/* Warp Cinematic Camera - takes over during any warp phase */}
      {isWarping && !isOrbitEnabled && (
        <WarpCinematicCamera 
          target={shipRef}
          warpState={currentWarpState}
          warpProgress={warpProgress}
        />
      )}
      
      {/* Chase Camera (when flight is enabled, not warping, and not in orbit/freeLook mode) */}
      {flightEnabled && !isOrbitEnabled && !isWarping && internalCameraType === 'chase' && (
        <ChaseCamera 
          target={shipRef} 
          enabled={true}
          warpState={currentWarpState}
        />
      )}
      
      {/* Orbit Camera Controls - enabled when in freeLook or photo mode */}
      {isOrbitEnabled && (
        <OrbitControlsWrapper 
          shipRef={shipRef}
          frozenPosition={frozenShipPosition.current}
        />
      )}
      
      {/* Cinematic Camera - auto-orbiting (only in flight mode, not warping) */}
      {!isOrbitEnabled && !isWarping && internalCameraType === 'cinematic' && (
        <CinematicCamera target={shipRef} />
      )}

      {/* Lighting */}
      <ambientLight intensity={0.5} />
      <directionalLight
        position={[50, 30, 20]}
        intensity={1.5}
        castShadow={qualitySettings?.shadowsEnabled ?? false}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-far={150}
        shadow-camera-left={-50}
        shadow-camera-right={50}
        shadow-camera-top={50}
        shadow-camera-bottom={-50}
      />
      <pointLight position={[-30, -20, 30]} intensity={0.3} color={0x4488ff} />
      
      {/* Rim light for dramatic effect */}
      <pointLight position={[0, -10, -50]} intensity={0.5} color={0x88aaff} />

      {/* Space Environment */}
      <SpaceEnvironment qualitySettings={qualitySettings} />

      {/* Orbit Lines */}
      <OrbitLines 
        visible={showOrbitLines} 
        opacity={0.25}
        showMoons={false}
      />

      {/* Sun direction for planet shaders (pointing from sun at origin to planets) */}
      {(() => {
        // Sun is at position [0, 0, -500] based on destinations.ts
        const sunPosition = new THREE.Vector3(0, 0, -500);
        const sunDir = sunPosition.clone().negate().normalize();
        
        return (
          <>
            {/* Space Stations - rendered separately from planets */}
            {DESTINATIONS.filter(dest => dest.type === 'station').map((station) => {
              if (station.id === 'spacedock') {
                return (
                  <Spacedock
                    key={station.id}
                    position={station.position.toArray() as [number, number, number]}
                    scale={station.radius * 0.5}
                  />
                );
              }
              if (station.id === 'deepspace1') {
                return (
                  <DeepSpaceStation
                    key={station.id}
                    position={station.position.toArray() as [number, number, number]}
                    scale={station.radius * 0.8}
                  />
                );
              }
              return null;
            })}

            {/* Destination Planets with destruction system */}
            {DESTINATIONS.filter(dest => dest.type !== 'station').map((dest) => {
              const health = planetHealth.getPlanet(dest.id);
              if (!health) return null;
              
              const isTargeted = weapons.state.targetId === dest.id;
              
              return (
                <group key={dest.id}>
                  {/* Destructible planet */}
                  <DestructiblePlanet 
                    destination={dest} 
                    healthState={health}
                    isTargeted={isTargeted}
                    sunDirection={sunDir}
                  />
                  
                  {/* Explosion effect */}
                  {health.damageState === 'exploding' && (
                    <PlanetExplosion
                      position={dest.position}
                      radius={dest.radius}
                      progress={health.explosionProgress}
                    />
                  )}
                  
                  {/* Debris field */}
                  <DebrisField
                    position={dest.position}
                    radius={dest.radius}
                    isActive={health.damageState === 'debris'}
                    fadeProgress={health.damageState === 'debris' ? 0 : 1}
                    shipPosition={shipPositionRef.current}
                    onShipCollision={handleDebrisCollision}
                  />
                </group>
              );
            })}
          </>
        );
      })()}

      {/* USS Enterprise with flight controls */}
      <group ref={shipRef}>
        <Enterprise
          onSelectComponent={onSelectComponent}
          hoveredComponent={hoveredComponent}
          onHoverComponent={onHoverComponent}
        />
        
        {/* Warp Visual Effects - attached to ship so they follow it */}
        <WarpEffects
          warpState={currentWarpState}
          warpLevel={warpLevel}
        />
      </group>

      {/* Phaser beam */}
      {weapons.state.phaserFiring && weapons.state.targetPosition && (
        <PhaserBeam
          startPosition={getPhaserOrigin()}
          endPosition={weapons.state.targetPosition}
          intensity={weapons.state.phaserCharge / 100}
          active={true}
        />
      )}

      {/* Photon torpedoes */}
      <PhotonTorpedoes
        torpedoes={weapons.state.activeTorpedoes}
      />

      {/* Flight and Warp Controller */}
      {flightEnabled && (
        <FlightWarpController 
          shipRef={shipRef}
          onFlightStateUpdate={onFlightStateUpdate}
          onWarpStateUpdate={handleWarpStateUpdate}
          enabled={flightEnabled}
          selectedDestination={selectedDestination}
          warpLevel={warpLevel}
          audioEnabled={audioEnabled}
          weaponsHook={weapons}
        />
      )}

      {/* Post-processing effects */}
      <PostProcessing cinematicMode={currentWarpState === 'cruising'} qualitySettings={qualitySettings} />
    </>
  );
}

export function Scene({ 
  onSelectComponent, 
  hoveredComponent, 
  onHoverComponent,
  onFlightStateUpdate,
  onWarpStateUpdate,
  onWeaponsStateUpdate,
  onShipSystemsUpdate,
  onPlanetDestroyed,
  onPlanetClick,
  flightEnabled = true,
  cameraMode = 'flight',
  isOrbitEnabled = false,
  selectedDestination,
  warpLevel = 1,
  audioEnabled = true,
  phaserFiring = false,
  torpedoFired = false,
  targetNext = false,
  showOrbitLines = false,
  qualitySettings,
}: SceneProps) {
  return (
    <div className="fixed inset-0">
      <Canvas
        shadows={qualitySettings?.shadowsEnabled ?? false}
        gl={{ 
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
          stencil: false,
          depth: true,
        }}
        dpr={[1, Math.min(window.devicePixelRatio, 2)]}
        style={{ background: '#000510' }}
        frameloop="always"
        performance={{ min: 0.5 }}
      >
        <Suspense fallback={null}>
          <SceneContent
            onSelectComponent={onSelectComponent}
            hoveredComponent={hoveredComponent}
            onHoverComponent={onHoverComponent}
            onFlightStateUpdate={onFlightStateUpdate}
            onWarpStateUpdate={onWarpStateUpdate}
            onWeaponsStateUpdate={onWeaponsStateUpdate}
            onShipSystemsUpdate={onShipSystemsUpdate}
            onPlanetDestroyed={onPlanetDestroyed}
            onPlanetClick={onPlanetClick}
            flightEnabled={flightEnabled}
            cameraMode={cameraMode}
            isOrbitEnabled={isOrbitEnabled}
            selectedDestination={selectedDestination}
            warpLevel={warpLevel}
            audioEnabled={audioEnabled}
            phaserFiring={phaserFiring}
            torpedoFired={torpedoFired}
            targetNext={targetNext}
            showOrbitLines={showOrbitLines}
            qualitySettings={qualitySettings}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
