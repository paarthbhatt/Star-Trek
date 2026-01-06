'use client';

import { useRef, useCallback, useEffect } from 'react';

export type SoundType = 
  | 'engineIdle'
  | 'engineImpulse'
  | 'warpCharge'
  | 'warpEngage'
  | 'warpCruise'
  | 'warpDisengage'
  | 'uiBeep'
  | 'uiConfirm'
  | 'uiAlert'
  | 'viewscreen'
  | 'phaserFire'
  | 'phaserStop'
  | 'torpedoLaunch'
  | 'torpedoImpact'
  | 'planetDamage'
  | 'planetExplode'
  | 'shieldHit'
  | 'targetLock'
  | 'uiClick'     // New
  | 'uiHover'     // New
  | 'uiOpen'      // New
  | 'uiClose'     // New
  | 'ambienceRumble' // New - Gas Giants/Sun
  | 'ambienceEthereal' // New - Earth/Water planets
  | 'ambienceStatic'; // New - Stations/Radio

interface AudioState {
  context: AudioContext | null;
  masterGain: GainNode | null;
  activeOscillators: Map<string, OscillatorNode[]>;
  activeGains: Map<string, GainNode>;
  activeSources: Map<string, AudioBufferSourceNode>; // Track noise sources
}

export function useAudio(enabled: boolean = true) {
  const stateRef = useRef<AudioState>({
    context: null,
    masterGain: null,
    activeOscillators: new Map(),
    activeGains: new Map(),
    activeSources: new Map(),
  });

  // Initialize audio context on first user interaction
  const initAudio = useCallback(() => {
    if (stateRef.current.context) return;

    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const masterGain = ctx.createGain();
    masterGain.gain.value = 0.3; // Master volume
    masterGain.connect(ctx.destination);

    stateRef.current.context = ctx;
    stateRef.current.masterGain = masterGain;
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      const { context, activeOscillators, activeSources } = stateRef.current;
      activeOscillators.forEach((oscs) => {
        oscs.forEach(osc => {
          try { osc.stop(); } catch (e) {}
        });
      });
      activeSources.forEach((source) => {
        try { source.stop(); } catch (e) {}
      });
      if (context) {
        context.close();
      }
    };
  }, []);

  // Create a simple oscillator tone
  const createTone = useCallback((
    frequency: number,
    type: OscillatorType = 'sine',
    gainValue: number = 0.1,
    duration?: number
  ): { oscillator: OscillatorNode; gain: GainNode } | null => {
    const { context, masterGain } = stateRef.current;
    if (!context || !masterGain || !enabled) return null;

    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gain.gain.value = gainValue;

    oscillator.connect(gain);
    gain.connect(masterGain);
    oscillator.start();

    if (duration) {
      gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);
      oscillator.stop(context.currentTime + duration + 0.1);
    }

    return { oscillator, gain };
  }, [enabled]);

  // Create noise generator
  const createNoise = useCallback((
    gainValue: number = 0.05,
    duration?: number
  ): { source: AudioBufferSourceNode; gain: GainNode } | null => {
    const { context, masterGain } = stateRef.current;
    if (!context || !masterGain || !enabled) return null;

    // Create white noise buffer
    const bufferSize = context.sampleRate * 2;
    const buffer = context.createBuffer(1, bufferSize, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const source = context.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const gain = context.createGain();
    gain.gain.value = gainValue;

    // Low-pass filter for engine rumble
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 200;

    source.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);
    source.start();

    if (duration) {
      gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);
      source.stop(context.currentTime + duration + 0.1);
    }

    return { source, gain };
  }, [enabled]);

  // Stop a looping sound
  const stopSound = useCallback((id: string) => {
    const { activeOscillators, activeGains, activeSources, context } = stateRef.current;
    
    const oscs = activeOscillators.get(id);
    const source = activeSources.get(id);
    const gain = activeGains.get(id);
    
    if (gain && context) {
      // Immediate fade out
      try {
        gain.gain.cancelScheduledValues(context.currentTime);
        gain.gain.setValueAtTime(gain.gain.value, context.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.2);
      } catch (e) {}
    }
    
    // Stop oscillators and buffer sources after short fade
    setTimeout(() => {
      if (oscs) {
        oscs.forEach(osc => {
          try { osc.stop(); } catch (e) {}
        });
        activeOscillators.delete(id);
      }
      if (source) {
        try { source.stop(); } catch (e) {}
        activeSources.delete(id);
      }
      activeGains.delete(id);
    }, 250);
  }, []);

  // Stop all sounds (for cleanup)
  const stopAllSounds = useCallback(() => {
    const { activeOscillators, activeGains, activeSources, context } = stateRef.current;
    
    // Stop all tracked oscillators
    for (const [id, oscs] of activeOscillators) {
      const gain = activeGains.get(id);
      if (gain && context) {
        try {
          gain.gain.cancelScheduledValues(context.currentTime);
          gain.gain.setValueAtTime(gain.gain.value, context.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.1);
        } catch (e) {}
      }
      setTimeout(() => {
        oscs.forEach(osc => {
          try { osc.stop(); } catch (e) {}
        });
      }, 150);
    }

    // Stop all tracked sources (noise buffers)
    for (const [id, source] of activeSources) {
       // Gain handling is shared if ID matches, already handled above
       setTimeout(() => {
         try { source.stop(); } catch (e) {}
       }, 150);
    }
    
    activeOscillators.clear();
    activeSources.clear();
    activeGains.clear();
  }, []);

  // Engine idle sound - low frequency hum
  const playEngineIdle = useCallback(() => {
    initAudio();
    const { context, masterGain } = stateRef.current;
    if (!context || !masterGain || !enabled) return;

    stopSound('engine');

    const oscs: OscillatorNode[] = [];
    const gain = context.createGain();
    gain.gain.value = 0.05; // Reduced volume
    gain.connect(masterGain);

    // Low-pass filter for smooth sound
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 100;
    filter.Q.value = 0.5;

    // Base frequency hum
    const osc1 = context.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.value = 45; // Lower frequency
    osc1.connect(filter);
    filter.connect(gain);
    osc1.start();
    oscs.push(osc1);

    // Sub-harmonic for depth
    const osc2 = context.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = 22.5; // Half frequency
    const gain2 = context.createGain();
    gain2.gain.value = 0.02;
    osc2.connect(gain2);
    gain2.connect(gain);
    osc2.start();
    oscs.push(osc2);

    // Very subtle amplitude variation (no frequency modulation)
    const lfo = context.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.15; // Very slow
    const lfoGain = context.createGain();
    lfoGain.gain.value = 0.008; // Barely perceptible
    lfo.connect(lfoGain);
    lfoGain.connect(gain.gain); // Amplitude only
    lfo.start();
    oscs.push(lfo);

    stateRef.current.activeOscillators.set('engine', oscs);
    stateRef.current.activeGains.set('engine', gain);
  }, [initAudio, stopSound, enabled]);

  // Engine impulse sound - higher pitch with more harmonics
  const playEngineImpulse = useCallback((power: number = 0.5) => {
    initAudio();
    const { context, masterGain, activeOscillators, activeGains } = stateRef.current;
    if (!context || !masterGain || !enabled) return;

    // Check if engine is already running
    if (activeOscillators.has('engine') && activeGains.has('engine')) {
      const oscs = activeOscillators.get('engine');
      const gain = activeGains.get('engine');
      
      if (oscs && oscs.length >= 3 && gain) {
        // Update existing sound
        const baseFreq = 55 + power * 25;
        
        // Smoothly ramp to new values to prevent clicking
        const time = context.currentTime;
        const rampTime = 0.1; // 100ms smoothing
        
        // Update gain/volume
        gain.gain.setTargetAtTime(0.06 + power * 0.04, time, rampTime);
        
        // Update frequencies
        oscs[0].frequency.setTargetAtTime(baseFreq, time, rampTime);
        oscs[1].frequency.setTargetAtTime(baseFreq * 0.5, time, rampTime);
        oscs[2].frequency.setTargetAtTime(0.8 + power * 0.5, time, rampTime);
        
        return; // Done updating
      }
    }

    // If not running, create new
    stopSound('engine');

    const oscs: OscillatorNode[] = [];
    const gain = context.createGain();
    gain.gain.value = 0.06 + power * 0.04;
    gain.connect(masterGain);

    // Base frequency - increases with power
    const baseFreq = 55 + power * 25;
    
    const osc1 = context.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.value = baseFreq;
    
    // Filter to smooth the sound
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 150 + power * 100;
    filter.Q.value = 0.5;
    
    osc1.connect(filter);
    filter.connect(gain);
    osc1.start();
    oscs.push(osc1);

    // Second oscillator for sub-bass rumble
    const osc2 = context.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = baseFreq * 0.5;
    const gain2 = context.createGain();
    gain2.gain.value = 0.03;
    osc2.connect(gain2);
    gain2.connect(gain);
    osc2.start();
    oscs.push(osc2);

    // Very subtle pulsing LFO
    const lfo = context.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.8 + power * 0.5;
    const lfoGain = context.createGain();
    lfoGain.gain.value = 0.01;
    lfo.connect(lfoGain);
    lfoGain.connect(gain.gain);
    lfo.start();
    oscs.push(lfo);

    stateRef.current.activeOscillators.set('engine', oscs);
    stateRef.current.activeGains.set('engine', gain);
  }, [initAudio, stopSound, enabled]);

  // Bridge ambience - steady hum + random beeps
  const playBridgeAmbience = useCallback(() => {
    initAudio();
    const { context, masterGain, activeOscillators } = stateRef.current;
    if (!context || !masterGain || !enabled) return;

    if (activeOscillators.has('bridge')) return; // Already playing

    const oscs: OscillatorNode[] = [];
    const gain = context.createGain();
    gain.gain.value = 0.08; // Increased background volume slightly
    gain.connect(masterGain);

    // Deep deck hum (Star Trek TNG style) - The "Room Tone"
    const hum = context.createOscillator();
    hum.type = 'sine';
    hum.frequency.value = 58; // Low C# approx - classic TNG rumble note
    
    // Add multiple harmonics for that "air conditioner" sound
    const hum2 = context.createOscillator();
    hum2.type = 'triangle'; // Richer tone than sine
    hum2.frequency.value = 110; 
    const hum2Gain = context.createGain();
    hum2Gain.gain.value = 0.15;
    hum2.connect(hum2Gain);
    hum2Gain.connect(gain);

    // Pink noise for air texture (ventilation)
    const bufferSize = context.sampleRate * 2;
    const buffer = context.createBuffer(1, bufferSize, context.sampleRate);
    const data = buffer.getChannelData(0);
    let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (lastOut + (0.02 * white)) / 1.02;
      lastOut = data[i];
      data[i] *= 3.5;
    }

    const noise = context.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;
    const noiseFilter = context.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.value = 120; // Muffled air
    const noiseGain = context.createGain();
    noiseGain.gain.value = 0.25; // Prominent air hiss

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(gain);
    noise.start();

    // Connect hums
    hum.connect(gain);
    hum.start();
    hum2.start();

    oscs.push(hum);
    oscs.push(hum2);
    // Cast to any to store in oscillator array
    oscs.push(noise as any);

    stateRef.current.activeOscillators.set('bridge', oscs);
    stateRef.current.activeGains.set('bridge', gain);

    // Schedule random beeps (simulated computer activity - LCARS style chirps)
    const scheduleBeep = () => {
      // Check if bridge sound is still active
      if (!stateRef.current.activeOscillators.has('bridge')) return;
      
      if (Math.random() > 0.6) {
        // LCARS style: High-High or High-Low chirps
        // Frequencies often around 1000Hz - 2500Hz
        const baseFreq = 1200 + Math.random() * 1000;
        
        // Short duration clean tones
        createTone(baseFreq, 'sine', 0.03, 0.08);
        
        // Sometimes double chirp
        if (Math.random() > 0.4) {
           const nextFreq = Math.random() > 0.5 ? baseFreq * 1.5 : baseFreq * 0.8;
           setTimeout(() => createTone(nextFreq, 'sine', 0.03, 0.08), 120);
        }
        
        // Rare: Triple chirp (processing sound)
        if (Math.random() > 0.85) {
            setTimeout(() => createTone(baseFreq * 1.2, 'sine', 0.03, 0.06), 240);
        }
      }
      
      // Schedule next event - keep it somewhat busy but not annoying
      setTimeout(scheduleBeep, 3000 + Math.random() * 6000);
    };
    scheduleBeep();

  }, [initAudio, createTone, enabled]);

  // Warp charge sound - rising tone
  const playWarpCharge = useCallback(() => {
    initAudio();
    const { context, masterGain } = stateRef.current;
    if (!context || !masterGain || !enabled) return;

    stopSound('warp');

    const oscs: OscillatorNode[] = [];
    const gain = context.createGain();
    gain.gain.value = 0.15;
    gain.connect(masterGain);

    // Rising tone
    const osc1 = context.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.value = 100;
    osc1.frequency.exponentialRampToValueAtTime(800, context.currentTime + 1.5);
    osc1.connect(gain);
    osc1.start();
    oscs.push(osc1);

    // Harmonic that follows
    const osc2 = context.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = 200;
    osc2.frequency.exponentialRampToValueAtTime(1600, context.currentTime + 1.5);
    const gain2 = context.createGain();
    gain2.gain.value = 0.08;
    osc2.connect(gain2);
    gain2.connect(gain);
    osc2.start();
    oscs.push(osc2);

    stateRef.current.activeOscillators.set('warp', oscs);
    stateRef.current.activeGains.set('warp', gain);
  }, [initAudio, stopSound, enabled]);

  // Warp engage sound - dramatic swoosh
  const playWarpEngage = useCallback(() => {
    initAudio();
    const { context, masterGain } = stateRef.current;
    if (!context || !masterGain || !enabled) return;

    // Quick burst
    createTone(1200, 'sine', 0.2, 0.1);
    createTone(600, 'sine', 0.15, 0.15);
    
    // Sweep down
    setTimeout(() => {
      const osc = context.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = 2000;
      osc.frequency.exponentialRampToValueAtTime(100, context.currentTime + 0.5);
      
      const gain = context.createGain();
      gain.gain.value = 0.2;
      gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.5);
      
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start();
      osc.stop(context.currentTime + 0.6);
    }, 100);
  }, [initAudio, createTone, enabled]);

  // Warp cruise sound - steady high-pitched hum
  const playWarpCruise = useCallback((warpLevel: number = 1) => {
    initAudio();
    const { context, masterGain } = stateRef.current;
    if (!context || !masterGain || !enabled) return;

    stopSound('warp');

    const oscs: OscillatorNode[] = [];
    const gain = context.createGain();
    gain.gain.value = 0.08; // Reduced volume
    gain.connect(masterGain);

    const baseFreq = 120 + warpLevel * 20; // Lower base frequency

    // Low-pass filter to remove harshness
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 400;
    filter.Q.value = 0.5;

    // Main warp tone
    const osc1 = context.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.value = baseFreq;
    osc1.connect(filter);
    filter.connect(gain);
    osc1.start();
    oscs.push(osc1);

    // Very subtle pulsing effect - amplitude only
    const lfo = context.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 1.5 + warpLevel * 0.3; // Slower pulse
    const lfoGain = context.createGain();
    lfoGain.gain.value = 0.015; // Very subtle
    lfo.connect(lfoGain);
    lfoGain.connect(gain.gain); // Amplitude modulation, not frequency
    lfo.start();
    oscs.push(lfo);

    // Soft sub-bass
    const osc2 = context.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = baseFreq * 0.5;
    const gain2 = context.createGain();
    gain2.gain.value = 0.02;
    osc2.connect(gain2);
    gain2.connect(gain);
    osc2.start();
    oscs.push(osc2);

    stateRef.current.activeOscillators.set('warp', oscs);
    stateRef.current.activeGains.set('warp', gain);
  }, [initAudio, stopSound, enabled]);

  // Warp disengage sound
  const playWarpDisengage = useCallback(() => {
    initAudio();
    const { context, masterGain } = stateRef.current;
    if (!context || !masterGain || !enabled) return;

    // IMPORTANT: Stop the warp cruise sound first
    stopSound('warp');

    // Short delay to ensure warp sound is fading
    setTimeout(() => {
      if (!context || !masterGain) return;
      
      // Descending tone (short, not looping)
      const osc = context.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = 600;
      osc.frequency.exponentialRampToValueAtTime(80, context.currentTime + 0.8);
      
      const gain = context.createGain();
      gain.gain.value = 0.15;
      gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 1);
      
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start();
      osc.stop(context.currentTime + 1.1);
    }, 100);
  }, [initAudio, stopSound, enabled]);

  // UI beep sound
  const playUIBeep = useCallback(() => {
    initAudio();
    if (!enabled) return;
    createTone(880, 'sine', 0.1, 0.1);
  }, [initAudio, createTone, enabled]);

  // UI confirm sound
  const playUIConfirm = useCallback(() => {
    initAudio();
    const { context } = stateRef.current;
    if (!context || !enabled) return;
    
    createTone(660, 'sine', 0.1, 0.08);
    setTimeout(() => createTone(880, 'sine', 0.1, 0.1), 80);
  }, [initAudio, createTone, enabled]);

  // UI alert sound
  const playUIAlert = useCallback(() => {
    initAudio();
    if (!enabled) return;
    
    createTone(440, 'square', 0.08, 0.15);
    setTimeout(() => createTone(440, 'square', 0.08, 0.15), 200);
    setTimeout(() => createTone(440, 'square', 0.08, 0.15), 400);
  }, [initAudio, createTone, enabled]);

  // NEW UI SOUNDS
  // ----------------------------------------------------

  const playUIClick = useCallback(() => {
    initAudio();
    if (!enabled) return;
    // High pitched short chirp
    createTone(1200, 'sine', 0.08, 0.05);
  }, [initAudio, createTone, enabled]);

  const playUIHover = useCallback(() => {
    initAudio();
    if (!enabled) return;
    // Very soft, high tick
    createTone(800, 'triangle', 0.02, 0.03);
  }, [initAudio, createTone, enabled]);

  const playUIOpen = useCallback(() => {
    initAudio();
    const { context } = stateRef.current;
    if (!context || !enabled) return;
    
    // Ascending harmonic sweep
    createTone(400, 'sine', 0.05, 0.1);
    setTimeout(() => createTone(600, 'sine', 0.05, 0.1), 50);
    setTimeout(() => createTone(800, 'sine', 0.05, 0.1), 100);
  }, [initAudio, createTone, enabled]);

  const playUIClose = useCallback(() => {
    initAudio();
    const { context } = stateRef.current;
    if (!context || !enabled) return;
    
    // Descending harmonic sweep
    createTone(800, 'sine', 0.05, 0.1);
    setTimeout(() => createTone(600, 'sine', 0.05, 0.1), 50);
    setTimeout(() => createTone(400, 'sine', 0.05, 0.1), 100);
  }, [initAudio, createTone, enabled]);


  // Viewscreen activation sound
  const playViewscreen = useCallback(() => {
    initAudio();
    const { context, masterGain } = stateRef.current;
    if (!context || !masterGain || !enabled) return;

    // Static burst
    const noise = createNoise(0.1, 0.3);
    
    // Tone sweep
    setTimeout(() => {
      createTone(200, 'sine', 0.1, 0.2);
      createTone(400, 'sine', 0.08, 0.25);
    }, 100);
  }, [initAudio, createNoise, createTone, enabled]);

  // Phaser fire sound - Kelvin pulse style (rapid energetic pulses)
  const playPhaserFire = useCallback(() => {
    initAudio();
    const { context, masterGain } = stateRef.current;
    if (!context || !masterGain || !enabled) return;

    // Stop any existing phaser sound
    stopSound('phaser');

    const oscs: OscillatorNode[] = [];
    const gain = context.createGain();
    gain.gain.value = 0.22;
    gain.connect(masterGain);

    // Primary phaser oscillator - sharp pulse
    const osc1 = context.createOscillator();
    osc1.type = 'sawtooth';
    osc1.frequency.value = 350; // Lower fundamental for 'punch'
    osc1.connect(gain);
    osc1.start();
    oscs.push(osc1);

    // High harmonic whine (energy buildup)
    const osc2 = context.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = 1200;
    const gain2 = context.createGain();
    gain2.gain.value = 0.1;
    osc2.connect(gain2);
    gain2.connect(gain);
    osc2.start();
    oscs.push(osc2);

    // Aggressive Amplitude Modulation for the "Pulse" effect
    const pulseLfo = context.createOscillator();
    pulseLfo.type = 'square'; // Hard on/off sound
    pulseLfo.frequency.value = 15; // 15 pulses per second
    
    // Smooth the square wave slightly to avoid clicking
    const lfoFilter = context.createBiquadFilter();
    lfoFilter.type = 'lowpass';
    lfoFilter.frequency.value = 100;

    const pulseGain = context.createGain();
    pulseGain.gain.value = 0.8; // Depth of pulsing
    
    pulseLfo.connect(lfoFilter);
    lfoFilter.connect(pulseGain);
    pulseGain.connect(gain.gain);
    pulseLfo.start();
    oscs.push(pulseLfo);

    // Frequency modulation for the "Zew-Zew" pitch envelope on each pulse
    const pitchLfo = context.createOscillator();
    pitchLfo.type = 'sawtooth'; 
    pitchLfo.frequency.value = 15; // Sync with pulse
    const pitchGain = context.createGain();
    pitchGain.gain.value = 200; // Pitch drop amount
    
    pitchLfo.connect(pitchGain);
    pitchGain.connect(osc1.frequency);
    pitchLfo.start();
    oscs.push(pitchLfo);

    stateRef.current.activeOscillators.set('phaser', oscs);
    stateRef.current.activeGains.set('phaser', gain);
  }, [initAudio, stopSound, enabled]);

  // Phaser stop sound - quick descending tone
  const playPhaserStop = useCallback(() => {
    initAudio();
    const { context, masterGain } = stateRef.current;
    if (!context || !masterGain || !enabled) return;

    stopSound('phaser');

    // Quick descending whine
    const osc = context.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 700;
    osc.frequency.exponentialRampToValueAtTime(200, context.currentTime + 0.2);
    
    const gain = context.createGain();
    gain.gain.value = 0.12;
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.25);
    
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start();
    osc.stop(context.currentTime + 0.3);
  }, [initAudio, stopSound, enabled]);

  // Torpedo launch sound - low thump + rising whoosh
  const playTorpedoLaunch = useCallback(() => {
    initAudio();
    const { context, masterGain } = stateRef.current;
    if (!context || !masterGain || !enabled) return;

    // Initial thump (low frequency burst)
    const thump = context.createOscillator();
    thump.type = 'sine';
    thump.frequency.value = 60;
    thump.frequency.exponentialRampToValueAtTime(30, context.currentTime + 0.15);
    
    const thumpGain = context.createGain();
    thumpGain.gain.value = 0.25;
    thumpGain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.2);
    
    thump.connect(thumpGain);
    thumpGain.connect(masterGain);
    thump.start();
    thump.stop(context.currentTime + 0.25);

    // Rising whoosh
    setTimeout(() => {
      const whoosh = context.createOscillator();
      whoosh.type = 'sawtooth';
      whoosh.frequency.value = 100;
      whoosh.frequency.exponentialRampToValueAtTime(400, context.currentTime + 0.3);
      
      const whooshFilter = context.createBiquadFilter();
      whooshFilter.type = 'bandpass';
      whooshFilter.frequency.value = 300;
      whooshFilter.Q.value = 2;
      
      const whooshGain = context.createGain();
      whooshGain.gain.value = 0.1;
      whooshGain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.35);
      
      whoosh.connect(whooshFilter);
      whooshFilter.connect(whooshGain);
      whooshGain.connect(masterGain);
      whoosh.start();
      whoosh.stop(context.currentTime + 0.4);
    }, 50);

    // High-pitched launch whine
    const whine = context.createOscillator();
    whine.type = 'sine';
    whine.frequency.value = 500;
    whine.frequency.exponentialRampToValueAtTime(1200, context.currentTime + 0.15);
    
    const whineGain = context.createGain();
    whineGain.gain.value = 0.08;
    whineGain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.2);
    
    whine.connect(whineGain);
    whineGain.connect(masterGain);
    whine.start();
    whine.stop(context.currentTime + 0.25);
  }, [initAudio, enabled]);

  // Torpedo impact sound - bass explosion + crackling
  const playTorpedoImpact = useCallback(() => {
    initAudio();
    const { context, masterGain } = stateRef.current;
    if (!context || !masterGain || !enabled) return;

    // Bass explosion
    const bass = context.createOscillator();
    bass.type = 'sine';
    bass.frequency.value = 80;
    bass.frequency.exponentialRampToValueAtTime(20, context.currentTime + 0.4);
    
    const bassGain = context.createGain();
    bassGain.gain.value = 0.3;
    bassGain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.5);
    
    bass.connect(bassGain);
    bassGain.connect(masterGain);
    bass.start();
    bass.stop(context.currentTime + 0.6);

    // Mid-frequency explosion body
    const mid = context.createOscillator();
    mid.type = 'sawtooth';
    mid.frequency.value = 200;
    mid.frequency.exponentialRampToValueAtTime(50, context.currentTime + 0.3);
    
    const midFilter = context.createBiquadFilter();
    midFilter.type = 'lowpass';
    midFilter.frequency.value = 400;
    
    const midGain = context.createGain();
    midGain.gain.value = 0.15;
    midGain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.35);
    
    mid.connect(midFilter);
    midFilter.connect(midGain);
    midGain.connect(masterGain);
    mid.start();
    mid.stop(context.currentTime + 0.4);

    // Crackling noise
    const crackleNoise = createNoise(0.12, 0.4);
  }, [initAudio, createNoise, enabled]);

  // Planet damage sound - deep rumble
  const playPlanetDamage = useCallback(() => {
    initAudio();
    const { context, masterGain } = stateRef.current;
    if (!context || !masterGain || !enabled) return;

    // Deep rumble
    const rumble = context.createOscillator();
    rumble.type = 'sine';
    rumble.frequency.value = 40;
    
    const rumbleGain = context.createGain();
    rumbleGain.gain.value = 0.15;
    rumbleGain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.5);
    
    // Add some variation
    const lfo = context.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 5;
    const lfoGain = context.createGain();
    lfoGain.gain.value = 10;
    lfo.connect(lfoGain);
    lfoGain.connect(rumble.frequency);
    
    rumble.connect(rumbleGain);
    rumbleGain.connect(masterGain);
    rumble.start();
    lfo.start();
    rumble.stop(context.currentTime + 0.6);
    lfo.stop(context.currentTime + 0.6);

    // Impact thud
    const thud = context.createOscillator();
    thud.type = 'sine';
    thud.frequency.value = 100;
    thud.frequency.exponentialRampToValueAtTime(30, context.currentTime + 0.2);
    
    const thudGain = context.createGain();
    thudGain.gain.value = 0.2;
    thudGain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.25);
    
    thud.connect(thudGain);
    thudGain.connect(masterGain);
    thud.start();
    thud.stop(context.currentTime + 0.3);
  }, [initAudio, enabled]);

  // Planet explode sound - massive bass + layered explosions
  const playPlanetExplode = useCallback(() => {
    initAudio();
    const { context, masterGain } = stateRef.current;
    if (!context || !masterGain || !enabled) return;

    // Massive bass hit
    const bass = context.createOscillator();
    bass.type = 'sine';
    bass.frequency.value = 50;
    bass.frequency.exponentialRampToValueAtTime(15, context.currentTime + 1.5);
    
    const bassGain = context.createGain();
    bassGain.gain.value = 0.4;
    bassGain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 2);
    
    bass.connect(bassGain);
    bassGain.connect(masterGain);
    bass.start();
    bass.stop(context.currentTime + 2.1);

    // Initial flash/crack
    const crack = context.createOscillator();
    crack.type = 'sawtooth';
    crack.frequency.value = 300;
    crack.frequency.exponentialRampToValueAtTime(50, context.currentTime + 0.3);
    
    const crackFilter = context.createBiquadFilter();
    crackFilter.type = 'lowpass';
    crackFilter.frequency.value = 600;
    
    const crackGain = context.createGain();
    crackGain.gain.value = 0.25;
    crackGain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.4);
    
    crack.connect(crackFilter);
    crackFilter.connect(crackGain);
    crackGain.connect(masterGain);
    crack.start();
    crack.stop(context.currentTime + 0.5);

    // Multiple layered rumbles
    [0, 200, 400, 700].forEach((delay) => {
      setTimeout(() => {
        const rumble = context.createOscillator();
        rumble.type = 'sine';
        rumble.frequency.value = 60 - delay * 0.02;
        rumble.frequency.exponentialRampToValueAtTime(20, context.currentTime + 0.8);
        
        const rumbleGain = context.createGain();
        rumbleGain.gain.value = 0.15 - delay * 0.0002;
        rumbleGain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 1);
        
        rumble.connect(rumbleGain);
        rumbleGain.connect(masterGain);
        rumble.start();
        rumble.stop(context.currentTime + 1.1);
      }, delay);
    });

    // Extended noise/debris sound
    const debris = createNoise(0.1, 1.5);
    
    // High frequency "shatter" sounds
    [100, 300, 600].forEach((delay) => {
      setTimeout(() => {
        const shatter = context.createOscillator();
        shatter.type = 'square';
        shatter.frequency.value = 800 + Math.random() * 400;
        shatter.frequency.exponentialRampToValueAtTime(200, context.currentTime + 0.2);
        
        const shatterGain = context.createGain();
        shatterGain.gain.value = 0.05;
        shatterGain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.25);
        
        const shatterFilter = context.createBiquadFilter();
        shatterFilter.type = 'highpass';
        shatterFilter.frequency.value = 400;
        
        shatter.connect(shatterFilter);
        shatterFilter.connect(shatterGain);
        shatterGain.connect(masterGain);
        shatter.start();
        shatter.stop(context.currentTime + 0.3);
      }, delay);
    });
  }, [initAudio, createNoise, enabled]);

  // Shield hit sound
  const playShieldHit = useCallback(() => {
    initAudio();
    const { context, masterGain } = stateRef.current;
    if (!context || !masterGain || !enabled) return;

    // Electric crackle
    const crackle = context.createOscillator();
    crackle.type = 'sawtooth';
    crackle.frequency.value = 1500;
    crackle.frequency.exponentialRampToValueAtTime(300, context.currentTime + 0.15);
    
    const crackleFilter = context.createBiquadFilter();
    crackleFilter.type = 'bandpass';
    crackleFilter.frequency.value = 1000;
    crackleFilter.Q.value = 3;
    
    const crackleGain = context.createGain();
    crackleGain.gain.value = 0.12;
    crackleGain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.2);
    
    crackle.connect(crackleFilter);
    crackleFilter.connect(crackleGain);
    crackleGain.connect(masterGain);
    crackle.start();
    crackle.stop(context.currentTime + 0.25);

    // Impact thump
    const thump = context.createOscillator();
    thump.type = 'sine';
    thump.frequency.value = 80;
    thump.frequency.exponentialRampToValueAtTime(40, context.currentTime + 0.1);
    
    const thumpGain = context.createGain();
    thumpGain.gain.value = 0.15;
    thumpGain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.15);
    
    thump.connect(thumpGain);
    thumpGain.connect(masterGain);
    thump.start();
    thump.stop(context.currentTime + 0.2);

    // Shield hum
    const hum = context.createOscillator();
    hum.type = 'sine';
    hum.frequency.value = 220;
    
    const humGain = context.createGain();
    humGain.gain.value = 0.08;
    humGain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.3);
    
    hum.connect(humGain);
    humGain.connect(masterGain);
    hum.start();
    hum.stop(context.currentTime + 0.35);
  }, [initAudio, enabled]);

  // Target lock sound
  const playTargetLock = useCallback(() => {
    initAudio();
    const { context, masterGain } = stateRef.current;
    if (!context || !masterGain || !enabled) return;

    // Two-tone beep
    const beep1 = context.createOscillator();
    beep1.type = 'sine';
    beep1.frequency.value = 800;
    
    const beep1Gain = context.createGain();
    beep1Gain.gain.value = 0.1;
    beep1Gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.1);
    
    beep1.connect(beep1Gain);
    beep1Gain.connect(masterGain);
    beep1.start();
    beep1.stop(context.currentTime + 0.12);

    setTimeout(() => {
      const beep2 = context.createOscillator();
      beep2.type = 'sine';
      beep2.frequency.value = 1200;
      
      const beep2Gain = context.createGain();
      beep2Gain.gain.value = 0.12;
      beep2Gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.15);
      
      beep2.connect(beep2Gain);
      beep2Gain.connect(masterGain);
      beep2.start();
      beep2.stop(context.currentTime + 0.18);
    }, 100);
  }, [initAudio, enabled]);

  // Ambience - Deep Space Rumble (Gas Giant/Sun)
  const playAmbienceRumble = useCallback(() => {
    initAudio();
    const { context, masterGain, activeOscillators } = stateRef.current;
    if (!context || !masterGain || !enabled) return;

    if (activeOscillators.has('ambience_rumble')) return;

    const oscs: OscillatorNode[] = [];
    const gain = context.createGain();
    gain.gain.value = 0.15;
    gain.connect(masterGain);

    // Deep sub-bass drone
    const osc1 = context.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.value = 35; 
    osc1.connect(gain);
    osc1.start();
    oscs.push(osc1);

    // Secondary drone
    const osc2 = context.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.value = 42;
    const gain2 = context.createGain();
    gain2.gain.value = 0.05;
    osc2.connect(gain2);
    gain2.connect(gain);
    osc2.start();
    oscs.push(osc2);

    // Add slow modulation for "breathing" effect
    const lfo = context.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.05; // Very slow
    const lfoGain = context.createGain();
    lfoGain.gain.value = 0.02;
    lfo.connect(lfoGain);
    lfoGain.connect(gain.gain);
    lfo.start();
    oscs.push(lfo);

    stateRef.current.activeOscillators.set('ambience_rumble', oscs);
    stateRef.current.activeGains.set('ambience_rumble', gain);
  }, [initAudio, enabled]);

  // Ambience - Ethereal (Earth/Water)
  const playAmbienceEthereal = useCallback(() => {
    initAudio();
    const { context, masterGain, activeOscillators } = stateRef.current;
    if (!context || !masterGain || !enabled) return;

    if (activeOscillators.has('ambience_ethereal')) return;

    const oscs: OscillatorNode[] = [];
    const gain = context.createGain();
    gain.gain.value = 0.1;
    gain.connect(masterGain);

    // High shimmer
    const osc1 = context.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.value = 440; 
    const gain1 = context.createGain();
    gain1.gain.value = 0.05;
    osc1.connect(gain1);
    gain1.connect(gain);
    osc1.start();
    oscs.push(osc1);

    // Fifth harmony
    const osc2 = context.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = 660;
    const gain2 = context.createGain();
    gain2.gain.value = 0.03;
    osc2.connect(gain2);
    gain2.connect(gain);
    osc2.start();
    oscs.push(osc2);

    // Wind/Air noise
    const noise = createNoise(0.02, undefined);
    if(noise) {
        // We need to track this noise source manually since it's not in our oscs array
        // But for consistency let's add it to activeSources
        stateRef.current.activeSources.set('ambience_ethereal_noise', noise.source);
        noise.gain.connect(gain);
    }

    stateRef.current.activeOscillators.set('ambience_ethereal', oscs);
    stateRef.current.activeGains.set('ambience_ethereal', gain);
  }, [initAudio, createNoise, enabled]);

  // Ambience - Static/Radio (Stations)
  const playAmbienceStatic = useCallback(() => {
    initAudio();
    const { context, masterGain, activeOscillators } = stateRef.current;
    if (!context || !masterGain || !enabled) return;
    
    // Check if already playing active source for static
    if (stateRef.current.activeSources.has('ambience_static')) return;

    const gain = context.createGain();
    gain.gain.value = 0.08;
    gain.connect(masterGain);

    const noise = createNoise(0.08, undefined);
    if(noise) {
        stateRef.current.activeSources.set('ambience_static', noise.source);
        // Add a bandpass filter for "radio" effect
        const filter = context.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 1000;
        filter.Q.value = 1;
        
        noise.source.disconnect();
        noise.source.connect(filter);
        filter.connect(noise.gain);
        noise.gain.connect(gain);
        
        stateRef.current.activeGains.set('ambience_static', gain);
    }
    
    // Add random blips
    const scheduleBlip = () => {
        if (!stateRef.current.activeSources.has('ambience_static')) return;
        
        if (Math.random() > 0.7) {
             createTone(2000 + Math.random() * 500, 'square', 0.02, 0.05);
        }
        setTimeout(scheduleBlip, 1000 + Math.random() * 2000);
    }
    scheduleBlip();

  }, [initAudio, createNoise, createTone, enabled]);

  // Play sound by type
  const playSound = useCallback((type: SoundType, ...args: any[]) => {
    switch (type) {
      case 'engineIdle': playEngineIdle(); break;
      case 'engineImpulse': playEngineImpulse(args[0]); break;
      case 'warpCharge': playWarpCharge(); break;
      case 'warpEngage': playWarpEngage(); break;
      case 'warpCruise': playWarpCruise(args[0]); break;
      case 'warpDisengage': playWarpDisengage(); break;
      case 'uiBeep': playUIBeep(); break;
      case 'uiConfirm': playUIConfirm(); break;
      case 'uiAlert': playUIAlert(); break;
      case 'uiClick': playUIClick(); break;
      case 'uiHover': playUIHover(); break;
      case 'uiOpen': playUIOpen(); break;
      case 'uiClose': playUIClose(); break;
      case 'viewscreen': playViewscreen(); break;
      case 'phaserFire': playPhaserFire(); break;
      case 'phaserStop': playPhaserStop(); break;
      case 'torpedoLaunch': playTorpedoLaunch(); break;
      case 'torpedoImpact': playTorpedoImpact(); break;
      case 'planetDamage': playPlanetDamage(); break;
      case 'planetExplode': playPlanetExplode(); break;
      case 'shieldHit': playShieldHit(); break;
      case 'targetLock': playTargetLock(); break;
      case 'ambienceRumble': playAmbienceRumble(); break;
      case 'ambienceEthereal': playAmbienceEthereal(); break;
      case 'ambienceStatic': playAmbienceStatic(); break;
    }
  }, [playEngineIdle, playEngineImpulse, playWarpCharge, playWarpEngage, 
      playWarpCruise, playWarpDisengage, playUIBeep, playUIConfirm, 
      playUIAlert, playUIClick, playUIHover, playUIOpen, playUIClose, 
      playViewscreen, playPhaserFire, playPhaserStop,
      playTorpedoLaunch, playTorpedoImpact, playPlanetDamage, playPlanetExplode,
      playShieldHit, playTargetLock, playAmbienceRumble, playAmbienceEthereal, playAmbienceStatic]);

  // Set master volume
  const setVolume = useCallback((volume: number) => {
    if (stateRef.current.masterGain) {
      stateRef.current.masterGain.gain.value = Math.max(0, Math.min(1, volume));
    }
  }, []);

  // Update volume of a specific sound instance
  const updateSoundVolume = useCallback((id: string, volume: number, rampTime: number = 0.1) => {
    const { activeGains, context } = stateRef.current;
    const gain = activeGains.get(id);
    
    if (gain && context) {
      gain.gain.setTargetAtTime(volume, context.currentTime, rampTime);
    }
  }, []);

  return {
    initAudio,
    playSound,
    stopSound,
    stopAllSounds,
    setVolume,
    updateSoundVolume,
  };
}
