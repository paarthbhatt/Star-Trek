
import * as THREE from 'three';
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Destination } from '@/data/destinations';
import { atmosphereVertex, atmosphereFragment } from '@/shaders/atmosphere';
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

// Mapping destination IDs to shader types
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

// Get planet-specific colors for procedural shaders
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

interface PlanetProps {
  destination: Destination;
  sunDirection: THREE.Vector3;
  lodLevel?: 'high' | 'medium' | 'low';
}

export function DetailedPlanet({ 
  destination, 
  sunDirection,
  lodLevel = 'high'
}: PlanetProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const cloudMeshRef = useRef<THREE.Mesh>(null);
  const atmosphereRef = useRef<THREE.Mesh>(null);
  const shaderMaterialRef = useRef<THREE.ShaderMaterial>(null);
  const cloudMaterialRef = useRef<THREE.ShaderMaterial>(null);
  
  const shaderType = useMemo(() => getPlanetShaderType(destination.id), [destination.id]);
  const planetColors = useMemo(() => getPlanetColors(destination.id), [destination.id]);

  // Procedural shader material based on planet type
  const planetMaterial = useMemo(() => {
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
        // Fallback to simple standard material if no shader matches
        return new THREE.MeshStandardMaterial({
          color: destination.color,
          roughness: 0.8,
          metalness: 0.1,
        });
    }
    
    return new THREE.ShaderMaterial({
      vertexShader: proceduralPlanetVertex,
      fragmentShader,
      uniforms,
    });
  }, [shaderType, sunDirection, planetColors, destination]);

  // Cloud material (for Earth-like planets)
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
      depthWrite: false, // Prevents z-fighting with atmosphere
    });
  }, [destination.id, sunDirection]);

  // Atmosphere shader material
  const atmosphereMaterial = useMemo(() => {
    if (!destination.atmosphere) return null;
    
    return new THREE.ShaderMaterial({
      vertexShader: atmosphereVertex,
      fragmentShader: atmosphereFragment,
      uniforms: {
        uAtmosphereColor: { value: new THREE.Color(destination.atmosphere) },
        uIntensity: { value: 0.5 },
        uSunDirection: { value: sunDirection }
      },
      transparent: true,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
  }, [destination.atmosphere, sunDirection]);

  useFrame((state) => {
    const time = state.clock.elapsedTime;
    
    // Rotate planet
    if (meshRef.current) {
      meshRef.current.rotation.y = time * 0.02; 
    }
    
    // Update shader time uniforms
    if (shaderMaterialRef.current) {
      shaderMaterialRef.current.uniforms.uTime.value = time;
    }

    // Update cloud rotation and uniforms
    if (cloudMeshRef.current) {
      cloudMeshRef.current.rotation.y = time * 0.025; // Clouds move faster
      if (cloudMaterialRef.current) {
        cloudMaterialRef.current.uniforms.uTime.value = time;
      }
    }
  });

  return (
    <group>
      {/* Planet Surface */}
      <mesh ref={meshRef} castShadow receiveShadow>
        <sphereGeometry args={[destination.radius, lodLevel === 'high' ? 64 : 32, lodLevel === 'high' ? 64 : 32]} />
        {planetMaterial instanceof THREE.ShaderMaterial ? (
          <primitive object={planetMaterial} ref={shaderMaterialRef} attach="material" />
        ) : (
          <primitive object={planetMaterial} attach="material" />
        )}
      </mesh>
      
      {/* Cloud Layer (Earth only currently) */}
      {cloudMaterial && (
        <mesh ref={cloudMeshRef} scale={[1.01, 1.01, 1.01]}>
          <sphereGeometry args={[destination.radius, 64, 64]} />
          <primitive object={cloudMaterial} ref={cloudMaterialRef} attach="material" />
        </mesh>
      )}
      
      {/* Atmosphere Glow (Fresnel) */}
      {destination.atmosphere && atmosphereMaterial && (
        <mesh ref={atmosphereRef} scale={[1.15, 1.15, 1.15]}>
          <sphereGeometry args={[destination.radius, 64, 64]} />
          <primitive object={atmosphereMaterial} attach="material" />
        </mesh>
      )}
      
      {/* Rings if applicable */}
      {destination.hasRings && (
        <mesh rotation={[Math.PI / 2.5, 0, 0]} receiveShadow>
          <ringGeometry args={[destination.radius * 1.4, destination.radius * 2.2, 128]} />
          <meshStandardMaterial 
            color={destination.ringColor || "#c9b896"} 
            side={THREE.DoubleSide}
            transparent
            opacity={0.8}
          />
        </mesh>
      )}
    </group>
  );
}
