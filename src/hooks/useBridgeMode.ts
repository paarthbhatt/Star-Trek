import { create } from 'zustand';
import * as THREE from 'three';

type BridgeStation = 'captain' | 'helm' | 'tactical' | 'ops' | 'engineering' | 'science';

interface BridgeState {
  isBridgeMode: boolean;
  currentStation: BridgeStation;
  isSeated: boolean;
  cameraRotation: THREE.Euler;
  
  // Actions
  enterBridge: () => void;
  exitBridge: () => void;
  setStation: (station: BridgeStation) => void;
  sitDown: () => void;
  standUp: () => void;
  toggleSeated: () => void;
}

export const useBridgeMode = create<BridgeState>((set) => ({
  isBridgeMode: false,
  currentStation: 'captain',
  isSeated: true,
  cameraRotation: new THREE.Euler(0, 0, 0),

  enterBridge: () => set({ isBridgeMode: true }),
  exitBridge: () => set({ isBridgeMode: false }),
  setStation: (station) => set({ currentStation: station, isSeated: false }),
  sitDown: () => set({ isSeated: true }),
  standUp: () => set({ isSeated: false }),
  toggleSeated: () => set((state) => ({ isSeated: !state.isSeated })),
}));
