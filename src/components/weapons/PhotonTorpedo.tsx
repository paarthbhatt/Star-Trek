
'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface PhotonTorpedoProps {
  position: THREE.Vector3;
  targetPosition: THREE.Vector3;
  onImpact: () => void;
}

export function PhotonTorpedo({ position, targetPosition, onImpact }: PhotonTorpedoProps) {
  const ref = useRef<THREE.Group>(null);
  const speed = 100; // Units per second
  const hasImpacted = useRef(false);

  useFrame((state, delta) => {
    if (!ref.current || hasImpacted.current) return;

    // Move towards target
    const direction = new THREE.Vector3().subVectors(targetPosition, ref.current.position).normalize();
    const distanceToTarget = ref.current.position.distanceTo(targetPosition);
    const moveDistance = speed * delta;

    if (distanceToTarget < moveDistance) {
      // Impact
      ref.current.position.copy(targetPosition);
      hasImpacted.current = true;
      onImpact();
    } else {
      ref.current.position.add(direction.multiplyScalar(moveDistance));
      ref.current.lookAt(targetPosition);
    }
  });

  if (hasImpacted.current) return null;

  return (
    <group ref={ref} position={position}>
      {/* Core glow */}
      <mesh>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshBasicMaterial color="#ff3300" toneMapped={false} />
      </mesh>
      
      {/* Outer glow */}
      <mesh>
        <sphereGeometry args={[0.6, 16, 16]} />
        <meshBasicMaterial color="#ff6600" transparent opacity={0.4} toneMapped={false} />
      </mesh>

      {/* Point light */}
      <pointLight color="#ff3300" intensity={2} distance={10} decay={2} />
    </group>
  );
}
