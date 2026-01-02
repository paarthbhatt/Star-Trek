import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import * as THREE from 'three';

// Define the game state interface
export interface GameState {
  // Ship State
  shipPosition: [number, number, number];
  shipRotation: [number, number, number, number]; // Quaternion
  shipVelocity: [number, number, number];
  
  // Navigation
  currentDestinationId: string | null;
  warpFactor: number;
  
  // Player Status
  isBridgeMode: boolean;
  bridgeStation: string | null; // 'captain', 'helm', 'tactical', etc.
  
  // Progress/World State
  destroyedPlanets: string[]; // IDs of destroyed planets
  missionLog: string[];
  
  // Settings
  lastSaveTime: number;
}

interface GameStateActions {
  saveGame: (currentData: Partial<GameState>) => void;
  loadGame: () => Partial<GameState> | null;
  resetGame: () => void;
}

// Helper to serialize Vector3/Quaternion to arrays
const serializeVector3 = (v: THREE.Vector3): [number, number, number] => [v.x, v.y, v.z];
const serializeQuaternion = (q: THREE.Quaternion): [number, number, number, number] => [q.x, q.y, q.z, q.w];

export const useGameState = create<GameState & GameStateActions>()(
  persist(
    (set, get) => ({
      // Initial State
      shipPosition: [0, 0, 0],
      shipRotation: [0, 0, 0, 1],
      shipVelocity: [0, 0, 0],
      currentDestinationId: null,
      warpFactor: 0,
      isBridgeMode: false,
      bridgeStation: 'captain',
      destroyedPlanets: [],
      missionLog: [],
      lastSaveTime: Date.now(),

      saveGame: (currentData) => {
        set((state) => ({
          ...state,
          ...currentData,
          lastSaveTime: Date.now(),
        }));
        console.log('Game Saved', get().lastSaveTime);
      },

      loadGame: () => {
        const state = get();
        // logic to restore state is handled by persist middleware automatically on init
        // but this method can be used to manually trigger a reload or return data
        return state;
      },

      resetGame: () => {
        set({
            shipPosition: [0, 0, 0],
            shipRotation: [0, 0, 0, 1],
            shipVelocity: [0, 0, 0],
            currentDestinationId: null,
            warpFactor: 0,
            isBridgeMode: false,
            bridgeStation: 'captain',
            destroyedPlanets: [],
            missionLog: [],
            lastSaveTime: Date.now(),
        });
      }
    }),
    {
      name: 'startrek-save-data', // name of the item in the storage (must be unique)
      partialize: (state) => ({
        shipPosition: state.shipPosition,
        shipRotation: state.shipRotation,
        currentDestinationId: state.currentDestinationId,
        destroyedPlanets: state.destroyedPlanets,
        lastSaveTime: state.lastSaveTime,
      }), // Only persist specific fields
    }
  )
);
