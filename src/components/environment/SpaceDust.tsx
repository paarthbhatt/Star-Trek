'use client';

import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

export function SpaceDust() {
  const particlesRef = useRef<THREE.Points>(null);
  const velocitiesRef = useRef<Float32Array | null>(null);

  // Generate 1000 dust particles with positions and velocities (reduced for performance)
  const positions = useMemo(() => {
    const pos = new Float32Array(1000 * 3);
    const vel = new Float32Array(1000 * 3);
    const boundarySize = 100;

    for (let i = 0; i < 1000; i++) {
      // Random positions within boundary
      pos[i * 3] = (Math.random() - 0.5) * boundarySize * 2;
      pos[i * 3 + 1] = (Math.random() - 0.5) * boundarySize * 2;
      pos[i * 3 + 2] = (Math.random() - 0.5) * boundarySize * 2;

      // Random velocities (slow drift)
      vel[i * 3] = (Math.random() - 0.5) * 0.02;
      vel[i * 3 + 1] = (Math.random() - 0.5) * 0.02;
      vel[i * 3 + 2] = (Math.random() - 0.5) * 0.02;
    }

    velocitiesRef.current = vel;
    return pos;
  }, []);

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(0x88ffff) },
        uSize: { value: 0.15 * window.devicePixelRatio }, // Adjust for pixel ratio
      },
      vertexShader: `
        uniform float uTime;
        uniform float uSize;
        attribute vec3 velocity;
        varying float vAlpha;
        
        void main() {
          vec3 pos = position + velocity * uTime;
          
          // Wrap around boundary (-100 to 100)
          float boundary = 100.0;
          pos = mod(pos + boundary, boundary * 2.0) - boundary;
          
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          
          // Size attenuation
          gl_PointSize = uSize * (300.0 / -mvPosition.z);
          
          // Fade based on distance
          vAlpha = 0.6;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        varying float vAlpha;
        
        void main() {
          // Circular particle
          vec2 center = gl_PointCoord - 0.5;
          float dist = length(center);
          if (dist > 0.5) discard;
          
          // Soft edge
          float alpha = vAlpha * (1.0 - smoothstep(0.3, 0.5, dist));
          
          gl_FragColor = vec4(uColor, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
  }, []);

  useFrame((state) => {
    if (particlesRef.current) {
      // Gentle rotation of entire system
      particlesRef.current.rotation.y = state.clock.elapsedTime * 0.01;
      particlesRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.005) * 0.1;
      
      // Update time uniform for particle movement
      (particlesRef.current.material as THREE.ShaderMaterial).uniforms.uTime.value = state.clock.elapsedTime * 20.0; // Speed multiplier
    }
  });

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    // Add velocities as attribute
    if (velocitiesRef.current) {
      geo.setAttribute('velocity', new THREE.BufferAttribute(velocitiesRef.current, 3));
    }
    return geo;
  }, [positions]);

  return (
    <points ref={particlesRef} geometry={geometry} material={material} />
  );
}
