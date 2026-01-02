'use client';

import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { DamageState, PlanetHealth } from '@/hooks/usePlanetHealth';
import { Destination } from '@/data/destinations';
import {
  proceduralPlanetVertex,
  earthFragment,
  earthCloudsFragment,
  marsFragment,
  gasGiantFragment,
  iceGiantFragment,
  rockyPlanetFragment,
  volcanicMoonFragment,
  icyMoonFragment,
  hazyMoonFragment,
  moonFragment,
  venusFragment,
} from '@/shaders/procedural';

// Damage crack shader for planet surface (overlay)
const damageCrackVertexShader = `
  varying vec3 vPosition;
  varying vec3 vNormal;
  varying vec2 vUv;
  
  void main() {
    vPosition = position;
    vNormal = normal;
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const damageCrackFragmentShader = `
  uniform float uDamage;       // 0-1, how damaged
  uniform float uTime;
  uniform vec3 uBaseColor;
  uniform vec3 uCrackColor;
  
  varying vec3 vPosition;
  varying vec3 vNormal;
  varying vec2 vUv;
  
  // Simple noise function
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }
  
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }
  
  void main() {
    // Create crack pattern based on position
    float crackNoise = noise(vPosition.xy * 3.0 + vPosition.z * 2.0);
    crackNoise += noise(vPosition.yz * 5.0) * 0.5;
    crackNoise += noise(vPosition.xz * 7.0) * 0.25;
    
    // Cracks appear based on damage level
    float crackThreshold = 1.0 - uDamage * 1.5;
    float crack = smoothstep(crackThreshold - 0.1, crackThreshold, crackNoise);
    
    // Pulsing glow in cracks
    float pulse = sin(uTime * 3.0) * 0.3 + 0.7;
    
    // Mix base color with crack color
    vec3 color = mix(uBaseColor, uCrackColor * pulse, crack * uDamage);
    
    // Add emissive glow to cracks
    float emissive = crack * uDamage * pulse;
    
    gl_FragColor = vec4(color + uCrackColor * emissive * 0.5, 1.0);
  }
`;

// Saturn ring shader with Cassini Division
const saturnRingFragment = `
  uniform float uTime;
  uniform vec3 uSunDirection;
  varying vec2 vUv;
  
  void main() {
    // Distance from center (0 = inner, 1 = outer)
    float dist = vUv.x;
    
    // Ring bands with varying opacity
    float rings = 0.0;
    
    // C Ring (innermost, faint)
    rings += smoothstep(0.0, 0.1, dist) * smoothstep(0.25, 0.2, dist) * 0.3;
    
    // B Ring (brightest, widest)
    rings += smoothstep(0.25, 0.28, dist) * smoothstep(0.58, 0.55, dist) * 0.9;
    
    // Cassini Division (dark gap)
    float cassini = smoothstep(0.58, 0.60, dist) * smoothstep(0.65, 0.63, dist);
    rings *= (1.0 - cassini * 0.9);
    
    // A Ring (outer)
    rings += smoothstep(0.65, 0.67, dist) * smoothstep(0.88, 0.85, dist) * 0.7;
    
    // Encke Gap in A Ring
    float encke = smoothstep(0.78, 0.79, dist) * smoothstep(0.80, 0.79, dist);
    rings *= (1.0 - encke * 0.7);
    
    // F Ring (outermost, thin)
    rings += smoothstep(0.92, 0.93, dist) * smoothstep(0.96, 0.95, dist) * 0.4;
    
    // Color variation
    vec3 ringColor = mix(
      vec3(0.85, 0.75, 0.6),  // Tan inner
      vec3(0.95, 0.9, 0.8),   // Cream outer
      dist
    );
    
    // Add some texture variation
    float variation = sin(dist * 200.0 + vUv.y * 50.0) * 0.1 + 0.9;
    rings *= variation;
    
    // Shadow from planet (simple approximation)
    float shadow = smoothstep(-0.1, 0.1, vUv.y - 0.5);
    rings *= 0.3 + shadow * 0.7;
    
    gl_FragColor = vec4(ringColor, rings * 0.8);
  }
`;

const saturnRingVertex = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Planet shader mapping
type PlanetShaderType = 
  | 'earth' | 'mars' | 'gasGiant' | 'iceGiant' | 'rockyPlanet' 
  | 'volcanicMoon' | 'icyMoon' | 'hazyMoon' | 'moon' | 'venus' | 'default';

const getPlanetShaderType = (planetId: string): PlanetShaderType => {
  const mapping: Record<string, PlanetShaderType> = {
    // Inner planets
    'mercury': 'rockyPlanet',
    'venus': 'venus',
    'earth': 'earth',
    'mars': 'mars',
    
    // Earth's moon
    'luna': 'moon',
    
    // Mars moons
    'phobos': 'rockyPlanet',
    'deimos': 'rockyPlanet',
    
    // Jupiter system
    'jupiter': 'gasGiant',
    'io': 'volcanicMoon',
    'europa': 'icyMoon',
    'ganymede': 'rockyPlanet',
    'callisto': 'rockyPlanet',
    
    // Saturn system
    'saturn': 'gasGiant',
    'titan': 'hazyMoon',
    'enceladus': 'icyMoon',
    'mimas': 'icyMoon',
    'rhea': 'icyMoon',
    
    // Uranus system
    'uranus': 'iceGiant',
    'miranda': 'icyMoon',
    'ariel': 'icyMoon',
    'titania': 'icyMoon',
    
    // Neptune system
    'neptune': 'iceGiant',
    'triton': 'icyMoon',
    
    // Dwarf planets
    'pluto': 'icyMoon',
    'charon': 'icyMoon',
    'eris': 'icyMoon',
    'dysnomia': 'icyMoon',
    'makemake': 'icyMoon',
    'haumea': 'icyMoon',
    
    // Asteroid belt
    'ceres': 'rockyPlanet',
    'vesta': 'rockyPlanet',
  };
  
  return mapping[planetId] || 'default';
};

// Get planet-specific colors
const getPlanetColors = (planetId: string): { base: string; ice?: string; crack?: number } => {
  const colors: Record<string, { base: string; ice?: string; crack?: number }> = {
    'mercury': { base: '#8c7853' },
    'venus': { base: '#e6c87a' },
    'ganymede': { base: '#7a7a7a' },
    'callisto': { base: '#5a5a5a' },
    'phobos': { base: '#6a5a4a' },
    'deimos': { base: '#7a6a5a' },
    'europa': { base: '#d4cfc4', ice: '#d4cfc4', crack: 1.0 },
    'enceladus': { base: '#ffffff', ice: '#ffffff', crack: 0.8 },
    'mimas': { base: '#c8c8c8', ice: '#c8c8c8', crack: 0.3 },
    'rhea': { base: '#b0b0b0', ice: '#b0b0b0', crack: 0.4 },
    'miranda': { base: '#a8a8a8', ice: '#a8a8a8', crack: 0.6 },
    'ariel': { base: '#c0c0c0', ice: '#c0c0c0', crack: 0.5 },
    'titania': { base: '#a0a0a0', ice: '#a0a0a0', crack: 0.4 },
    'triton': { base: '#d0d8e0', ice: '#d0d8e0', crack: 0.7 },
    'pluto': { base: '#e8dcc8', ice: '#e8dcc8', crack: 0.5 },
    'charon': { base: '#909090', ice: '#909090', crack: 0.3 },
    'eris': { base: '#f0f0f0', ice: '#f0f0f0', crack: 0.4 },
    'dysnomia': { base: '#808080', ice: '#808080', crack: 0.3 },
    'makemake': { base: '#d4a87a', ice: '#d4a87a', crack: 0.3 },
    'haumea': { base: '#e0e0e0', ice: '#e0e0e0', crack: 0.5 },
    'ceres': { base: '#6a6a6a' },
    'vesta': { base: '#8a8a8a' },
    'uranus': { base: '#7de3f4' },
    'neptune': { base: '#4b70dd' },
  };
  
  return colors[planetId] || { base: '#888888' };
};

interface DestructiblePlanetProps {
  destination: Destination;
  healthState: PlanetHealth;
  isTargeted?: boolean;
  sunDirection?: THREE.Vector3;
}

export function DestructiblePlanet({ 
  destination, 
  healthState,
  isTargeted = false,
  sunDirection = new THREE.Vector3(1, 0.5, 1).normalize(),
}: DestructiblePlanetProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const cloudMeshRef = useRef<THREE.Mesh>(null);
  const ringMeshRef = useRef<THREE.Mesh>(null);
  const shaderMaterialRef = useRef<THREE.ShaderMaterial>(null);
  const cloudMaterialRef = useRef<THREE.ShaderMaterial>(null);
  const crackMaterialRef = useRef<THREE.ShaderMaterial>(null);
  const atmosphereRef = useRef<THREE.Mesh>(null);
  
  // Don't render stations or stars - they're handled separately
  if (destination.type === 'station' || destination.type === 'star') {
    return null;
  }
  
  // Calculate damage level (0 = healthy, 1 = destroyed)
  const damageLevel = useMemo(() => {
    return 1 - (healthState.health / healthState.maxHealth);
  }, [healthState.health, healthState.maxHealth]);
  
  // Parse destination color
  const baseColor = useMemo(() => new THREE.Color(destination.color), [destination.color]);
  
  // Get shader type for this planet
  const shaderType = useMemo(() => getPlanetShaderType(destination.id), [destination.id]);
  const planetColors = useMemo(() => getPlanetColors(destination.id), [destination.id]);
  
  // Create the appropriate shader material
  const shaderMaterial = useMemo(() => {
    let fragmentShader = '';
    const uniforms: Record<string, { value: unknown }> = {
      uTime: { value: 0 },
      uSunDirection: { value: sunDirection },
    };
    
    switch (shaderType) {
      case 'earth':
        fragmentShader = earthFragment;
        break;
        
      case 'mars':
        fragmentShader = marsFragment;
        break;
        
      case 'gasGiant':
        fragmentShader = gasGiantFragment;
        uniforms.uBandColor1 = { value: new THREE.Color('#d4a574') };
        uniforms.uBandColor2 = { value: new THREE.Color('#c9b896') };
        uniforms.uBandColor3 = { value: new THREE.Color('#8b6914') };
        break;
        
      case 'iceGiant':
        fragmentShader = iceGiantFragment;
        uniforms.uBaseColor = { value: new THREE.Color(planetColors.base) };
        uniforms.uBandIntensity = { value: destination.id === 'uranus' ? 0.2 : 0.4 };
        break;
        
      case 'rockyPlanet':
        fragmentShader = rockyPlanetFragment;
        uniforms.uBaseColor = { value: new THREE.Color(planetColors.base) };
        uniforms.uCraterDensity = { value: destination.id === 'mercury' ? 8.0 : 5.0 };
        break;
        
      case 'volcanicMoon':
        fragmentShader = volcanicMoonFragment;
        break;
        
      case 'icyMoon':
        fragmentShader = icyMoonFragment;
        uniforms.uIceColor = { value: new THREE.Color(planetColors.ice || '#ffffff') };
        uniforms.uCrackIntensity = { value: planetColors.crack || 0.5 };
        break;
        
      case 'hazyMoon':
        fragmentShader = hazyMoonFragment;
        break;
        
      case 'moon':
        fragmentShader = moonFragment;
        break;
        
      case 'venus':
        fragmentShader = venusFragment;
        break;
        
      default:
        // Fallback to standard material
        return null;
    }
    
    if (!fragmentShader) return null;
    
    return new THREE.ShaderMaterial({
      vertexShader: proceduralPlanetVertex,
      fragmentShader,
      uniforms,
    });
  }, [shaderType, sunDirection, planetColors, destination.id]);
  
  // Earth cloud material
  const cloudMaterial = useMemo(() => {
    if (destination.id !== 'earth') return null;
    
    return new THREE.ShaderMaterial({
      vertexShader: proceduralPlanetVertex,
      fragmentShader: earthCloudsFragment,
      uniforms: {
        uTime: { value: 0 },
        uSunDirection: { value: sunDirection },
      },
      transparent: true,
      side: THREE.FrontSide,
      depthWrite: false,
    });
  }, [destination.id, sunDirection]);
  
  // Saturn ring material
  const ringMaterial = useMemo(() => {
    if (destination.id !== 'saturn') return null;
    
    return new THREE.ShaderMaterial({
      vertexShader: saturnRingVertex,
      fragmentShader: saturnRingFragment,
      uniforms: {
        uTime: { value: 0 },
        uSunDirection: { value: sunDirection },
      },
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
  }, [destination.id, sunDirection]);
  
  // Crack shader uniforms for damaged planets
  const crackUniforms = useMemo(() => ({
    uDamage: { value: 0 },
    uTime: { value: 0 },
    uBaseColor: { value: baseColor },
    uCrackColor: { value: new THREE.Color(1, 0.3, 0) }, // Orange-red cracks
  }), [baseColor]);
  
  // Handle respawning fade-in
  const respawnOpacity = healthState.damageState === 'respawning' 
    ? healthState.respawnProgress 
    : 1;
  
  useFrame((state) => {
    if (!meshRef.current) return;
    
    const time = state.clock.elapsedTime;
    
    // Slow rotation
    meshRef.current.rotation.y += 0.001;
    
    // Update shader time uniform
    if (shaderMaterialRef.current) {
      shaderMaterialRef.current.uniforms.uTime.value = time;
    }
    
    // Update cloud rotation and shader
    if (cloudMeshRef.current) {
      cloudMeshRef.current.rotation.y += 0.0012; // Slightly faster than planet
      if (cloudMaterialRef.current) {
        cloudMaterialRef.current.uniforms.uTime.value = time;
      }
    }
    
    // Update ring shader
    if (ringMeshRef.current && ringMaterial) {
      ringMaterial.uniforms.uTime.value = time;
    }
    
    // Update crack shader
    if (crackMaterialRef.current) {
      crackUniforms.uTime.value = time;
      crackUniforms.uDamage.value = damageLevel;
    }
    
    // Shake when critically damaged
    if (healthState.damageState === 'critical') {
      const shake = Math.sin(time * 50) * 0.1 * damageLevel;
      meshRef.current.position.x = destination.position.x + shake;
      meshRef.current.position.z = destination.position.z + shake * 0.5;
    }
    
    // Update atmosphere opacity
    if (atmosphereRef.current && atmosphereRef.current.material instanceof THREE.MeshBasicMaterial) {
      // Fade atmosphere as damage increases
      atmosphereRef.current.material.opacity = 0.15 * (1 - damageLevel * 0.7) * respawnOpacity;
    }
  });
  
  // Don't render if exploding, debris, or in middle of respawn fade
  if (healthState.damageState === 'exploding' || healthState.damageState === 'debris') {
    return null;
  }
  
  // Check if we should use damage overlay
  const showDamageOverlay = damageLevel > 0.1;
  
  return (
    <group position={destination.position.toArray()}>
      {/* Planet body with procedural shader */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[destination.radius, 64, 32]} />
        {showDamageOverlay ? (
          <shaderMaterial
            ref={crackMaterialRef}
            vertexShader={damageCrackVertexShader}
            fragmentShader={damageCrackFragmentShader}
            uniforms={crackUniforms}
            transparent={respawnOpacity < 1}
            opacity={respawnOpacity}
          />
        ) : shaderMaterial ? (
          <primitive 
            object={shaderMaterial} 
            ref={shaderMaterialRef}
            attach="material" 
          />
        ) : (
          <meshStandardMaterial
            color={destination.color}
            metalness={0.1}
            roughness={0.8}
            transparent={respawnOpacity < 1}
            opacity={respawnOpacity}
          />
        )}
      </mesh>
      
      {/* Earth cloud layer */}
      {destination.id === 'earth' && cloudMaterial && !showDamageOverlay && (
        <mesh ref={cloudMeshRef} scale={1.02}>
          <sphereGeometry args={[destination.radius, 64, 32]} />
          <primitive 
            object={cloudMaterial} 
            ref={cloudMaterialRef}
            attach="material" 
          />
        </mesh>
      )}
      
      {/* Atmosphere glow */}
      {destination.atmosphere && (
        <mesh ref={atmosphereRef} scale={1.05}>
          <sphereGeometry args={[destination.radius, 32, 16]} />
          <meshBasicMaterial
            color={destination.atmosphere}
            transparent
            opacity={0.15 * respawnOpacity}
            side={THREE.BackSide}
          />
        </mesh>
      )}
      
      {/* Saturn detailed rings with Cassini Division */}
      {destination.id === 'saturn' && ringMaterial && (
        <mesh 
          ref={ringMeshRef}
          rotation={[Math.PI / 2.5, 0, 0]}
        >
          <ringGeometry args={[destination.radius * 1.3, destination.radius * 2.4, 128]} />
          <primitive object={ringMaterial} attach="material" />
        </mesh>
      )}
      
      {/* Generic rings for other ringed planets (Uranus, Neptune) */}
      {destination.hasRings && destination.id !== 'saturn' && (
        <mesh rotation={[Math.PI / 2.5, 0, 0]}>
          <ringGeometry args={[destination.radius * 1.4, destination.radius * 2.2, 64]} />
          <meshBasicMaterial
            color={destination.ringColor || '#c9b896'}
            transparent
            opacity={0.4 * respawnOpacity * (1 - damageLevel * 0.5)}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
      
      {/* Target indicator when targeted */}
      {isTargeted && (
        <TargetIndicator radius={destination.radius} />
      )}
      
      {/* Damage smoke/fire effect when critical */}
      {healthState.damageState === 'critical' && (
        <CriticalDamageEffect radius={destination.radius} />
      )}
      
      {/* Health bar (only show when damaged and targeted) */}
      {isTargeted && damageLevel > 0 && (
        <HealthBar 
          health={healthState.health} 
          maxHealth={healthState.maxHealth} 
          radius={destination.radius}
        />
      )}
      
      {/* Destination marker/beacon */}
      <pointLight
        position={[0, destination.radius + 5, 0]}
        color={isTargeted ? 0xff4444 : 0x44ff88}
        intensity={isTargeted ? 40 : 20}
        distance={50}
      />
    </group>
  );
}

// Target indicator ring
function TargetIndicator({ radius }: { radius: number }) {
  const ringRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (ringRef.current) {
      // Rotate and pulse
      ringRef.current.rotation.z = state.clock.elapsedTime * 0.5;
      const pulse = Math.sin(state.clock.elapsedTime * 3) * 0.1 + 1;
      ringRef.current.scale.setScalar(pulse);
    }
  });
  
  return (
    <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
      <ringGeometry args={[radius * 1.3, radius * 1.4, 32]} />
      <meshBasicMaterial
        color={0xff4444}
        transparent
        opacity={0.6}
        side={THREE.DoubleSide}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

// Critical damage fire/smoke effect
function CriticalDamageEffect({ radius }: { radius: number }) {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (groupRef.current) {
      // Random flickering
      groupRef.current.children.forEach((child, i) => {
        if (child instanceof THREE.Mesh) {
          const flicker = Math.sin(state.clock.elapsedTime * 10 + i) * 0.3 + 0.7;
          if (child.material instanceof THREE.MeshBasicMaterial) {
            child.material.opacity = flicker * 0.5;
          }
          child.scale.setScalar(flicker);
        }
      });
    }
  });
  
  // Create several fire spots
  const spots = useMemo(() => {
    const positions: [number, number, number][] = [];
    for (let i = 0; i < 5; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const r = radius * 1.02;
      positions.push([
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi),
      ]);
    }
    return positions;
  }, [radius]);
  
  return (
    <group ref={groupRef}>
      {spots.map((pos, i) => (
        <mesh key={i} position={pos}>
          <sphereGeometry args={[radius * 0.15, 8, 8]} />
          <meshBasicMaterial
            color={0xff4400}
            transparent
            opacity={0.5}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}
    </group>
  );
}

// Health bar above planet
function HealthBar({ health, maxHealth, radius }: { health: number; maxHealth: number; radius: number }) {
  const percent = health / maxHealth;
  const barWidth = radius * 2;
  const barHeight = 0.5;
  
  // Color based on health
  const color = percent > 0.5 ? '#44ff44' : percent > 0.25 ? '#ffaa00' : '#ff4444';
  
  return (
    <group position={[0, radius + 3, 0]}>
      {/* Background */}
      <mesh>
        <planeGeometry args={[barWidth, barHeight]} />
        <meshBasicMaterial color="#333333" transparent opacity={0.7} />
      </mesh>
      
      {/* Health fill */}
      <mesh position={[-(barWidth * (1 - percent)) / 2, 0, 0.01]}>
        <planeGeometry args={[barWidth * percent, barHeight * 0.8]} />
        <meshBasicMaterial color={color} />
      </mesh>
    </group>
  );
}
