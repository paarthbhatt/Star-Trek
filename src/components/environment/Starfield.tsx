'use client';

import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Points, PointMaterial } from '@react-three/drei';
import { QualitySettings, QUALITY_PRESETS } from '@/hooks/useSettings';

interface StarfieldProps {
  qualitySettings?: QualitySettings;
}

// Milky Way shader for the galactic band
const milkyWayVertex = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const milkyWayFragment = `
  uniform float uTime;
  varying vec2 vUv;
  
  // Noise functions for cloud-like effect
  float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
  }
  
  float noise(vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);
    float a = random(i);
    float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0));
    float d = random(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
  }
  
  float fbm(vec2 st) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 5; i++) {
      value += amplitude * noise(st);
      st *= 2.0;
      amplitude *= 0.5;
    }
    return value;
  }
  
  void main() {
    vec2 st = vUv;
    
    // Center the band vertically
    float distFromCenter = abs(st.y - 0.5) * 2.0;
    
    // Create cloud-like structure
    float n = fbm(st * vec2(8.0, 2.0) + uTime * 0.01);
    n += fbm(st * vec2(16.0, 4.0) - uTime * 0.005) * 0.5;
    
    // Gaussian falloff from center
    float falloff = exp(-distFromCenter * distFromCenter * 8.0);
    
    // Add some structure variation along the band
    float structure = fbm(st * vec2(4.0, 1.0)) * 0.3 + 0.7;
    
    // Final alpha with noise and falloff
    float alpha = n * falloff * structure * 0.15;
    
    // Color gradient - blueish to warm
    vec3 color1 = vec3(0.6, 0.7, 0.9); // Blue tint
    vec3 color2 = vec3(0.9, 0.85, 0.7); // Warm tint
    vec3 color = mix(color1, color2, n);
    
    // Add some bright spots (dense star regions)
    float spots = pow(fbm(st * vec2(20.0, 5.0)), 3.0);
    color += vec3(1.0, 0.95, 0.9) * spots * 0.3;
    
    gl_FragColor = vec4(color, alpha);
  }
`;

export function Starfield({ qualitySettings }: StarfieldProps) {
  const starRef1 = useRef<THREE.Points>(null);
  const starRef2 = useRef<THREE.Points>(null);
  const brightStarsRef = useRef<THREE.Points>(null);
  const milkyWayRef = useRef<THREE.Mesh>(null);
  const milkyWayMaterialRef = useRef<THREE.ShaderMaterial>(null);

  // Use quality settings or default to high
  const quality = qualitySettings || QUALITY_PRESETS.high;
  
  // Calculate star counts based on quality (maintain ratios)
  const totalStars = quality.starCount;
  const layer1Count = Math.floor(totalStars * 0.45);  // 45% distant
  const layer2Count = Math.floor(totalStars * 0.37);  // 37% mid
  const layer3Count = Math.floor(totalStars * 0.18);  // 18% milky way band
  const brightCount = Math.min(80, Math.floor(totalStars * 0.003)); // ~80 for high

  // Generate stars in multiple layers based on quality
  const [layer1Positions, layer2Positions, layer3Positions, brightStarData] = useMemo(() => {
    // Layer 1: Distant stars (background)
    const positions1 = new Float32Array(layer1Count * 3);
    for (let i = 0; i < layer1Count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const radius = 6000 + Math.random() * 2000;
      
      positions1[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions1[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions1[i * 3 + 2] = radius * Math.cos(phi);
    }

    // Layer 2: Mid-distance stars
    const positions2 = new Float32Array(layer2Count * 3);
    for (let i = 0; i < layer2Count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const radius = 4000 + Math.random() * 1500;
      
      positions2[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions2[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions2[i * 3 + 2] = radius * Math.cos(phi);
    }

    // Layer 3: Stars concentrated in the Milky Way band
    const positions3 = new Float32Array(layer3Count * 3);
    for (let i = 0; i < layer3Count; i++) {
      const theta = Math.random() * Math.PI * 2;
      // Concentrate stars near the galactic plane (phi near PI/2)
      const phi = Math.PI / 2 + (Math.random() - 0.5) * 0.4;
      const radius = 5000 + Math.random() * 2000;
      
      positions3[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions3[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions3[i * 3 + 2] = radius * Math.cos(phi);
    }

    // Bright stars - use Points geometry instead of 80 pointLights!
    // This is the key performance fix - we render them as larger, brighter particles
    const brightPositions = new Float32Array(brightCount * 3);
    const brightColors = new Float32Array(brightCount * 3);
    const brightSizes = new Float32Array(brightCount);
    
    const colorOptions = [
      new THREE.Color(0xffffff),  // White
      new THREE.Color(0xffeecc),  // Warm white
      new THREE.Color(0xccddff),  // Blue-white
      new THREE.Color(0xffeedd),  // Pale yellow
      new THREE.Color(0xffccaa),  // Orange
      new THREE.Color(0xaaccff),  // Blue
    ];
    
    for (let i = 0; i < brightCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const radius = 3000 + Math.random() * 2000;
      
      brightPositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      brightPositions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      brightPositions[i * 3 + 2] = radius * Math.cos(phi);
      
      const color = colorOptions[Math.floor(Math.random() * colorOptions.length)];
      brightColors[i * 3] = color.r;
      brightColors[i * 3 + 1] = color.g;
      brightColors[i * 3 + 2] = color.b;
      
      // Size variation for bright stars (larger = brighter appearance)
      brightSizes[i] = 8 + Math.random() * 12; // 8-20 size range
    }

    return [positions1, positions2, positions3, { positions: brightPositions, colors: brightColors, sizes: brightSizes }];
  }, [layer1Count, layer2Count, layer3Count, brightCount]);

  // Milky Way material
  const milkyWayMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: milkyWayVertex,
      fragmentShader: milkyWayFragment,
      uniforms: {
        uTime: { value: 0 },
      },
      transparent: true,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
  }, []);

  // Gentle rotation for star field and animate Milky Way
  useFrame((state) => {
    const time = state.clock.elapsedTime;
    
    if (starRef1.current) {
      starRef1.current.rotation.y = time * 0.0005;
    }
    if (starRef2.current) {
      starRef2.current.rotation.y = time * 0.0003;
      starRef2.current.rotation.x = time * 0.0001;
    }
    
    // Animate Milky Way
    if (milkyWayMaterialRef.current) {
      milkyWayMaterialRef.current.uniforms.uTime.value = time;
    }
  });

  return (
    <group>
      {/* Milky Way band - large cylinder around the scene */}
      <mesh 
        ref={milkyWayRef}
        rotation={[Math.PI / 2, 0, Math.PI / 6]} // Tilted like real Milky Way
        material={milkyWayMaterial}
      >
        <cylinderGeometry args={[7000, 7000, 2000, 64, 1, true]} />
        <primitive object={milkyWayMaterial} ref={milkyWayMaterialRef} attach="material" />
      </mesh>

      {/* Layer 1 - Very distant dim stars */}
      <Points ref={starRef1} positions={layer1Positions} stride={3} frustumCulled={false}>
        <PointMaterial
          transparent
          color={0xffffff}
          size={1}
          sizeAttenuation={true}
          depthWrite={false}
          opacity={0.5}
        />
      </Points>

      {/* Layer 2 - Mid-distance stars */}
      <Points ref={starRef2} positions={layer2Positions} stride={3} frustumCulled={false}>
        <PointMaterial
          transparent
          color={0xffffee}
          size={1.5}
          sizeAttenuation={true}
          depthWrite={false}
          opacity={0.7}
        />
      </Points>

      {/* Layer 3 - Milky Way concentrated stars */}
      <Points positions={layer3Positions} stride={3} frustumCulled={false}>
        <PointMaterial
          transparent
          color={0xffeeff}
          size={2}
          sizeAttenuation={true}
          depthWrite={false}
          opacity={0.8}
          blending={THREE.AdditiveBlending}
        />
      </Points>

      {/* Bright individual stars - Using Points instead of 80 pointLights for performance! */}
      <points ref={brightStarsRef} frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[brightStarData.positions, 3]}
          />
          <bufferAttribute
            attach="attributes-color"
            args={[brightStarData.colors, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          vertexColors
          transparent
          size={15}
          sizeAttenuation={true}
          depthWrite={false}
          opacity={1}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  );
}
