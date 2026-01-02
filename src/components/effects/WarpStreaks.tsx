'use client';

import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { WarpState } from '@/hooks/useWarpDrive';

interface WarpStreaksProps {
  warpState: WarpState;
  warpLevel: number;
}

const STREAK_COUNT = 80; // Reduced from 200 for better performance and less visual chaos

// JJ Abrams style - smooth motion blur streaks
export function WarpStreaks({ warpState, warpLevel }: WarpStreaksProps) {
  const geometryRef = useRef<THREE.BufferGeometry>(null);
  
  const { positions, velocities } = useMemo(() => {
    const positions = new Float32Array(STREAK_COUNT * 3);
    const velocities = new Float32Array(STREAK_COUNT);
    
    for (let i = 0; i < STREAK_COUNT; i++) {
      const i3 = i * 3;
      const angle = Math.random() * Math.PI * 2;
      const radius = 1.5 + Math.random() * 3.5; // Increased from 0.8-3.3 to 1.5-5.0 to keep clear of ship
      const z = (Math.random() - 0.5) * 20;
      
      positions[i3] = Math.cos(angle) * radius;
      positions[i3 + 1] = Math.sin(angle) * radius;
      positions[i3 + 2] = z;
      velocities[i] = 0.8 + Math.random() * 0.4;
    }
    
    return { positions, velocities };
  }, []);

  const streakGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const streakPositions = new Float32Array(STREAK_COUNT * 6);
    const colors = new Float32Array(STREAK_COUNT * 6);
    
    for (let i = 0; i < STREAK_COUNT; i++) {
      const i6 = i * 6;
      const i3 = i * 3;
      
      streakPositions[i6] = positions[i3];
      streakPositions[i6 + 1] = positions[i3 + 1];
      streakPositions[i6 + 2] = positions[i3 + 2];
      streakPositions[i6 + 3] = positions[i3];
      streakPositions[i6 + 4] = positions[i3 + 1];
      streakPositions[i6 + 5] = positions[i3 + 2] + 0.1;
      
      // Bright white to blue streaks
      const brightness = 0.5 + Math.random() * 0.5;
      colors[i6] = brightness; colors[i6 + 1] = brightness; colors[i6 + 2] = 1.0;
      colors[i6 + 3] = 0.4; colors[i6 + 4] = 0.6; colors[i6 + 5] = 1.0;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(streakPositions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    return geometry;
  }, [positions]);

  const isActive = warpState === 'accelerating' || warpState === 'cruising' || warpState === 'decelerating';
  const intensityRef = useRef(0);

  useFrame((_, delta) => {
    if (!geometryRef.current) return;

    const targetIntensity = isActive ? 1 : 0;
    intensityRef.current = THREE.MathUtils.lerp(intensityRef.current, targetIntensity, delta * 5);

    if (intensityRef.current < 0.01) return;

    const positionAttr = geometryRef.current.getAttribute('position') as THREE.BufferAttribute;
    const streakPositions = positionAttr.array as Float32Array;
    
    // Smooth, stable speed
    const baseSpeed = warpState === 'cruising' ? 12 + warpLevel * 2 : 6;
    const streakLength = 0.3 + (baseSpeed * 0.03);

    for (let i = 0; i < STREAK_COUNT; i++) {
      const i6 = i * 6;
      const i3 = i * 3;
      
      const speed = baseSpeed * velocities[i];
      positions[i3 + 2] -= speed * delta;
      
      // Recycle streaks smoothly
      if (positions[i3 + 2] < -10) {
        positions[i3 + 2] = 10 + Math.random() * 5;
        const angle = Math.random() * Math.PI * 2;
        const radius = 1.5 + Math.random() * 3.5; // Increased from 0.8-3.3 to 1.5-5.0 to keep clear of ship
        positions[i3] = Math.cos(angle) * radius;
        positions[i3 + 1] = Math.sin(angle) * radius;
      }
      
      streakPositions[i6] = positions[i3];
      streakPositions[i6 + 1] = positions[i3 + 1];
      streakPositions[i6 + 2] = positions[i3 + 2];
      streakPositions[i6 + 3] = positions[i3];
      streakPositions[i6 + 4] = positions[i3 + 1];
      streakPositions[i6 + 5] = positions[i3 + 2] + streakLength;
    }
    
    positionAttr.needsUpdate = true;
  });

  if (intensityRef.current < 0.01 && !isActive) return null;

  return (
    <group>
      <lineSegments geometry={streakGeometry} frustumCulled={false}>
        <lineBasicMaterial
          vertexColors
          transparent
          opacity={intensityRef.current * 0.6}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          linewidth={1}
        />
      </lineSegments>
      <primitive object={streakGeometry} ref={geometryRef} />
    </group>
  );
}
