'use client';

import { Starfield } from './Starfield';
import { Sun } from './Sun';
import { Nebula } from './Nebula';
import { SpaceDust } from './SpaceDust';
import { AsteroidBelt, KuiperBelt } from './AsteroidBelt';
import { Constellations } from './Constellations';
import { MeteorShower } from './MeteorShower';
import { QualitySettings } from '@/hooks/useSettings';

interface SpaceEnvironmentProps {
  showConstellationLines?: boolean;
  meteorShowerIntensity?: 'none' | 'light' | 'moderate' | 'heavy';
  qualitySettings?: QualitySettings;
}

export function SpaceEnvironment({ 
  showConstellationLines = true,
  meteorShowerIntensity = 'light',
  qualitySettings,
}: SpaceEnvironmentProps) {
  // Meteor shower settings based on intensity
  const meteorSettings = {
    none: { count: 0, spawnRate: 0 },
    light: { count: 30, spawnRate: 1 },
    moderate: { count: 50, spawnRate: 3 },
    heavy: { count: 100, spawnRate: 8 },
  };
  
  const { count: meteorCount, spawnRate } = meteorSettings[meteorShowerIntensity];
  
  return (
    <group>
      {/* Background nebula - furthest layer */}
      <Nebula />

      {/* Star field with Milky Way band - quality-aware star count */}
      <Starfield qualitySettings={qualitySettings} />

      {/* Constellations - major star patterns with optional connecting lines */}
      <Constellations 
        showLines={showConstellationLines} 
        lineOpacity={0.2}
        starBrightness={1.2}
      />

      {/* Sun with corona and solar flares - central star */}
      <Sun position={[0, 0, -500]} />

      {/* Main Asteroid Belt - between Mars and Jupiter orbits, quality-aware */}
      <AsteroidBelt type="main" qualitySettings={qualitySettings} />

      {/* Kuiper Belt - outer solar system beyond Neptune */}
      <KuiperBelt qualitySettings={qualitySettings} />

      {/* Meteor shower effect */}
      {meteorShowerIntensity !== 'none' && (
        <MeteorShower 
          count={meteorCount} 
          spawnRate={spawnRate}
          radius={4000}
          speed={150}
        />
      )}

      {/* Space dust particles - closest layer, adds depth */}
      <SpaceDust />

      {/* Volumetric fog for depth - extended range for larger solar system */}
      <fog attach="fog" args={['#000510', 500, 5000]} />

      {/* Ambient lighting for minimum visibility in shadows */}
      <ambientLight color={0x111122} intensity={0.05} />
    </group>
  );
}
