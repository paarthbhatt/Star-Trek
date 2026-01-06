'use client';

import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { WarpState } from '@/hooks/useWarpDrive';

// Star Trek Kelvin Timeline / Discovery style warp bubble
// Features:
// 1. "Lens" distortion - space bending around the ship
// 2. Chromatic aberration - colors splitting at the edges
// 3. Fluid-like surface tension - the bubble feels like a physical membrane of spacetime
// 4. "Rainbow" refraction at high angles

const warpBubbleVertexShader = `
  uniform float uStretch;
  uniform float uTime;
  uniform float uIntensity;

  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec2 vUv;
  varying vec3 vViewPosition;
  varying float vNoise;

  // Simplex noise for organic distortion
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
  float snoise(vec3 v) {
    const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
    const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i  = floor(v + dot(v, C.yyy) );
    vec3 x0 = v - i + dot(i, C.xxx) ;
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min( g.xyz, l.zxy );
    vec3 i2 = max( g.xyz, l.zxy );
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i);
    vec4 p = permute( permute( permute(
              i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
    float n_ = 0.142857142857;
    vec3  ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_ );
    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4( x.xy, y.xy );
    vec4 b1 = vec4( x.zw, y.zw );
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
    vec3 p0 = vec3(a0.xy,h.x);
    vec3 p1 = vec3(a0.zw,h.y);
    vec3 p2 = vec3(a1.xy,h.z);
    vec3 p3 = vec3(a1.zw,h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1),
                                  dot(p2,x2), dot(p3,x3) ) );
  }

  void main() {
    vNormal = normalize(normalMatrix * normal);
    vUv = uv;

    vec3 pos = position;

    // "Spacetime Ripple" - elongated noise along Z axis (direction of travel)
    float noiseScale = 2.0;
    float timeScale = uTime * 5.0;
    
    // Stretch noise along Z for speed effect
    vec3 noisePos = vec3(pos.x, pos.y, pos.z * 0.2 + timeScale);
    float noise = snoise(noisePos * noiseScale);
    vNoise = noise;

    // Apply distortion based on stretch intensity
    // Vertices push out/in based on noise to simulate fluid bubble
    float displacement = noise * 0.1 * uIntensity;
    
    // Elongate the bubble based on warp speed (uStretch)
    pos.z *= uStretch;
    
    // Add the noise displacement
    pos += normal * displacement;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    vViewPosition = -mvPosition.xyz;
    vPosition = pos;

    gl_Position = projectionMatrix * mvPosition;
  }
`;

const warpBubbleFragmentShader = `
  uniform float uTime;
  uniform float uIntensity;
  uniform vec3 uColor;
  uniform float uStretch;

  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec3 vViewPosition;
  varying float vNoise;

  void main() {
    vec3 viewDirection = normalize(vViewPosition);
    vec3 normal = normalize(vNormal);

    // Fresnel effect - stronger at edges (bubble look)
    // Split fresnel for chromatic aberration (RGB split at edges)
    float fBase = 1.0 - abs(dot(viewDirection, normal));
    float fresnelR = pow(fBase, 2.5);
    float fresnelG = pow(fBase, 3.0);
    float fresnelB = pow(fBase, 3.5);
    vec3 fresnel3 = vec3(fresnelR, fresnelG, fresnelB);

    // Dynamic color shifting (Kelvin timeline style blue/white/rainbow)
    vec3 deepBlue = vec3(0.0, 0.2, 0.8);
    vec3 brightCyan = vec3(0.4, 0.9, 1.0);
    vec3 whiteHot = vec3(1.2, 1.2, 1.5); // Overblown white
    
    // Rainbow shift based on viewing angle, not just time
    vec3 aberration = vec3(
        0.5 + 0.5 * sin(uTime * 5.0 + vViewPosition.x * 0.1), 
        0.5 + 0.5 * sin(uTime * 5.0 + vViewPosition.y * 0.1 + 2.0), 
        0.5 + 0.5 * sin(uTime * 5.0 + vViewPosition.z * 0.1 + 4.0)
    );

    // Mix colors based on noise and fresnel
    vec3 bubbleColor = mix(deepBlue, brightCyan, vNoise * 0.6 + 0.4);
    
    // Add intense white hot highlights at grazing angles
    bubbleColor = mix(bubbleColor, whiteHot, fresnelB * 0.9);
    
    // Add chromatic aberration at edges
    bubbleColor += aberration * fresnel3 * 0.5 * uIntensity;

    // Alpha/Transparency
    // Clearer in center, opaque at edges
    float alpha = fresnelG * uIntensity * 1.8;
    alpha = clamp(alpha, 0.0, 0.9);

    // "Cherenkov Radiation" glow - blow out the brightness
    float glow = smoothstep(0.4, 1.0, fresnelB) * uIntensity;
    bubbleColor += vec3(0.6, 0.8, 1.0) * glow * 1.5;

    gl_FragColor = vec4(bubbleColor, alpha);
  }
`;

// Inner distortion core - unseen but felt mass
const innerGlowFragmentShader = `
  uniform float uTime;
  uniform float uIntensity;
  uniform vec3 uColor;

  varying vec3 vNormal;
  varying vec3 vViewPosition;

  void main() {
    vec3 viewDirection = normalize(vViewPosition);
    vec3 normal = normalize(vNormal);

    float fresnel = pow(1.0 - abs(dot(viewDirection, normal)), 2.0);
    
    // Pulsing energy
    float pulse = 0.5 + 0.5 * sin(uTime * 20.0);

    vec3 color = mix(uColor, vec3(1.0), fresnel);
    float alpha = fresnel * uIntensity * 0.3 * pulse;

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
        return { intensity: 0.3, stretch: 1.0, scale: 1.0 };
      case 'accelerating': 
        // Bubble elongates drastically as ship enters warp
        return { intensity: 2.0, stretch: 8.0, scale: 0.8 }; 
      case 'cruising': 
        // Stable but elongated bubble
        return { intensity: 1.2, stretch: 12.0 + warpLevel * 2.0, scale: 1.0 };
      case 'decelerating': 
        // Bubble snaps back
        return { intensity: 1.5, stretch: 0.5, scale: 1.2 };
      case 'arriving':
        return { intensity: 0.0, stretch: 1.0, scale: 1.0 };
      default: 
        return { intensity: 0, stretch: 1.0, scale: 1.0 };
    }
  }, [warpState, warpLevel]);

  const outerUniforms = useMemo(() => ({
    uTime: { value: 0 },
    uIntensity: { value: 0 },
    uStretch: { value: 1.0 },
    uColor: { value: new THREE.Color(0.0, 0.5, 1.0) },
  }), []);

  const innerUniforms = useMemo(() => ({
    uTime: { value: 0 },
    uIntensity: { value: 0 },
    uColor: { value: new THREE.Color(0.2, 0.6, 1.0) },
  }), []);

  useFrame((state, delta) => {
    const time = state.clock.elapsedTime;
    
    // Smoothly interpolate uniform values
    if (outerMaterialRef.current) {
      outerUniforms.uTime.value = time;
      
      // Lerp intensity
      outerUniforms.uIntensity.value = THREE.MathUtils.lerp(
        outerUniforms.uIntensity.value,
        targets.intensity,
        delta * 3
      );

      // Lerp stretch (elongation)
      outerUniforms.uStretch.value = THREE.MathUtils.lerp(
        outerUniforms.uStretch.value,
        targets.stretch,
        delta * 2 // Slower stretch for weight
      );
    }
    
    if (innerMaterialRef.current) {
      innerUniforms.uTime.value = time;
      innerUniforms.uIntensity.value = outerUniforms.uIntensity.value;
    }

    // Physical mesh scaling for the "snap" effect
    if (outerMeshRef.current) {
       // Scale Z is handled by shader uStretch, but we scale X/Y to "thin" the bubble at speed
       const currentScale = outerMeshRef.current.scale.x;
       const targetScale = targets.scale;
       const newScale = THREE.MathUtils.lerp(currentScale, targetScale, delta * 2);
       outerMeshRef.current.scale.set(newScale, newScale, newScale);
    }
  });

  if (!visible && outerUniforms.uIntensity.value < 0.01) return null;

  return (
    <group>
      {/* Outer warp bubble - visible membrane */}
      <mesh ref={outerMeshRef} scale={[1, 1, 1]}>
        {/* Elongated sphere geometry */}
        <sphereGeometry args={[2.8, 64, 64]} />
        <shaderMaterial
          ref={outerMaterialRef}
          vertexShader={warpBubbleVertexShader}
          fragmentShader={warpBubbleFragmentShader}
          uniforms={outerUniforms}
          transparent
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      
      {/* Inner glow - core energy */}
      <mesh ref={innerMeshRef}>
        <sphereGeometry args={[1.8, 32, 32]} />
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

// Intense flash ("Warp Burst") when entering/exiting
export function WarpFlash({ active, onComplete }: { active: boolean; onComplete?: () => void }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);
  const progressRef = useRef(0);

  useFrame((_, delta) => {
    if (!materialRef.current || !meshRef.current) return;

    if (active && progressRef.current < 1) {
      progressRef.current += delta * 4.0; // Fast flash
      
      // Spike intensity curve
      const intensity = Math.sin(progressRef.current * Math.PI); 
      
      materialRef.current.opacity = intensity;
      
      // Expand rapidly
      const scale = 1 + progressRef.current * 15.0;
      meshRef.current.scale.setScalar(scale);

      if (progressRef.current >= 1) {
        progressRef.current = 0;
        if (onComplete) onComplete();
      }
    } else if (!active) {
      materialRef.current.opacity = 0;
      progressRef.current = 0;
      meshRef.current.scale.setScalar(1);
    }
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[2, 32, 32]} />
      <meshBasicMaterial
        ref={materialRef}
        color={0x00ffff} // Cyan/White burst
        transparent
        opacity={0}
        side={THREE.BackSide}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

// "Infinite Tunnel" effect - long streaking stars
export function WarpTunnel({ 
  warpState, 
  warpLevel 
}: { 
  warpState: WarpState;
  warpLevel: number;
}) {
  // Implemented in WarpStreaks.tsx, but could be added here for a fog/cloud tunnel effect
  // For now we keep this simple or empty if WarpStreaks handles the visuals
  return null; 
}