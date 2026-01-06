'use client';

import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

interface SpacedockProps {
  position?: [number, number, number];
  scale?: number;
}

/**
 * Earth Spacedock - The iconic mushroom-shaped orbital station from Star Trek
 * Features: Main dome, central shaft, docking bays, running lights
 */
export function Spacedock({ position = [0, 0, 0], scale = 1 }: SpacedockProps) {
  const groupRef = useRef<THREE.Group>(null);
  const lightsRef = useRef<THREE.Group>(null);
  const dockLightsRef = useRef<THREE.PointLight[]>([]);
  
  // Animation for rotation
  useFrame((state) => {
    const time = state.clock.elapsedTime;
    
    // Slow rotation
    if (groupRef.current) {
      groupRef.current.rotation.y = time * 0.02;
    }
  });
  
  // Station colors
  const hullMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0x8899aa,
    metalness: 0.7,
    roughness: 0.3,
  }), []);
  
  const darkHullMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0x445566,
    metalness: 0.6,
    roughness: 0.4,
  }), []);
  
  const windowMaterial = useMemo(() => new THREE.MeshBasicMaterial({
    color: 0xffffcc,
    transparent: true,
    opacity: 0.8,
  }), []);
  
  const dockBayMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0x334455,
    metalness: 0.5,
    roughness: 0.5,
    emissive: 0x112233,
    emissiveIntensity: 0.2,
  }), []);

  const bayLightMaterial = useMemo(() => new THREE.MeshBasicMaterial({
    color: 0x88ccff,
  }), []);

  const pylonGreenLightMaterial = useMemo(() => new THREE.MeshBasicMaterial({
    color: 0x00ff00,
  }), []);

  const pylonYellowLightMaterial = useMemo(() => new THREE.MeshBasicMaterial({
    color: 0xffff00,
  }), []);
  
  // Generate window positions on the dome
  const windowPositions = useMemo(() => {
    const positions: { pos: [number, number, number]; scale: number }[] = [];
    const rows = 8;
    const domeRadius = 3;
    
    for (let row = 1; row < rows; row++) {
      const phi = (row / rows) * Math.PI * 0.4;
      const y = Math.cos(phi) * domeRadius * 0.8;
      const ringRadius = Math.sin(phi) * domeRadius;
      const count = Math.floor(12 + row * 4);
      
      for (let i = 0; i < count; i++) {
        const theta = (i / count) * Math.PI * 2;
        positions.push({
          pos: [
            Math.cos(theta) * ringRadius,
            y + 0.5,
            Math.sin(theta) * ringRadius,
          ],
          scale: 0.05 + Math.random() * 0.03,
        });
      }
    }
    return positions;
  }, []);
  
  // Docking bay positions around the rim
  const dockingBays = useMemo(() => {
    const bays: { pos: [number, number, number]; rotation: number }[] = [];
    const count = 12;
    const radius = 3.8;
    
    for (let i = 0; i < count; i++) {
      const theta = (i / count) * Math.PI * 2;
      bays.push({
        pos: [Math.cos(theta) * radius, -0.5, Math.sin(theta) * radius],
        rotation: theta,
      });
    }
    return bays;
  }, []);
  
  return (
    <group ref={groupRef} position={position} scale={scale}>
      {/* Main mushroom dome (upper section) */}
      <mesh material={hullMaterial} position={[0, 0.5, 0]}>
        <sphereGeometry args={[3, 64, 32, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
      </mesh>
      
      {/* Dome rim */}
      <mesh material={darkHullMaterial} position={[0, 0.5, 0]}>
        <torusGeometry args={[3, 0.15, 16, 64]} />
      </mesh>
      
      {/* Secondary rim detail */}
      <mesh material={hullMaterial} position={[0, 0.3, 0]}>
        <torusGeometry args={[3.2, 0.08, 12, 64]} />
      </mesh>
      
      {/* Underside of dome (docking area) */}
      <mesh material={dockBayMaterial} position={[0, 0.4, 0]} rotation={[Math.PI, 0, 0]}>
        <cylinderGeometry args={[3, 2.8, 0.3, 64]} />
      </mesh>
      
      {/* Central shaft */}
      <mesh material={hullMaterial} position={[0, -1.5, 0]}>
        <cylinderGeometry args={[0.6, 0.8, 4, 32]} />
      </mesh>
      
      {/* Shaft details - rings */}
      {[-0.5, -1.5, -2.5].map((y, i) => (
        <mesh key={`ring-${i}`} material={darkHullMaterial} position={[0, y, 0]}>
          <torusGeometry args={[0.7 + i * 0.05, 0.05, 8, 32]} />
        </mesh>
      ))}
      
      {/* Lower engineering section */}
      <mesh material={darkHullMaterial} position={[0, -3.8, 0]}>
        <cylinderGeometry args={[1.2, 0.8, 0.8, 32]} />
      </mesh>
      
      {/* Bottom cap */}
      <mesh material={hullMaterial} position={[0, -4.3, 0]}>
        <sphereGeometry args={[0.8, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
      </mesh>
      
      {/* Sensor array on top */}
      <mesh material={darkHullMaterial} position={[0, 3.2, 0]}>
        <cylinderGeometry args={[0.1, 0.3, 0.5, 16]} />
      </mesh>
      <mesh material={hullMaterial} position={[0, 3.5, 0]}>
        <sphereGeometry args={[0.15, 16, 8]} />
      </mesh>
      
      {/* Windows on dome */}
      <group ref={lightsRef}>
        {windowPositions.map((win, i) => (
          <mesh key={`window-${i}`} material={windowMaterial} position={win.pos}>
            <boxGeometry args={[win.scale, win.scale * 0.5, 0.02]} />
          </mesh>
        ))}
      </group>
      
      {/* Docking bays around the rim */}
      {dockingBays.map((bay, i) => (
        <group key={`bay-${i}`} position={bay.pos} rotation={[0, bay.rotation, 0]}>
          {/* Bay opening */}
          <mesh material={dockBayMaterial}>
            <boxGeometry args={[0.8, 0.4, 0.3]} />
          </mesh>
          {/* Bay light - replaced with mesh for performance */}
          <mesh 
            material={bayLightMaterial}
            position={[0, 0, 0.2]}
          >
             <sphereGeometry args={[0.08, 8, 8]} />
          </mesh>
        </group>
      ))}
      
      {/* Navigation lights */}
      <pointLight color={0xff0000} intensity={1} distance={5} position={[3.5, 0.5, 0]} />
      <pointLight color={0x00ff00} intensity={1} distance={5} position={[-3.5, 0.5, 0]} />
      <pointLight color={0xffffff} intensity={0.5} distance={3} position={[0, 3.6, 0]} />
      
      {/* Internal glow */}
      <pointLight color={0xffffcc} intensity={2} distance={8} position={[0, 0, 0]} />
    </group>
  );
}

interface DeepSpaceStationProps {
  position?: [number, number, number];
  scale?: number;
}

/**
 * Deep Space Station - Modular research and resupply station
 * Features: Central hub, rotating habitat ring, docking pylons, solar arrays
 */
export function DeepSpaceStation({ position = [0, 0, 0], scale = 1 }: DeepSpaceStationProps) {
  const groupRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Group>(null);
  const solarRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    const time = state.clock.elapsedTime;
    
    // Slow station rotation
    if (groupRef.current) {
      groupRef.current.rotation.y = time * 0.01;
    }
    
    // Habitat ring rotation (for artificial gravity)
    if (ringRef.current) {
      ringRef.current.rotation.y = time * 0.15;
    }
    
    // Solar panel tracking
    if (solarRef.current) {
      solarRef.current.rotation.y = -time * 0.01 + Math.PI * 0.25;
    }
  });
  
  const hullMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0x889999,
    metalness: 0.6,
    roughness: 0.4,
  }), []);
  
  const darkMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0x334444,
    metalness: 0.5,
    roughness: 0.5,
  }), []);
  
  const solarMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0x1a237e,
    metalness: 0.8,
    roughness: 0.2,
    emissive: 0x0d47a1,
    emissiveIntensity: 0.1,
  }), []);
  
  const windowMaterial = useMemo(() => new THREE.MeshBasicMaterial({
    color: 0xffffaa,
    transparent: true,
    opacity: 0.9,
  }), []);

  const pylonGreenLightMaterial = useMemo(() => new THREE.MeshBasicMaterial({
    color: 0x00ff00,
  }), []);

  const pylonYellowLightMaterial = useMemo(() => new THREE.MeshBasicMaterial({
    color: 0xffff00,
  }), []);
  
  // Habitat ring window positions
  const ringWindows = useMemo(() => {
    const windows: [number, number, number][] = [];
    const count = 24;
    const radius = 2.3;
    
    for (let i = 0; i < count; i++) {
      const theta = (i / count) * Math.PI * 2;
      windows.push([Math.cos(theta) * radius, 0, Math.sin(theta) * radius]);
    }
    return windows;
  }, []);
  
  return (
    <group ref={groupRef} position={position} scale={scale}>
      {/* Central command module (sphere) */}
      <mesh material={hullMaterial}>
        <sphereGeometry args={[0.8, 32, 16]} />
      </mesh>
      
      {/* Upper observation dome */}
      <mesh material={hullMaterial} position={[0, 1, 0]}>
        <sphereGeometry args={[0.4, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.6]} />
      </mesh>
      
      {/* Command windows */}
      {[0, 90, 180, 270].map((angle, i) => (
        <mesh 
          key={`cmd-win-${i}`}
          material={windowMaterial} 
          position={[
            Math.cos(angle * Math.PI / 180) * 0.82,
            0.2,
            Math.sin(angle * Math.PI / 180) * 0.82,
          ]}
          rotation={[0, -angle * Math.PI / 180, 0]}
        >
          <planeGeometry args={[0.2, 0.15]} />
        </mesh>
      ))}
      
      {/* Rotating habitat ring */}
      <group ref={ringRef} position={[0, -0.5, 0]}>
        {/* Main ring */}
        <mesh material={hullMaterial}>
          <torusGeometry args={[2.3, 0.35, 16, 48]} />
        </mesh>
        
        {/* Ring detail bands */}
        <mesh material={darkMaterial}>
          <torusGeometry args={[2.3, 0.38, 8, 48]} />
        </mesh>
        
        {/* Windows on ring */}
        {ringWindows.map((pos, i) => (
          <mesh key={`ring-win-${i}`} material={windowMaterial} position={pos}>
            <boxGeometry args={[0.15, 0.1, 0.02]} />
          </mesh>
        ))}
        
        {/* Spokes connecting ring to hub */}
        {[0, 60, 120, 180, 240, 300].map((angle, i) => {
          const rad = angle * Math.PI / 180;
          return (
            <mesh 
              key={`spoke-${i}`}
              material={darkMaterial}
              position={[Math.cos(rad) * 1.15, 0.5, Math.sin(rad) * 1.15]}
              rotation={[0, -rad, Math.PI / 2]}
            >
              <cylinderGeometry args={[0.08, 0.08, 2.3, 8]} />
            </mesh>
          );
        })}
      </group>
      
      {/* Docking pylons */}
      {[0, 90, 180, 270].map((angle, i) => {
        const rad = angle * Math.PI / 180;
        const x = Math.cos(rad) * 1.5;
        const z = Math.sin(rad) * 1.5;
        return (
          <group key={`pylon-${i}`} position={[x, 0, z]} rotation={[0, -rad, 0]}>
            {/* Pylon arm */}
            <mesh material={hullMaterial} position={[0.5, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.1, 0.1, 1, 8]} />
            </mesh>
            {/* Docking port */}
            <mesh material={darkMaterial} position={[1.1, 0, 0]}>
              <cylinderGeometry args={[0.2, 0.25, 0.3, 12]} />
            </mesh>
            {/* Docking light - replaced with mesh */}
            <mesh 
              material={i % 2 === 0 ? pylonGreenLightMaterial : pylonYellowLightMaterial}
              position={[1.1, 0.2, 0]}
            >
              <sphereGeometry args={[0.05, 6, 6]} />
            </mesh>
          </group>
        );
      })}
      
      {/* Solar array assembly */}
      <group ref={solarRef} position={[0, 1.5, 0]}>
        {/* Solar panel support */}
        <mesh material={darkMaterial} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.05, 0.05, 3, 8]} />
        </mesh>
        
        {/* Solar panels */}
        {[-1, 1].map((side, i) => (
          <group key={`solar-${i}`} position={[side * 1.2, 0, 0]}>
            <mesh material={solarMaterial}>
              <boxGeometry args={[1, 0.02, 0.6]} />
            </mesh>
            {/* Panel frame */}
            <mesh material={darkMaterial} position={[0, 0.015, 0]}>
              <boxGeometry args={[1.05, 0.01, 0.65]} />
            </mesh>
          </group>
        ))}
      </group>
      
      {/* Lower engineering module */}
      <mesh material={darkMaterial} position={[0, -1.5, 0]}>
        <cylinderGeometry args={[0.5, 0.3, 0.8, 16]} />
      </mesh>
      
      {/* Sensor array */}
      <mesh material={hullMaterial} position={[0, -2, 0]}>
        <coneGeometry args={[0.2, 0.4, 12]} />
      </mesh>
      
      {/* Navigation lights */}
      <pointLight color={0xff0000} intensity={0.5} distance={3} position={[2.5, -0.5, 0]} />
      <pointLight color={0x00ff00} intensity={0.5} distance={3} position={[-2.5, -0.5, 0]} />
      <pointLight color={0xffffff} intensity={0.3} distance={2} position={[0, 1.5, 0]} />
      
      {/* Station ambient light */}
      <pointLight color={0xffffee} intensity={1} distance={5} position={[0, 0, 0]} />
    </group>
  );
}
