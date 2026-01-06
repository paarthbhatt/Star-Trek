
'use client';

import { Suspense, useRef, useEffect, useCallback, useState, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerspectiveCamera, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { Enterprise } from './enterprise/Enterprise';
import { SpaceEnvironment } from './environment/SpaceEnvironment';
import { PostProcessing } from './effects/PostProcessing';
import { WarpBubble, WarpFlash } from './effects/WarpBubble';
import { WarpStreaks } from './effects/WarpStreaks';
import { DetailedPlanet } from './environment/planets/DetailedPlanet';
import { Spacedock, DeepSpaceStation } from './environment/SpaceStations';
import { OrbitLines } from './environment/OrbitLines';
import { Explosion } from './effects/Explosion'; // Import Explosion
import { useFlightControls, FlightState } from '@/hooks/useFlightControls';
import { useWarpDrive, WarpState } from '@/hooks/useWarpDrive';
import { useShipSystems, ShieldState } from '@/hooks/useShipSystems';
import { useScanner, ScannerState } from '@/hooks/useScanner';
import { useAudio } from '@/hooks/useAudio';
import { useGameState } from '@/hooks/useGameState';
import { useAnnouncements } from '@/hooks/useAnnouncements';
import { WARP_LINES } from '@/data/voiceLines';
import { DESTINATIONS, Destination } from '@/data/destinations';
import { ShipComponent } from '@/types';
import { CameraMode } from '@/hooks/useCameraMode';
import { QualitySettings } from '@/hooks/useSettings';
import { WeaponTarget } from '@/hooks/useWeapons';
import { PhotonTorpedo } from '@/components/weapons/PhotonTorpedo';
import { EnemyShip } from '@/components/enemies/EnemyShip';

interface SceneProps {
  onSelectComponent: (component: ShipComponent) => void;
  hoveredComponent: ShipComponent | null;
  onHoverComponent: (component: ShipComponent | null) => void;
  onFlightStateUpdate?: (state: FlightState) => void;
  onWarpStateUpdate?: (state: WarpState, warpLevel: number, destination: Destination | null) => void;
  onShipSystemsUpdate?: (shields: ShieldState, hullIntegrity: number, alertLevel: 'green' | 'yellow' | 'red') => void;
  onScannerUpdate?: (state: ScannerState) => void;
  onPlanetDestroyed?: (planetName: string) => void;
  onPlanetClick?: (destination: Destination) => void;
  flightEnabled?: boolean;
  cameraMode?: CameraMode;
  isOrbitEnabled?: boolean;
  selectedDestination?: Destination | null;
  warpLevel?: number;
  audioEnabled?: boolean;
  showOrbitLines?: boolean;
  qualitySettings?: QualitySettings;
  // Combat Props
  torpedoes?: { id: string; position: THREE.Vector3; targetPosition: THREE.Vector3 }[];
  enemies?: WeaponTarget[];
  onTorpedoImpact?: (id: string) => void;
  onUpdateWeapons?: (delta: number) => void;
}

// Reusable vectors to avoid GC
const _shipPos = new THREE.Vector3();
const _shipQuat = new THREE.Quaternion();
const _camOffset = new THREE.Vector3();
const _lookAhead = new THREE.Vector3();
const _targetPos = new THREE.Vector3();
const _lookAtPos = new THREE.Vector3();

// Chase camera that follows behind the ship - smooth third-person view
function ChaseCamera({ 
  target, 
  enabled = true,
  warpState = 'idle' as WarpState,
  shakeIntensity = 0
}: { 
  target: React.RefObject<THREE.Group | null>;
  enabled?: boolean;
  warpState?: WarpState;
  shakeIntensity?: number;
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

  useFrame((state, delta) => {
    if (!target.current || !enabled) return;

    target.current.getWorldPosition(_shipPos);
    target.current.getWorldQuaternion(_shipQuat);

    const dampingFactor = getDampingFactor();
    
    // Camera offset in ship's local space - behind and above
    // Ship faces -Z (forward), so camera should be at +Z (behind)
    _camOffset.set(0, 0.7, 2.5);
    
    // Calculate desired position
    // We hard-lock the distance to avoid "shrinking" effect (drag)
    // But we still smooth the rotation for cinematic feel
    
    // 1. Get the target position immediately (hard lock)
    let targetPos = _camOffset.clone().applyQuaternion(_shipQuat).add(_shipPos);
    
    // Apply Shake
    if (shakeIntensity > 0) {
        const shake = new THREE.Vector3(
            (Math.random() - 0.5) * shakeIntensity,
            (Math.random() - 0.5) * shakeIntensity,
            (Math.random() - 0.5) * shakeIntensity
        );
        targetPos.add(shake);
    }

    // 2. Smoothly interpolate current position towards target position
    // BUT we need to be very aggressive to prevent shrinking
    // For translation, we want to be almost instant
    currentPosition.current.lerp(targetPos, 0.2); // Very fast lerp
    
    // 3. For rotation (lookAt), we can be smoother
    _lookAhead.set(0, 0.3, -8.0).applyQuaternion(_shipQuat).add(_shipPos);
    currentLookAt.current.lerp(_lookAhead, dampingFactor * 2.0);
    
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
    target.current.getWorldPosition(_shipPos);
    
    // Slowly orbit around the ship
    angleRef.current += delta * 0.2; // Slow rotation
    
    // Vary radius and height for cinematic feel
    const time = state.clock.elapsedTime;
    const radius = 5.0 + Math.sin(time * 0.1) * 1.5;
    const height = 2.0 + Math.sin(time * 0.15) * 1.0;
    
    // Calculate camera position
    const x = _shipPos.x + Math.cos(angleRef.current) * radius;
    const y = _shipPos.y + height;
    const z = _shipPos.z + Math.sin(angleRef.current) * radius;
    
    // Smooth camera movement
    _targetPos.set(x, y, z);
    currentPosition.current.lerp(_targetPos, delta * 2);
    camera.position.copy(currentPosition.current);
    
    // Always look at ship
    camera.lookAt(_shipPos);
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
    target.current.getWorldPosition(_shipPos);
    target.current.getWorldQuaternion(_shipQuat);
    
    switch (warpState) {
      case 'charging':
        // Mild side drift, but mostly rear view
        angleRef.current += delta * 0.1; // Slower drift
        const chargeRadius = 5.0;
        // Clamp orbit angle to rear arc (PI to 2PI, or similar range behind ship)
        // We want angles around 3PI/2 (270 deg) which is directly behind if 0 is right?
        // Actually in our setup: +Z is behind. So angle 0 is +X (Right), PI/2 is +Z (Behind), PI is -X (Left), 3PI/2 is -Z (Front)
        // Let's keep it simple: Oscillate between slightly left and slightly right of rear (+Z)
        
        const baseRearAngle = Math.PI / 2;
        const drift = Math.sin(phaseTime * 0.5) * 0.5; // +/- 0.5 radians (approx 30 deg)
        const finalAngle = baseRearAngle + drift;

        const chargeHeight = 1.5 + Math.sin(phaseTime * 0.5) * 0.3;
        
        _targetPos.set(
          _shipPos.x + Math.cos(finalAngle) * chargeRadius,
          _shipPos.y + chargeHeight,
          _shipPos.z + Math.sin(finalAngle) * chargeRadius
        );
        _lookAtPos.copy(_shipPos);
        break;
        
      case 'accelerating':
        // Pull back dramatically strictly behind
        const accelProgress = Math.min(phaseTime / 1.0, 1.0);
        const pullBack = 4.0 + accelProgress * 8.0;
        _camOffset.set(0, 2.0, pullBack); // Strictly behind (+Z)
        _targetPos.copy(_camOffset).applyQuaternion(_shipQuat).add(_shipPos);
        // Look slightly ahead of ship
        _lookAhead.set(0, 0, -5).applyQuaternion(_shipQuat).add(_shipPos);
        _lookAtPos.copy(_lookAhead);
        break;
        
      case 'cruising':
        // Dynamic camera during cruise - gentle wobble behind ship
        angleRef.current += delta * 0.15;
        const cruiseTime = state.clock.elapsedTime;
        
        // Strictly constrained orbit behind ship
        const cruiseRearAngle = Math.PI / 2;
        const cruiseDrift = Math.sin(cruiseTime * 0.2) * 0.8; // Wider drift but staying behind
        const cruiseCurrentAngle = cruiseRearAngle + cruiseDrift;

        const cruiseRadius = 5.0 + Math.sin(cruiseTime * 0.2) * 2.0;
        const cruiseHeight = 1.5 + Math.sin(cruiseTime * 0.3) * 1.0;
        
        _targetPos.set(
          _shipPos.x + Math.cos(cruiseCurrentAngle) * cruiseRadius,
          _shipPos.y + cruiseHeight,
          _shipPos.z + Math.sin(cruiseCurrentAngle) * cruiseRadius
        );
        
        _lookAtPos.copy(_shipPos);
        break;
        
      case 'decelerating':
        // Return to standard chase position
        const decelProgress = Math.min(phaseTime / 1.2, 1.0);
        const decelRadius = 6.0 - decelProgress * 2.0;
        
        // Stay behind
        _camOffset.set(
          0,
          1.5,
          decelRadius
        );
        _targetPos.copy(_camOffset).applyQuaternion(_shipQuat).add(_shipPos);
        _lookAtPos.copy(_shipPos);
        break;
        
      case 'arriving':
        // Settle behind ship looking at destination
        _camOffset.set(0, 1.5, 5.0);
        _targetPos.copy(_camOffset).applyQuaternion(_shipQuat).add(_shipPos);
        // Look past ship at destination
        _lookAhead.set(0, 0, -10).applyQuaternion(_shipQuat).add(_shipPos);
        _lookAtPos.copy(_lookAhead);
        break;
        
      default:
        // Fallback to behind ship
        _camOffset.set(0, 1.2, 4.0);
        _targetPos.copy(_camOffset).applyQuaternion(_shipQuat).add(_shipPos);
        _lookAtPos.copy(_shipPos);
    }
    
    // Smooth camera transitions
    // During high-speed warp, snap to position to avoid camera lagging behind (ship moves too fast for lerp)
    const isHighSpeed = warpState === 'accelerating' || warpState === 'cruising';
    const smoothing = isHighSpeed ? 1.0 : 0.05;
    
    currentPosition.current.lerp(_targetPos, smoothing);
    currentLookAt.current.lerp(_lookAtPos, smoothing);
    
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
      shipRef.current.getWorldPosition(_shipPos);
      controlsRef.current.target.copy(_shipPos);
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
}: {
  shipRef: React.RefObject<THREE.Group | null>;
  onFlightStateUpdate?: (state: FlightState) => void;
  onWarpStateUpdate?: (state: WarpState, warpLevel: number, destination: Destination | null) => void;
  enabled?: boolean;
  selectedDestination?: Destination | null;
  warpLevel?: number;
  audioEnabled?: boolean;
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
          audio.playSound('warpCharge');
          announcements.announce(WARP_LINES.warpCharging);
          // Reset alignment and announcement flags when starting new warp
          hasAlignedToDestination.current = false;
          hasAnnouncedBrace.current = false;
          break;
        case 'accelerating':
          audio.playSound('warpEngage');
          announcements.announce(WARP_LINES.warpEngage);
          break;
        case 'cruising':
          audio.playSound('warpCruise', warpLevel);
          break;
        case 'decelerating':
        case 'arriving':
          audio.playSound('warpDisengage');
          announcements.announce(WARP_LINES.warpDisengage);
          break;
        case 'idle':
          if (prevState !== 'idle') {
            audio.playSound('engineIdle');
          }
          break;
      }
    },
    onArrival: () => {
      audio.playSound('uiConfirm');
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
        
        // Create rotation that points ship's forward (-Z local) toward destination
        // Since ship model faces -Z, we want -Z to point at destination
        // Standard lookAt makes +Z point at target.
        // So we look at a point BEHIND the ship relative to destination to make +Z point AWAY.
        const directionToDest = new THREE.Vector3().subVectors(warpDriveState.destination, shipPos);
        const lookAtTarget = new THREE.Vector3().subVectors(shipPos, directionToDest);
        
        const lookAtMatrix = new THREE.Matrix4();
        lookAtMatrix.lookAt(shipPos, lookAtTarget, new THREE.Vector3(0, 1, 0));
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
             // Only announce if audio is enabled
             if(audioEnabled) {
                 announcements.announceImmediate(WARP_LINES.braceForAcceleration);
             }
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
        
        // Get final position and destination center
        const shipPos = new THREE.Vector3();
        shipRef.current.getWorldPosition(shipPos);
        
        const destinationCenter = warpDriveState.destinationCenter;
        if (destinationCenter) {
          // Calculate direction to destination
          const toDestination = new THREE.Vector3()
            .subVectors(destinationCenter, shipPos)
            .normalize();
          
          // Calculate pitch angle (vertical)
          // Y is up, so asin(y) gives pitch
          const pitch = Math.asin(toDestination.y);
          
          // Calculate yaw angle (horizontal)
          const yaw = Math.atan2(toDestination.x, toDestination.z);
          
          // Create rotation that points ship's forward (-Z) at target
          // Standard rotation is 0,0,0 facing +Z? No, three.js default is +Z
          // Our ship faces -Z. 
          // If yaw is 0, we face +Z. If we want to face -Z, we need yaw + PI.
          // Let's use lookAt matrix to be safe.
          
          const matrix = new THREE.Matrix4();
          matrix.lookAt(shipPos, destinationCenter, new THREE.Vector3(0, 1, 0));
          const quaternion = new THREE.Quaternion().setFromRotationMatrix(matrix);
          const euler = new THREE.Euler().setFromQuaternion(quaternion);
          
          // Ensure level roll
          euler.z = 0;
          
          // Sync flight state
          const flightState = getState();
          flightState.rotation.copy(euler);
          flightState.quaternion.setFromEuler(euler);
          shipRef.current.quaternion.copy(flightState.quaternion);
        } else {
             // Fallback if no destination center
             const euler = new THREE.Euler().setFromQuaternion(shipRef.current.quaternion);
             euler.z = 0;
             const flightState = getState();
             flightState.rotation.copy(euler);
             flightState.quaternion.setFromEuler(euler);
             shipRef.current.quaternion.copy(flightState.quaternion);
        }
      }
    }
    
    // Engine sound based on impulse - smooth updates now handled by audio engine
    const impulsePercent = flightState.impulsePercent;
    if (!isWarping) {
      if (impulsePercent > 5) {
        audio.playSound('engineImpulse', impulsePercent / 100);
      } else if (lastImpulseRef.current > 5) {
        audio.playSound('engineIdle');
      }
      lastImpulseRef.current = impulsePercent;
    }
    
    // Update ship position and rotation for systems that need it
    if (shipRef.current) {
      const shipQuat = new THREE.Quaternion();
      shipRef.current.getWorldQuaternion(shipQuat);
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
    // Flash on entry (accelerating) and exit (decelerating)
    if (warpState === 'accelerating' || warpState === 'decelerating') {
      setShowFlash(true);
    }
  }, [warpState]);

  const isWarpActive = warpState !== 'idle';

  return (
    <group>
      {/* Warp bubble around ship - visible membrane distortion */}
      <WarpBubble
        warpState={warpState}
        warpLevel={warpLevel}
        visible={isWarpActive}
      />
      
      {/* Star streaks during warp - "Rain" effect */}
      <WarpStreaks
        warpState={warpState}
        warpLevel={warpLevel}
      />
      
      {/* Flash effect on transition */}
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
  onShipSystemsUpdate,
  onScannerUpdate,
  onPlanetDestroyed,
  onPlanetClick,
  flightEnabled = true,
  cameraMode: cameraModeFromProps = 'flight',
  isOrbitEnabled = false,
  selectedDestination,
  warpLevel = 1,
  audioEnabled = true,
  showOrbitLines = false,
  qualitySettings,
  torpedoes = [],
  enemies = [],
  onTorpedoImpact,
  onUpdateWeapons,
}: SceneProps) {
  const shipRef = useRef<THREE.Group>(null);
  // Use local camera state only for internal camera types (chase/cinematic), orbit is controlled by parent
  const [internalCameraType, setInternalCameraType] = useState<'chase' | 'cinematic'>('chase');
  const [currentWarpState, setCurrentWarpState] = useState<WarpState>('idle');
  const [warpProgress, setWarpProgress] = useState(0);
  const shipPositionRef = useRef(new THREE.Vector3());
  // Store frozen ship position when entering free look
  const frozenShipPosition = useRef<THREE.Vector3 | null>(null);
  
  // Shake effect state
  const [shakeIntensity, setShakeIntensity] = useState(0);
  const [explosions, setExplosions] = useState<{ id: string; position: THREE.Vector3 }[]>([]); // Track explosions

  // Decay shake
  useFrame((_, delta) => {
    if (shakeIntensity > 0) {
        setShakeIntensity(prev => Math.max(0, prev - delta * 2)); // Decay over time
    }
  });

  // Check if we're in any warp phase (for cinematic camera)
  const isWarping = currentWarpState !== 'idle';
  
  const audio = useAudio(audioEnabled);
  const announcements = useAnnouncements({ enabled: audioEnabled, voiceEnabled: audioEnabled });

  // Ship systems (shields, etc.)
  const shipSystems = useShipSystems({
    shieldRechargeRate: 2,
    shieldDamageTimeout: 3000,
    onShieldsDown: () => {
      audio.playSound('uiAlert');
    },
    onHullDamage: () => {
      audio.playSound('shieldHit');
    },
  });

  // Scanner system
  const { scannerState, startScan, cancelScan, updateScanner } = useScanner({
    onScanComplete: () => {
      audio.playSound('uiConfirm');
    }
  });

  // Handle Scan key 'K'
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'k' && !isWarping) {
        // No auto-target in peaceful mode, scan what's in front or selected
        // For now just scan if something is selected or we're near something
        // Simplified: toggle scanner
        if (scannerState.isScanning) {
          cancelScan();
        } else {
           // Scan closest planet
           const closest = DESTINATIONS.reduce((prev, curr) => {
              const d = shipPositionRef.current.distanceTo(curr.position);
              return d < prev.dist ? { dist: d, dest: curr } : prev;
           }, { dist: Infinity, dest: null as Destination | null });

           if (closest.dest && closest.dist < 100) {
             startScan(closest.dest, shipPositionRef.current);
             audio.playSound('uiBeep');
           } else {
             audio.playSound('uiAlert');
           }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isWarping, startScan, cancelScan, scannerState.isScanning, audio]);

  // Update ship position ref for orbit controls target
  useFrame((_, delta) => {
    if (shipRef.current) {
      shipRef.current.getWorldPosition(shipPositionRef.current);
    }
    
    // Update ship systems (shield recharge, etc.)
    shipSystems.update(delta);
    
    // Update scanner
    updateScanner(delta, shipPositionRef.current, null); // target null for now
    
    if (onScannerUpdate) {
      onScannerUpdate(scannerState);
    }

    if (onShipSystemsUpdate) {
      onShipSystemsUpdate(shipSystems.shields, shipSystems.hullIntegrity, shipSystems.alertLevel);
    }
    
    if (onUpdateWeapons) {
        onUpdateWeapons(delta);
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
    audio.playSound('shieldHit');
  }, [shipSystems, audio]);

  // Ambient Audio Logic
  useFrame(() => {
    if (!audioEnabled || isWarping) {
        // Stop all ambience if warping or disabled
        audio.stopSound('ambienceRumble');
        audio.stopSound('ambienceEthereal');
        audio.stopSound('ambienceStatic');
        return;
    }

    // Find nearest destination
    let nearestDist = Infinity;
    let nearestDest: Destination | null = null;

    const shipPos = shipPositionRef.current;

    for (const dest of DESTINATIONS) {
        const dist = shipPos.distanceTo(dest.position);
        // Only consider it if it's reasonably close to save perf
        if (dist < 500 && dist < nearestDist) {
            nearestDist = dist;
            nearestDest = dest;
        }
    }

    // Logic for playing sound based on proximity
    const maxRange = 300; // Audibility range
    const minRange = 40;  // Full volume range (radius of planet + buffer)
    
    if (nearestDest && nearestDist < maxRange) {
        // Calculate volume: 0 at maxRange, 0.4 at minRange
        // Clamp normalized distance 0..1
        const t = Math.max(0, Math.min(1, 1 - (nearestDist - minRange) / (maxRange - minRange)));
        const volume = t * 0.4; // Max volume 0.4
        
        let soundType: 'ambienceRumble' | 'ambienceEthereal' | 'ambienceStatic' | null = null;
        
        // Map destination type to sound
        if (nearestDest.type === 'star') {
            soundType = 'ambienceRumble';
        } else if (nearestDest.id === 'jupiter' || nearestDest.id === 'saturn' || nearestDest.id === 'uranus' || nearestDest.id === 'neptune') {
             // Gas giants are classified as 'planet' in the data, so we check IDs or need a better way.
             // Looking at data/destinations.ts, Jupiter etc are type 'planet'.
             // Let's check IDs for gas giants.
             soundType = 'ambienceRumble';
        } else if (nearestDest.type === 'planet' || nearestDest.type === 'dwarf' || nearestDest.type === 'moon') {
             soundType = 'ambienceEthereal';
        } else if (nearestDest.type === 'station') {
            soundType = 'ambienceStatic';
        }

        if (soundType && volume > 0.01) {
             // Ensure this sound is playing and update volume
             audio.playSound(soundType);
             audio.updateSoundVolume(soundType, volume);
             
             // Stop others to prevent mud
             if (soundType !== 'ambienceRumble') audio.stopSound('ambienceRumble');
             if (soundType !== 'ambienceEthereal') audio.stopSound('ambienceEthereal');
             if (soundType !== 'ambienceStatic') audio.stopSound('ambienceStatic');
        } else {
             // Volume too low, stop everything
            audio.stopSound('ambienceRumble');
            audio.stopSound('ambienceEthereal');
            audio.stopSound('ambienceStatic');
        }
    } else {
        // Too far, stop all
        audio.stopSound('ambienceRumble');
        audio.stopSound('ambienceEthereal');
        audio.stopSound('ambienceStatic');
    }
  });

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
          shakeIntensity={shakeIntensity}
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
          
          {/* Enemies */}
          {enemies.map((enemy) => (
            <EnemyShip
               key={enemy.id}
               id={enemy.id}
               position={enemy.position}
               type={enemy.id.includes('romulan') ? 'warbird' : 'scout'}
               health={enemy.health || 100}
            />
          ))}

          {/* Explosions */}
          {explosions.map((explosion) => (
             <Explosion
               key={explosion.id}
               position={explosion.position}
               onComplete={() => setExplosions(prev => prev.filter(e => e.id !== explosion.id))}
             />
          ))}

          {/* Torpedoes */}
          {torpedoes.map((torpedo) => (
             <PhotonTorpedo
                key={torpedo.id}
                position={torpedo.position}
                targetPosition={torpedo.targetPosition}
                onImpact={() => {
                   onTorpedoImpact?.(torpedo.id);
                   setExplosions(prev => [...prev, { id: Date.now().toString(), position: torpedo.targetPosition.clone() }]);
                   setShakeIntensity(5); // Shake camera on impact
                }}
             />
          ))}

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

                {/* Destination Planets */}
                {DESTINATIONS.filter(dest => dest.type !== 'station').map((dest) => {
                  return (
                    <group key={dest.id} position={dest.position.toArray()}>
                      {/* Detailed planet */}
                      <DetailedPlanet 
                        destination={dest} 
                        sunDirection={sunDir}
                        lodLevel="high"
                      />
                      {/* Destination marker/beacon */}
                      <pointLight
                        position={[0, dest.radius + 5, 0]}
                        color={0x44ff88}
                        intensity={20}
                        distance={50}
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
              warpState={currentWarpState}
            />
            
            {/* Warp Visual Effects - attached to ship so they follow it */}
            <WarpEffects
              warpState={currentWarpState}
              warpLevel={warpLevel}
            />
          </group>

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
  onShipSystemsUpdate,
  onScannerUpdate,
  onPlanetDestroyed,
  onPlanetClick,
  flightEnabled = true,
  cameraMode = 'flight',
  isOrbitEnabled = false,
  selectedDestination,
  warpLevel = 1,
  audioEnabled = true,
  showOrbitLines = false,
  qualitySettings,
  torpedoes,
  enemies,
  onTorpedoImpact,
  onUpdateWeapons,
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
            onShipSystemsUpdate={onShipSystemsUpdate}
            onScannerUpdate={onScannerUpdate}
            onPlanetDestroyed={onPlanetDestroyed}
            onPlanetClick={onPlanetClick}
            flightEnabled={flightEnabled}
            cameraMode={cameraMode}
            isOrbitEnabled={isOrbitEnabled}
            selectedDestination={selectedDestination}
            warpLevel={warpLevel}
            audioEnabled={audioEnabled}
            showOrbitLines={showOrbitLines}
            qualitySettings={qualitySettings}
            torpedoes={torpedoes}
            enemies={enemies}
            onTorpedoImpact={onTorpedoImpact}
            onUpdateWeapons={onUpdateWeapons}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
