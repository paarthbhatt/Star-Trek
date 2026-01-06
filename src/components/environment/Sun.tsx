'use client';

import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { coronaVertex, coronaFragment } from '@/shaders/atmosphere';

// Solar flare shader
const solarFlareVertex = `
  varying vec2 vUv;
  varying vec3 vPosition;
  
  void main() {
    vUv = uv;
    vPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const solarFlareFragment = `
  uniform float uTime;
  uniform vec3 uColor;
  uniform float uIntensity;
  
  varying vec2 vUv;
  varying vec3 vPosition;
  
  // Noise function for flare animation
  float noise(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
  }
  
  float smoothNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    
    float a = noise(i);
    float b = noise(i + vec2(1.0, 0.0));
    float c = noise(i + vec2(0.0, 1.0));
    float d = noise(i + vec2(1.0, 1.0));
    
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }
  
  void main() {
    vec2 center = vec2(0.5);
    float dist = length(vUv - center) * 2.0;
    
    // Animated noise for flare movement
    float n = smoothNoise(vUv * 8.0 + uTime * 0.5);
    n += smoothNoise(vUv * 16.0 - uTime * 0.3) * 0.5;
    
    // Flare shape - strongest at edges
    float flare = pow(1.0 - dist, 2.0) * n;
    flare *= smoothstep(1.0, 0.3, dist);
    
    // Color gradient from yellow core to orange/red edges
    vec3 innerColor = vec3(1.0, 0.95, 0.6);
    vec3 outerColor = uColor;
    vec3 color = mix(innerColor, outerColor, dist);
    
    float alpha = flare * uIntensity * (1.0 - dist * 0.5);
    
    gl_FragColor = vec4(color, alpha);
  }
`;

// Prominence/solar loop shader
const prominenceVertex = `
  uniform float uTime;
  varying vec2 vUv;
  
  void main() {
    vUv = uv;
    
    // Animate the prominence loop
    vec3 pos = position;
    float wave = sin(uv.x * 3.14159 + uTime) * 0.1;
    pos.y += wave * uv.y;
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const prominenceFragment = `
  uniform float uTime;
  uniform vec3 uColor;
  
  varying vec2 vUv;
  
  void main() {
    // Fade at edges
    float alpha = smoothstep(0.0, 0.3, vUv.y) * smoothstep(1.0, 0.7, vUv.y);
    alpha *= smoothstep(0.0, 0.1, vUv.x) * smoothstep(1.0, 0.9, vUv.x);
    
    // Animate brightness
    float brightness = 0.7 + 0.3 * sin(uTime * 2.0 + vUv.x * 10.0);
    
    vec3 color = uColor * brightness;
    
    gl_FragColor = vec4(color, alpha * 0.6);
  }
`;

interface SunProps {
  position?: [number, number, number];
}

export function Sun({ position = [0, 0, -500] }: SunProps) {
  const sunRef = useRef<THREE.Mesh>(null);
  const coronaRef = useRef<THREE.ShaderMaterial>(null);
  const outerCoronaRef = useRef<THREE.Mesh>(null);
  const flaresRef = useRef<THREE.Mesh[]>([]);
  const prominenceRef = useRef<THREE.ShaderMaterial>(null);

  // Corona shader material
  const coronaMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: coronaVertex,
      fragmentShader: coronaFragment,
      uniforms: {
        uTime: { value: 0 },
        uInnerColor: { value: new THREE.Color(0xffff88) },
        uOuterColor: { value: new THREE.Color(0xff6600) },
      },
      transparent: true,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
  }, []);

  // Solar flare materials
  const flareMaterials = useMemo(() => {
    return [
      new THREE.ShaderMaterial({
        vertexShader: solarFlareVertex,
        fragmentShader: solarFlareFragment,
        uniforms: {
          uTime: { value: 0 },
          uColor: { value: new THREE.Color(0xff4400) },
          uIntensity: { value: 0.8 },
        },
        transparent: true,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
      new THREE.ShaderMaterial({
        vertexShader: solarFlareVertex,
        fragmentShader: solarFlareFragment,
        uniforms: {
          uTime: { value: 0.5 },
          uColor: { value: new THREE.Color(0xff6600) },
          uIntensity: { value: 0.6 },
        },
        transparent: true,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
      new THREE.ShaderMaterial({
        vertexShader: solarFlareVertex,
        fragmentShader: solarFlareFragment,
        uniforms: {
          uTime: { value: 1.0 },
          uColor: { value: new THREE.Color(0xff8800) },
          uIntensity: { value: 0.5 },
        },
        transparent: true,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    ];
  }, []);

  // Prominence material
  const prominenceMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: prominenceVertex,
      fragmentShader: prominenceFragment,
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(0xff4400) },
      },
      transparent: true,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
  }, []);

  // Sun surface texture (procedural spots)
  const sunTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    
    // Base yellow-orange gradient
    const gradient = ctx.createRadialGradient(256, 128, 0, 256, 128, 256);
    gradient.addColorStop(0, '#ffff66');
    gradient.addColorStop(0.5, '#ffcc00');
    gradient.addColorStop(1, '#ff8800');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 256);
    
    // Add sunspots
    ctx.fillStyle = 'rgba(100, 50, 0, 0.3)';
    for (let i = 0; i < 20; i++) {
      const x = Math.random() * 512;
      const y = 64 + Math.random() * 128; // Concentrate near equator
      const size = 5 + Math.random() * 20;
      ctx.beginPath();
      ctx.ellipse(x, y, size, size * 0.7, Math.random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Add granulation texture
    ctx.fillStyle = 'rgba(255, 200, 100, 0.1)';
    for (let i = 0; i < 500; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 256;
      const size = 1 + Math.random() * 3;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }, []);

  useFrame((state) => {
    const time = state.clock.elapsedTime;
    
    // Animate corona
    if (coronaRef.current) {
      coronaRef.current.uniforms.uTime.value = time;
    }
    
    // Animate outer corona rotation and pulsing
    if (outerCoronaRef.current) {
      outerCoronaRef.current.rotation.z = time * 0.05;
      outerCoronaRef.current.scale.setScalar(1 + Math.sin(time * 0.5) * 0.05);
    }
    
    // Rotate sun
    if (sunRef.current) {
      sunRef.current.rotation.y = time * 0.02;
    }
    
    // Animate flares
    flareMaterials.forEach((mat, i) => {
      mat.uniforms.uTime.value = time + i * 2;
      // Vary intensity over time
      mat.uniforms.uIntensity.value = 0.4 + Math.sin(time * 0.3 + i) * 0.3;
    });
    
    // Animate prominences
    if (prominenceRef.current) {
      prominenceRef.current.uniforms.uTime.value = time;
    }
  });

  return (
    <group position={position}>
      {/* Sun core with texture */}
      <mesh ref={sunRef}>
        <sphereGeometry args={[50, 64, 32]} />
        <meshBasicMaterial map={sunTexture} />
      </mesh>

      {/* Inner glow layer */}
      <mesh>
        <sphereGeometry args={[52, 32, 16]} />
        <meshBasicMaterial 
          color={0xffcc00} 
          transparent 
          opacity={0.4}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Second glow layer */}
      <mesh>
        <sphereGeometry args={[55, 32, 16]} />
        <meshBasicMaterial 
          color={0xffaa00} 
          transparent 
          opacity={0.25}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Corona effect plane */}
      <mesh ref={outerCoronaRef} material={coronaMaterial}>
        <planeGeometry args={[200, 200]} />
      </mesh>

      {/* Solar flares at different positions */}
      {flareMaterials.map((mat, i) => (
        <mesh 
          key={i}
          material={mat}
          rotation={[0, 0, (Math.PI * 2 / 3) * i]}
          position={[
            Math.cos((Math.PI * 2 / 3) * i) * 5,
            Math.sin((Math.PI * 2 / 3) * i) * 5,
            0
          ]}
        >
          <planeGeometry args={[80, 80]} />
        </mesh>
      ))}

      {/* Outer glow rings */}
      {[55, 62, 70, 80, 95].map((radius, i) => (
        <mesh key={`ring-${i}`} rotation={[Math.PI / 2, 0, i * 0.3]}>
          <ringGeometry args={[radius, radius + 3, 64]} />
          <meshBasicMaterial 
            color={i < 2 ? 0xffaa00 : 0xff6600} 
            transparent 
            opacity={0.25 - i * 0.04}
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}

      {/* Solar prominences (plasma loops) */}
      {[0, 120, 240].map((angle, i) => (
        <mesh 
          key={`prominence-${i}`}
          position={[
            Math.cos(angle * Math.PI / 180) * 52,
            10 + i * 5,
            Math.sin(angle * Math.PI / 180) * 52
          ]}
          rotation={[0, angle * Math.PI / 180, Math.PI / 4]}
          material={prominenceMaterial}
        >
          <planeGeometry args={[15, 30]} />
        </mesh>
      ))}

      {/* Sun light - primary scene illumination */}
      <pointLight 
        color={0xffffee} 
        intensity={150} 
        distance={3000} 
        decay={1.5} 
      />
      
      {/* Secondary fill light */}
      <pointLight 
        color={0xffcc88} 
        intensity={50} 
        distance={1500} 
        decay={2} 
      />
      
      {/* Directional light for shadows */}
      <directionalLight
        color={0xffffee}
        intensity={2}
        position={[0, 0, 0]}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={2000}
        shadow-camera-left={-100}
        shadow-camera-right={100}
        shadow-camera-top={100}
        shadow-camera-bottom={-100}
      />

      {/* Ambient light for minimum visibility */}
      <ambientLight color={0x222244} intensity={0.1} />
    </group>
  );
}
