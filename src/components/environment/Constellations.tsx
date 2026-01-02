'use client';

import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

// Constellation data - positions relative to a sphere around the scene
// Each constellation has stars and connecting lines
interface Star {
  id: string;
  position: [number, number, number]; // Spherical coords converted to cartesian
  magnitude: number; // Brightness (lower = brighter)
  name?: string;
}

interface ConstellationData {
  name: string;
  stars: Star[];
  lines: [string, string][]; // Pairs of star IDs to connect
  mythology?: string;
}

// Distance for constellation sphere
const CONSTELLATION_DISTANCE = 8000;

// Convert RA/Dec-like angles to cartesian (simplified)
function sphericalToCartesian(
  theta: number, // Horizontal angle (0-360)
  phi: number,   // Vertical angle (-90 to 90)
  r: number = CONSTELLATION_DISTANCE
): [number, number, number] {
  const thetaRad = (theta * Math.PI) / 180;
  const phiRad = (phi * Math.PI) / 180;
  
  return [
    r * Math.cos(phiRad) * Math.cos(thetaRad),
    r * Math.sin(phiRad),
    r * Math.cos(phiRad) * Math.sin(thetaRad),
  ];
}

// Major constellation data
const CONSTELLATIONS: ConstellationData[] = [
  {
    name: 'Orion',
    mythology: 'The Hunter - One of the most recognizable constellations',
    stars: [
      { id: 'betelgeuse', position: sphericalToCartesian(45, 15), magnitude: 0.5, name: 'Betelgeuse' },
      { id: 'rigel', position: sphericalToCartesian(48, -5), magnitude: 0.2, name: 'Rigel' },
      { id: 'bellatrix', position: sphericalToCartesian(42, 12), magnitude: 1.6 },
      { id: 'saiph', position: sphericalToCartesian(51, -7), magnitude: 2.1 },
      { id: 'alnitak', position: sphericalToCartesian(46, 3), magnitude: 1.8 },
      { id: 'alnilam', position: sphericalToCartesian(46.5, 4), magnitude: 1.7, name: 'Alnilam' },
      { id: 'mintaka', position: sphericalToCartesian(47, 5), magnitude: 2.2 },
    ],
    lines: [
      ['betelgeuse', 'bellatrix'],
      ['betelgeuse', 'alnitak'],
      ['bellatrix', 'mintaka'],
      ['alnitak', 'alnilam'],
      ['alnilam', 'mintaka'],
      ['alnitak', 'saiph'],
      ['mintaka', 'rigel'],
      ['saiph', 'rigel'],
    ],
  },
  {
    name: 'Ursa Major',
    mythology: 'The Great Bear - Contains the Big Dipper asterism',
    stars: [
      { id: 'dubhe', position: sphericalToCartesian(120, 62), magnitude: 1.8, name: 'Dubhe' },
      { id: 'merak', position: sphericalToCartesian(115, 56), magnitude: 2.4 },
      { id: 'phecda', position: sphericalToCartesian(108, 54), magnitude: 2.4 },
      { id: 'megrez', position: sphericalToCartesian(105, 57), magnitude: 3.3 },
      { id: 'alioth', position: sphericalToCartesian(98, 56), magnitude: 1.8 },
      { id: 'mizar', position: sphericalToCartesian(92, 55), magnitude: 2.2, name: 'Mizar' },
      { id: 'alkaid', position: sphericalToCartesian(85, 49), magnitude: 1.9, name: 'Alkaid' },
    ],
    lines: [
      ['dubhe', 'merak'],
      ['merak', 'phecda'],
      ['phecda', 'megrez'],
      ['megrez', 'dubhe'],
      ['megrez', 'alioth'],
      ['alioth', 'mizar'],
      ['mizar', 'alkaid'],
    ],
  },
  {
    name: 'Cassiopeia',
    mythology: 'The Queen - W-shaped constellation',
    stars: [
      { id: 'schedar', position: sphericalToCartesian(200, 56), magnitude: 2.2, name: 'Schedar' },
      { id: 'caph', position: sphericalToCartesian(210, 59), magnitude: 2.3 },
      { id: 'gamma_cas', position: sphericalToCartesian(195, 60), magnitude: 2.5 },
      { id: 'ruchbah', position: sphericalToCartesian(188, 60), magnitude: 2.7 },
      { id: 'segin', position: sphericalToCartesian(180, 64), magnitude: 3.4 },
    ],
    lines: [
      ['caph', 'schedar'],
      ['schedar', 'gamma_cas'],
      ['gamma_cas', 'ruchbah'],
      ['ruchbah', 'segin'],
    ],
  },
  {
    name: 'Scorpius',
    mythology: 'The Scorpion - Summer constellation with red Antares',
    stars: [
      { id: 'antares', position: sphericalToCartesian(270, -26), magnitude: 1.0, name: 'Antares' },
      { id: 'graffias', position: sphericalToCartesian(265, -20), magnitude: 2.6 },
      { id: 'dschubba', position: sphericalToCartesian(268, -23), magnitude: 2.3 },
      { id: 'pi_sco', position: sphericalToCartesian(266, -26), magnitude: 2.9 },
      { id: 'sigma_sco', position: sphericalToCartesian(272, -26), magnitude: 2.9 },
      { id: 'tau_sco', position: sphericalToCartesian(275, -28), magnitude: 2.8 },
      { id: 'epsilon_sco', position: sphericalToCartesian(278, -34), magnitude: 2.3 },
      { id: 'shaula', position: sphericalToCartesian(285, -37), magnitude: 1.6, name: 'Shaula' },
      { id: 'lesath', position: sphericalToCartesian(286, -38), magnitude: 2.7 },
    ],
    lines: [
      ['graffias', 'dschubba'],
      ['dschubba', 'pi_sco'],
      ['pi_sco', 'antares'],
      ['antares', 'sigma_sco'],
      ['sigma_sco', 'tau_sco'],
      ['tau_sco', 'epsilon_sco'],
      ['epsilon_sco', 'shaula'],
      ['shaula', 'lesath'],
    ],
  },
  {
    name: 'Cygnus',
    mythology: 'The Swan - Also called the Northern Cross',
    stars: [
      { id: 'deneb', position: sphericalToCartesian(310, 45), magnitude: 1.3, name: 'Deneb' },
      { id: 'sadr', position: sphericalToCartesian(305, 40), magnitude: 2.2 },
      { id: 'gienah', position: sphericalToCartesian(300, 34), magnitude: 2.5 },
      { id: 'delta_cyg', position: sphericalToCartesian(302, 45), magnitude: 2.9 },
      { id: 'albireo', position: sphericalToCartesian(295, 28), magnitude: 3.1, name: 'Albireo' },
    ],
    lines: [
      ['deneb', 'sadr'],
      ['sadr', 'gienah'],
      ['sadr', 'delta_cyg'],
      ['sadr', 'albireo'],
    ],
  },
  {
    name: 'Leo',
    mythology: 'The Lion - Zodiac constellation',
    stars: [
      { id: 'regulus', position: sphericalToCartesian(150, 12), magnitude: 1.4, name: 'Regulus' },
      { id: 'denebola', position: sphericalToCartesian(175, 15), magnitude: 2.1, name: 'Denebola' },
      { id: 'algieba', position: sphericalToCartesian(152, 20), magnitude: 2.0 },
      { id: 'zosma', position: sphericalToCartesian(168, 21), magnitude: 2.6 },
      { id: 'chertan', position: sphericalToCartesian(168, 15), magnitude: 3.3 },
      { id: 'adhafera', position: sphericalToCartesian(154, 24), magnitude: 3.4 },
    ],
    lines: [
      ['regulus', 'algieba'],
      ['algieba', 'adhafera'],
      ['algieba', 'zosma'],
      ['zosma', 'chertan'],
      ['chertan', 'denebola'],
      ['zosma', 'denebola'],
    ],
  },
  {
    name: 'Lyra',
    mythology: 'The Lyre - Contains brilliant Vega',
    stars: [
      { id: 'vega', position: sphericalToCartesian(280, 39), magnitude: 0.0, name: 'Vega' },
      { id: 'sheliak', position: sphericalToCartesian(282, 33), magnitude: 3.5 },
      { id: 'sulafat', position: sphericalToCartesian(284, 32), magnitude: 3.3 },
      { id: 'delta1_lyr', position: sphericalToCartesian(281, 37), magnitude: 5.5 },
      { id: 'zeta1_lyr', position: sphericalToCartesian(279, 38), magnitude: 4.4 },
    ],
    lines: [
      ['vega', 'sheliak'],
      ['vega', 'sulafat'],
      ['sheliak', 'sulafat'],
      ['vega', 'delta1_lyr'],
      ['vega', 'zeta1_lyr'],
    ],
  },
  {
    name: 'Crux',
    mythology: 'The Southern Cross - Smallest constellation',
    stars: [
      { id: 'acrux', position: sphericalToCartesian(180, -63), magnitude: 0.8, name: 'Acrux' },
      { id: 'mimosa', position: sphericalToCartesian(185, -60), magnitude: 1.3 },
      { id: 'gacrux', position: sphericalToCartesian(182, -57), magnitude: 1.6 },
      { id: 'delta_cru', position: sphericalToCartesian(178, -59), magnitude: 2.8 },
    ],
    lines: [
      ['acrux', 'gacrux'],
      ['mimosa', 'delta_cru'],
    ],
  },
];

interface ConstellationsProps {
  showLines?: boolean;
  lineOpacity?: number;
  starBrightness?: number;
}

export function Constellations({ 
  showLines = true, 
  lineOpacity = 0.3,
  starBrightness = 1.0 
}: ConstellationsProps) {
  const starsRef = useRef<THREE.Points>(null);
  const linesRef = useRef<THREE.Group>(null);
  
  // Generate star geometry
  const { positions, sizes, colors } = useMemo(() => {
    const positions: number[] = [];
    const sizes: number[] = [];
    const colors: number[] = [];
    
    CONSTELLATIONS.forEach(constellation => {
      constellation.stars.forEach(star => {
        positions.push(...star.position);
        
        // Size based on magnitude (brighter = larger)
        const size = (4 - star.magnitude) * 15 * starBrightness;
        sizes.push(Math.max(5, size));
        
        // Color based on star type (simplified)
        let color: THREE.Color;
        if (star.name === 'Betelgeuse' || star.name === 'Antares') {
          color = new THREE.Color(0xff6644); // Red giants
        } else if (star.name === 'Rigel' || star.name === 'Vega') {
          color = new THREE.Color(0xaaccff); // Blue-white
        } else if (star.magnitude < 1) {
          color = new THREE.Color(0xffffee); // Bright white
        } else {
          color = new THREE.Color(0xffeedd); // Standard
        }
        colors.push(color.r, color.g, color.b);
      });
    });
    
    return { 
      positions: new Float32Array(positions),
      sizes: new Float32Array(sizes),
      colors: new Float32Array(colors)
    };
  }, [starBrightness]);
  
  // Generate line geometry for constellation patterns
  const lineGeometries = useMemo(() => {
    if (!showLines) return [];
    
    return CONSTELLATIONS.map(constellation => {
      const points: THREE.Vector3[] = [];
      
      constellation.lines.forEach(([startId, endId]) => {
        const startStar = constellation.stars.find(s => s.id === startId);
        const endStar = constellation.stars.find(s => s.id === endId);
        
        if (startStar && endStar) {
          points.push(new THREE.Vector3(...startStar.position));
          points.push(new THREE.Vector3(...endStar.position));
        }
      });
      
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      return { name: constellation.name, geometry };
    });
  }, [showLines]);
  
  // Subtle twinkling animation
  useFrame((state) => {
    if (starsRef.current) {
      const time = state.clock.elapsedTime;
      const sizes = starsRef.current.geometry.attributes.size;
      const baseValue = sizes.array as Float32Array;
      
      for (let i = 0; i < baseValue.length; i++) {
        // Vary size slightly for twinkling effect
        const twinkle = 1 + Math.sin(time * 2 + i * 0.5) * 0.1;
        baseValue[i] = baseValue[i] * twinkle;
      }
      sizes.needsUpdate = true;
    }
  });
  
  // Star material with glow
  const starMaterial = useMemo(() => {
    return new THREE.PointsMaterial({
      size: 30,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
  }, []);
  
  return (
    <group>
      {/* Constellation stars */}
      <points ref={starsRef} material={starMaterial}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[positions, 3]}
          />
          <bufferAttribute
            attach="attributes-size"
            args={[sizes, 1]}
          />
          <bufferAttribute
            attach="attributes-color"
            args={[colors, 3]}
          />
        </bufferGeometry>
      </points>
      
      {/* Constellation lines */}
      {showLines && (
        <group ref={linesRef}>
          {lineGeometries.map(({ name, geometry }) => (
            <lineSegments key={name} geometry={geometry}>
              <lineBasicMaterial 
                color={0x4488ff} 
                transparent 
                opacity={lineOpacity}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
              />
            </lineSegments>
          ))}
        </group>
      )}
    </group>
  );
}
