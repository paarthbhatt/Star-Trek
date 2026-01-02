'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import { Line } from '@react-three/drei';
import { DESTINATIONS, Destination } from '@/data/destinations';

interface OrbitLinesProps {
  visible?: boolean;
  opacity?: number;
  // Only show orbits for planets (not moons)
  showMoons?: boolean;
}

// Sun position from destinations
const SUN_POSITION = new THREE.Vector3(0, 0, -500);

// Generate orbit ellipse points
function generateOrbitPoints(
  destination: Destination,
  segments: number = 128
): [number, number, number][] {
  // For moons, orbit around their parent body
  let centerPos = SUN_POSITION;
  if (destination.parentId) {
    const parent = DESTINATIONS.find(d => d.id === destination.parentId);
    if (parent) {
      centerPos = parent.position.clone();
    }
  }

  // Calculate approximate radius from center
  const radius = destination.position.distanceTo(centerPos);
  
  // Generate circle points (simplified - real orbits are elliptical)
  const points: [number, number, number][] = [];
  
  for (let i = 0; i <= segments; i++) {
    const theta = (i / segments) * Math.PI * 2;
    const x = centerPos.x + Math.cos(theta) * radius;
    const y = centerPos.y; // Orbits approximately on same plane
    const z = centerPos.z + Math.sin(theta) * radius;
    points.push([x, y, z]);
  }
  
  return points;
}

// Get orbit color based on destination type
function getOrbitColor(dest: Destination): string {
  switch (dest.type) {
    case 'planet': return '#3388ff';
    case 'dwarf': return '#8866ff';
    case 'moon': return '#666688';
    case 'asteroid': return '#666666';
    case 'star': return '#ffaa00';
    default: return '#444488';
  }
}

// Single orbit line component
function OrbitLine({ 
  destination, 
  opacity = 0.3 
}: { 
  destination: Destination; 
  opacity?: number;
}) {
  const points = useMemo(() => 
    generateOrbitPoints(destination), 
    [destination]
  );

  const color = getOrbitColor(destination);

  return (
    <Line
      points={points}
      color={color}
      lineWidth={1}
      transparent
      opacity={opacity}
      depthWrite={false}
    />
  );
}

export function OrbitLines({ 
  visible = true, 
  opacity = 0.3,
  showMoons = false,
}: OrbitLinesProps) {
  // Filter destinations to show
  const orbitsToShow = useMemo(() => {
    return DESTINATIONS.filter(dest => {
      // Skip stations
      if (dest.type === 'station') return false;
      // Skip moons if not showing them
      if (dest.type === 'moon' && !showMoons) return false;
      // Skip the sun itself
      if (dest.id === 'sol') return false;
      // Include planets and dwarf planets
      return true;
    });
  }, [showMoons]);

  if (!visible) return null;

  return (
    <group name="orbit-lines">
      {orbitsToShow.map(dest => (
        <OrbitLine 
          key={dest.id} 
          destination={dest} 
          opacity={opacity}
        />
      ))}
    </group>
  );
}
