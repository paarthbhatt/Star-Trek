'use client';

import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { WarpState } from '@/hooks/useWarpDrive';

// Star Trek movie style warp bubble - elongated field effect
const warpBubbleVertexShader = `
  uniform float uStretch;
  uniform float uTime;
  
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec2 vUv;
  
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vUv = uv;
    
    // Stretch the bubble along Z axis during warp
    vec3 pos = position;
    pos.z *= uStretch;
    
    // Add subtle wave distortion
    float wave = sin(pos.z * 3.0 + uTime * 2.0) * 0.05 * (uStretch - 1.0);
    pos.x += wave * normal.x;
    pos.y += wave * normal.y;
    
    vPosition = pos;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const warpBubbleFragmentShader = `
  uniform float uTime;
  uniform float uIntensity;
  uniform vec3 uColor;
  uniform float uStretch;
  
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec2 vUv;
  
  void main() {
    vec3 viewDirection = normalize(cameraPosition - vPosition);
    
    // Fresnel effect - brighter at edges
    float fresnel = pow(1.0 - abs(dot(viewDirection, vNormal)), 2.0);
    
    // Flowing energy pattern along the bubble
    float flow = sin(vPosition.z * 5.0 - uTime * 8.0) * 0.5 + 0.5;
    float flow2 = sin(vPosition.z * 8.0 + uTime * 12.0) * 0.5 + 0.5;
    float energyPattern = mix(flow, flow2, 0.5);
    
    // Pulse effect
    float pulse = 0.8 + sin(uTime * 3.0) * 0.2;
    
    // Combine effects
    float alpha = fresnel * uIntensity * pulse * (0.3 + energyPattern * 0.4);
    
    // Color gradient - blue core with white edges
    vec3 coreColor = uColor;
    vec3 edgeColor = vec3(0.9, 0.95, 1.0);
    vec3 color = mix(coreColor, edgeColor, fresnel * 0.5);
    
    // Add bright streaks during high warp
    float streak = pow(abs(sin(vPosition.z * 20.0 - uTime * 30.0)), 8.0);
    color += vec3(1.0) * streak * 0.3 * (uStretch - 1.0);
    
    gl_FragColor = vec4(color, alpha);
  }
`;

// Inner glow effect
const innerGlowFragmentShader = `
  uniform float uTime;
  uniform float uIntensity;
  uniform vec3 uColor;
  
  varying vec3 vNormal;
  varying vec3 vPosition;
  
  void main() {
    vec3 viewDirection = normalize(cameraPosition - vPosition);
    
    // Inverse fresnel for inner glow
    float fresnel = pow(abs(dot(viewDirection, vNormal)), 1.5);
    
    // Pulsing core
    float pulse = 0.7 + sin(uTime * 4.0) * 0.3;
    
    float alpha = fresnel * uIntensity * pulse * 0.2;
    
    vec3 color = uColor * 1.5;
    
    gl_FragColor = vec4(color, alpha);
  }
`;

interface WarpBubbleProps {
  warpState: WarpState;
  warpLevel: number;
  visible: boolean;
}

export function WarpBubble({ warpState, warpLevel, visible }: WarpBubbleProps) {
  const outerMeshRef = useRef<THREE.Mesh>(null);
  const innerMeshRef = useRef<THREE.Mesh>(null);
  const outerMaterialRef = useRef<THREE.ShaderMaterial>(null);
  const innerMaterialRef = useRef<THREE.ShaderMaterial>(null);

  // Target values based on warp state
  const targets = useMemo(() => {
    switch (warpState) {
      case 'charging': 
        return { intensity: 0.3, stretch: 1.0 };
      case 'accelerating': 
        return { intensity: 0.8, stretch: 1.5 + warpLevel * 0.2 };
      case 'cruising': 
        return { intensity: 0.6, stretch: 2.0 + warpLevel * 0.3 };
      case 'decelerating': 
        return { intensity: 0.7, stretch: 1.3 };
      case 'arriving':
        return { intensity: 0.2, stretch: 1.0 };
      default: 
        return { intensity: 0, stretch: 1.0 };
    }
  }, [warpState, warpLevel]);

  const outerUniforms = useMemo(() => ({
    uTime: { value: 0 },
    uIntensity: { value: 0 },
    uStretch: { value: 1.0 },
    uColor: { value: new THREE.Color(0.3, 0.6, 1.0) },
  }), []);

  const innerUniforms = useMemo(() => ({
    uTime: { value: 0 },
    uIntensity: { value: 0 },
    uColor: { value: new THREE.Color(0.5, 0.8, 1.0) },
  }), []);

  useFrame((state, delta) => {
    const time = state.clock.elapsedTime;
    
    // Update outer bubble
    if (outerMaterialRef.current) {
      outerUniforms.uTime.value = time;
      
      const intensityTarget = visible ? targets.intensity : 0;
      const stretchTarget = visible ? targets.stretch : 1.0;
      
      outerUniforms.uIntensity.value = THREE.MathUtils.lerp(
        outerUniforms.uIntensity.value,
        intensityTarget,
        delta * 4
      );
      outerUniforms.uStretch.value = THREE.MathUtils.lerp(
        outerUniforms.uStretch.value,
        stretchTarget,
        delta * 6
      );
    }
    
    // Update inner glow
    if (innerMaterialRef.current) {
      innerUniforms.uTime.value = time;
      innerUniforms.uIntensity.value = THREE.MathUtils.lerp(
        innerUniforms.uIntensity.value,
        visible ? targets.intensity * 0.5 : 0,
        delta * 4
      );
    }
  });

  if (!visible && outerUniforms.uIntensity.value < 0.01) return null;

  return (
    <group>
      {/* Outer warp bubble */}
      <mesh ref={outerMeshRef}>
        <sphereGeometry args={[2.5, 48, 32]} />
        <shaderMaterial
          ref={outerMaterialRef}
          vertexShader={warpBubbleVertexShader}
          fragmentShader={warpBubbleFragmentShader}
          uniforms={outerUniforms}
          transparent
          side={THREE.BackSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      
      {/* Inner glow */}
      <mesh ref={innerMeshRef}>
        <sphereGeometry args={[1.5, 32, 24]} />
        <shaderMaterial
          ref={innerMaterialRef}
          vertexShader={warpBubbleVertexShader}
          fragmentShader={innerGlowFragmentShader}
          uniforms={innerUniforms}
          transparent
          side={THREE.FrontSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
}

// Bright flash on warp engage/disengage - more dramatic
export function WarpFlash({ active, onComplete }: { active: boolean; onComplete?: () => void }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);
  const progressRef = useRef(0);

  useFrame((_, delta) => {
    if (!materialRef.current || !meshRef.current) return;

    if (active && progressRef.current < 1) {
      progressRef.current += delta * 6; // Flash speed
      
      // Quick bright flash with longer fade
      const intensity = progressRef.current < 0.15 
        ? progressRef.current / 0.15 
        : Math.pow(1 - (progressRef.current - 0.15) / 0.85, 2);
      
      materialRef.current.opacity = intensity * 0.8;
      meshRef.current.scale.setScalar(1 + progressRef.current * 4);

      if (progressRef.current >= 1) {
        progressRef.current = 0;
        if (onComplete) onComplete();
      }
    } else if (!active) {
      materialRef.current.opacity = THREE.MathUtils.lerp(materialRef.current.opacity, 0, delta * 8);
      progressRef.current = 0;
    }
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[3, 32, 16]} />
      <meshBasicMaterial
        ref={materialRef}
        color={0xaaddff}
        transparent
        opacity={0}
        side={THREE.DoubleSide}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

// Warp tunnel effect - streaking stars forming a tunnel
export function WarpTunnel({ 
  warpState, 
  warpLevel 
}: { 
  warpState: WarpState;
  warpLevel: number;
}) {
  const geometryRef = useRef<THREE.BufferGeometry>(null);
  const materialRef = useRef<THREE.PointsMaterial>(null);
  
  const PARTICLE_COUNT = 500;
  
  const { positions, velocities, colors } = useMemo(() => {
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const velocities = new Float32Array(PARTICLE_COUNT);
    const colors = new Float32Array(PARTICLE_COUNT * 3);
    
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;
      
      // Distribute in a cylinder around the ship
      const angle = Math.random() * Math.PI * 2;
      const radius = 3 + Math.random() * 8;
      const z = (Math.random() - 0.5) * 100;
      
      positions[i3] = Math.cos(angle) * radius;
      positions[i3 + 1] = Math.sin(angle) * radius;
      positions[i3 + 2] = z;
      
      velocities[i] = 0.5 + Math.random() * 0.5;
      
      // Blue-white color gradient
      const brightness = 0.7 + Math.random() * 0.3;
      colors[i3] = brightness * 0.8;
      colors[i3 + 1] = brightness * 0.9;
      colors[i3 + 2] = brightness;
    }
    
    return { positions, velocities, colors };
  }, []);
  
  const isActive = warpState === 'cruising' || warpState === 'accelerating';
  const intensityRef = useRef(0);
  
  useFrame((_, delta) => {
    if (!geometryRef.current) return;
    
    const targetIntensity = isActive ? 1 : 0;
    intensityRef.current = THREE.MathUtils.lerp(intensityRef.current, targetIntensity, delta * 3);
    
    if (intensityRef.current < 0.01) return;
    
    const posAttr = geometryRef.current.getAttribute('position') as THREE.BufferAttribute;
    const posArray = posAttr.array as Float32Array;
    
    const speed = warpState === 'cruising' ? 50 + warpLevel * 20 : 30;
    
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;
      
      // Move particles toward camera (negative Z)
      posArray[i3 + 2] -= speed * velocities[i] * delta;
      
      // Recycle particles that pass the camera
      if (posArray[i3 + 2] < -50) {
        posArray[i3 + 2] = 50 + Math.random() * 20;
        const angle = Math.random() * Math.PI * 2;
        const radius = 3 + Math.random() * 8;
        posArray[i3] = Math.cos(angle) * radius;
        posArray[i3 + 1] = Math.sin(angle) * radius;
      }
    }
    
    posAttr.needsUpdate = true;
    
    if (materialRef.current) {
      materialRef.current.opacity = intensityRef.current * 0.6;
    }
  });
  
  if (intensityRef.current < 0.01 && !isActive) return null;
  
  return (
    <points frustumCulled={false}>
      <bufferGeometry ref={geometryRef}>
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
        ref={materialRef}
        vertexColors
        transparent
        size={0.3}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
