'use client';

import { useRef, useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

interface DebrisChunk {
  id: number;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  rotation: THREE.Euler;
  rotationSpeed: THREE.Vector3;
  scale: number;
  opacity: number;
}

interface DebrisFieldProps {
  position: THREE.Vector3;
  radius: number;
  isActive: boolean;       // Whether debris is currently active
  fadeProgress?: number;   // 0-1, controls fade out
  shipPosition?: THREE.Vector3;
  onShipCollision?: () => void;  // Called when ship hits debris
}

const MAX_DEBRIS = 50;
const COLLISION_RADIUS = 3;  // Ship collision radius

export function DebrisField({
  position,
  radius,
  isActive,
  fadeProgress = 0,
  shipPosition,
  onShipCollision,
}: DebrisFieldProps) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRefs = useRef<(THREE.Mesh | null)[]>([]);
  const lastCollisionTime = useRef<number>(0);
  
  // Generate debris chunks
  const chunks = useMemo<DebrisChunk[]>(() => {
    const debrisChunks: DebrisChunk[] = [];
    
    for (let i = 0; i < MAX_DEBRIS; i++) {
      // Random position in sphere around explosion center
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = radius * (1 + Math.random() * 2);  // Spread from 1x to 3x radius
      
      const pos = new THREE.Vector3(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi)
      );
      
      // Slow drift velocity
      const driftSpeed = 0.1 + Math.random() * 0.3;
      const vel = pos.clone().normalize().multiplyScalar(driftSpeed);
      vel.x += (Math.random() - 0.5) * 0.1;
      vel.y += (Math.random() - 0.5) * 0.1;
      vel.z += (Math.random() - 0.5) * 0.1;
      
      debrisChunks.push({
        id: i,
        position: pos,
        velocity: vel,
        rotation: new THREE.Euler(
          Math.random() * Math.PI * 2,
          Math.random() * Math.PI * 2,
          Math.random() * Math.PI * 2
        ),
        rotationSpeed: new THREE.Vector3(
          (Math.random() - 0.5) * 0.5,
          (Math.random() - 0.5) * 0.5,
          (Math.random() - 0.5) * 0.5
        ),
        scale: 0.5 + Math.random() * 1.5,
        opacity: 1,
      });
    }
    
    return debrisChunks;
  }, [radius]);
  
  // Check for ship collision
  useFrame((state, delta) => {
    if (!isActive || !shipPosition || !onShipCollision) return;
    
    const now = state.clock.elapsedTime;
    
    // Cooldown between collisions (prevent rapid-fire damage)
    if (now - lastCollisionTime.current < 0.5) return;
    
    // Check each debris chunk for collision with ship
    for (let i = 0; i < meshRefs.current.length; i++) {
      const mesh = meshRefs.current[i];
      if (!mesh) continue;
      
      // Get world position of debris
      const debrisWorldPos = new THREE.Vector3();
      mesh.getWorldPosition(debrisWorldPos);
      
      // Check distance to ship
      const distance = debrisWorldPos.distanceTo(shipPosition);
      const debrisRadius = chunks[i].scale * radius * 0.08;
      
      if (distance < COLLISION_RADIUS + debrisRadius) {
        onShipCollision();
        lastCollisionTime.current = now;
        break;  // Only one collision per frame
      }
    }
  });
  
  // Animate debris
  useFrame((state, delta) => {
    if (!groupRef.current || !isActive) return;
    
    const time = state.clock.elapsedTime;
    
    meshRefs.current.forEach((mesh, i) => {
      if (!mesh || !chunks[i]) return;
      
      const chunk = chunks[i];
      
      // Update position with drift
      chunk.position.add(chunk.velocity.clone().multiplyScalar(delta));
      mesh.position.copy(chunk.position);
      
      // Rotate
      mesh.rotation.x += chunk.rotationSpeed.x * delta;
      mesh.rotation.y += chunk.rotationSpeed.y * delta;
      mesh.rotation.z += chunk.rotationSpeed.z * delta;
      
      // Update material opacity for fade out
      if (mesh.material instanceof THREE.MeshStandardMaterial) {
        mesh.material.opacity = (1 - fadeProgress) * 0.9;
      }
    });
  });
  
  if (!isActive) {
    return null;
  }
  
  return (
    <group ref={groupRef} position={position.toArray()}>
      {chunks.map((chunk, i) => (
        <mesh
          key={chunk.id}
          ref={(el) => { meshRefs.current[i] = el; }}
          position={chunk.position.toArray()}
          rotation={chunk.rotation}
          scale={chunk.scale * radius * 0.08}
        >
          <icosahedronGeometry args={[1, 0]} />
          <meshStandardMaterial
            color={i % 4 === 0 ? '#5a4a3a' : i % 4 === 1 ? '#4a3a2a' : i % 4 === 2 ? '#6a5a4a' : '#3a2a1a'}
            emissive={i % 3 === 0 ? '#ff4400' : '#441100'}
            emissiveIntensity={fadeProgress < 0.5 ? 0.3 : 0.3 * (1 - (fadeProgress - 0.5) * 2)}
            roughness={0.9}
            metalness={0.1}
            transparent
            opacity={1 - fadeProgress * 0.9}
          />
        </mesh>
      ))}
      
      {/* Ambient glow in debris field */}
      <pointLight
        color={0xff6600}
        intensity={(1 - fadeProgress) * 20}
        distance={radius * 4}
        decay={2}
      />
      
      {/* Dust particles */}
      <DebrisDust 
        radius={radius} 
        opacity={1 - fadeProgress}
      />
    </group>
  );
}

// Floating dust particles in debris field
function DebrisDust({ radius, opacity }: { radius: number; opacity: number }) {
  const pointsRef = useRef<THREE.Points>(null);
  
  const { positions, colors } = useMemo(() => {
    const count = 200;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    
    for (let i = 0; i < count; i++) {
      // Random position in sphere
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = radius * (0.5 + Math.random() * 2.5);
      
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
      
      // Gray-brown dust colors
      const brightness = 0.3 + Math.random() * 0.3;
      colors[i * 3] = brightness;
      colors[i * 3 + 1] = brightness * 0.8;
      colors[i * 3 + 2] = brightness * 0.6;
    }
    
    return { positions, colors };
  }, [radius]);
  
  // Slowly drift particles
  useFrame((state, delta) => {
    if (!pointsRef.current) return;
    
    const posAttr = pointsRef.current.geometry.attributes.position as THREE.BufferAttribute;
    const posArray = posAttr.array as Float32Array;
    
    for (let i = 0; i < posArray.length; i += 3) {
      // Gentle drift
      const drift = Math.sin(state.clock.elapsedTime + i) * 0.02;
      posArray[i] += drift * delta;
      posArray[i + 1] += drift * 0.5 * delta;
      posArray[i + 2] += drift * 0.7 * delta;
    }
    
    posAttr.needsUpdate = true;
  });
  
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
        size={radius * 0.02}
        vertexColors
        transparent
        opacity={opacity * 0.4}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  );
}

export default DebrisField;
