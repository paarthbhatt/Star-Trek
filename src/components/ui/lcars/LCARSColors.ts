// LCARS Color System - Star Trek TNG-inspired colors
// https://www.lcars.org.uk/guidelines.htm

export const LCARS_COLORS = {
  // Primary colors
  orange: '#FF9900',      // Navigation/Helm - Main accent
  tangerine: '#FF6600',   // Warning/Active state
  gold: '#CC6633',        // Secondary accent
  
  // Blues
  blue: '#9999FF',        // Systems/Info - Data displays
  skyBlue: '#6688CC',     // Secondary info
  navy: '#4455AA',        // Background accents
  
  // Reds/Pinks
  salmon: '#CC6666',      // Tactical/Weapons
  pink: '#CC99CC',        // Engineering/Status
  mauve: '#9977AA',       // Secondary status
  
  // Alerts
  alertRed: '#FF3333',    // Red alert
  alertYellow: '#FFCC00', // Yellow alert
  alertGreen: '#33FF66',  // All clear
  
  // Status
  success: '#99FF99',     // Confirm/Success
  error: '#FF6666',       // Error/Critical
  warning: '#FFAA33',     // Warning/Caution
  
  // Neutrals
  background: '#000000',  // Primary background
  backgroundLight: '#111122', // Slightly lighter
  text: '#FFFFFF',        // Primary text
  textMuted: '#999999',   // Secondary text
  textDim: '#666666',     // Tertiary text
  
  // Specialty
  transporter: '#99CCFF', // Transporter systems
  warp: '#6699FF',        // Warp systems
  impulse: '#FF8844',     // Impulse engines
  shields: '#66CCFF',     // Shield systems
} as const;

// Type for LCARS colors
export type LCARSColor = keyof typeof LCARS_COLORS;

// Get LCARS color by name
export function getLCARSColor(color: LCARSColor): string {
  return LCARS_COLORS[color];
}

// Alert level to LCARS color mapping
export function getAlertColor(level: 'green' | 'yellow' | 'red'): string {
  switch (level) {
    case 'red': return LCARS_COLORS.alertRed;
    case 'yellow': return LCARS_COLORS.alertYellow;
    case 'green': return LCARS_COLORS.alertGreen;
  }
}

// System type to LCARS color mapping
export function getSystemColor(system: string): string {
  switch (system.toLowerCase()) {
    case 'navigation':
    case 'helm':
      return LCARS_COLORS.orange;
    case 'engineering':
    case 'warp':
      return LCARS_COLORS.pink;
    case 'science':
    case 'sensors':
      return LCARS_COLORS.blue;
    case 'communications':
      return LCARS_COLORS.skyBlue;
    case 'shields':
      return LCARS_COLORS.shields;
    default:
      return LCARS_COLORS.text;
  }
}

// Tailwind CSS classes for LCARS colors (for use in className)
export const LCARS_CLASSES = {
  // Background colors
  bgOrange: 'bg-[#FF9900]',
  bgBlue: 'bg-[#9999FF]',
  bgSalmon: 'bg-[#CC6666]',
  bgPink: 'bg-[#CC99CC]',
  bgAlertRed: 'bg-[#FF3333]',
  bgAlertYellow: 'bg-[#FFCC00]',
  bgAlertGreen: 'bg-[#33FF66]',
  
  // Text colors
  textOrange: 'text-[#FF9900]',
  textBlue: 'text-[#9999FF]',
  textSalmon: 'text-[#CC6666]',
  textPink: 'text-[#CC99CC]',
  textAlertRed: 'text-[#FF3333]',
  textAlertYellow: 'text-[#FFCC00]',
  textAlertGreen: 'text-[#33FF66]',
  
  // Border colors
  borderOrange: 'border-[#FF9900]',
  borderBlue: 'border-[#9999FF]',
  borderSalmon: 'border-[#CC6666]',
  borderPink: 'border-[#CC99CC]',
} as const;
