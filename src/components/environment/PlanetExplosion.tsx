'use client';

import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

// Explosion shockwave shader
const shockwaveVertexShader = `
  varying vec2 vUv;
  
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const shockwaveFragmentShader = `
  uniform float uProgress;
  uniform float uOpacity;
  uniform vec3 uColor;
  
  varying vec2 vUv;
  
  void main() {
    vec2 center = vec2(0.5, 0.5);
    float dist = distance(vUv, center) * 2.0;
    
    // Ring shape
    float ringWidth = 0.15;
    float ringEdge = smoothstep(uProgress - ringWidth, uProgress, dist);
    float ring = ringEdge * (1.0 - smoothstep(uProgress, uProgress + ringWidth * 0.5, dist));
    
    // Fade at edges
    float fade = 1.0 - smoothstep(0.4, 0.5, dist);
    
    float alpha = ring * fade * uOpacity;
    
    gl_FragColor = vec4(uColor, alpha);
  }
`;

// Core explosion glow shader
const coreGlowVertexShader = `
  varying vec3 vPosition;
  varying vec3 vNormal;
  
  void main() {
    vPosition = position;
    vNormal = normal;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const coreGlowFragmentShader = `
  uniform float uProgress;
  uniform float uIntensity;
  uniform vec3 uCoreColor;
  uniform vec3 uOuterColor;
  
  varying vec3 vPosition;
  varying vec3 vNormal;
  
  void main() {
    float dist = length(vPosition);
    
    // Core glow falloff
    float glow = 1.0 - smoothstep(0.0, 1.0, dist);
    glow = pow(glow, 2.0);
    
    // Mix core and outer colors
    vec3 color = mix(uOuterColor, uCoreColor, glow);
    
    // Intensity based on progress
    float alpha = glow * uIntensity;
    
    gl_FragColor = vec4(color, alpha);
  }
`;

interface PlanetExplosionProps {
  position: THREE.Vector3;
  radius: number;
  progress: number;  // 0-1 explosion progress
  onComplete?: () => void;
}

export function PlanetExplosion({ 
  position, 
  radius, 
  progress,
}: PlanetExplosionProps) {
  const groupRef = useRef<THREE.Group>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const shockwaveRef = useRef<THREE.Mesh>(null);
  const chunksRef = useRef<THREE.Group>(null);
  const flashRef = useRef<THREE.PointLight>(null);
  
  // Phase timing (normalized 0-1):
  // 0.00 - 0.15: Bright core flash (expanding sphere)
  // 0.15 - 0.40: Surface fractures, chunks separate outward
  // 0.40 - 0.75: Core explosion, shockwave ring
  // 0.75 - 1.00: Fade to debris field
  
  // Create explosion chunks
  const chunks = useMemo(() => {
    const chunkData: { 
      position: THREE.Vector3; 
      velocity: THREE.Vector3; 
      rotation: THREE.Euler;
      rotationSpeed: THREE.Vector3;
      scale: number;
    }[] = [];
    
    const numChunks = 24;
    for (let i = 0; i < numChunks; i++) {
      // Random position on sphere surface
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      
      const x = Math.sin(phi) * Math.cos(theta);
      const y = Math.sin(phi) * Math.sin(theta);
      const z = Math.cos(phi);
      
      const pos = new THREE.Vector3(x, y, z).multiplyScalar(radius * 0.8);
      
      // Velocity pointing outward with some randomness
      const vel = pos.clone().normalize().multiplyScalar(
        radius * (1.5 + Math.random() * 2)
      );
      vel.x += (Math.random() - 0.5) * radius * 0.5;
      vel.y += (Math.random() - 0.5) * radius * 0.5;
      vel.z += (Math.random() - 0.5) * radius * 0.5;
      
      chunkData.push({
        position: pos,
        velocity: vel,
        rotation: new THREE.Euler(
          Math.random() * Math.PI * 2,
          Math.random() * Math.PI * 2,
          Math.random() * Math.PI * 2
        ),
        rotationSpeed: new THREE.Vector3(
          (Math.random() - 0.5) * 5,
          (Math.random() - 0.5) * 5,
          (Math.random() - 0.5) * 5
        ),
        scale: 0.3 + Math.random() * 0.7,
      });
    }
    
    return chunkData;
  }, [radius]);
  
  // Shockwave uniforms
  const shockwaveUniforms = useMemo(() => ({
    uProgress: { value: 0 },
    uOpacity: { value: 0 },
    uColor: { value: new THREE.Color(1, 0.6, 0.2) },
  }), []);
  
  // Core glow uniforms
  const coreUniforms = useMemo(() => ({
    uProgress: { value: 0 },
    uIntensity: { value: 0 },
    uCoreColor: { value: new THREE.Color(1, 1, 0.9) },
    uOuterColor: { value: new THREE.Color(1, 0.4, 0) },
  }), []);
  
  useFrame((state, delta) => {
    if (!groupRef.current) return;
    
    const p = progress;
    
    // Phase 1: Core flash (0 - 0.15)
    if (p < 0.15) {
      const phaseProgress = p / 0.15;
      
      // Expanding core
      if (coreRef.current) {
        const scale = 0.5 + phaseProgress * 2;
        coreRef.current.scale.setScalar(scale);
        coreUniforms.uIntensity.value = 1;
      }
      
      // Bright flash
      if (flashRef.current) {
        flashRef.current.intensity = 500 * (1 - phaseProgress * 0.3);
      }
    }
    
    // Phase 2: Chunks separate (0.15 - 0.40)
    if (p >= 0.15 && p < 0.40) {
      const phaseProgress = (p - 0.15) / 0.25;
      
      // Core shrinks slightly
      if (coreRef.current) {
        const scale = 2.5 - phaseProgress * 0.5;
        coreRef.current.scale.setScalar(scale);
        coreUniforms.uIntensity.value = 1 - phaseProgress * 0.2;
      }
      
      // Flash dims
      if (flashRef.current) {
        flashRef.current.intensity = 350 * (1 - phaseProgress * 0.5);
      }
    }
    
    // Phase 3: Core explosion + shockwave (0.40 - 0.75)
    if (p >= 0.40 && p < 0.75) {
      const phaseProgress = (p - 0.40) / 0.35;
      
      // Core expands rapidly then fades
      if (coreRef.current) {
        const scale = 2 + phaseProgress * 4;
        coreRef.current.scale.setScalar(scale);
        coreUniforms.uIntensity.value = 0.8 * (1 - phaseProgress);
      }
      
      // Shockwave expands
      shockwaveUniforms.uProgress.value = phaseProgress;
      shockwaveUniforms.uOpacity.value = (1 - phaseProgress) * 0.8;
      
      // Flash continues to dim
      if (flashRef.current) {
        flashRef.current.intensity = 175 * (1 - phaseProgress);
      }
    }
    
    // Phase 4: Fade to debris (0.75 - 1.0)
    if (p >= 0.75) {
      const phaseProgress = (p - 0.75) / 0.25;
      
      // Core fades out
      if (coreRef.current) {
        const scale = 6 + phaseProgress * 2;
        coreRef.current.scale.setScalar(scale);
        coreUniforms.uIntensity.value = 0.2 * (1 - phaseProgress);
      }
      
      // Shockwave fades
      shockwaveUniforms.uOpacity.value = 0.2 * (1 - phaseProgress);
      
      // Flash off
      if (flashRef.current) {
        flashRef.current.intensity = 0;
      }
    }
    
    // Update chunks throughout all phases (start moving at phase 2)
    if (chunksRef.current && p >= 0.15) {
      const chunkProgress = Math.min((p - 0.15) / 0.85, 1);
      
      chunksRef.current.children.forEach((child, i) => {
        if (child instanceof THREE.Mesh && chunks[i]) {
          const chunk = chunks[i];
          
          // Position based on velocity and progress
          const easeProgress = 1 - Math.pow(1 - chunkProgress, 2); // Ease out
          child.position.copy(chunk.position).add(
            chunk.velocity.clone().multiplyScalar(easeProgress)
          );
          
          // Rotation
          child.rotation.x = chunk.rotation.x + chunk.rotationSpeed.x * chunkProgress * 2;
          child.rotation.y = chunk.rotation.y + chunk.rotationSpeed.y * chunkProgress * 2;
          child.rotation.z = chunk.rotation.z + chunk.rotationSpeed.z * chunkProgress * 2;
          
          // Fade opacity after phase 3
          if (child.material instanceof THREE.MeshStandardMaterial) {
            if (p > 0.75) {
              const fadeProgress = (p - 0.75) / 0.25;
              child.material.opacity = 1 - fadeProgress * 0.5;
            }
          }
        }
      });
    }
  });
  
  // Don't render if explosion is complete
  if (progress >= 1) {
    return null;
  }
  
  return (
    <group ref={groupRef} position={position.toArray()}>
      {/* Core explosion glow */}
      <mesh ref={coreRef}>
        <sphereGeometry args={[radius * 0.5, 32, 32]} />
        <shaderMaterial
          vertexShader={coreGlowVertexShader}
          fragmentShader={coreGlowFragmentShader}
          uniforms={coreUniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
        />
      </mesh>
      
      {/* Shockwave ring */}
      <mesh ref={shockwaveRef} rotation={[0, 0, 0]} scale={[radius * 6, radius * 6, 1]}>
        <planeGeometry args={[2, 2, 1, 1]} />
        <shaderMaterial
          vertexShader={shockwaveVertexShader}
          fragmentShader={shockwaveFragmentShader}
          uniforms={shockwaveUniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
        />
      </mesh>
      
      {/* Second shockwave at different angle */}
      <mesh rotation={[Math.PI / 2, 0, 0]} scale={[radius * 6, radius * 6, 1]}>
        <planeGeometry args={[2, 2, 1, 1]} />
        <shaderMaterial
          vertexShader={shockwaveVertexShader}
          fragmentShader={shockwaveFragmentShader}
          uniforms={shockwaveUniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
        />
      </mesh>
      
      {/* Third shockwave at another angle for 3D effect */}
      <mesh rotation={[Math.PI / 4, Math.PI / 4, 0]} scale={[radius * 6, radius * 6, 1]}>
        <planeGeometry args={[2, 2, 1, 1]} />
        <shaderMaterial
          vertexShader={shockwaveVertexShader}
          fragmentShader={shockwaveFragmentShader}
          uniforms={shockwaveUniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
        />
      </mesh>
      
      {/* Explosion chunks (planet fragments) */}
      <group ref={chunksRef}>
        {chunks.map((chunk, i) => (
          <mesh
            key={i}
            position={chunk.position.toArray()}
            rotation={chunk.rotation}
            scale={chunk.scale * radius * 0.15}
          >
            <icosahedronGeometry args={[1, 0]} />
            <meshStandardMaterial
              color={i % 3 === 0 ? '#ff6600' : i % 3 === 1 ? '#884400' : '#442200'}
              emissive={i % 2 === 0 ? '#ff4400' : '#ff2200'}
              emissiveIntensity={progress < 0.5 ? 2 : 2 * (1 - (progress - 0.5) * 2)}
              roughness={0.8}
              metalness={0.2}
              transparent
              opacity={1}
            />
          </mesh>
        ))}
      </group>
      
      {/* Bright point light for illumination */}
      <pointLight
        ref={flashRef}
        color={0xffaa44}
        intensity={500}
        distance={radius * 20}
        decay={2}
      />
      
      {/* Secondary colored lights */}
      <pointLight
        color={0xff4400}
        intensity={progress < 0.5 ? 100 : 100 * (1 - (progress - 0.5) * 2)}
        distance={radius * 10}
        decay={2}
      />
      <pointLight
        color={0xffff88}
        intensity={progress < 0.3 ? 200 : 200 * (1 - (progress - 0.3) * 1.5)}
        distance={radius * 8}
        decay={2}
      />
      
      {/* Particle sparks */}
      <ExplosionSparks radius={radius} progress={progress} />
    </group>
  );
}

// Particle sparks that fly outward
function ExplosionSparks({ radius, progress }: { radius: number; progress: number }) {
  const pointsRef = useRef<THREE.Points>(null);
  
  const { positions, velocities, colors } = useMemo(() => {
    const count = 100;
    const positions = new Float32Array(count * 3);
    const velocities: THREE.Vector3[] = [];
    const colors = new Float32Array(count * 3);
    
    for (let i = 0; i < count; i++) {
      // Start at center
      positions[i * 3] = 0;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = 0;
      
      // Random outward velocity
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const speed = radius * (2 + Math.random() * 4);
      
      velocities.push(new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta) * speed,
        Math.sin(phi) * Math.sin(theta) * speed,
        Math.cos(phi) * speed
      ));
      
      // Orange-yellow colors
      const t = Math.random();
      colors[i * 3] = 1;
      colors[i * 3 + 1] = 0.3 + t * 0.5;
      colors[i * 3 + 2] = t * 0.3;
    }
    
    return { positions, velocities, colors };
  }, [radius]);
  
  useFrame(() => {
    if (!pointsRef.current) return;
    
    const posAttr = pointsRef.current.geometry.attributes.position as THREE.BufferAttribute;
    const posArray = posAttr.array as Float32Array;
    
    for (let i = 0; i < velocities.length; i++) {
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      posArray[i * 3] = velocities[i].x * easeProgress;
      posArray[i * 3 + 1] = velocities[i].y * easeProgress;
      posArray[i * 3 + 2] = velocities[i].z * easeProgress;
    }
    
    posAttr.needsUpdate = true;
  });
  
  // Fade out during final phase
  const opacity = progress > 0.7 ? (1 - progress) / 0.3 : 1;
  
  if (progress < 0.1) return null;
  
  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
        <bufferAttribute
          attach="attributes-color"
          args={[colors, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={radius * 0.1}
        vertexColors
        transparent
        opacity={opacity}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        sizeAttenuation
      />
    </points>
  );
}

export default PlanetExplosion;
