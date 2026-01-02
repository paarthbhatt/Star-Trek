'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import * as THREE from 'three';
import { AnimatePresence, motion } from 'framer-motion';
import { LoadingScreen } from '@/components/LoadingScreen';
import { Header } from '@/components/ui/Header';
import { ComponentMenu } from '@/components/ui/ComponentMenu';
import { InfoPanelsContainer } from '@/components/ui/InfoPanel';
import { CornerDecorations } from '@/components/ui/SystemReadout';
import { HelmConsole } from '@/components/ui/HelmConsole';
import { DestinationSelector } from '@/components/ui/DestinationSelector';
import { SettingsPanel, SettingsButton, FPSCounter } from '@/components/ui/SettingsPanel';
import { KeyboardIndicator } from '@/components/ui/KeyboardIndicator';
import { Tutorial, useFirstVisit } from '@/components/ui/Tutorial';
import { RadarDisplay } from '@/components/ui/RadarDisplay';
import { PhotoMode } from '@/components/ui/PhotoMode';
import { AlertOverlay, AnnouncementToast } from '@/components/ui/AlertOverlay';
import { PauseMenu, PauseButton } from '@/components/ui/PauseMenu';
import { useShipSelection } from '@/hooks/useShipSelection';
import { useCameraMode, CameraMode, getCameraModeDisplayName } from '@/hooks/useCameraMode';
import { useSettings } from '@/hooks/useSettings';
import { useKeyboardState } from '@/hooks/useKeyboardState';
import { useAnnouncements } from '@/hooks/useAnnouncements';
import { WARP_LINES, TACTICAL_LINES, ALERT_LINES, SYSTEM_LINES } from '@/data/voiceLines';
import { FlightState } from '@/hooks/useFlightControls';
import { WarpState } from '@/hooks/useWarpDrive';
import { WeaponsState } from '@/hooks/useWeapons';
import { ShieldState } from '@/hooks/useShipSystems';
import { Destination, formatETA, calculateDistance, calculateWarpETA } from '@/data/destinations';

import { useBridgeMode } from '@/hooks/useBridgeMode';

// Dynamically import the 3D scene to avoid SSR issues
const Scene = dynamic(() => import('@/components/Scene').then(mod => mod.Scene), {
  ssr: false,
  loading: () => null,
});

export default function Home() {
  const [isLoading, setIsLoading] = useState(true);
  const [flightState, setFlightState] = useState<FlightState | null>(null);
  const [weaponsState, setWeaponsState] = useState<WeaponsState | null>(null);
  const [shields, setShields] = useState<ShieldState | null>(null);
  const [hullIntegrity, setHullIntegrity] = useState(100);
  const [alertLevel, setAlertLevel] = useState<'green' | 'yellow' | 'red'>('green');
  const [warpLevel, setWarpLevel] = useState(1);
  const [warpState, setWarpState] = useState<WarpState>('idle');
  const [showPanels, setShowPanels] = useState(true);
  const [showHelmConsole, setShowHelmConsole] = useState(true);
  const [showDestinationSelector, setShowDestinationSelector] = useState(false);
  const [showControlsHelp, setShowControlsHelp] = useState(false);
  const [currentDestination, setCurrentDestination] = useState<Destination | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [phaserFiring, setPhaserFiring] = useState(false);
  const [torpedoFired, setTorpedoFired] = useState(false);
  const [targetNext, setTargetNext] = useState(false);
  const [destroyedPlanetName, setDestroyedPlanetName] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [currentFps, setCurrentFps] = useState(60);
  const [showRadar, setShowRadar] = useState(false);
  const [showOrbitLines, setShowOrbitLines] = useState(false);
  const [showPauseMenu, setShowPauseMenu] = useState(false);
  const currentPositionRef = useRef(new THREE.Vector3(0, 0, 0));
  const fpsRef = useRef({ frames: 0, lastTime: performance.now() });

  const { isBridgeMode, enterBridge, exitBridge, toggleSeated } = useBridgeMode();
  
  const {
    panelStates,
    hoveredComponent,
    openPanels,
    selectComponent,
    closePanel,
    toggleMinimize,
    setHoveredComponent,
  } = useShipSelection();

  // Camera mode system
  const cameraMode = useCameraMode({
    onModeChange: (newMode, prevMode) => {
      // Could play sound effects here in the future
      console.log(`Camera mode: ${prevMode} -> ${newMode}`);
    },
  });

  // Settings system
  const { settings, getQualitySettings } = useSettings();

  // Get current quality settings based on FPS
  const qualitySettings = getQualitySettings(currentFps);

  // Keyboard state for visual feedback
  const { keys: keyboardState } = useKeyboardState();

  // First visit / tutorial
  const { isFirstVisit, markVisited } = useFirstVisit();
  const [showTutorial, setShowTutorial] = useState(false);

  // Announcement system
  const { currentAnnouncement, announce, announceImmediate, isSpeaking } = useAnnouncements({
    enabled: true,
    voiceEnabled: settings.audioEnabled,
    volume: settings.audioVolume,
  });

  // Track previous states for announcement triggers
  const prevWarpStateRef = useRef<WarpState>('idle');
  const prevAlertLevelRef = useRef<'green' | 'yellow' | 'red'>('green');
  const hasAnnouncedWelcome = useRef(false);

  // Show tutorial for first-time visitors after loading
  useEffect(() => {
    if (!isLoading && isFirstVisit && !settings.tutorialCompleted) {
      // Small delay to let the scene render first
      const timer = setTimeout(() => setShowTutorial(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [isLoading, isFirstVisit, settings.tutorialCompleted]);

  // Welcome announcement on first load
  useEffect(() => {
    if (!isLoading && !hasAnnouncedWelcome.current) {
      hasAnnouncedWelcome.current = true;
      // Small delay for loading to settle
      const timer = setTimeout(() => {
        announce(SYSTEM_LINES.welcome);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isLoading, announce]);

  // Warp state change announcements
  const warpSequenceTimeRef = useRef(0);
  const hasEnteredCruising = useRef(false);
  
  useEffect(() => {
    const prev = prevWarpStateRef.current;
    prevWarpStateRef.current = warpState;

    if (prev === warpState) return;

    // When entering charging state, queue the sequence of announcements
    if (warpState === 'charging' && prev === 'idle') {
      warpSequenceTimeRef.current = Date.now();
      hasEnteredCruising.current = false;
      
      // Queue announcements in sequence
      announce(WARP_LINES.warpCharging);
      setTimeout(() => announce(WARP_LINES.enginesStandby), 800);
      setTimeout(() => announce(WARP_LINES.courseLaidIn), 1600);
      setTimeout(() => announce(WARP_LINES.braceForAcceleration), 2400);
      
    } else if (warpState === 'accelerating') {
      announce(WARP_LINES.warpEngage);
      
    } else if (warpState === 'cruising') {
      hasEnteredCruising.current = true;
      warpSequenceTimeRef.current = Date.now();
      
    } else if (warpState === 'decelerating') {
      // Check if this is a fast arrival (less than 3 seconds in cruising)
      const cruisingDuration = Date.now() - warpSequenceTimeRef.current;
      if (hasEnteredCruising.current && cruisingDuration < 3000) {
        // Fast arrival - interrupt any current announcement
        announceImmediate(WARP_LINES.arrivalDestination);
      }
      
    } else if (warpState === 'arriving') {
      // Normal arrival - only announce if not already done
      const cruisingDuration = Date.now() - warpSequenceTimeRef.current;
      if (!hasEnteredCruising.current || cruisingDuration >= 3000) {
        announce(WARP_LINES.arrivalDestination);
      }
      
    } else if (warpState === 'idle' && prev === 'decelerating') {
      announce(WARP_LINES.warpDisengage);
    }
  }, [warpState, announce, announceImmediate]);

  // Alert level change announcements
  useEffect(() => {
    const prev = prevAlertLevelRef.current;
    prevAlertLevelRef.current = alertLevel;

    if (prev === alertLevel) return;

    if (alertLevel === 'red') {
      announce(ALERT_LINES.redAlert);
    } else if (alertLevel === 'yellow') {
      announce(ALERT_LINES.yellowAlert);
    } else if (alertLevel === 'green' && prev !== 'green') {
      announce(ALERT_LINES.greenAlert);
    }
  }, [alertLevel, announce]);

  // Destination set announcement
  useEffect(() => {
    if (currentDestination) {
      announce(SYSTEM_LINES.navigationSet);
    }
  }, [currentDestination, announce]);

  const handleTutorialComplete = useCallback(() => {
    setShowTutorial(false);
    markVisited();
  }, [markVisited]);

  const handleTutorialSkip = useCallback(() => {
    setShowTutorial(false);
    markVisited();
  }, [markVisited]);

  // FPS counter
  useEffect(() => {
    if (!settings.showFPS) return;
    
    let animationId: number;
    const updateFps = () => {
      fpsRef.current.frames++;
      const now = performance.now();
      const delta = now - fpsRef.current.lastTime;
      
      if (delta >= 1000) {
        setCurrentFps(fpsRef.current.frames * 1000 / delta);
        fpsRef.current.frames = 0;
        fpsRef.current.lastTime = now;
      }
      
      animationId = requestAnimationFrame(updateFps);
    };
    
    animationId = requestAnimationFrame(updateFps);
    return () => cancelAnimationFrame(animationId);
  }, [settings.showFPS]);

  const handleLoadingComplete = useCallback(() => {
    setIsLoading(false);
  }, []);

  const handleFlightStateUpdate = useCallback((state: FlightState) => {
    setFlightState(state);
    currentPositionRef.current.copy(state.position);
  }, []);

  const handleWarpStateUpdate = useCallback((state: WarpState, level: number, dest: Destination | null) => {
    setWarpState(state);
  }, []);

  const handleWeaponsStateUpdate = useCallback((state: WeaponsState) => {
    setWeaponsState(state);
  }, []);

  const handleShipSystemsUpdate = useCallback((newShields: ShieldState, newHull: number, newAlert: 'green' | 'yellow' | 'red') => {
    setShields(newShields);
    setHullIntegrity(newHull);
    setAlertLevel(newAlert);
  }, []);

  const handlePlanetDestroyed = useCallback((planetName: string) => {
    setDestroyedPlanetName(planetName);
    // Clear after 3 seconds
    setTimeout(() => setDestroyedPlanetName(null), 3000);
  }, []);

  const handleDestinationSelect = useCallback((destination: Destination) => {
    setCurrentDestination(destination);
    setShowDestinationSelector(false);
  }, []);

  // Pause menu handlers
  const handlePauseResume = useCallback(() => {
    setShowPauseMenu(false);
  }, []);

  const handlePauseSettings = useCallback(() => {
    setShowPauseMenu(false);
    setShowSettings(true);
  }, []);

  const handlePauseQuit = useCallback(() => {
    // Reload the page to reset everything
    window.location.reload();
  }, []);

  // Calculate ETA to current destination
  const distance = currentDestination 
    ? calculateDistance(currentPositionRef.current, currentDestination.position)
    : 0;
  
  const eta = currentDestination 
    ? formatETA(calculateWarpETA(distance, warpLevel))
    : null;

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Warp level selection (1-9)
      if (/^[1-9]$/.test(e.key)) {
        setWarpLevel(parseInt(e.key, 10));
      }
      // Toggle panels with Tab
      if (e.key === 'Tab') {
        e.preventDefault();
        setShowPanels(prev => !prev);
      }
      // Open destination selector with N when not in warp
      if (e.key.toLowerCase() === 'n' && warpState === 'idle') {
        // If no active weapon target, open navigation
        // Otherwise N cycles through targets
        if (!showDestinationSelector) {
          setTargetNext(true);
          setTimeout(() => setTargetNext(false), 100);
        }
      }
      // Open navigation with V
      if (e.key.toLowerCase() === 'v') {
        setShowDestinationSelector(prev => !prev);
      }
      // Close modals with Escape or toggle pause menu
      if (e.key === 'Escape') {
        if (showDestinationSelector || showControlsHelp || showSettings) {
          setShowDestinationSelector(false);
          setShowControlsHelp(false);
          setShowSettings(false);
        } else if (!showPauseMenu && warpState === 'idle') {
          // Only allow pause when not warping
          setShowPauseMenu(true);
        } else if (showPauseMenu) {
          setShowPauseMenu(false);
        }
      }
      // Toggle audio with M
      if (e.key.toLowerCase() === 'm') {
        setAudioEnabled(prev => !prev);
      }
      // Toggle helm console with H (only in flight mode)
      // Note: H also returns to flight mode from freeLook/cinematic (handled in useCameraMode)
      if (e.key.toLowerCase() === 'h' && cameraMode.mode === 'flight') {
        setShowHelmConsole(prev => !prev);
      }
      // Toggle controls help with ?
      if (e.key === '?') {
        setShowControlsHelp(prev => !prev);
      }
      // Fire phaser with P (hold)
      if (e.key.toLowerCase() === 'p' && warpState === 'idle') {
        setPhaserFiring(true);
      }
      // Fire torpedo with G
      if (e.key.toLowerCase() === 'g' && warpState === 'idle') {
        setTorpedoFired(true);
        setTimeout(() => setTorpedoFired(false), 100);
      }
      // Toggle radar with R
      if (e.key.toLowerCase() === 'r') {
        setShowRadar(prev => !prev);
      }
      // Toggle orbit lines with O
      if (e.key.toLowerCase() === 'o') {
        setShowOrbitLines(prev => !prev);
      }
      
      // Toggle bridge mode with B
      if (e.key.toLowerCase() === 'b') {
        if (isBridgeMode) {
            exitBridge();
        } else {
            enterBridge();
        }
      }

      // Sit/Stand in Bridge Mode with E
      if (e.key.toLowerCase() === 'e' && isBridgeMode) {
        toggleSeated();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      // Stop phaser when P released
      if (e.key.toLowerCase() === 'p') {
        setPhaserFiring(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [warpState, showDestinationSelector, cameraMode.mode]);

  // Auto-hide panels during warp
  const showPanelsEffective = showPanels && warpState === 'idle';

  // Get warp state display text
  const getWarpStatus = () => {
    switch (warpState) {
      case 'charging': return 'WARP CORE CHARGING...';
      case 'accelerating': return 'ENGAGING WARP DRIVE...';
      case 'cruising': return `AT WARP ${warpLevel}`;
      case 'decelerating': return 'DROPPING TO IMPULSE...';
      case 'arriving': return 'ARRIVING AT DESTINATION';
      default: return null;
    }
  };

  const warpStatus = getWarpStatus();

  // Alert level colors
  const alertColors = {
    green: 'border-green-500/30',
    yellow: 'border-yellow-500/50',
    red: 'border-red-500/70',
  };

  return (
    <main className={`relative h-screen w-screen overflow-hidden bg-[#000510]`}>
      {/* Loading Screen */}
      <AnimatePresence>
        {isLoading && (
          <LoadingScreen onLoadingComplete={handleLoadingComplete} />
        )}
      </AnimatePresence>

      {/* Alert Overlay (red/yellow alert visual effects) */}
      {!isLoading && cameraMode.mode !== 'photo' && (
        <AlertOverlay alertLevel={alertLevel} showFlash />
      )}

      {/* Announcement Toast */}
      {!isLoading && cameraMode.mode !== 'photo' && (
        <AnnouncementToast announcement={currentAnnouncement} />
      )}

      {/* 3D Scene */}
      {!isLoading && (
        <>
          <Scene
            onSelectComponent={selectComponent}
            hoveredComponent={hoveredComponent}
            onHoverComponent={setHoveredComponent}
            onFlightStateUpdate={handleFlightStateUpdate}
            onWarpStateUpdate={handleWarpStateUpdate}
            onWeaponsStateUpdate={handleWeaponsStateUpdate}
            onShipSystemsUpdate={handleShipSystemsUpdate}
            onPlanetDestroyed={handlePlanetDestroyed}
            flightEnabled={cameraMode.isFlightEnabled}
            cameraMode={cameraMode.mode}
            isOrbitEnabled={cameraMode.isOrbitEnabled}
            isBridgeMode={isBridgeMode}
            selectedDestination={currentDestination}
            warpLevel={warpLevel}
            audioEnabled={audioEnabled}
            phaserFiring={phaserFiring}
            torpedoFired={torpedoFired}
            targetNext={targetNext}
            showOrbitLines={showOrbitLines}
            qualitySettings={qualitySettings}
          />

          {/* UI Overlay - Hide most UI in Bridge Mode unless needed */}
          {!isBridgeMode && <Header />}
          
          {showPanelsEffective && !isBridgeMode && (
            <>
              <ComponentMenu
                onSelectComponent={selectComponent}
                openPanels={openPanels}
              />

              <InfoPanelsContainer
                openPanels={openPanels}
                panelStates={panelStates}
                onClose={closePanel}
                onToggleMinimize={toggleMinimize}
              />
            </>
          )}

          {/* Planet Destroyed Notification */}
          <AnimatePresence>
            {destroyedPlanetName && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: -50 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: -50 }}
                className="fixed top-32 left-1/2 -translate-x-1/2 z-50"
              >
                <div className="bg-red-900/80 backdrop-blur-sm border-2 border-red-500 rounded-lg px-8 py-4 text-center">
                  <div className="text-red-400 font-bold text-2xl tracking-widest animate-pulse">
                    🎯 PLANET DESTROYED
                  </div>
                  <div className="text-white text-lg mt-2 font-mono">
                    {destroyedPlanetName}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Warp Status Overlay - Top Center, Minimized */}
          {warpStatus && (
            <div className="fixed top-24 left-1/2 -translate-x-1/2 z-40 pointer-events-none">
              <div className="bg-black/80 backdrop-blur-md border border-cyan-500/60 rounded-lg px-6 py-2 text-center shadow-lg shadow-cyan-500/20">
                <div className="text-cyan-400 font-bold text-lg tracking-widest">
                  {warpStatus}
                </div>
                {warpState === 'cruising' && currentDestination && (
                  <div className="text-gray-400 text-xs mt-1 font-mono">
                    Destination: {currentDestination.name} | ETA: {eta}
                  </div>
                )}
                {warpState === 'cruising' && (
                  <div className="text-gray-500 text-[10px] mt-1 font-mono">
                    Press <kbd className="text-cyan-400 text-[10px]">T</kbd> to skip | <kbd className="text-cyan-400 text-[10px]">X</kbd> to disengage
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Weapons Status HUD */}
          {weaponsState && warpState === 'idle' && (
            <div className="fixed bottom-24 right-4 z-30">
              <div className={`bg-black/60 backdrop-blur-sm border ${alertColors[alertLevel]} rounded-lg p-3 font-mono text-xs`}>
                <div className="text-gray-400 uppercase tracking-wider mb-2">Tactical</div>
                
                {/* Target Info */}
                <div className="mb-2">
                  <span className="text-gray-500">Target: </span>
                  {weaponsState.targetName ? (
                    <span className="text-red-400">{weaponsState.targetName}</span>
                  ) : (
                    <span className="text-gray-600">None</span>
                  )}
                  {weaponsState.targetDistance > 0 && (
                    <span className="text-gray-500 ml-2">
                      ({weaponsState.targetDistance.toFixed(0)}u)
                    </span>
                  )}
                </div>
                
                {/* Phaser Status */}
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-orange-400 w-16">Phasers</span>
                  <div className="flex-1 h-2 bg-gray-800 rounded overflow-hidden">
                    <div 
                      className={`h-full transition-all ${weaponsState.phaserOverheated ? 'bg-red-500' : 'bg-orange-500'}`}
                      style={{ width: `${weaponsState.phaserCharge}%` }}
                    />
                  </div>
                  <span className="text-gray-500 w-8">{weaponsState.phaserCharge.toFixed(0)}%</span>
                </div>
                
                {/* Torpedo Status */}
                <div className="flex items-center gap-2">
                  <span className="text-red-400 w-16">Torpedos</span>
                  <span className="text-white">{weaponsState.torpedoCount}</span>
                  <span className="text-gray-500">/ 64</span>
                  {weaponsState.torpedoReloading && (
                    <span className="text-yellow-500 ml-2">LOADING</span>
                  )}
                </div>
                
                {/* Weapons disabled warning */}
                {!weaponsState.weaponsEnabled && (
                  <div className="text-red-500 mt-2 animate-pulse">WEAPONS OFFLINE</div>
                )}
              </div>
            </div>
          )}

          {/* Shield Status HUD */}
          {shields && warpState === 'idle' && (
            <div className="fixed bottom-24 left-4 z-30">
              <div className={`bg-black/60 backdrop-blur-sm border ${alertColors[alertLevel]} rounded-lg p-3 font-mono text-xs`}>
                <div className="text-gray-400 uppercase tracking-wider mb-2">Defenses</div>
                
                {/* Hull Integrity */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-gray-400 w-16">Hull</span>
                  <div className="flex-1 h-2 bg-gray-800 rounded overflow-hidden">
                    <div 
                      className={`h-full transition-all ${hullIntegrity < 50 ? 'bg-red-500' : hullIntegrity < 80 ? 'bg-yellow-500' : 'bg-green-500'}`}
                      style={{ width: `${hullIntegrity}%` }}
                    />
                  </div>
                  <span className="text-gray-500 w-8">{hullIntegrity.toFixed(0)}%</span>
                </div>
                
                {/* Shield Quadrants */}
                <div className="grid grid-cols-2 gap-1 text-[10px]">
                  <div className="flex justify-between">
                    <span className="text-cyan-500">FWD</span>
                    <span className={shields.front < 30 ? 'text-red-400' : 'text-cyan-400'}>{shields.front.toFixed(0)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-cyan-500">AFT</span>
                    <span className={shields.rear < 30 ? 'text-red-400' : 'text-cyan-400'}>{shields.rear.toFixed(0)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-cyan-500">PORT</span>
                    <span className={shields.port < 30 ? 'text-red-400' : 'text-cyan-400'}>{shields.port.toFixed(0)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-cyan-500">STBD</span>
                    <span className={shields.starboard < 30 ? 'text-red-400' : 'text-cyan-400'}>{shields.starboard.toFixed(0)}%</span>
                  </div>
                </div>
                
                {/* Alert Status */}
                {alertLevel !== 'green' && (
                  <div className={`mt-2 text-center ${alertLevel === 'red' ? 'text-red-500 animate-pulse' : 'text-yellow-500'}`}>
                    {alertLevel.toUpperCase()} ALERT
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Radar Display */}
          <RadarDisplay
            shipPosition={currentPositionRef.current}
            targetId={weaponsState?.targetId}
            visible={showRadar && warpState === 'idle' && !isBridgeMode}
            range={500}
          />

          {/* Helm Console - Toggleable, only in flight mode and not during warp */}
          {showHelmConsole && cameraMode.mode === 'flight' && warpState === 'idle' && !isBridgeMode && (
            <HelmConsole
              flightState={flightState}
              warpLevel={warpLevel}
              destination={currentDestination?.name ?? null}
              eta={eta}
            />
          )}

          {/* Destination Selector Modal */}
          <DestinationSelector
            isOpen={showDestinationSelector}
            onClose={() => setShowDestinationSelector(false)}
            onSelect={handleDestinationSelect}
            currentPosition={currentPositionRef.current}
            warpLevel={warpLevel}
          />

          {/* Controls Help Modal */}
          <AnimatePresence>
            {showControlsHelp && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center"
                onClick={() => setShowControlsHelp(false)}
              >
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="bg-gray-900/95 border border-cyan-500/50 rounded-lg p-6 max-w-lg"
                  onClick={e => e.stopPropagation()}
                >
                  <h2 className="text-cyan-400 text-xl font-bold mb-4">CONTROLS</h2>
                  
                  <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm font-mono">
                    <div className="text-gray-400">Flight</div>
                    <div></div>
                    <div className="text-gray-500">W/S</div><div className="text-white">Throttle</div>
                    <div className="text-gray-500">A/D</div><div className="text-white">Turn</div>
                    <div className="text-gray-500">Q/E</div><div className="text-white">Roll</div>
                    <div className="text-gray-500">R/F</div><div className="text-white">Pitch</div>
                    
                    <div className="text-gray-400 mt-4">Warp</div>
                    <div></div>
                    <div className="text-gray-500">SPACE</div><div className="text-white">Engage Warp</div>
                    <div className="text-gray-500">1-9</div><div className="text-white">Warp Factor</div>
                    <div className="text-gray-500">T</div><div className="text-white">Skip to Destination</div>
                    <div className="text-gray-500">X</div><div className="text-white">Emergency Stop</div>
                    
                    <div className="text-gray-400 mt-4">Weapons</div>
                    <div></div>
                    <div className="text-gray-500">P (hold)</div><div className="text-white">Fire Phasers</div>
                    <div className="text-gray-500">G</div><div className="text-white">Fire Torpedo</div>
                    <div className="text-gray-500">N</div><div className="text-white">Select Target</div>
                    
                                    <div className="text-gray-400 mt-4">Camera</div>
                                    <div></div>
                                    <div className="text-gray-500">I</div><div className="text-white">Inspect Mode (360 view)</div>
                                    <div className="text-gray-500">C</div><div className="text-white">Cycle Camera Mode</div>
                                    <div className="text-gray-500">Shift+P</div><div className="text-white">Photo Mode</div>
                    
                    <div className="text-gray-400 mt-4">Interface</div>
                    <div></div>
                    <div className="text-gray-500">V</div><div className="text-white">Navigation</div>
                    <div className="text-gray-500">H</div><div className="text-white">Toggle Helm</div>
                    <div className="text-gray-500">TAB</div><div className="text-white">Toggle Panels</div>
                    <div className="text-gray-500">M</div><div className="text-white">Toggle Audio</div>
                    <div className="text-gray-500">?</div><div className="text-white">This Help</div>
                    <div className="text-gray-500">ESC</div><div className="text-white">Close Modals</div>
                  </div>
                  
                  <div className="text-gray-500 text-xs mt-4 text-center">
                    Press ESC or click outside to close
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          <CornerDecorations />

          {/* Keyboard Indicator - show when actively flying */}
          <KeyboardIndicator 
            keys={keyboardState} 
            visible={cameraMode.mode === 'flight' && warpState === 'idle' && !showHelmConsole && !isBridgeMode}
            compact
          />

          {/* Controls hint */}
          <div className="fixed top-20 right-4 text-gray-500 text-[10px] font-mono z-30 space-y-1 text-right">
            <div><kbd className="text-cyan-500/50">WASD</kbd> Flight Controls</div>
            <div><kbd className="text-cyan-500/50">SPACE</kbd> Engage Warp</div>
            <div><kbd className="text-orange-500/50">P</kbd> Phasers <kbd className="text-red-500/50">G</kbd> Torpedos</div>
            <div><kbd className="text-cyan-500/50">N</kbd> Target <kbd className="text-cyan-500/50">V</kbd> Navigation</div>
            <div><kbd className="text-cyan-500/50">1-9</kbd> Warp <kbd className="text-cyan-500/50">R</kbd> Radar {showRadar ? '(ON)' : '(OFF)'}</div>
            <div><kbd className="text-cyan-500/50">I</kbd> Inspect <kbd className="text-cyan-500/50">C</kbd> Camera</div>
            <div><kbd className="text-cyan-500/50">O</kbd> Orbits {showOrbitLines ? '(ON)' : '(OFF)'} <kbd className="text-cyan-500/50">Shift+P</kbd> Photo</div>
            <div><kbd className="text-cyan-500/50">H</kbd> Helm <kbd className="text-cyan-500/50">?</kbd> Help</div>
            <div><kbd className="text-cyan-500/50">M</kbd> Audio {audioEnabled ? '(ON)' : '(OFF)'}</div>
             <div><kbd className="text-cyan-500/50">B</kbd> Bridge Mode</div>
          </div>

          {/* Camera Mode Indicator */}
          {cameraMode.showUI && cameraMode.mode !== 'flight' && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="fixed top-20 left-1/2 -translate-x-1/2 z-40"
            >
              <div className="bg-black/70 backdrop-blur-sm border border-cyan-500/50 rounded-lg px-4 py-2 text-center">
                <div className="text-cyan-400 font-bold text-sm tracking-wider">
                  {getCameraModeDisplayName(cameraMode.mode)}
                </div>
                                <div className="text-gray-400 text-xs mt-1">
                                  {cameraMode.mode === 'freeLook' && 'Drag to rotate | Scroll to zoom | I or H to exit'}
                                  {cameraMode.mode === 'cinematic' && 'Auto-orbiting camera | C or H to return'}
                                </div>
              </div>
            </motion.div>
          )}

          {/* Destination indicator when not in warp */}
          {currentDestination && warpState === 'idle' && (
            <div className="fixed top-20 left-4 z-30">
              <div className="bg-black/60 backdrop-blur-sm border border-green-500/30 rounded-lg p-3">
                <div className="text-green-400/70 text-xs font-mono uppercase tracking-wider">
                  Navigation Target
                </div>
                <div className="text-white font-semibold">{currentDestination.name}</div>
                <div className="text-gray-400 text-xs font-mono mt-1">
                  {distance.toFixed(0)} units | ETA: {eta}
                </div>
                <div className="text-cyan-500 text-xs mt-2">
                  Press <kbd className="font-bold">SPACE</kbd> to engage warp
                </div>
              </div>
            </div>
          )}

          {/* Settings Button (gear icon) */}
          <SettingsButton onClick={() => setShowSettings(true)} />

          {/* Settings Panel */}
          <SettingsPanel
            isOpen={showSettings}
            onClose={() => setShowSettings(false)}
            currentFps={currentFps}
            audioEnabled={audioEnabled}
            onAudioToggle={setAudioEnabled}
          />

          {/* FPS Counter */}
          <FPSCounter fps={currentFps} visible={settings.showFPS} />

          {/* Tutorial */}
          <Tutorial 
            isActive={showTutorial}
            onComplete={handleTutorialComplete}
            onSkip={handleTutorialSkip}
          />

          {/* Photo Mode UI */}
          <PhotoMode 
            visible={cameraMode.mode === 'photo'}
            onExit={cameraMode.returnToFlight}
          />

          {/* Pause Button */}
          {cameraMode.mode !== 'photo' && warpState === 'idle' && (
            <PauseButton onClick={() => setShowPauseMenu(true)} />
          )}

          {/* Pause Menu */}
          <PauseMenu
            isOpen={showPauseMenu}
            onClose={() => setShowPauseMenu(false)}
            onResume={handlePauseResume}
            onSettings={handlePauseSettings}
            onQuit={handlePauseQuit}
          />
        </>
      )}
    </main>
  );
}
