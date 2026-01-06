'use client';

import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { nebulaVertex, nebulaFragment } from '@/shaders/nebula';

export function Nebula() {
  const nebulaRef = useRef<THREE.Mesh>(null);
  const shaderRef = useRef<THREE.ShaderMaterial>(null);

  // Nebula shader material
  const nebulaMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: nebulaVertex,
      fragmentShader: nebulaFragment,
      uniforms: {
        uTime: { value: 0 },
        uColor1: { value: new THREE.Color(0x1a0a2e) }, // Deep purple
        uColor2: { value: new THREE.Color(0x0a1628) }, // Dark blue
        uColor3: { value: new THREE.Color(0x2d1b4e) }, // Violet
      },
      transparent: true,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
  }, []);

  useFrame((state) => {
    const time = state.clock.elapsedTime;
    
    if (shaderRef.current) {
      shaderRef.current.uniforms.uTime.value = time;
    }

    if (nebulaRef.current) {
      nebulaRef.current.rotation.y = time * 0.002;
    }
  });

  return (
    <group>
      {/* Main nebula sphere - reduced segments for performance */}
      <mesh ref={nebulaRef}>
        <sphereGeometry args={[800, 32, 16]} />
        <shaderMaterial
          ref={shaderRef}
          vertexShader={nebulaVertex}
          fragmentShader={nebulaFragment}
          uniforms={{
            uTime: { value: 0 },
            uColor1: { value: new THREE.Color(0x1a0a2e) },
            uColor2: { value: new THREE.Color(0x0a1628) },
            uColor3: { value: new THREE.Color(0x2d1b4e) },
          }}
          transparent
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Additional nebula clouds at different positions - reduced complexity */}
      {[
        { pos: [300, 100, -400], color: 0x2a1a4e, scale: 200 },
        { pos: [-400, -50, -300], color: 0x1a2a4e, scale: 250 },
      ].map((cloud, i) => (
        <mesh key={i} position={cloud.pos as [number, number, number]}>
          <sphereGeometry args={[cloud.scale, 16, 8]} />
          <meshBasicMaterial
            color={cloud.color}
            transparent
            opacity={0.05}
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}
    </group>
  );
}
