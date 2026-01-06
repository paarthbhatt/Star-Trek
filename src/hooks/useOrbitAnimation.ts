'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';

interface OrbitConfig {
  orbitRadius: number;
  orbitSpeed: number;
  rotationSpeed: number;
  inclination?: number;
  startAngle?: number;
}

export function useOrbitAnimation(config: OrbitConfig) {
  const {
    orbitRadius,
    orbitSpeed,
    rotationSpeed,
    inclination = 0,
    startAngle = 0,
  } = config;

  const angleRef = useRef(startAngle);
  const rotationRef = useRef(0);

  useFrame((_, delta) => {
    angleRef.current += orbitSpeed * delta;
    rotationRef.current += rotationSpeed * delta;
  });

  const getPosition = (): [number, number, number] => {
    const x = Math.cos(angleRef.current) * orbitRadius;
    const z = Math.sin(angleRef.current) * orbitRadius;
    const y = Math.sin(angleRef.current) * Math.sin(inclination) * orbitRadius * 0.1;
    return [x, y, z];
  };

  const getRotation = (): number => rotationRef.current;

  return { getPosition, getRotation, angleRef, rotationRef };
}

export function usePlanetaryMotion() {
  const earthAngle = useRef(0);
  const moonAngle = useRef(0);
  const marsAngle = useRef(Math.PI * 0.7);
  const gasGiantAngle = useRef(Math.PI * 1.3);

  const earthRotation = useRef(0);
  const marsRotation = useRef(0);
  const gasGiantRotation = useRef(0);

  useFrame((_, delta) => {
    // Orbital motion
    earthAngle.current += 0.02 * delta;
    moonAngle.current += 0.15 * delta;
    marsAngle.current += 0.012 * delta;
    gasGiantAngle.current += 0.005 * delta;

    // Rotation
    earthRotation.current += 0.1 * delta;
    marsRotation.current += 0.08 * delta;
    gasGiantRotation.current += 0.15 * delta;
  });

  return {
    earthAngle,
    moonAngle,
    marsAngle,
    gasGiantAngle,
    earthRotation,
    marsRotation,
    gasGiantRotation,
  };
}
