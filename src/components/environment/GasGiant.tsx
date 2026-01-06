'use client';

import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { proceduralPlanetVertex, gasGiantFragment } from '@/shaders/procedural';

export function GasGiant() {
  const planetRef = useRef<THREE.Mesh>(null);
  const ringsRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const shaderRef = useRef<THREE.ShaderMaterial>(null);
  const orbitAngle = useRef(Math.PI * 1.3); // Start position

  useFrame((state, delta) => {
    const time = state.clock.elapsedTime;

    // Update shader time
    if (shaderRef.current) {
      shaderRef.current.uniforms.uTime.value = time;
    }

    // Slow orbital motion
    orbitAngle.current += delta * 0.005;
    
    if (groupRef.current) {
      const orbitRadius = 250;
      groupRef.current.position.x = Math.cos(orbitAngle.current) * orbitRadius + 100;
      groupRef.current.position.z = Math.sin(orbitAngle.current) * orbitRadius - 200;
    }

    // Fast rotation (gas giants rotate quickly)
    if (planetRef.current) {
      planetRef.current.rotation.y += delta * 0.15;
    }

    // Slow ring rotation
    if (ringsRef.current) {
      ringsRef.current.rotation.z = Math.sin(time * 0.1) * 0.02;
    }
  });

  // Ring texture - procedural
  const ringMaterial = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    
    // Create ring pattern
    const gradient = ctx.createLinearGradient(0, 0, 512, 0);
    gradient.addColorStop(0, 'rgba(200, 180, 150, 0)');
    gradient.addColorStop(0.1, 'rgba(200, 180, 150, 0.6)');
    gradient.addColorStop(0.2, 'rgba(180, 160, 130, 0.3)');
    gradient.addColorStop(0.3, 'rgba(200, 180, 150, 0.7)');
    gradient.addColorStop(0.4, 'rgba(160, 140, 110, 0.2)');
    gradient.addColorStop(0.5, 'rgba(200, 180, 150, 0.5)');
    gradient.addColorStop(0.6, 'rgba(180, 160, 130, 0.6)');
    gradient.addColorStop(0.7, 'rgba(160, 140, 110, 0.3)');
    gradient.addColorStop(0.8, 'rgba(200, 180, 150, 0.4)');
    gradient.addColorStop(0.9, 'rgba(180, 160, 130, 0.2)');
    gradient.addColorStop(1, 'rgba(200, 180, 150, 0)');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 64);
    
    // Add some noise/detail
    for (let i = 0; i < 1000; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 64;
      const alpha = Math.random() * 0.3;
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.fillRect(x, y, 1, 1);
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.repeat.set(1, 1);
    
    return new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      opacity: 0.8,
    });
  }, []);

  return (
    <group ref={groupRef} position={[-150, 30, -300]}>
      {/* Gas giant surface */}
      <mesh ref={planetRef}>
        <sphereGeometry args={[22, 64, 32]} />
        <shaderMaterial
          ref={shaderRef}
          vertexShader={proceduralPlanetVertex}
          fragmentShader={gasGiantFragment}
          uniforms={{ uTime: { value: 0 } }}
        />
      </mesh>

      {/* Ring system */}
      <mesh ref={ringsRef} rotation={[Math.PI / 2.5, 0, 0]} material={ringMaterial}>
        <ringGeometry args={[28, 45, 128]} />
      </mesh>

      {/* Shadow ring (under the main rings) */}
      <mesh rotation={[Math.PI / 2.5, 0, 0]}>
        <ringGeometry args={[28, 45, 64]} />
        <meshBasicMaterial 
          color={0x000000}
          transparent
          opacity={0.2}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Atmospheric glow */}
      <mesh>
        <sphereGeometry args={[23, 32, 16]} />
        <meshBasicMaterial 
          color={0xffcc88}
          transparent
          opacity={0.1}
          side={THREE.BackSide}
        />
      </mesh>
    </group>
  );
}
