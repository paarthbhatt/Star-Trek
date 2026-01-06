// Voice announcement lines for different events
export type AnnouncementCategory = 
  | 'warp' 
  | 'navigation' 
  | 'tactical' 
  | 'shields' 
  | 'damage' 
  | 'alert'
  | 'system';

export interface VoiceLine {
  id: string;
  text: string;
  category: AnnouncementCategory;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

// Warp-related announcements
export const WARP_LINES: Record<string, VoiceLine> = {
  warpCharging: {
    id: 'warp-charging',
    text: 'Warp core charging.',
    category: 'warp',
    priority: 'medium',
  },
  enginesStandby: {
    id: 'engines-standby',
    text: 'Engines at standby.',
    category: 'warp',
    priority: 'medium',
  },
  courseLaidIn: {
    id: 'course-laid-in',
    text: 'Course laid in.',
    category: 'navigation',
    priority: 'medium',
  },
  calculatingRoute: {
    id: 'calculating-route',
    text: 'Calculating warp trajectory.',
    category: 'navigation',
    priority: 'medium',
  },
  astrometricsOpen: {
    id: 'astrometrics-open',
    text: 'Astrometrics display active.',
    category: 'navigation',
    priority: 'low',
  },
  braceForAcceleration: {
    id: 'brace-acceleration',
    text: 'Brace for acceleration.',
    category: 'warp',
    priority: 'high',
  },
  warpEngage: {
    id: 'warp-engage',
    text: 'Engage.',
    category: 'warp',
    priority: 'high',
  },
  warpDisengage: {
    id: 'warp-disengage',
    text: 'Dropping out of warp. Returning to impulse power.',
    category: 'warp',
    priority: 'medium',
  },
  arrivalDestination: {
    id: 'arrival-destination',
    text: 'Arrived at destination. Orbit established.',
    category: 'navigation',
    priority: 'high',
  },
  emergencyStop: {
    id: 'emergency-stop',
    text: 'Emergency stop! All hands, brace for impact.',
    category: 'warp',
    priority: 'critical',
  },
};

// Tactical announcements
export const TACTICAL_LINES: Record<string, VoiceLine> = {
  phasersFiring: {
    id: 'phasers-firing',
    text: 'Phasers firing.',
    category: 'tactical',
    priority: 'medium',
  },
  torpedoLaunched: {
    id: 'torpedo-launched',
    text: 'Photon torpedo away.',
    category: 'tactical',
    priority: 'medium',
  },
  targetAcquired: {
    id: 'target-acquired',
    text: 'Target acquired. Weapons locked.',
    category: 'tactical',
    priority: 'medium',
  },
  targetDestroyed: {
    id: 'target-destroyed',
    text: 'Target destroyed.',
    category: 'tactical',
    priority: 'high',
  },
  weaponsOffline: {
    id: 'weapons-offline',
    text: 'Warning. Weapons systems offline.',
    category: 'tactical',
    priority: 'high',
  },
  phaserOverheat: {
    id: 'phaser-overheat',
    text: 'Phasers overheating. Cooldown required.',
    category: 'tactical',
    priority: 'medium',
  },
  torpedoReloading: {
    id: 'torpedo-reloading',
    text: 'Torpedo bay reloading.',
    category: 'tactical',
    priority: 'low',
  },
};

// Shield and defense announcements
export const DEFENSE_LINES: Record<string, VoiceLine> = {
  shieldsUp: {
    id: 'shields-up',
    text: 'Shields raised.',
    category: 'shields',
    priority: 'medium',
  },
  shieldsDown: {
    id: 'shields-down',
    text: 'Shields down!',
    category: 'shields',
    priority: 'critical',
  },
  shieldsCritical: {
    id: 'shields-critical',
    text: 'Warning. Shield integrity critical.',
    category: 'shields',
    priority: 'high',
  },
  forwardShieldsFailing: {
    id: 'forward-shields-failing',
    text: 'Forward shields failing.',
    category: 'shields',
    priority: 'high',
  },
  aftShieldsFailing: {
    id: 'aft-shields-failing',
    text: 'Aft shields failing.',
    category: 'shields',
    priority: 'high',
  },
};

// Damage announcements
export const DAMAGE_LINES: Record<string, VoiceLine> = {
  hullBreach: {
    id: 'hull-breach',
    text: 'Hull breach detected. Emergency bulkheads engaged.',
    category: 'damage',
    priority: 'critical',
  },
  hullDamage: {
    id: 'hull-damage',
    text: 'Hull damage sustained.',
    category: 'damage',
    priority: 'high',
  },
  hullCritical: {
    id: 'hull-critical',
    text: 'Warning. Hull integrity critical. Abandon ship protocols available.',
    category: 'damage',
    priority: 'critical',
  },
};

// Alert level announcements
export const ALERT_LINES: Record<string, VoiceLine> = {
  redAlert: {
    id: 'red-alert',
    text: 'Red alert. All hands to battle stations.',
    category: 'alert',
    priority: 'critical',
  },
  yellowAlert: {
    id: 'yellow-alert',
    text: 'Yellow alert. All personnel, stand by.',
    category: 'alert',
    priority: 'high',
  },
  greenAlert: {
    id: 'green-alert',
    text: 'Condition green. All clear.',
    category: 'alert',
    priority: 'medium',
  },
};

// System announcements
export const SYSTEM_LINES: Record<string, VoiceLine> = {
  welcome: {
    id: 'welcome',
    text: 'Welcome aboard the USS Enterprise. NCC-1701.',
    category: 'system',
    priority: 'low',
  },
  systemsOnline: {
    id: 'systems-online',
    text: 'All systems nominal. Ready for departure.',
    category: 'system',
    priority: 'low',
  },
  navigationSet: {
    id: 'navigation-set',
    text: 'Course laid in.',
    category: 'navigation',
    priority: 'medium',
  },
};

// Combine all lines for easy lookup
export const ALL_VOICE_LINES: Record<string, VoiceLine> = {
  ...WARP_LINES,
  ...TACTICAL_LINES,
  ...DEFENSE_LINES,
  ...DAMAGE_LINES,
  ...ALERT_LINES,
  ...SYSTEM_LINES,
};

// Get voice line by ID
export function getVoiceLine(id: string): VoiceLine | undefined {
  return Object.values(ALL_VOICE_LINES).find(line => line.id === id);
}
