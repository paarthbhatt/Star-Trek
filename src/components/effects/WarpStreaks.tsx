'use client';

import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { WarpState } from '@/hooks/useWarpDrive';

// Star Trek Kelvin/Discovery style streaks
// - Long, intense blue/white streaks
// - "Rain" effect where they pass the camera
// - Tunnel-like structure (empty center)

interface WarpStreaksProps {
  warpState: WarpState;
  warpLevel: number;
}

const STREAK_COUNT = 800; // Increased count for dense tunnel

export function WarpStreaks({ warpState, warpLevel }: WarpStreaksProps) {
  const geometryRef = useRef<THREE.BufferGeometry>(null);
  
  const { positions, velocities, offsets } = useMemo(() => {
    const positions = new Float32Array(STREAK_COUNT * 3);
    const velocities = new Float32Array(STREAK_COUNT);
    const offsets = new Float32Array(STREAK_COUNT); // Random start offset
    
    for (let i = 0; i < STREAK_COUNT; i++) {
      const i3 = i * 3;
      
      // Create a tunnel: distribute particles in a cylinder, avoiding the center
      const angle = Math.random() * Math.PI * 2;
      const minRadius = 6.0; // Slightly wider tunnel
      const maxRadius = 30.0; // Much wider spread for depth
      // Bias towards outer edge for depth, but keep some near for parallax
      const rRandom = Math.pow(Math.random(), 1.5); // Sqrt distribution pushes out
      const radius = minRadius + rRandom * (maxRadius - minRadius);
      
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      const z = (Math.random() - 0.5) * 400; // Longer spread along Z
      
      positions[i3] = x;
      positions[i3 + 1] = y;
      positions[i3 + 2] = z;
      
      velocities[i] = 1.0 + Math.random() * 2.0; // More speed variance
      offsets[i] = Math.random() * 100;
    }
    
    return { positions, velocities, offsets };
  }, []);

  const streakGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const posAttribute = new Float32Array(STREAK_COUNT * 6); // 2 points per line
    const colorAttribute = new Float32Array(STREAK_COUNT * 6);
    
    // Initialize geometry
    for (let i = 0; i < STREAK_COUNT; i++) {
       // Set initial colors (Blue/Cyan/White gradient)
       const i6 = i * 6;
       const brightness = 0.5 + Math.random() * 0.5;
       
       // Kelvin timeline blue
       const r = 0.4 * brightness;
       const g = 0.6 * brightness;
       const b = 1.0 * brightness;

       // Vertex 1 color
       colorAttribute[i6] = r;
       colorAttribute[i6+1] = g;
       colorAttribute[i6+2] = b;

       // Vertex 2 color (tail fades out, maybe shift to purple/cyan)
       colorAttribute[i6+3] = r * 0.2; // Darker tail
       colorAttribute[i6+4] = g * 0.4;
       colorAttribute[i6+5] = b * 0.8; // Keep blue dominance in tail
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(posAttribute, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colorAttribute, 3));
    
    return geometry;
  }, []);

  const intensityRef = useRef(0);

  useFrame((state, delta) => {
    if (!geometryRef.current) return;

    // Fade in/out based on warp state
    const isActive = warpState === 'accelerating' || warpState === 'cruising' || warpState === 'decelerating';
    const targetIntensity = isActive ? 1.0 : 0.0;
    
    // Fast fade in, slower fade out
    intensityRef.current = THREE.MathUtils.lerp(intensityRef.current, targetIntensity, delta * (isActive ? 5.0 : 2.0));

    if (intensityRef.current < 0.01) return;

    const positionAttr = geometryRef.current.getAttribute('position') as THREE.BufferAttribute;
    const posArray = positionAttr.array as Float32Array;

    // Speed calculation
    // "Real" warp speed feel: extremely fast
    let speed = 0;
    if (warpState === 'accelerating') speed = 100 + state.clock.elapsedTime * 50; 
    else if (warpState === 'cruising') speed = 400 + warpLevel * 50;
    else if (warpState === 'decelerating') speed = 200;

    const streakLenBase = speed * 0.05; // Streaks get longer as you go faster

    for (let i = 0; i < STREAK_COUNT; i++) {
      const i3 = i * 3; // Index for original positions
      const i6 = i * 6; // Index for line geometry positions

      // Move Z position towards camera (assuming camera looks down -Z? No, ship faces -Z)
      // Actually, standard "stars fly by" effect usually means stars move +Z relative to camera if camera faces -Z
      // Let's assume camera faces -Z. Stars start at -Z (far) and move to +Z (behind).
      
      let z = positions[i3 + 2];
      
      // Update Z based on speed
      z += speed * velocities[i] * delta;
      
      // Wrap around
      const bounds = 100;
      if (z > 20) {
        z = -200 - Math.random() * 50; // Respawn far ahead
        // Randomize XY slightly on respawn for variety
        const angle = Math.random() * Math.PI * 2;
        const radius = 4.0 + Math.random() * 10.0;
        positions[i3] = Math.cos(angle) * radius;
        positions[i3 + 1] = Math.sin(angle) * radius;
      }
      
      positions[i3 + 2] = z;

      // Update line segment geometry
      // Head
      posArray[i6] = positions[i3];
      posArray[i6+1] = positions[i3+1];
      posArray[i6+2] = z;

      // Tail (trailing behind)
      const len = streakLenBase * velocities[i] * (0.8 + Math.random() * 0.4); // Jitter length
      posArray[i6+3] = positions[i3];
      posArray[i6+4] = positions[i3+1];
      posArray[i6+5] = z - len;
    }
    
    positionAttr.needsUpdate = true;
  });

  if (intensityRef.current < 0.01) return null;

  return (
    <group>
      <lineSegments geometry={streakGeometry} frustumCulled={false}>
        <lineBasicMaterial
          vertexColors
          transparent
          opacity={intensityRef.current} // Global opacity fade
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          linewidth={1}
        />
      </lineSegments>
    </group>
  );
}