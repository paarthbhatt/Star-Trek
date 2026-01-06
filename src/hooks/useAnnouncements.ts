'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { VoiceLine, ALL_VOICE_LINES, AnnouncementCategory } from '@/data/voiceLines';

interface UseAnnouncementsOptions {
  enabled?: boolean;
  voiceEnabled?: boolean;
  volume?: number;
  onAnnouncement?: (line: VoiceLine) => void;
}

interface Announcement {
  id: string;
  line: VoiceLine;
  timestamp: number;
}

export function useAnnouncements(options: UseAnnouncementsOptions = {}) {
  const {
    enabled = true,
    voiceEnabled = true,
    volume = 1.0,
    onAnnouncement,
  } = options;

  const [currentAnnouncement, setCurrentAnnouncement] = useState<Announcement | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const announcementQueue = useRef<VoiceLine[]>([]);
  const isProcessing = useRef(false);
  const lastAnnouncementTime = useRef<Record<string, number>>({});
  const speechSynthesis = useRef<SpeechSynthesis | null>(null);

  // Initialize speech synthesis
  useEffect(() => {
    if (typeof window !== 'undefined') {
      speechSynthesis.current = window.speechSynthesis;
    }
  }, []);

  // Process announcement queue
  const processQueue = useCallback(async () => {
    if (isProcessing.current || announcementQueue.current.length === 0) {
      return;
    }

    isProcessing.current = true;
    const line = announcementQueue.current.shift()!;

    // Set current announcement for display
    const announcement: Announcement = {
      id: `${line.id}-${Date.now()}`,
      line,
      timestamp: Date.now(),
    };
    setCurrentAnnouncement(announcement);
    onAnnouncement?.(line);

    // Speak the announcement if voice is enabled
    if (voiceEnabled && speechSynthesis.current) {
      setIsSpeaking(true);
      
      const utterance = new SpeechSynthesisUtterance(line.text);
      utterance.rate = 0.9; // Slightly slower for clarity
      utterance.pitch = 0.9; // Slightly deeper voice
      utterance.volume = volume;
      
      // Try to find a suitable voice (prefer English, male voices)
      const voices = speechSynthesis.current.getVoices();
      const preferredVoice = voices.find(
        voice => voice.lang.startsWith('en') && voice.name.toLowerCase().includes('male')
      ) || voices.find(
        voice => voice.lang.startsWith('en')
      ) || voices[0];
      
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      utterance.onend = () => {
        setIsSpeaking(false);
        isProcessing.current = false;
        // Process next in queue after a small delay
        setTimeout(processQueue, 500);
      };

      utterance.onerror = () => {
        setIsSpeaking(false);
        isProcessing.current = false;
        setTimeout(processQueue, 500);
      };

      speechSynthesis.current.speak(utterance);
    } else {
      // No voice, just show text for duration based on text length
      const displayDuration = Math.max(2000, line.text.length * 50);
      setTimeout(() => {
        isProcessing.current = false;
        processQueue();
      }, displayDuration);
    }

    // Auto-dismiss announcement after a delay
    setTimeout(() => {
      setCurrentAnnouncement(prev => {
        if (prev?.id === announcement.id) {
          return null;
        }
        return prev;
      });
    }, Math.max(3000, line.text.length * 60));

  }, [voiceEnabled, volume, onAnnouncement]);

  // Queue an announcement
  const announce = useCallback((lineOrId: VoiceLine | string) => {
    if (!enabled) return;

    const line = typeof lineOrId === 'string' 
      ? Object.values(ALL_VOICE_LINES).find(l => l.id === lineOrId)
      : lineOrId;

    if (!line) {
      console.warn(`Voice line not found: ${lineOrId}`);
      return;
    }

    // Debounce same announcements (minimum 5 seconds between same announcements)
    const now = Date.now();
    const lastTime = lastAnnouncementTime.current[line.id] || 0;
    if (now - lastTime < 5000) {
      return;
    }
    lastAnnouncementTime.current[line.id] = now;

    // Priority handling - critical announcements skip to front
    if (line.priority === 'critical') {
      announcementQueue.current.unshift(line);
    } else {
      announcementQueue.current.push(line);
    }

    processQueue();
  }, [enabled, processQueue]);

  // Stop all announcements
  const stopAll = useCallback(() => {
    announcementQueue.current = [];
    setCurrentAnnouncement(null);
    if (speechSynthesis.current) {
      speechSynthesis.current.cancel();
    }
    setIsSpeaking(false);
    isProcessing.current = false;
  }, []);

  // Skip current announcement and announce a new one immediately
  const announceImmediate = useCallback((lineOrId: VoiceLine | string) => {
    // Stop current announcement
    if (speechSynthesis.current) {
      speechSynthesis.current.cancel();
    }
    setIsSpeaking(false);
    isProcessing.current = false;
    
    // Clear queue and announce immediately
    announcementQueue.current = [];
    announce(lineOrId);
  }, [announce]);

  // Clear announcement display
  const dismiss = useCallback(() => {
    setCurrentAnnouncement(null);
  }, []);

  return {
    currentAnnouncement,
    isSpeaking,
    announce,
    announceImmediate,
    stopAll,
    dismiss,
  };
}

// Get priority color for announcement
export function getAnnouncementColor(priority: VoiceLine['priority']): string {
  switch (priority) {
    case 'critical': return 'text-red-400';
    case 'high': return 'text-orange-400';
    case 'medium': return 'text-cyan-400';
    case 'low': return 'text-gray-400';
    default: return 'text-white';
  }
}

// Get category icon
export function getCategoryIcon(category: AnnouncementCategory): string {
  switch (category) {
    case 'warp': return '⚡';
    case 'navigation': return '🧭';
    case 'tactical': return '🎯';
    case 'shields': return '🛡️';
    case 'damage': return '⚠️';
    case 'alert': return '🚨';
    case 'system': return '💻';
    default: return '📢';
  }
}
