'use client';

import { useRef, useMemo, useLayoutEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { ASTEROID_BELT, KUIPER_BELT } from '@/data/destinations';
import { QualitySettings, QUALITY_PRESETS } from '@/hooks/useSettings';

interface AsteroidBeltProps {
  type?: 'main' | 'kuiper';
  qualitySettings?: QualitySettings;
}

// Reusable objects to avoid per-frame allocations (GC pressure fix)
const tempMatrix = new THREE.Matrix4();
const tempPosition = new THREE.Vector3();
const tempQuaternion = new THREE.Quaternion();
const tempScale = new THREE.Vector3();
const tempRotDelta = new THREE.Quaternion();
const tempEuler = new THREE.Euler();

export function AsteroidBelt({ type = 'main', qualitySettings }: AsteroidBeltProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const rotationRef = useRef(0);
  
  // Use quality settings for asteroid count
  const quality = qualitySettings || QUALITY_PRESETS.high;
  const baseConfig = type === 'main' ? ASTEROID_BELT : KUIPER_BELT;
  
  // Scale asteroid count based on quality settings
  const asteroidCount = type === 'main' 
    ? quality.asteroidCount 
    : Math.floor(quality.asteroidCount * 0.5); // Kuiper belt has fewer
  
  const config = { ...baseConfig, count: asteroidCount };
  
  // Generate asteroid positions and properties
  const { matrices, scales, rotationSpeeds } = useMemo(() => {
    const matrices: THREE.Matrix4[] = [];
    const scales: number[] = [];
    const rotationSpeeds: number[] = [];
    
    for (let i = 0; i < config.count; i++) {
      // Random angle around the belt
      const angle = Math.random() * Math.PI * 2;
      
      // Random radius within belt bounds (weighted toward center)
      const radiusRange = config.outerRadius - config.innerRadius;
      const radius = config.innerRadius + Math.random() * radiusRange;
      
      // Gaussian-ish distribution for vertical offset (more concentrated near plane)
      const verticalSpread = (Math.random() - 0.5) * 2;
      const y = config.centerY + verticalSpread * config.thickness * Math.pow(Math.random(), 0.5);
      
      // Position in ring
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      
      // Random scale (most asteroids are small, few are large)
      const scaleFactor = type === 'main' 
        ? 0.3 + Math.pow(Math.random(), 3) * 2.5  // 0.3 to 2.8
        : 0.2 + Math.pow(Math.random(), 4) * 1.5; // Smaller for Kuiper
      scales.push(scaleFactor);
      
      // Random rotation
      const rotX = Math.random() * Math.PI;
      const rotY = Math.random() * Math.PI;
      const rotZ = Math.random() * Math.PI;
      
      // Create matrix
      const matrix = new THREE.Matrix4();
      matrix.compose(
        new THREE.Vector3(x, y, z),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(rotX, rotY, rotZ)),
        new THREE.Vector3(scaleFactor, scaleFactor * (0.6 + Math.random() * 0.8), scaleFactor)
      );
      matrices.push(matrix);
      
      // Random rotation speed for animation
      rotationSpeeds.push((Math.random() - 0.5) * 0.02);
    }
    
    return { matrices, scales, rotationSpeeds };
  }, [config.count, config.innerRadius, config.outerRadius, config.centerY, config.thickness, type]);
  
  // Create irregular asteroid geometry
  const asteroidGeometry = useMemo(() => {
    const geo = new THREE.IcosahedronGeometry(1, 1);
    const positions = geo.attributes.position;
    
    // Deform vertices randomly to create irregular shapes
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const z = positions.getZ(i);
      
      const noise = 0.7 + Math.random() * 0.6;
      positions.setXYZ(i, x * noise, y * noise, z * noise);
    }
    
    geo.computeVertexNormals();
    return geo;
  }, []);
  
  // Initialize instance matrices
  useLayoutEffect(() => {
    if (meshRef.current) {
      matrices.forEach((matrix, i) => {
        meshRef.current!.setMatrixAt(i, matrix);
      });
      meshRef.current.instanceMatrix.needsUpdate = true;
    }
  }, [matrices]);
  
  // Animate asteroids (slow rotation of entire belt + individual tumbling)
  useFrame((state, delta) => {
    if (!meshRef.current) return;
    
    // Very slow belt rotation
    rotationRef.current += delta * 0.001;
    meshRef.current.rotation.y = rotationRef.current;
    
    // Update a subset of asteroids each frame for individual rotation
    // (updating all would be too expensive)
    const updateCount = Math.min(30, config.count); // Reduced from 50 to 30 for performance
    const startIdx = Math.floor(state.clock.elapsedTime * 10) % config.count;
    
    for (let i = 0; i < updateCount; i++) {
      const idx = (startIdx + i) % config.count;
      
      // Reuse tempMatrix instead of creating new Matrix4 each iteration
      meshRef.current.getMatrixAt(idx, tempMatrix);
      
      // Reuse temp objects for decomposition
      tempMatrix.decompose(tempPosition, tempQuaternion, tempScale);
      
      // Apply small rotation using reused objects
      tempEuler.set(
        rotationSpeeds[idx] * delta,
        rotationSpeeds[idx] * 0.7 * delta,
        rotationSpeeds[idx] * 0.5 * delta
      );
      tempRotDelta.setFromEuler(tempEuler);
      tempQuaternion.multiply(tempRotDelta);
      
      // Recompose matrix using reused objects
      tempMatrix.compose(tempPosition, tempQuaternion, tempScale);
      meshRef.current.setMatrixAt(idx, tempMatrix);
    }
    
    meshRef.current.instanceMatrix.needsUpdate = true;
  });
  
  // Material with slight color variation
  const material = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: type === 'main' ? '#6b6b6b' : '#4a4a5a',
      roughness: 0.9,
      metalness: 0.1,
      flatShading: true,
    });
  }, [type]);
  
  return (
    <instancedMesh
      ref={meshRef}
      args={[asteroidGeometry, material, config.count]}
      frustumCulled={true}
      castShadow={quality.shadowsEnabled}
      receiveShadow={false}
    />
  );
}

// Separate component for Kuiper Belt (thinner, farther, icier)
export function KuiperBelt({ qualitySettings }: { qualitySettings?: QualitySettings }) {
  return <AsteroidBelt type="kuiper" qualitySettings={qualitySettings} />;
}
