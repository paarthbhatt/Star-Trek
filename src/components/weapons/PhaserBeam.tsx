'use client';

import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

// Phaser beam shader for the glowing effect
const phaserVertexShader = `
  varying vec2 vUv;
  varying vec3 vPosition;
  
  void main() {
    vUv = uv;
    vPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const phaserFragmentShader = `
  uniform float uTime;
  uniform float uIntensity;
  uniform vec3 uColorInner;
  uniform vec3 uColorOuter;
  
  varying vec2 vUv;
  varying vec3 vPosition;
  
  void main() {
    // Create a gradient from center to edge
    float distFromCenter = abs(vUv.y - 0.5) * 2.0;
    
    // Pulsing effect
    float pulse = sin(uTime * 20.0) * 0.1 + 0.9;
    
    // Flickering along the beam
    float flicker = sin(vUv.x * 50.0 + uTime * 30.0) * 0.1 + 0.9;
    
    // Mix colors based on distance from center
    vec3 color = mix(uColorInner, uColorOuter, distFromCenter);
    
    // Calculate alpha - bright in center, fades at edges
    float alpha = (1.0 - distFromCenter) * uIntensity * pulse * flicker;
    alpha = pow(alpha, 0.5); // Make falloff less harsh
    
    gl_FragColor = vec4(color, alpha);
  }
`;

interface PhaserBeamProps {
  startPosition: THREE.Vector3;  // Ship phaser bank position (world coords)
  endPosition: THREE.Vector3;    // Target position (world coords)
  active: boolean;
  intensity?: number;            // 0-1, based on phaser charge
}

export function PhaserBeam({ startPosition, endPosition, active, intensity = 1 }: PhaserBeamProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  
  // Current intensity for smooth transitions
  const currentIntensity = useRef(0);
  
  // Shader uniforms
  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uIntensity: { value: 0 },
    uColorInner: { value: new THREE.Color(1.0, 0.9, 0.7) },  // Bright yellow-white core
    uColorOuter: { value: new THREE.Color(1.0, 0.4, 0.1) },  // Orange edge
  }), []);
  
  useFrame((state, delta) => {
    if (!meshRef.current || !materialRef.current) return;
    
    // Smooth intensity transition
    const targetIntensity = active ? intensity : 0;
    currentIntensity.current = THREE.MathUtils.lerp(
      currentIntensity.current,
      targetIntensity,
      delta * (active ? 15 : 8) // Fast on, medium off
    );
    
    // Update uniforms
    uniforms.uTime.value = state.clock.elapsedTime;
    uniforms.uIntensity.value = currentIntensity.current;
    
    // Calculate beam geometry
    const direction = endPosition.clone().sub(startPosition);
    const length = direction.length();
    const midpoint = startPosition.clone().add(direction.multiplyScalar(0.5));
    
    // Position and orient the beam
    meshRef.current.position.copy(midpoint);
    meshRef.current.lookAt(endPosition);
    meshRef.current.rotateX(Math.PI / 2); // Align cylinder with beam direction
    
    // Scale to beam length
    meshRef.current.scale.set(1, length, 1);
    
    // Update glow
    if (glowRef.current) {
      glowRef.current.position.copy(midpoint);
      glowRef.current.lookAt(endPosition);
      glowRef.current.rotateX(Math.PI / 2);
      glowRef.current.scale.set(1, length, 1);
    }
  });
  
  // Don't render if completely invisible
  if (currentIntensity.current < 0.01 && !active) return null;
  
  return (
    <group>
      {/* Main beam */}
      <mesh ref={meshRef}>
        <cylinderGeometry args={[0.15, 0.15, 1, 8, 1, true]} />
        <shaderMaterial
          ref={materialRef}
          vertexShader={phaserVertexShader}
          fragmentShader={phaserFragmentShader}
          uniforms={uniforms}
          transparent
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      
      {/* Outer glow */}
      <mesh ref={glowRef}>
        <cylinderGeometry args={[0.4, 0.4, 1, 8, 1, true]} />
        <meshBasicMaterial
          color={0xff6622}
          transparent
          opacity={currentIntensity.current * 0.3}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      
      {/* Point light at beam origin for glow effect */}
      {active && (
        <pointLight
          position={startPosition.toArray()}
          color={0xff6622}
          intensity={currentIntensity.current * 30}
          distance={30}
          decay={2}
        />
      )}
      
      {/* Point light at impact for glow effect */}
      {active && (
        <pointLight
          position={endPosition.toArray()}
          color={0xff4400}
          intensity={currentIntensity.current * 50}
          distance={40}
          decay={2}
        />
      )}
    </group>
  );
}

// Impact effect at the target
interface PhaserImpactProps {
  position: THREE.Vector3;
  active: boolean;
  planetRadius: number;
}

export function PhaserImpact({ position, active, planetRadius }: PhaserImpactProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const intensityRef = useRef(0);
  
  useFrame((state, delta) => {
    if (!meshRef.current) return;
    
    // Smooth intensity
    const target = active ? 1 : 0;
    intensityRef.current = THREE.MathUtils.lerp(intensityRef.current, target, delta * 10);
    
    // Pulsing scale
    const pulse = Math.sin(state.clock.elapsedTime * 15) * 0.2 + 1;
    const scale = (2 + planetRadius * 0.1) * pulse * intensityRef.current;
    meshRef.current.scale.setScalar(scale);
    
    // Always face camera
    meshRef.current.lookAt(state.camera.position);
  });
  
  if (intensityRef.current < 0.01 && !active) return null;
  
  return (
    <mesh ref={meshRef} position={position.toArray()}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial
        color={0xff6622}
        transparent
        opacity={intensityRef.current * 0.8}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}
