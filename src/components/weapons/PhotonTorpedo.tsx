'use client';

import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Torpedo } from '@/hooks/useWeapons';

interface PhotonTorpedoProps {
  torpedo: Torpedo;
  onImpact?: (torpedoId: string) => void;
}

export function PhotonTorpedo({ torpedo }: PhotonTorpedoProps) {
  const groupRef = useRef<THREE.Group>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const trailRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (!groupRef.current) return;
    
    // Update position from torpedo state
    groupRef.current.position.copy(torpedo.position);
    
    // Point toward target
    groupRef.current.lookAt(torpedo.targetPosition);
    
    // Pulse the glow
    if (glowRef.current) {
      const pulse = Math.sin(state.clock.elapsedTime * 20) * 0.2 + 1;
      glowRef.current.scale.setScalar(pulse);
    }
    
    // Animate trail
    if (trailRef.current) {
      const trailPulse = Math.sin(state.clock.elapsedTime * 15) * 0.1 + 0.9;
      trailRef.current.scale.x = trailPulse;
      trailRef.current.scale.y = trailPulse;
    }
  });
  
  return (
    <group ref={groupRef}>
      {/* Main torpedo body - glowing sphere */}
      <mesh>
        <sphereGeometry args={[0.4, 16, 16]} />
        <meshBasicMaterial
          color={0xff4400}
          transparent
          opacity={0.9}
        />
      </mesh>
      
      {/* Inner bright core */}
      <mesh>
        <sphereGeometry args={[0.25, 12, 12]} />
        <meshBasicMaterial
          color={0xffaa66}
        />
      </mesh>
      
      {/* Outer glow */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[0.8, 12, 12]} />
        <meshBasicMaterial
          color={0xff6622}
          transparent
          opacity={0.4}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      
      {/* Trail effect */}
      <mesh ref={trailRef} position={[0, 0, -2]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.3, 4, 8]} />
        <meshBasicMaterial
          color={0xff4400}
          transparent
          opacity={0.5}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      
      {/* Point light for illumination */}
      <pointLight
        color={0xff4400}
        intensity={50}
        distance={30}
        decay={2}
      />
    </group>
  );
}

// Container for multiple torpedoes
interface PhotonTorpedoesProps {
  torpedoes: Torpedo[];
}

export function PhotonTorpedoes({ torpedoes }: PhotonTorpedoesProps) {
  return (
    <group>
      {torpedoes.map(torpedo => (
        <PhotonTorpedo key={torpedo.id} torpedo={torpedo} />
      ))}
    </group>
  );
}

// Torpedo impact explosion effect
interface TorpedoExplosionProps {
  position: THREE.Vector3;
  onComplete?: () => void;
}

export function TorpedoExplosion({ position, onComplete }: TorpedoExplosionProps) {
  const groupRef = useRef<THREE.Group>(null);
  const progressRef = useRef(0);
  const completedRef = useRef(false);
  
  useFrame((_, delta) => {
    if (!groupRef.current || completedRef.current) return;
    
    progressRef.current += delta * 3; // 0.33 second explosion
    
    // Scale up and fade out
    const scale = progressRef.current * 5;
    const opacity = Math.max(0, 1 - progressRef.current);
    
    groupRef.current.scale.setScalar(scale);
    
    // Update all child materials
    groupRef.current.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshBasicMaterial) {
        child.material.opacity = opacity;
      }
    });
    
    if (progressRef.current >= 1 && !completedRef.current) {
      completedRef.current = true;
      if (onComplete) onComplete();
    }
  });
  
  return (
    <group ref={groupRef} position={position.toArray()}>
      {/* Explosion sphere */}
      <mesh>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial
          color={0xff6622}
          transparent
          opacity={1}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      
      {/* Bright core */}
      <mesh>
        <sphereGeometry args={[0.5, 12, 12]} />
        <meshBasicMaterial
          color={0xffaa44}
          transparent
          opacity={1}
        />
      </mesh>
      
      {/* Shockwave ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.8, 1.2, 32]} />
        <meshBasicMaterial
          color={0xff4400}
          transparent
          opacity={0.8}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      
      {/* Point light flash */}
      <pointLight
        color={0xff4400}
        intensity={100}
        distance={50}
        decay={2}
      />
    </group>
  );
}
