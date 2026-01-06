'use client';

import { useState, useCallback } from 'react';
import { ShipComponent, PanelStates, PanelState } from '@/types';

const initialPanelState: PanelState = {
  isOpen: false,
  isMinimized: false,
};

const initialPanelStates: PanelStates = {
  saucer: initialPanelState,
  engineering: initialPanelState,
  nacelles: initialPanelState,
  deflector: initialPanelState,
  mission: initialPanelState,
};

export function useShipSelection() {
  const [selectedComponent, setSelectedComponent] = useState<ShipComponent | null>(null);
  const [panelStates, setPanelStates] = useState<PanelStates>(initialPanelStates);
  const [hoveredComponent, setHoveredComponent] = useState<ShipComponent | null>(null);

  const selectComponent = useCallback((component: ShipComponent) => {
    setSelectedComponent(component);
    setPanelStates((prev) => ({
      ...prev,
      [component]: {
        isOpen: true,
        isMinimized: false,
      },
    }));
  }, []);

  const closePanel = useCallback((component: ShipComponent) => {
    setPanelStates((prev) => ({
      ...prev,
      [component]: {
        isOpen: false,
        isMinimized: false,
      },
    }));
    if (selectedComponent === component) {
      setSelectedComponent(null);
    }
  }, [selectedComponent]);

  const toggleMinimize = useCallback((component: ShipComponent) => {
    setPanelStates((prev) => ({
      ...prev,
      [component]: {
        ...prev[component],
        isMinimized: !prev[component].isMinimized,
      },
    }));
  }, []);

  const closeAllPanels = useCallback(() => {
    setPanelStates(initialPanelStates);
    setSelectedComponent(null);
  }, []);

  const openPanels = Object.entries(panelStates)
    .filter(([, state]) => state.isOpen)
    .map(([id]) => id as ShipComponent);

  return {
    selectedComponent,
    panelStates,
    hoveredComponent,
    openPanels,
    selectComponent,
    closePanel,
    toggleMinimize,
    closeAllPanels,
    setHoveredComponent,
  };
}
