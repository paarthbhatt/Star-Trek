'use client';

import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

interface Meteor {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  length: number;
  brightness: number;
  lifetime: number;
  maxLifetime: number;
  active: boolean;
}

interface MeteorShowerProps {
  count?: number;
  spawnRate?: number; // Meteors per second
  radius?: number;    // Spawn sphere radius
  speed?: number;     // Base meteor speed
}

export function MeteorShower({ 
  count = 50, 
  spawnRate = 2, 
  radius = 3000,
  speed = 200 
}: MeteorShowerProps) {
  const meteorsRef = useRef<Meteor[]>([]);
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const trailMeshRef = useRef<THREE.InstancedMesh>(null);
  const lastSpawnRef = useRef(0);
  
  // Initialize meteor pool
  useMemo(() => {
    meteorsRef.current = Array.from({ length: count }, () => ({
      position: new THREE.Vector3(),
      velocity: new THREE.Vector3(),
      length: 0,
      brightness: 0,
      lifetime: 0,
      maxLifetime: 0,
      active: false,
    }));
  }, [count]);
  
  // Meteor geometry (elongated shape for trail effect)
  const meteorGeometry = useMemo(() => {
    // Cone shape for meteor head
    return new THREE.ConeGeometry(0.5, 3, 8);
  }, []);
  
  // Trail geometry (longer, thinner)
  const trailGeometry = useMemo(() => {
    return new THREE.CylinderGeometry(0.1, 0.3, 15, 6);
  }, []);
  
  // Glowing material
  const meteorMaterial = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: 0xffffaa,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
    });
  }, []);
  
  const trailMaterial = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: 0xff8844,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
    });
  }, []);
  
  // Spawn a new meteor
  const spawnMeteor = (meteor: Meteor) => {
    // Random position on sphere
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    
    meteor.position.set(
      radius * Math.sin(phi) * Math.cos(theta),
      radius * Math.sin(phi) * Math.sin(theta),
      radius * Math.cos(phi)
    );
    
    // Velocity toward center (with some randomness)
    const targetOffset = new THREE.Vector3(
      (Math.random() - 0.5) * radius * 0.5,
      (Math.random() - 0.5) * radius * 0.5,
      (Math.random() - 0.5) * radius * 0.5
    );
    
    meteor.velocity.copy(meteor.position)
      .negate()
      .add(targetOffset)
      .normalize()
      .multiplyScalar(speed + Math.random() * speed * 0.5);
    
    meteor.length = 5 + Math.random() * 15;
    meteor.brightness = 0.5 + Math.random() * 0.5;
    meteor.lifetime = 0;
    meteor.maxLifetime = 2 + Math.random() * 4; // 2-6 seconds
    meteor.active = true;
  };
  
  useFrame((state, delta) => {
    if (!meshRef.current || !trailMeshRef.current) return;
    
    const time = state.clock.elapsedTime;
    
    // Spawn new meteors based on spawn rate
    if (time - lastSpawnRef.current > 1 / spawnRate) {
      lastSpawnRef.current = time;
      
      // Find inactive meteor to spawn
      const inactiveMeteor = meteorsRef.current.find(m => !m.active);
      if (inactiveMeteor) {
        spawnMeteor(inactiveMeteor);
      }
    }
    
    // Update all meteors
    const tempMatrix = new THREE.Matrix4();
    const tempQuaternion = new THREE.Quaternion();
    const upVector = new THREE.Vector3(0, 1, 0);
    
    meteorsRef.current.forEach((meteor, i) => {
      if (!meteor.active) {
        // Hide inactive meteors
        tempMatrix.makeScale(0, 0, 0);
        meshRef.current!.setMatrixAt(i, tempMatrix);
        trailMeshRef.current!.setMatrixAt(i, tempMatrix);
        return;
      }
      
      // Update position
      meteor.position.addScaledVector(meteor.velocity, delta);
      meteor.lifetime += delta;
      
      // Check if meteor should die
      if (meteor.lifetime > meteor.maxLifetime || meteor.position.length() < 100) {
        meteor.active = false;
        tempMatrix.makeScale(0, 0, 0);
        meshRef.current!.setMatrixAt(i, tempMatrix);
        trailMeshRef.current!.setMatrixAt(i, tempMatrix);
        return;
      }
      
      // Calculate fade based on lifetime
      const fadeIn = Math.min(meteor.lifetime / 0.3, 1);
      const fadeOut = Math.max(0, 1 - (meteor.lifetime - meteor.maxLifetime + 0.5) / 0.5);
      const fade = fadeIn * fadeOut * meteor.brightness;
      
      // Orient meteor along velocity vector
      tempQuaternion.setFromUnitVectors(upVector, meteor.velocity.clone().normalize());
      
      // Scale based on brightness/fade
      const scale = fade * (0.5 + meteor.brightness * 0.5);
      
      // Meteor head
      tempMatrix.compose(
        meteor.position,
        tempQuaternion,
        new THREE.Vector3(scale, scale * 2, scale)
      );
      meshRef.current!.setMatrixAt(i, tempMatrix);
      
      // Trail (behind the meteor)
      const trailPos = meteor.position.clone().addScaledVector(
        meteor.velocity.clone().normalize(), 
        -meteor.length * scale
      );
      tempMatrix.compose(
        trailPos,
        tempQuaternion,
        new THREE.Vector3(scale * 0.5, meteor.length * scale, scale * 0.5)
      );
      trailMeshRef.current!.setMatrixAt(i, tempMatrix);
    });
    
    meshRef.current.instanceMatrix.needsUpdate = true;
    trailMeshRef.current.instanceMatrix.needsUpdate = true;
  });
  
  return (
    <group>
      {/* Meteor heads */}
      <instancedMesh
        ref={meshRef}
        args={[meteorGeometry, meteorMaterial, count]}
        frustumCulled={false}
      />
      
      {/* Meteor trails */}
      <instancedMesh
        ref={trailMeshRef}
        args={[trailGeometry, trailMaterial, count]}
        frustumCulled={false}
      />
    </group>
  );
}
