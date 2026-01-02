'use client';

import { useRef, useMemo, useState, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Text, Instance, Instances } from '@react-three/drei';
import { ShipComponent } from '@/types';

interface EnterpriseProps {
  onSelectComponent: (component: ShipComponent) => void;
  hoveredComponent: ShipComponent | null;
  onHoverComponent: (component: ShipComponent | null) => void;
  enableFloating?: boolean;
}

// Enterprise NCC-1701 Procedural Model
// Built to 0.01 scale (1 unit = 100 meters approximately)
// Total length approx 2.8 units

const COLORS = {
  HULL: '#b8b8b8',
  HULL_DARK: '#888888',
  BUSSARD: '#ff4400',
  BUSSARD_GLOW: '#ff6600',
  DEFLECTOR: '#cc6633',
  DEFLECTOR_GLOW: '#ffaa44',
  NACELLE_GLOW: '#4488ff',
  WINDOWS: '#ffffcc',
  IMPULSE: '#ff2200',
  BRIDGE: '#eeeeee'
};

const MATERIALS = {
  hull: new THREE.MeshStandardMaterial({ 
    color: COLORS.HULL, 
    roughness: 0.4, 
    metalness: 0.3 
  }),
  hullDark: new THREE.MeshStandardMaterial({ 
    color: COLORS.HULL_DARK, 
    roughness: 0.5, 
    metalness: 0.4 
  }),
  bussard: new THREE.MeshStandardMaterial({ 
    color: COLORS.BUSSARD, 
    emissive: COLORS.BUSSARD_GLOW, 
    emissiveIntensity: 2,
    toneMapped: false
  }),
  deflector: new THREE.MeshStandardMaterial({ 
    color: COLORS.DEFLECTOR, 
    emissive: COLORS.DEFLECTOR_GLOW, 
    emissiveIntensity: 1.5,
    toneMapped: false
  }),
  nacelleGlow: new THREE.MeshStandardMaterial({ 
    color: COLORS.NACELLE_GLOW, 
    emissive: COLORS.NACELLE_GLOW, 
    emissiveIntensity: 1,
    transparent: true,
    opacity: 0.8
  }),
  impulse: new THREE.MeshStandardMaterial({
    color: COLORS.IMPULSE,
    emissive: COLORS.IMPULSE,
    emissiveIntensity: 2
  }),
  window: new THREE.MeshBasicMaterial({
    color: COLORS.WINDOWS
  })
};

export function Enterprise({ onSelectComponent, hoveredComponent, onHoverComponent, enableFloating = false }: EnterpriseProps) {
  const groupRef = useRef<THREE.Group>(null);
  
  // Floating animation
  useFrame((state) => {
    if (groupRef.current && enableFloating) {
      groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.3) * 0.02;
      groupRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.2) * 0.01;
    }
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
      instances.push({
        position: [Math.cos(angle) * r, 0, Math.sin(angle) * r],
        rotation: [0, -angle, 0]
      });
    }
    // Top windows
    for (let i = 0; i < 32; i++) {
      const angle = (i / 32) * Math.PI * 2;
      const r = 0.45;
      instances.push({
        position: [Math.cos(angle) * r, 0.08, Math.sin(angle) * r],
        rotation: [0, -angle, 0]
      });
    }
    // Bottom windows
    for (let i = 0; i < 24; i++) {
      const angle = (i / 24) * Math.PI * 2;
      const r = 0.3;
      instances.push({
        position: [Math.cos(angle) * r, -0.05, Math.sin(angle) * r],
        rotation: [0, -angle, 0]
      });
    }
    return instances;
  }, []);

  const engineeringWindows = useMemo(() => {
    const instances = [];
    // Side windows
    for (let i = 0; i < 16; i++) {
      const z = -0.2 + (i * 0.08); // Along the length
      instances.push({
        position: [0.14, -0.4, z],
        rotation: [0, 0, 0]
      });
      instances.push({
        position: [-0.14, -0.4, z],
        rotation: [0, 0, 0]
      });
    }
    return instances;
  }, []);

  return (
    <group ref={groupRef} dispose={null} rotation={[0, Math.PI, 0]}>
      {/* 
        -------------------------------------------
        SAUCER SECTION (Primary Hull) 
        -------------------------------------------
      */}
      <group position={[0, 0, 0.5]}>
        {/* Main Disk */}
        <mesh 
          onClick={handleClick('saucer')}
          onPointerOver={handlePointerOver('saucer')}
          onPointerOut={handlePointerOut()}
        >
          <cylinderGeometry args={[0.635, 0.635, 0.08, 64]} />
          <meshStandardMaterial 
            {...MATERIALS.hull} 
            emissive={getEmissive('saucer')}
          />
        </mesh>
        
        {/* Top Dome Slope */}
        <mesh position={[0, 0.08, 0]}>
          <cylinderGeometry args={[0.3, 0.635, 0.1, 64]} />
          <meshStandardMaterial 
            {...MATERIALS.hull} 
            emissive={getEmissive('saucer')}
          />
        </mesh>

        {/* Bottom Dome Slope */}
        <mesh position={[0, -0.08, 0]}>
          <cylinderGeometry args={[0.635, 0.2, 0.1, 64]} />
          <meshStandardMaterial 
            {...MATERIALS.hull} 
            emissive={getEmissive('saucer')}
          />
        </mesh>

        {/* Bottom Sensor Dome */}
        <mesh position={[0, -0.13, 0]}>
          <sphereGeometry args={[0.08, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
          <meshStandardMaterial color="#eeeeee" emissive="#ffffff" emissiveIntensity={0.5} />
        </mesh>

        {/* Impulse Engines (Back of Saucer) */}
        <mesh position={[0, 0.04, -0.55]} rotation={[0, 0, 0]}>
          <boxGeometry args={[0.2, 0.06, 0.1]} />
          <meshStandardMaterial {...MATERIALS.impulse} />
        </mesh>

        {/* Registry Text - Top */}
        <group position={[0, 0.131, 0.2]} rotation={[-Math.PI / 2, 0, 0]}>
          <Text
            fontSize={0.12}
            color="#222222"
            anchorX="center"
            anchorY="middle"
          >
            USS ENTERPRISE
          </Text>
          <Text
            position={[0, -0.15, 0]}
            fontSize={0.08}
            color="#222222"
            anchorX="center"
            anchorY="middle"
          >
            NCC-1701
          </Text>
        </group>

        {/* Registry Text - Bottom */}
        <group position={[0, -0.131, 0.2]} rotation={[Math.PI / 2, 0, Math.PI]}>
          <Text
            fontSize={0.12}
            color="#222222"
            anchorX="center"
            anchorY="middle"
          >
            NCC-1701
          </Text>
        </group>

        {/* BRIDGE MODULE */}
        <group 
          position={[0, 0.13, 0]} 
          onClick={handleClick('bridge')}
          onPointerOver={handlePointerOver('bridge')}
          onPointerOut={handlePointerOut()}
        >
          {/* Bridge Base */}
          <mesh>
            <cylinderGeometry args={[0.12, 0.15, 0.06, 32]} />
            <meshStandardMaterial {...MATERIALS.hull} emissive={getEmissive('bridge')} />
          </mesh>
          {/* Bridge Dome */}
          <mesh position={[0, 0.04, 0]}>
            <sphereGeometry args={[0.08, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
            <meshStandardMaterial {...MATERIALS.hull} color="#dddddd" emissive={getEmissive('bridge')} />
          </mesh>
        </group>

        {/* Windows Instanced Mesh - Saucer */}
        <Instances range={1000} material={MATERIALS.window}>
          <planeGeometry args={[0.015, 0.025]} />
          {saucerWindows.map((data, i) => (
            <Instance
              key={i}
              position={data.position as any}
              rotation={data.rotation as any}
            />
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

        {/* Deflector Dish */}
        <group 
          position={[0, -0.02, 0.51]} 
          onClick={handleClick('deflector')}
          onPointerOver={handlePointerOver('deflector')}
          onPointerOut={handlePointerOut()}
        >
           {/* Dish Housing Ring */}
           <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.1, 0.02, 16, 32]} />
            <meshStandardMaterial color="#886644" />
          </mesh>
          {/* Glowing Dish */}
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -0.02]}>
            <coneGeometry args={[0.1, 0.05, 32, 1, true]} />
            <meshStandardMaterial {...MATERIALS.deflector} side={THREE.DoubleSide} />
          </mesh>
        </group>

        {/* Shuttle Bay (Aft) */}
        <mesh position={[0, 0, -0.4]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.08, 0.1, 0.1, 32]} />
          <meshStandardMaterial color="#888888" />
        </mesh>

         {/* Windows Instanced Mesh - Engineering */}
         <Instances range={100} material={MATERIALS.window}>
          <planeGeometry args={[0.015, 0.025]} />
          {engineeringWindows.map((data, i) => (
            <Instance
              key={i}
              position={data.position as any}
              rotation={data.rotation as any}
            />
          ))}
        </Instances>
      </group>

      {/* 
        -------------------------------------------
        NACELLES & PYLONS
        -------------------------------------------
      */}
      <group position={[0, 0, 0]}>
        {/* Pylons */}
        <mesh 
          position={[0, -0.2, 0.1]} 
          rotation={[0, 0, 0]}
          onClick={handleClick('nacelles')}
          onPointerOver={handlePointerOver('nacelles')}
          onPointerOut={handlePointerOut()}
        >
          {/* Angled Pylon - Left */}
          <mesh position={[0.25, 0.3, 0]} rotation={[0, 0, -0.6]}>
            <boxGeometry args={[0.05, 0.6, 0.15]} />
            <meshStandardMaterial {...MATERIALS.hull} emissive={getEmissive('nacelles')} />
          </mesh>
          {/* Angled Pylon - Right */}
          <mesh position={[-0.25, 0.3, 0]} rotation={[0, 0, 0.6]}>
            <boxGeometry args={[0.05, 0.6, 0.15]} />
            <meshStandardMaterial {...MATERIALS.hull} emissive={getEmissive('nacelles')} />
          </mesh>
        </mesh>

        {/* Left Nacelle */}
        <group 
          position={[0.45, 0.4, 0.1]}
          onClick={handleClick('nacelles')}
          onPointerOver={handlePointerOver('nacelles')}
          onPointerOut={handlePointerOut()}
        >
          {/* Main Body */}
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.08, 0.08, 1.4, 32]} />
            <meshStandardMaterial {...MATERIALS.hull} emissive={getEmissive('nacelles')} />
          </mesh>
          {/* Bussard Collector (Front) */}
          <mesh position={[0, 0, 0.7]} rotation={[Math.PI / 2, 0, 0]}>
            <sphereGeometry args={[0.08, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
            <meshStandardMaterial {...MATERIALS.bussard} />
          </mesh>
          {/* Rear Cap */}
          <mesh position={[0, 0, -0.7]} rotation={[-Math.PI / 2, 0, 0]}>
             <sphereGeometry args={[0.07, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
             <meshStandardMaterial color="#444444" />
          </mesh>
          {/* Side Grills (Glow) */}
           <mesh position={[0.085, 0, 0.6]}>
             <boxGeometry args={[0.01, 0.04, 0.4]} />
             <meshStandardMaterial {...MATERIALS.nacelleGlow} />
           </mesh>
           <mesh position={[-0.085, 0, 0.6]}>
             <boxGeometry args={[0.01, 0.04, 0.4]} />
             <meshStandardMaterial {...MATERIALS.nacelleGlow} />
           </mesh>
           {/* Registry Side */}
           <group position={[0.09, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
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

        {/* Right Nacelle */}
        <group 
          position={[-0.45, 0.4, 0.1]}
          onClick={handleClick('nacelles')}
          onPointerOver={handlePointerOver('nacelles')}
          onPointerOut={handlePointerOut()}
        >
          {/* Main Body */}
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.08, 0.08, 1.4, 32]} />
            <meshStandardMaterial {...MATERIALS.hull} emissive={getEmissive('nacelles')} />
          </mesh>
          {/* Bussard Collector (Front) */}
          <mesh position={[0, 0, 0.7]} rotation={[Math.PI / 2, 0, 0]}>
            <sphereGeometry args={[0.08, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
            <meshStandardMaterial {...MATERIALS.bussard} />
          </mesh>
          {/* Rear Cap */}
          <mesh position={[0, 0, -0.7]} rotation={[-Math.PI / 2, 0, 0]}>
             <sphereGeometry args={[0.07, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
             <meshStandardMaterial color="#444444" />
          </mesh>
          {/* Side Grills (Glow) */}
           <mesh position={[0.085, 0, 0.6]}>
             <boxGeometry args={[0.01, 0.04, 0.4]} />
             <meshStandardMaterial {...MATERIALS.nacelleGlow} />
           </mesh>
           <mesh position={[-0.085, 0, 0.6]}>
             <boxGeometry args={[0.01, 0.04, 0.4]} />
             <meshStandardMaterial {...MATERIALS.nacelleGlow} />
           </mesh>
           {/* Registry Side */}
           <group position={[-0.09, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
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
      </group>
    </group>
  );
}
