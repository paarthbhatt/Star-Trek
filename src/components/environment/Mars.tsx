'use client';

import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { proceduralPlanetVertex, marsFragment } from '@/shaders/procedural';

export function Mars() {
  const marsRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const shaderRef = useRef<THREE.ShaderMaterial>(null);
  const orbitAngle = useRef(Math.PI * 0.7); // Start at different position

  // Mars surface shader
  const marsMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: proceduralPlanetVertex,
      fragmentShader: marsFragment,
      uniforms: {
        uTime: { value: 0 },
      },
    });
  }, []);

  useFrame((state, delta) => {
    const time = state.clock.elapsedTime;

    // Update shader time
    if (shaderRef.current) {
      shaderRef.current.uniforms.uTime.value = time;
    }

    // Orbital motion (further out, slower)
    orbitAngle.current += delta * 0.012;
    
    if (groupRef.current) {
      const orbitRadius = 180;
      groupRef.current.position.x = Math.cos(orbitAngle.current) * orbitRadius - 50;
      groupRef.current.position.z = Math.sin(orbitAngle.current) * orbitRadius - 150;
    }

    // Planet rotation
    if (marsRef.current) {
      marsRef.current.rotation.y += delta * 0.08;
    }
  });

  return (
    <group ref={groupRef} position={[-120, -10, -200]}>
      <mesh ref={marsRef}>
        <sphereGeometry args={[8, 64, 32]} />
        <shaderMaterial
          ref={shaderRef}
          vertexShader={proceduralPlanetVertex}
          fragmentShader={marsFragment}
          uniforms={{ uTime: { value: 0 } }}
        />
      </mesh>

      {/* Subtle dust atmosphere */}
      <mesh>
        <sphereGeometry args={[8.5, 32, 16]} />
        <meshBasicMaterial 
          color={0xffaa88}
          transparent
          opacity={0.08}
          side={THREE.BackSide}
        />
      </mesh>
    </group>
  );
}
