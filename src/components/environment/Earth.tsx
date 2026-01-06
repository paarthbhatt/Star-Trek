'use client';

import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { 
  proceduralPlanetVertex, 
  earthFragment, 
  moonFragment 
} from '@/shaders/procedural';
import { atmosphereVertex, atmosphereFragment } from '@/shaders/atmosphere';

export function Earth() {
  const earthRef = useRef<THREE.Group>(null);
  const planetRef = useRef<THREE.Mesh>(null);
  const cloudsRef = useRef<THREE.Mesh>(null);
  const shaderRef = useRef<THREE.ShaderMaterial>(null);

  // Earth surface shader
  const earthMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: proceduralPlanetVertex,
      fragmentShader: earthFragment,
      uniforms: {
        uTime: { value: 0 },
      },
    });
  }, []);

  // Atmosphere shader
  const atmosphereMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: atmosphereVertex,
      fragmentShader: atmosphereFragment,
      uniforms: {
        uAtmosphereColor: { value: new THREE.Color(0x4488ff) },
        uIntensity: { value: 0.8 },
      },
      transparent: true,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
  }, []);

  // Orbital motion
  const orbitAngle = useRef(0);

  useFrame((state, delta) => {
    const time = state.clock.elapsedTime;

    // Update shader time
    if (shaderRef.current) {
      shaderRef.current.uniforms.uTime.value = time;
    }

    // Orbital motion
    orbitAngle.current += delta * 0.02;
    if (earthRef.current) {
      const orbitRadius = 120;
      earthRef.current.position.x = Math.cos(orbitAngle.current) * orbitRadius + 80;
      earthRef.current.position.z = Math.sin(orbitAngle.current) * orbitRadius - 100;
    }

    // Planet rotation
    if (planetRef.current) {
      planetRef.current.rotation.y += delta * 0.1;
    }

    // Cloud rotation (slightly faster)
    if (cloudsRef.current) {
      cloudsRef.current.rotation.y += delta * 0.12;
    }
  });

  return (
    <group ref={earthRef} position={[80, 20, -100]}>
      {/* Earth surface */}
      <mesh ref={planetRef} material={earthMaterial}>
        <sphereGeometry args={[12, 64, 32]} />
        <shaderMaterial
          ref={shaderRef}
          vertexShader={proceduralPlanetVertex}
          fragmentShader={earthFragment}
          uniforms={{ uTime: { value: 0 } }}
        />
      </mesh>

      {/* Cloud layer */}
      <mesh ref={cloudsRef}>
        <sphereGeometry args={[12.2, 64, 32]} />
        <meshStandardMaterial 
          color={0xffffff}
          transparent
          opacity={0.35}
          depthWrite={false}
        />
      </mesh>

      {/* Atmospheric glow */}
      <mesh material={atmosphereMaterial}>
        <sphereGeometry args={[13.5, 32, 16]} />
      </mesh>

      {/* Additional outer glow */}
      <mesh>
        <sphereGeometry args={[14, 32, 16]} />
        <meshBasicMaterial 
          color={0x4488ff}
          transparent
          opacity={0.15}
          side={THREE.BackSide}
        />
      </mesh>
    </group>
  );
}

export function Moon() {
  const moonRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const orbitAngle = useRef(0);

  // Moon surface shader
  const moonMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: proceduralPlanetVertex,
      fragmentShader: moonFragment,
    });
  }, []);

  useFrame((state, delta) => {
    // Moon orbits Earth (relative positioning handled by parent)
    orbitAngle.current += delta * 0.15;
    
    if (groupRef.current) {
      const moonOrbitRadius = 25;
      groupRef.current.position.x = Math.cos(orbitAngle.current) * moonOrbitRadius + 80;
      groupRef.current.position.z = Math.sin(orbitAngle.current) * moonOrbitRadius - 100;
      groupRef.current.position.y = Math.sin(orbitAngle.current * 0.5) * 3 + 20;
    }

    // Moon rotation (tidally locked, slow)
    if (moonRef.current) {
      moonRef.current.rotation.y = orbitAngle.current;
    }
  });

  return (
    <group ref={groupRef} position={[100, 20, -85]}>
      <mesh ref={moonRef} material={moonMaterial}>
        <sphereGeometry args={[3, 32, 16]} />
      </mesh>
    </group>
  );
}
