'use client';

import { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { EffectComposer, Bloom, Vignette, Noise, ChromaticAberration } from '@react-three/postprocessing';
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
  const targetBloomIntensity = cinematicMode ? 2.0 : 1.0;

  useFrame((_, delta) => {
    bloomIntensityRef.current = THREE.MathUtils.lerp(
      bloomIntensityRef.current,
      targetBloomIntensity,
      delta * 2
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
        mipmapBlur={qualitySettings?.postProcessing === 'full'}
        kernelSize={qualitySettings?.postProcessing === 'full' ? KernelSize.LARGE : KernelSize.MEDIUM}
        blendFunction={BlendFunction.SCREEN}
      />
      <Vignette
        offset={0.3}
        darkness={0.6}
        eskil={false}
        blendFunction={BlendFunction.NORMAL}
      />
      <ChromaticAberration
        blendFunction={BlendFunction.NORMAL}
        offset={[cinematicMode ? 0.002 : 0, cinematicMode ? 0.002 : 0]}
        radialModulation={false}
        modulationOffset={0}
      />
      <Noise 
        opacity={cinematicMode ? 0.05 : 0}
        blendFunction={BlendFunction.OVERLAY}
      />
    </EffectComposer>
  );
}
