
'use client';

import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Text, Instance, Instances } from '@react-three/drei';
import { ShipComponent } from '@/types';
import { WarpState } from '@/hooks/useWarpDrive';

interface EnterpriseProps {
  onSelectComponent: (component: ShipComponent) => void;
  hoveredComponent: ShipComponent | null;
  onHoverComponent: (component: ShipComponent | null) => void;
  enableFloating?: boolean;
  warpState?: WarpState;
  showShields?: boolean;
}

// Enterprise NCC-1701 Procedural Model
// Built to 0.01 scale (1 unit = 100 meters approximately)
// Total length approx 2.8 units

const COLORS = {
  HULL: '#b8b8b8',
  HULL_DARK: '#888888',
  BUSSARD: '#ff3300',
  BUSSARD_GLOW: '#ff5500',
  DEFLECTOR_DISH: '#b87e53', // Copper/Gold
  DEFLECTOR_GLOW: '#ffaa44',
  NACELLE_GLOW: '#4488ff',
  WINDOWS: '#ffffcc',
  IMPULSE: '#ff2200',
  PHASER: '#ffaa00',
  NAV_LIGHT_GREEN: '#00ff00',
  NAV_LIGHT_RED: '#ff0000',
  NAV_LIGHT_WHITE: '#ffffff',
  BRIDGE: '#eeeeee'
};

const MATERIALS = {
  hull: new THREE.MeshStandardMaterial({ 
    color: COLORS.HULL, 
    roughness: 0.25, 
    metalness: 0.6,
    bumpScale: 0.02, // Add texture bump if map was available, but this hints at it
    envMapIntensity: 1.2
  }),
  hullDark: new THREE.MeshStandardMaterial({ 
    color: COLORS.HULL_DARK, 
    roughness: 0.35, 
    metalness: 0.7,
    envMapIntensity: 1.0
  }),
  copper: new THREE.MeshStandardMaterial({
    color: COLORS.DEFLECTOR_DISH,
    roughness: 0.2,
    metalness: 0.9,
    emissive: '#442200',
    emissiveIntensity: 0.2
  }),
  // These base materials will be cloned for animation
  bussardBase: new THREE.MeshStandardMaterial({ 
    color: COLORS.BUSSARD, 
    emissive: COLORS.BUSSARD_GLOW, 
    emissiveIntensity: 2,
    toneMapped: false,
    transparent: true,
    opacity: 0.9
  }),
  deflector: new THREE.MeshStandardMaterial({ 
    color: COLORS.DEFLECTOR_GLOW, 
    emissive: COLORS.DEFLECTOR_GLOW, 
    emissiveIntensity: 1.5,
    toneMapped: false
  }),
  nacelleGlowBase: new THREE.MeshStandardMaterial({ 
    color: COLORS.NACELLE_GLOW, 
    emissive: COLORS.NACELLE_GLOW, 
    emissiveIntensity: 1,
    transparent: true,
    opacity: 0.8
  }),
  impulse: new THREE.MeshStandardMaterial({
    color: COLORS.IMPULSE,
    emissive: COLORS.IMPULSE,
    emissiveIntensity: 3,
    toneMapped: false
  }),
  window: new THREE.MeshBasicMaterial({
    color: COLORS.WINDOWS
  }),
  navLightRed: new THREE.MeshBasicMaterial({ color: COLORS.NAV_LIGHT_RED }),
  navLightGreen: new THREE.MeshBasicMaterial({ color: COLORS.NAV_LIGHT_GREEN }),
  navLightWhite: new THREE.MeshBasicMaterial({ color: COLORS.NAV_LIGHT_WHITE }),
};

export function Enterprise({ onSelectComponent, hoveredComponent, onHoverComponent, enableFloating = false, warpState = 'idle', showShields = false }: EnterpriseProps) {
  const groupRef = useRef<THREE.Group>(null);
  const fanBladesRef = useRef<THREE.Group>(null);
  const shieldRef = useRef<THREE.Mesh>(null);
  const shieldTimeRef = useRef(0);
  
  // Create shared materials for animation
  const materials = useMemo(() => ({
    bussard: MATERIALS.bussardBase.clone(),
    nacelleGlow: MATERIALS.nacelleGlowBase.clone(),
    impulse: MATERIALS.impulse.clone(),
    deflector: MATERIALS.deflector.clone(),
    shield: new THREE.MeshBasicMaterial({ 
        color: '#44aaff',
        transparent: true,
        opacity: 0,
        side: THREE.BackSide, // Render on inside to surround ship? Or FrontSide if it's a bubble
        blending: THREE.AdditiveBlending,
        depthWrite: false
    })
  }), []);

  // Listen for damage events to trigger shield flash
  // We don't have a direct prop for "wasHit", but we could assume logic in Scene triggers a ref/callback?
  // Or: Use a state store or event bus. 
  // SIMPLER: Just randomly flicker shield occasionally if we can't detect hits easily here yet, 
  // BUT: We want it on hit. 
  // Let's add a `lastHitTime` prop to Enterprise? 
  // For now, I will modify Scene.tsx to pass a timestamp prop when hit.
  // Wait, let's keep it simple. We will add a method to the group ref if possible?
  // No, let's use a prop `shieldHitTime`.
  
  // Actually, let's just use `useFrame` to animate a simple shield bubble 
  // that is always present but very faint, and pulses.
  // And if we want reaction, we need state.

  // Let's rely on Scene.tsx managing the shield visual logic? 
  // Or better: Let's add a "ShieldBubble" component inside here that listens to an event or prop.
  // Since we are inside Enterprise, we can add a Shield mesh that scales with the ship.

  useFrame((state, delta) => {
    const time = state.clock.elapsedTime;
    
    // Shield Pulse Animation (Idle)
    if (shieldRef.current) {
        // Subtle idle pulse
        let pulse = (Math.sin(time * 2) * 0.5 + 0.5) * 0.05;
        // Check if we can access recent damage? 
        // For now just basic idle shield presence
        if(showShields) {
            pulse = 0.3 + (Math.sin(time * 10) * 0.1);
        }
        materials.shield.opacity = pulse;
    }

    // Floating animation
    if (groupRef.current && enableFloating) {
      groupRef.current.position.y = Math.sin(time * 0.3) * 0.02;
      groupRef.current.rotation.z = Math.sin(time * 0.2) * 0.01;
    }

    // Rotating Bussard Fans
    if (fanBladesRef.current) {
        // Spin faster when warping
        const spinSpeed = warpState === 'idle' ? 2 : 15;
        fanBladesRef.current.rotation.z -= delta * spinSpeed;
    }

    // Warp State Animation
    let targetBussardIntensity = 2;
    let targetGlowIntensity = 1;
    let targetGlowOpacity = 0.8;
    let targetDeflectorIntensity = 1.5;

    switch (warpState) {
      case 'charging':
        targetBussardIntensity = 4 + Math.sin(time * 15) * 2;
        targetGlowIntensity = 2 + Math.sin(time * 10) * 1;
        targetGlowOpacity = 0.9;
        targetDeflectorIntensity = 3;
        break;
      case 'accelerating':
        targetBussardIntensity = 8;
        targetGlowIntensity = 5;
        targetGlowOpacity = 1.0;
        targetDeflectorIntensity = 5;
        break;
      case 'cruising':
        targetBussardIntensity = 5 + Math.sin(time * 3) * 0.5;
        targetGlowIntensity = 3 + Math.sin(time * 5) * 0.2;
        targetGlowOpacity = 0.95;
        targetDeflectorIntensity = 2;
        break;
      case 'decelerating':
        targetBussardIntensity = 1.5;
        targetGlowIntensity = 0.5;
        targetGlowOpacity = 0.6;
        break;
      case 'arriving':
        targetBussardIntensity = 2;
        targetGlowIntensity = 1;
        targetGlowOpacity = 0.8;
        break;
      default: // idle
        targetBussardIntensity = 2 + Math.sin(time * 0.5) * 0.2;
        targetGlowIntensity = 1 + Math.sin(time * 0.5) * 0.1;
        targetGlowOpacity = 0.8;
    }

    // Smoothly interpolate current values
    materials.bussard.emissiveIntensity = THREE.MathUtils.lerp(materials.bussard.emissiveIntensity, targetBussardIntensity, delta * 5);
    materials.nacelleGlow.emissiveIntensity = THREE.MathUtils.lerp(materials.nacelleGlow.emissiveIntensity, targetGlowIntensity, delta * 5);
    materials.nacelleGlow.opacity = THREE.MathUtils.lerp(materials.nacelleGlow.opacity, targetGlowOpacity, delta * 5);
    materials.deflector.emissiveIntensity = THREE.MathUtils.lerp(materials.deflector.emissiveIntensity, targetDeflectorIntensity, delta * 5);
  });

  // Handler helpers
  const handlePointerOver = (component: ShipComponent) => (e: any) => {
    e.stopPropagation();
    onHoverComponent(component);
    document.body.style.cursor = 'pointer';
  };

  const handlePointerOut = () => (e: any) => {
    onHoverComponent(null);
    document.body.style.cursor = 'auto';
  };

  const handleClick = (component: ShipComponent) => (e: any) => {
    e.stopPropagation();
    onSelectComponent(component);
  };

  // Dynamic emission for highlighting
  const getEmissive = (component: ShipComponent) => {
    return hoveredComponent === component ? '#444444' : '#000000';
  };

  // Generate windows positions
  const saucerWindows = useMemo(() => {
    const instances = [];
    // Edge windows
    for (let i = 0; i < 48; i++) {
      const angle = (i / 48) * Math.PI * 2;
      const r = 0.62;
      instances.push({ position: [Math.cos(angle) * r, 0, Math.sin(angle) * r], rotation: [0, -angle, 0] });
    }
    // Top windows
    for (let i = 0; i < 32; i++) {
      const angle = (i / 32) * Math.PI * 2;
      const r = 0.45;
      instances.push({ position: [Math.cos(angle) * r, 0.08, Math.sin(angle) * r], rotation: [0, -angle, 0] });
    }
    // Bottom windows
    for (let i = 0; i < 24; i++) {
      const angle = (i / 24) * Math.PI * 2;
      const r = 0.3;
      instances.push({ position: [Math.cos(angle) * r, -0.05, Math.sin(angle) * r], rotation: [0, -angle, 0] });
    }
    return instances;
  }, []);

  const engineeringWindows = useMemo(() => {
    const instances = [];
    // Side windows
    for (let i = 0; i < 16; i++) {
      const z = -0.2 + (i * 0.08); // Along the length
      instances.push({ position: [0.14, -0.4, z], rotation: [0, 0, 0] });
      instances.push({ position: [-0.14, -0.4, z], rotation: [0, 0, 0] });
    }
    return instances;
  }, []);

  // Generate Bussard Fan Blades
  const fanBlades = useMemo(() => {
    const blades = [];
    for (let i = 0; i < 12; i++) {
        blades.push(
            <mesh key={i} rotation={[0, 0, (i / 12) * Math.PI * 2]} position={[0, 0, 0]}>
                <boxGeometry args={[0.02, 0.14, 0.01]} />
                <meshStandardMaterial color="#222222" metalness={0.8} roughness={0.2} />
            </mesh>
        );
    }
    return blades;
  }, []);


  // Lathe points for Saucer Profile (Top and Bottom)
  const saucerPoints = useMemo(() => {
    const points = [];
    // Top surface (center to edge)
    points.push(new THREE.Vector2(0, 0.16));     // Bridge center top
    points.push(new THREE.Vector2(0.12, 0.16));  // Bridge flat
    points.push(new THREE.Vector2(0.15, 0.10));  // Bridge slope down
    points.push(new THREE.Vector2(0.35, 0.08));  // Main slope start
    points.push(new THREE.Vector2(0.635, 0.03)); // Edge top

    // Rim
    points.push(new THREE.Vector2(0.635, -0.03));// Edge bottom

    // Bottom surface (edge to center)
    points.push(new THREE.Vector2(0.35, -0.07)); // Main slope bottom
    points.push(new THREE.Vector2(0.15, -0.12)); // Sensor dome start
    points.push(new THREE.Vector2(0, -0.15));    // Sensor dome bottom center
    
    // Close shape is not needed for Lathe, it spins around Y
    return points;
  }, []);

  return (
    <group ref={groupRef} dispose={null} rotation={[0, Math.PI, 0]}>
      {/* Shield Bubble */}
      <mesh ref={shieldRef}>
        <sphereGeometry args={[1.2, 32, 32]} />
        <primitive object={materials.shield} attach="material" />
      </mesh>

      {/* 
        -------------------------------------------
        SAUCER SECTION (Primary Hull) 
        -------------------------------------------
      */}
      <group position={[0, 0, 0.5]}>
        {/* Main Saucer - Lathe Geometry for smooth curve */}
        <mesh 
          onClick={handleClick('saucer')}
          onPointerOver={handlePointerOver('saucer')}
          onPointerOut={handlePointerOut()}
        >
          <latheGeometry args={[saucerPoints, 64]} />
          <meshStandardMaterial {...MATERIALS.hull} emissive={getEmissive('saucer')} side={THREE.DoubleSide} />
        </mesh>
        
        {/* Bridge Dome Detail */}
        <mesh position={[0, 0.16, 0]}>
             <cylinderGeometry args={[0.04, 0.04, 0.04, 16]} />
             <meshStandardMaterial color={COLORS.BRIDGE} roughness={0.2} metalness={0.8} />
        </mesh>

        {/* Bottom Sensor Dome */}
        <mesh position={[0, -0.15, 0]}>
          <sphereGeometry args={[0.05, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
          <meshStandardMaterial color="#eeeeee" emissive="#ffffff" emissiveIntensity={0.8} />
        </mesh>

        {/* Impulse Engines (Back of Saucer - Revised) */}
        <group position={[0, 0.04, -0.55]}>
             {/* Engine Housing */}
            <mesh>
                 <boxGeometry args={[0.3, 0.08, 0.15]} />
                 <meshStandardMaterial {...MATERIALS.hullDark} />
            </mesh>
            {/* Left Glow */}
            <mesh position={[-0.08, 0, 0.08]}>
                <boxGeometry args={[0.08, 0.04, 0.01]} />
                <primitive object={materials.impulse} attach="material" />
            </mesh>
            {/* Right Glow */}
            <mesh position={[0.08, 0, 0.08]}>
                <boxGeometry args={[0.08, 0.04, 0.01]} />
                <primitive object={materials.impulse} attach="material" />
            </mesh>
        </group>
        
        {/* Phaser Emitters (Bumps) */}
        <group>
             {/* Top Phasers */}
             <mesh position={[0, 0.04, 0.6]}>
                 <cylinderGeometry args={[0.01, 0.015, 0.02, 8]} />
                 <meshStandardMaterial color={COLORS.HULL_DARK} />
             </mesh>
             {/* Bottom Phasers */}
             <mesh position={[0, -0.04, 0.6]} rotation={[Math.PI, 0, 0]}>
                 <cylinderGeometry args={[0.01, 0.015, 0.02, 8]} />
                 <meshStandardMaterial color={COLORS.HULL_DARK} />
             </mesh>
        </group>

        {/* Navigation Lights Saucer */}
        <mesh position={[-0.6, 0.04, 0]}>
            <sphereGeometry args={[0.01]} />
            <meshBasicMaterial color={COLORS.NAV_LIGHT_RED} />
        </mesh>
         <mesh position={[0.6, 0.04, 0]}>
            <sphereGeometry args={[0.01]} />
            <meshBasicMaterial color={COLORS.NAV_LIGHT_GREEN} />
        </mesh>


        {/* Registry Text - Top */}
        <group position={[0, 0.131, 0.2]} rotation={[-Math.PI / 2, 0, 0]}>
          <Text fontSize={0.12} color="#222222" anchorX="center" anchorY="middle">USS ENTERPRISE</Text>
          <Text position={[0, -0.15, 0]} fontSize={0.08} color="#222222" anchorX="center" anchorY="middle">NCC-1701</Text>
        </group>

        {/* Registry Text - Bottom */}
        <group position={[0, -0.131, 0.2]} rotation={[Math.PI / 2, 0, Math.PI]}>
          <Text fontSize={0.12} color="#222222" anchorX="center" anchorY="middle">NCC-1701</Text>
        </group>

        {/* Windows Instanced Mesh - Saucer */}
        <Instances range={1000} material={MATERIALS.window}>
          <planeGeometry args={[0.015, 0.025]} />
          {saucerWindows.map((data, i) => (
            <Instance key={i} position={data.position as any} rotation={data.rotation as any} />
          ))}
        </Instances>
      </group>

      {/* 
        -------------------------------------------
        NECK SECTION (Dorsal)
        -------------------------------------------
      */}
      <group position={[0, 0, 0]}>
        <mesh 
          position={[0, -0.15, 0.4]} 
          rotation={[0.4, 0, 0]}
          onClick={handleClick('engineering')}
          onPointerOver={handlePointerOver('engineering')}
          onPointerOut={handlePointerOut()}
        >
          <boxGeometry args={[0.1, 0.4, 0.25]} />
          <meshStandardMaterial {...MATERIALS.hull} emissive={getEmissive('engineering')} />
        </mesh>
      </group>

      {/* 
        -------------------------------------------
        ENGINEERING HULL (Secondary Hull)
        -------------------------------------------
      */}
      <group 
        position={[0, -0.4, 0.2]}
        onClick={handleClick('engineering')}
        onPointerOver={handlePointerOver('engineering')}
        onPointerOut={handlePointerOut()}
      >
        {/* Main Body */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.15, 0.1, 0.8, 32]} />
          <meshStandardMaterial {...MATERIALS.hull} emissive={getEmissive('engineering')} />
        </mesh>

        {/* Front Section (Deflector Housing) */}
        <mesh position={[0, 0, 0.45]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.15, 0.15, 0.1, 32]} />
          <meshStandardMaterial {...MATERIALS.hull} emissive={getEmissive('engineering')} />
        </mesh>

        {/* 
            DETAILED DEFLECTOR DISH 
            Parabolic dish + Rings
        */}
        <group 
          position={[0, -0.02, 0.51]} 
          onClick={handleClick('deflector')}
          onPointerOver={handlePointerOver('deflector')}
          onPointerOut={handlePointerOut()}
        >
           {/* Outer Copper Ring */}
           <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.12, 0.02, 16, 48]} />
            <meshStandardMaterial {...MATERIALS.copper} />
          </mesh>
           {/* Inner Copper Ring */}
           <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -0.01]}>
            <torusGeometry args={[0.08, 0.015, 16, 48]} />
            <meshStandardMaterial {...MATERIALS.copper} />
          </mesh>
          
          {/* The Parabolic Dish (Flattened Sphere Cap) */}
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -0.04]}>
            <sphereGeometry args={[0.11, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.35]} />
            <primitive object={materials.deflector} attach="material" side={THREE.DoubleSide} />
          </mesh>

          {/* Central Emitter Spike */}
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
              <cylinderGeometry args={[0.01, 0.02, 0.05, 8]} />
              <meshStandardMaterial color="#884400" />
          </mesh>
        </group>

        {/* Shuttle Bay (Aft - Clamshell Doors) */}
        <group position={[0, 0.02, -0.42]} rotation={[0, Math.PI, 0]}>
            {/* Upper half dome for doors */}
            <mesh rotation={[-0.2, 0, 0]}>
                <sphereGeometry args={[0.09, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
                <meshStandardMaterial {...MATERIALS.hullDark} />
            </mesh>
            {/* Door seam */}
            <mesh position={[0, 0.05, 0.08]} rotation={[0, 0, 0]}>
                <boxGeometry args={[0.005, 0.1, 0.1]} />
                <meshStandardMaterial color="#333333" />
            </mesh>
             {/* Control Room / Observation */}
             <mesh position={[0, -0.02, 0.05]}>
                <boxGeometry args={[0.06, 0.02, 0.01]} />
                <meshBasicMaterial color={COLORS.WINDOWS} />
            </mesh>
        </group>
        
        {/* Undercut / Fan Tail */}
        <mesh position={[0, -0.08, -0.3]} rotation={[0.2, 0, 0]}>
             <cylinderGeometry args={[0.05, 0.02, 0.3, 16]} />
             <meshStandardMaterial {...MATERIALS.hull} />
        </mesh>

         {/* Windows Instanced Mesh - Engineering */}
         <Instances range={100} material={MATERIALS.window}>
          <planeGeometry args={[0.015, 0.025]} />
          {engineeringWindows.map((data, i) => (
            <Instance key={i} position={data.position as any} rotation={data.rotation as any} />
          ))}
        </Instances>
      </group>

      {/* 
        -------------------------------------------
        NACELLES & PYLONS
        -------------------------------------------
      */}
      <group position={[0, 0, 0]}>
        {/* Pylons - Swept Back Look */}
        <group 
          position={[0, -0.2, 0.1]} 
          onClick={handleClick('nacelles')}
          onPointerOver={handlePointerOver('nacelles')}
          onPointerOut={handlePointerOut()}
        >
          {/* Angled Pylon - Left */}
          {/* Rotated on X to sweep back, Z for dihedral */}
          <mesh position={[0.25, 0.3, -0.1]} rotation={[-0.4, 0, -0.6]}>
            <boxGeometry args={[0.05, 0.7, 0.15]} />
            <meshStandardMaterial {...MATERIALS.hull} emissive={getEmissive('nacelles')} />
          </mesh>
          {/* Angled Pylon - Right */}
          <mesh position={[-0.25, 0.3, -0.1]} rotation={[-0.4, 0, 0.6]}>
            <boxGeometry args={[0.05, 0.7, 0.15]} />
            <meshStandardMaterial {...MATERIALS.hull} emissive={getEmissive('nacelles')} />
          </mesh>
        </group>

        {/* 
            NACELLES 
        */}
        {[1, -1].map((side) => (
            <group 
            key={side}
            position={[side * 0.45, 0.4, 0]} // Moved back slightly due to pylon sweep
            onClick={handleClick('nacelles')}
            onPointerOver={handlePointerOver('nacelles')}
            onPointerOut={handlePointerOut()}
            >
            {/* Main Body */}
            <mesh rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.08, 0.08, 1.4, 32]} />
                <meshStandardMaterial {...MATERIALS.hull} emissive={getEmissive('nacelles')} />
            </mesh>
            
            {/* BUSSARD COLLECTOR (Detailed) */}
            <group position={[0, 0, 0.7]} rotation={[Math.PI / 2, 0, 0]}>
                 {/* Outer Glass Dome */}
                <mesh>
                    <sphereGeometry args={[0.082, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
                    <primitive object={materials.bussard} attach="material" />
                </mesh>
                {/* Rotating Fans (Inside) */}
                <group ref={fanBladesRef} position={[0, 0.02, 0]}>
                    {fanBlades}
                </group>
                {/* Inner Spike */}
                 <mesh position={[0, 0.03, 0]}>
                    <coneGeometry args={[0.02, 0.06, 16]} />
                    <meshStandardMaterial color="#884400" />
                </mesh>
            </group>

            {/* Rear Cap */}
            <mesh position={[0, 0, -0.7]} rotation={[-Math.PI / 2, 0, 0]}>
                <sphereGeometry args={[0.07, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
                <meshStandardMaterial color="#444444" />
            </mesh>
            
            {/* Strobe Light on Rear */}
            <mesh position={[0, 0.08, -0.65]}>
                <sphereGeometry args={[0.015]} />
                <meshBasicMaterial color={COLORS.NAV_LIGHT_WHITE} />
            </mesh>

            {/* Side Grills (Glow) */}
            <mesh position={[0.085, 0, 0.6]}>
                <boxGeometry args={[0.01, 0.04, 0.4]} />
                <primitive object={materials.nacelleGlow} attach="material" />
            </mesh>
            <mesh position={[-0.085, 0, 0.6]}>
                <boxGeometry args={[0.01, 0.04, 0.4]} />
                <primitive object={materials.nacelleGlow} attach="material" />
            </mesh>
            
            {/* Registry Side */}
            <group position={[side * 0.09, 0, 0]} rotation={[0, side * Math.PI / 2, 0]}>
                <Text
                fontSize={0.06}
                color="#222222"
                anchorX="center"
                anchorY="middle"
                letterSpacing={0.1}
                >
                NCC-1701
                </Text>
            </group>
            </group>
        ))}
      </group>
    </group>
  );
}
