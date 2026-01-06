
'use client';

import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

// Simplified explosion shader for combat impacts
const explosionShader = {
  vertex: `
    varying vec3 vPosition;
    void main() {
      vPosition = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragment: `
    uniform float uTime;
    uniform vec3 uColor;
    varying vec3 vPosition;
    
    void main() {
      float noise = fract(sin(dot(vPosition.xy + uTime, vec2(12.9898, 78.233))) * 43758.5453);
      float alpha = 1.0 - smoothstep(0.0, 1.0, length(vPosition) + noise * 0.2);
      gl_FragColor = vec4(uColor, alpha);
    }
  `
};

export function Explosion({ position, onComplete }: { position: THREE.Vector3, onComplete?: () => void }) {
  const ref = useRef<THREE.Group>(null);
  const startTime = useRef(Date.now());
  const duration = 1000; // ms

  useFrame(() => {
    if (!ref.current) return;
    const elapsed = Date.now() - startTime.current;
    const progress = elapsed / duration;

    if (progress >= 1) {
      if (onComplete) onComplete();
      return;
    }

    const scale = 1 + progress * 5;
    ref.current.scale.setScalar(scale);
    
    // Fade out
    ref.current.children.forEach((child: any) => {
       if (child.material) {
           child.material.opacity = 1 - progress;
       }
    });
  });

  return (
    <group ref={ref} position={position}>
       <mesh>
          <sphereGeometry args={[1, 16, 16]} />
          <meshBasicMaterial color="orange" transparent opacity={1} />
       </mesh>
       <pointLight color="orange" intensity={5} distance={20} decay={2} />
    </group>
  );
}
