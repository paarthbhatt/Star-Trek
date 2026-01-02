import React, { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { useBridgeMode } from '../../hooks/useBridgeMode';
import { useFlightControls } from '../../hooks/useFlightControls';

// Placeholder bridge component since we don't have the 111MB GLB file
// This creates a basic geometry representation of the bridge
export const Bridge: React.FC = () => {
  const { isBridgeMode, currentStation, isSeated, setStation, toggleSeated, exitBridge } = useBridgeMode();
  const { camera } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  
  // Station positions (relative to center)
  const stations: Record<string, [number, number, number]> = {
    captain: [0, 0, 0],
    helm: [-1.5, -0.5, -2],
    tactical: [0, 0, 3],
    ops: [2, 0, 2],
    engineering: [-2, 0, 2],
    science: [1.5, -0.5, -2],
  };

  useFrame((state, delta) => {
    if (!isBridgeMode) return;

    // Smooth camera transition to current station
    const targetPos = new THREE.Vector3(...stations[currentStation]);
    
    // Add height offset if standing
    if (!isSeated) {
      targetPos.y += 1.0;
    } else {
        targetPos.y += 0.5; // Seated height
    }

    // Lerp camera position
    state.camera.position.lerp(targetPos, delta * 2);
    
    // Slight look adjustment based on station
    if (currentStation === 'captain') {
        state.camera.lookAt(0, 0, -5); // Look at viewscreen
    } else if (currentStation === 'helm') {
        state.camera.lookAt(0, 0, -5); // Look forward
    } else if (currentStation === 'tactical') {
        state.camera.lookAt(0, 0, -5); // Look forward/viewscreen
    }
  });

  if (!isBridgeMode) return null;

  return (
    <group ref={groupRef}>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
        <circleGeometry args={[5, 32]} />
        <meshStandardMaterial color="#333" />
      </mesh>

      {/* Ceiling */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 3, 0]}>
        <circleGeometry args={[5, 32]} />
        <meshStandardMaterial color="#222" />
      </mesh>

      {/* Walls */}
      <mesh position={[0, 1.5, 0]}>
        <cylinderGeometry args={[5, 5, 3, 32, 1, true]} />
        <meshStandardMaterial color="#444" side={THREE.BackSide} />
      </mesh>

      {/* Viewscreen */}
      <mesh position={[0, 1.5, -4.5]}>
        <planeGeometry args={[4, 2]} />
        <meshBasicMaterial color="black" />
        <Html transform position={[0, 0, 0.1]} scale={0.2} wrapperClass="viewscreen-ui">
            <div className="w-full h-full flex items-center justify-center text-cyan-400 font-mono text-xl pointer-events-none select-none">
                MAIN VIEW
            </div>
        </Html>
      </mesh>

      {/* Captain's Chair */}
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[0.8, 0.8, 0.8]} />
        <meshStandardMaterial color="#500" />
        <Html position={[0, 1, 0]} center>
            <div className="pointer-events-none select-none text-xs text-white bg-black/50 px-2 py-1 rounded">
                {currentStation === 'captain' ? (isSeated ? "Captain's Chair (Seated)" : "Captain's Chair (Standing)") : "Click to take station"}
            </div>
        </Html>
      </mesh>

      {/* Helm Console */}
      <mesh position={[-1.5, 0.5, -2]} onClick={() => setStation('helm')}>
        <boxGeometry args={[1, 0.8, 0.6]} />
        <meshStandardMaterial color="#ccc" />
        <Html position={[0, 1, 0]} center>
             <div className="cursor-pointer bg-black/50 text-white px-2 py-1 text-xs rounded hover:bg-cyan-900/80 transition-colors" onClick={() => setStation('helm')}>
                Helm
            </div>
        </Html>
      </mesh>
      
       {/* Tactical Console */}
       <mesh position={[0, 0.8, 3]} onClick={() => setStation('tactical')}>
        <boxGeometry args={[2, 0.8, 0.6]} />
        <meshStandardMaterial color="#ccc" />
         <Html position={[0, 1, 0]} center>
             <div className="cursor-pointer bg-black/50 text-white px-2 py-1 text-xs rounded hover:bg-red-900/80 transition-colors" onClick={() => setStation('tactical')}>
                Tactical
            </div>
        </Html>
      </mesh>

      {/* Ambient Light for Interior */}
      <pointLight position={[0, 2.5, 0]} intensity={0.5} />
      
      {/* UI Overlay for Instructions */}
      <Html fullscreen style={{ pointerEvents: 'none' }}>
        <div className="absolute bottom-10 left-10 text-cyan-500 font-mono text-sm bg-black/70 p-4 border border-cyan-800 rounded">
            <h3 className="text-lg mb-2 font-bold">BRIDGE CONTROLS</h3>
            <p>Current Station: {currentStation.toUpperCase()}</p>
            <p>State: {isSeated ? 'SEATED' : 'STANDING'}</p>
            <div className="mt-2 text-xs opacity-80">
                <p>[E] - Sit / Stand</p>
                <p>[B] - Exit Bridge View</p>
                <p>[Click] - Move to Station</p>
            </div>
        </div>
      </Html>
    </group>
  );
};
