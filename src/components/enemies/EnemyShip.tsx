
'use client';

import { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useAudio } from '@/hooks/useAudio';

interface EnemyShipProps {
  id: string;
  position: THREE.Vector3;
  type: 'scout' | 'warbird' | 'cruiser';
  health: number;
  onDestroy?: () => void;
}

export function EnemyShip({ id, position, type, health, onDestroy }: EnemyShipProps) {
  const groupRef = useRef<THREE.Group>(null);
  const audio = useAudio();
  const [lastPosition] = useState(position.clone());
  
  // Simple floating animation
  useFrame((state) => {
    if (!groupRef.current) return;
    
    // Bobbing motion
    const time = state.clock.getElapsedTime();
    groupRef.current.position.y = position.y + Math.sin(time * 0.5 + parseFloat(id)) * 2;
    
    // Slow rotation
    groupRef.current.rotation.y += 0.005;
  });

  const getColor = () => {
    switch(type) {
        case 'warbird': return '#22cc44'; // Romulan Green
        case 'scout': return '#ccaa22'; // Klingon Yellow/Brown
        case 'cruiser': return '#cc2222'; // Generic Red
        default: return '#aaaaaa';
    }
  };

  const color = getColor();

  return (
    <group ref={groupRef} position={position}>
      {/* Ship Body Placeholder - Using Primitives for now */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[4, 1, 6]} />
        <meshStandardMaterial color={color} roughness={0.3} metalness={0.8} />
      </mesh>
      
      {/* Engines */}
      <mesh position={[-2.5, 0, -2]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.5, 0.8, 4]} />
        <meshStandardMaterial color="#333" />
      </mesh>
      <mesh position={[2.5, 0, -2]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.5, 0.8, 4]} />
        <meshStandardMaterial color="#333" />
      </mesh>

      {/* Engine Glow */}
      <pointLight position={[-2.5, 0, 2.5]} color="#ff4400" distance={5} intensity={2} />
      <pointLight position={[2.5, 0, 2.5]} color="#ff4400" distance={5} intensity={2} />

      {/* Target Marker (Visual only) */}
      <mesh position={[0, 3, 0]}>
         <sphereGeometry args={[0.2]} />
         <meshBasicMaterial color="red" />
      </mesh>
    </group>
  );
}
