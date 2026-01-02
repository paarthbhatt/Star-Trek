'use client';

import { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { BlendFunction, KernelSize } from 'postprocessing';
import { QualitySettings } from '@/hooks/useSettings';

interface PostProcessingProps {
  cinematicMode?: boolean;
  qualitySettings?: QualitySettings;
}

export function PostProcessing({ cinematicMode = false, qualitySettings }: PostProcessingProps) {
  const { gl, size, camera } = useThree();
  const composerRef = useRef<any>(null);
  const bloomIntensityRef = useRef(0);

  // JJ Abrams style bloom - stronger during warp
  const targetBloomIntensity = cinematicMode ? 1.5 : 0.8;

  useFrame((_, delta) => {
    bloomIntensityRef.current = THREE.MathUtils.lerp(
      bloomIntensityRef.current,
      targetBloomIntensity,
      delta * 3
    );
  });

  // Don't render bloom on low quality (check postProcessing setting)
  if (qualitySettings?.postProcessing === 'none') {
    return null;
  }

  return (
    <EffectComposer ref={composerRef}>
      <Bloom
        intensity={bloomIntensityRef.current}
        luminanceThreshold={0.2}
        luminanceSmoothing={0.9}
        mipmapBlur
        kernelSize={KernelSize.MEDIUM}
        blendFunction={BlendFunction.SCREEN}
      />
    </EffectComposer>
  );
}
