// Types for USS Enterprise NCC-1701 Cinematic Experience

export type ShipComponent =
  | 'saucer'
  | 'engineering'
  | 'nacelles'
  | 'deflector'
  | 'mission';

export interface ComponentInfo {
  id: ShipComponent;
  name: string;
  subtitle: string;
  description: string;
  specs: {
    label: string;
    value: string;
  }[];
  systems: string[];
}

export interface ShipData {
  name: string;
  registry: string;
  class: string;
  launched: string;
  components: Record<ShipComponent, ComponentInfo>;
  missions: Mission[];
}

export interface Mission {
  stardate: string;
  title: string;
  description: string;
  status: 'completed' | 'ongoing' | 'classified';
}

export interface WindowPosition {
  x: number;
  y: number;
  z: number;
}

export interface PanelState {
  isOpen: boolean;
  isMinimized: boolean;
}

export type PanelStates = Record<ShipComponent, PanelState>;
