'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface TutorialStep {
  id: string;
  title: string;
  description: string;
  hint: string;
  position?: 'center' | 'top' | 'bottom' | 'left' | 'right';
  highlightKeys?: string[];
  action?: string; // Action that completes this step
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'welcome',
    title: 'Welcome Aboard, Captain',
    description: 'You are now in command of the USS Enterprise NCC-1701. This tutorial will guide you through the ship\'s controls.',
    hint: 'Press ENTER to continue',
    position: 'center',
  },
  {
    id: 'movement',
    title: 'Flight Controls',
    description: 'Use WASD to control the ship\'s movement. W accelerates forward, S reverses, and A/D turn the ship.',
    hint: 'Press W to accelerate',
    highlightKeys: ['W', 'A', 'S', 'D'],
    action: 'move',
  },
  {
    id: 'roll',
    title: 'Roll Control',
    description: 'Use Q and E to roll the ship left and right. This is essential for maneuvering in 3D space.',
    hint: 'Press Q or E to roll',
    highlightKeys: ['Q', 'E'],
    action: 'roll',
  },
  {
    id: 'camera',
    title: 'Camera Modes',
    description: 'Press I to enter Free Look mode. This freezes the ship and lets you orbit around it with your mouse. Press C to cycle through camera modes.',
    hint: 'Press I to try Free Look',
    highlightKeys: ['I', 'C'],
    action: 'camera',
  },
  {
    id: 'navigation',
    title: 'Navigation',
    description: 'Press V to open the Navigation panel. Select a destination to set a warp target.',
    hint: 'Press V to open Navigation',
    highlightKeys: ['V'],
    action: 'navigation',
  },
  {
    id: 'warp',
    title: 'Warp Drive',
    description: 'With a destination selected, press SPACE to engage the warp drive. Use keys 1-9 to set warp factor.',
    hint: 'Press 1-9 to set warp factor',
    highlightKeys: ['SPACE', '1', '2', '3'],
    action: 'warp_set',
  },
  {
    id: 'complete',
    title: 'Tutorial Complete',
    description: 'You\'re ready to explore the galaxy! Remember: press ? for a full controls reference, and access Settings via the gear icon.',
    hint: 'Press ENTER to begin your mission',
    position: 'center',
  },
];

interface TutorialProps {
  isActive: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

export function Tutorial({ isActive, onComplete, onSkip }: TutorialProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  
  const step = TUTORIAL_STEPS[currentStep];
  const isLastStep = currentStep === TUTORIAL_STEPS.length - 1;
  const isFirstStep = currentStep === 0;

  const nextStep = useCallback(() => {
    if (isLastStep) {
      onComplete();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  }, [isLastStep, onComplete]);

  const prevStep = useCallback(() => {
    if (!isFirstStep) {
      setCurrentStep(prev => prev - 1);
    }
  }, [isFirstStep]);

  // Handle keyboard input
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();

      // Enter to continue on welcome/complete screens
      if (e.key === 'Enter' && (step.id === 'welcome' || step.id === 'complete')) {
        nextStep();
        return;
      }

      // Check for action completion
      if (step.action) {
        let actionCompleted = false;

        switch (step.action) {
          case 'move':
            if (['w', 'a', 's', 'd'].includes(key)) actionCompleted = true;
            break;
          case 'roll':
            if (['q', 'e'].includes(key)) actionCompleted = true;
            break;
          case 'camera':
            if (key === 'i' || key === 'c') actionCompleted = true;
            break;
          case 'navigation':
            if (key === 'v') actionCompleted = true;
            break;
          case 'warp_set':
            if (/^[1-9]$/.test(key)) actionCompleted = true;
            break;
        }

        if (actionCompleted) {
          setCompleted(prev => new Set([...prev, step.id]));
          // Auto-advance after a short delay
          setTimeout(nextStep, 500);
        }
      }

      // Skip with Escape
      if (e.key === 'Escape') {
        onSkip();
      }

      // Arrow keys for navigation
      if (e.key === 'ArrowRight') nextStep();
      if (e.key === 'ArrowLeft') prevStep();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, step, nextStep, prevStep, onSkip]);

  if (!isActive) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] pointer-events-none"
      >
        {/* Dimmed overlay */}
        <div className="absolute inset-0 bg-black/50" />

        {/* Tutorial card */}
        <motion.div
          key={step.id}
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className={`absolute pointer-events-auto ${getPositionClasses(step.position)}`}
        >
          <div className="bg-gray-900/95 border border-cyan-500/50 rounded-lg p-6 max-w-md shadow-2xl shadow-cyan-500/20">
            {/* Progress dots */}
            <div className="flex justify-center gap-1 mb-4">
              {TUTORIAL_STEPS.map((s, i) => (
                <div
                  key={s.id}
                  className={`w-2 h-2 rounded-full transition-all ${
                    i === currentStep
                      ? 'bg-cyan-400 w-6'
                      : i < currentStep
                      ? 'bg-cyan-600'
                      : 'bg-gray-600'
                  }`}
                />
              ))}
            </div>

            {/* Step number */}
            <div className="text-cyan-500/50 text-xs font-mono mb-2">
              STEP {currentStep + 1} OF {TUTORIAL_STEPS.length}
            </div>

            {/* Title */}
            <h2 className="text-cyan-400 text-xl font-bold mb-3">
              {step.title}
            </h2>

            {/* Description */}
            <p className="text-gray-300 text-sm mb-4 leading-relaxed">
              {step.description}
            </p>

            {/* Key highlights */}
            {step.highlightKeys && step.highlightKeys.length > 0 && (
              <div className="flex gap-2 mb-4 flex-wrap">
                {step.highlightKeys.map(key => (
                  <kbd
                    key={key}
                    className="px-3 py-1.5 bg-gray-800 border border-cyan-500/50 rounded text-cyan-400 font-mono text-sm"
                  >
                    {key}
                  </kbd>
                ))}
              </div>
            )}

            {/* Hint */}
            <div className="bg-cyan-500/10 border border-cyan-500/30 rounded px-3 py-2 mb-4">
              <span className="text-cyan-400 text-sm animate-pulse">
                {step.hint}
              </span>
            </div>

            {/* Navigation buttons */}
            <div className="flex justify-between items-center">
              <button
                onClick={onSkip}
                className="text-gray-500 hover:text-gray-300 text-sm transition-colors"
              >
                Skip Tutorial
              </button>

              <div className="flex gap-2">
                {!isFirstStep && (
                  <button
                    onClick={prevStep}
                    className="px-3 py-1.5 text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    Back
                  </button>
                )}
                <button
                  onClick={nextStep}
                  className="px-4 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/50 rounded text-cyan-400 text-sm transition-all"
                >
                  {isLastStep ? 'Finish' : 'Next'}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function getPositionClasses(position?: string): string {
  switch (position) {
    case 'top':
      return 'top-24 left-1/2 -translate-x-1/2';
    case 'bottom':
      return 'bottom-24 left-1/2 -translate-x-1/2';
    case 'left':
      return 'left-8 top-1/2 -translate-y-1/2';
    case 'right':
      return 'right-8 top-1/2 -translate-y-1/2';
    case 'center':
    default:
      return 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2';
  }
}

// First-time visitor detection
export function useFirstVisit() {
  const [isFirstVisit, setIsFirstVisit] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const visited = localStorage.getItem('startrek-visited');
    setIsFirstVisit(!visited);
    setIsLoaded(true);
  }, []);

  const markVisited = useCallback(() => {
    localStorage.setItem('startrek-visited', 'true');
    setIsFirstVisit(false);
  }, []);

  const resetFirstVisit = useCallback(() => {
    localStorage.removeItem('startrek-visited');
    setIsFirstVisit(true);
  }, []);

  return { isFirstVisit, isLoaded, markVisited, resetFirstVisit };
}
