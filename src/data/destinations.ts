import * as THREE from 'three';

export interface Destination {
  id: string;
  name: string;
  description: string;
  position: THREE.Vector3;
  radius: number;          // Visual size
  type: 'star' | 'planet' | 'dwarf' | 'moon' | 'station' | 'asteroid';
  category: 'inner' | 'outer' | 'dwarf' | 'belt' | 'kuiper' | 'station';
  color: string;           // Primary color
  atmosphere?: string;     // Atmosphere color
  hasRings?: boolean;
  ringColor?: string;
  ringInnerRadius?: number;
  ringOuterRadius?: number;
  moons?: string[];        // IDs of associated moons
  parentId?: string;       // Parent body for moons
  rotationSpeed?: number;  // Rotation period factor
  orbitRadius?: number;    // Distance from Sun (AU scaled)
  distance: number;        // Distance from origin in units
  starfleetPresence?: string; // Star Trek lore
  surfaceFeatures?: string[]; // Notable surface characteristics
}

// Scale: Compressed logarithmic for gameplay
// Real AU distances would be: Mercury 0.39, Venus 0.72, Earth 1, Mars 1.52, Jupiter 5.2, Saturn 9.5, etc.
// We compress these for playability while maintaining relative order
// Planet radii are scaled down significantly to make the starship appear appropriately small

// Sun position (origin point for solar system)
const SUN_POSITION = new THREE.Vector3(0, 0, -500);

export const DESTINATIONS: Destination[] = [
  // === THE SUN ===
  {
    id: 'sol',
    name: 'Sol',
    description: 'The star at the center of our solar system. Yellow G-type main-sequence star, 4.6 billion years old.',
    position: SUN_POSITION.clone(),
    radius: 30,
    type: 'star',
    category: 'inner',
    color: '#ffff44',
    atmosphere: '#ff8800',
    rotationSpeed: 0.02,
    distance: 500,
    starfleetPresence: 'Sol Station - Primary Federation hub',
  },

  // === INNER PLANETS ===
  {
    id: 'mercury',
    name: 'Mercury',
    description: 'Smallest planet, closest to the Sun. Extreme temperature variations from -180°C to 430°C. Heavily cratered surface.',
    position: new THREE.Vector3(80, 10, -420),
    radius: 1.5,
    type: 'planet',
    category: 'inner',
    color: '#8c7853',
    rotationSpeed: 0.004,
    orbitRadius: 0.39,
    distance: 100,
    starfleetPresence: 'Mercury Research Station - Solar observation',
    surfaceFeatures: ['Caloris Basin', 'Scarps', 'Craters'],
  },
  {
    id: 'venus',
    name: 'Venus',
    description: 'Earth\'s "sister planet". Dense toxic atmosphere with sulfuric acid clouds. Surface temperature 465°C due to runaway greenhouse effect.',
    position: new THREE.Vector3(150, -20, -350),
    radius: 3.5,
    type: 'planet',
    category: 'inner',
    color: '#e6c35c',
    atmosphere: '#ffd699',
    rotationSpeed: -0.001, // Retrograde rotation
    orbitRadius: 0.72,
    distance: 180,
    starfleetPresence: 'Ishtar Station - Atmospheric research',
    surfaceFeatures: ['Maxwell Montes', 'Ishtar Terra', 'Aphrodite Terra'],
  },
  {
    id: 'earth',
    name: 'Earth',
    description: 'Humanity\'s homeworld. The only known planet to harbor life. Headquarters of United Earth and Starfleet Command.',
    position: new THREE.Vector3(200, 0, -200),
    radius: 4,
    type: 'planet',
    category: 'inner',
    color: '#4a90d9',
    atmosphere: '#88ccff',
    rotationSpeed: 0.01,
    orbitRadius: 1.0,
    distance: 280,
    moons: ['luna'],
    starfleetPresence: 'Starfleet Headquarters, Spacedock, Multiple orbital facilities',
    surfaceFeatures: ['Oceans', 'Continents', 'Cloud systems'],
  },
  {
    id: 'luna',
    name: 'Luna',
    description: 'Earth\'s only natural satellite. Site of humanity\'s first steps beyond Earth. Home to Tycho City and multiple research stations.',
    position: new THREE.Vector3(220, 8, -185),
    radius: 1.1,
    type: 'moon',
    category: 'inner',
    color: '#c8c8c8',
    rotationSpeed: 0.001,
    parentId: 'earth',
    distance: 295,
    starfleetPresence: 'Tycho City, Luna Shipyards',
    surfaceFeatures: ['Mare Tranquillitatis', 'Tycho Crater', 'Sea of Serenity'],
  },
  {
    id: 'mars',
    name: 'Mars',
    description: 'The Red Planet. Second home of humanity. Major terraforming project underway. Home to Utopia Planitia shipyards.',
    position: new THREE.Vector3(350, -30, -50),
    radius: 2.5,
    type: 'planet',
    category: 'inner',
    color: '#c1440e',
    atmosphere: '#ff8866',
    rotationSpeed: 0.009,
    orbitRadius: 1.52,
    distance: 400,
    moons: ['phobos', 'deimos'],
    starfleetPresence: 'Utopia Planitia Fleet Yards - Primary ship construction',
    surfaceFeatures: ['Olympus Mons', 'Valles Marineris', 'Polar ice caps'],
  },
  {
    id: 'phobos',
    name: 'Phobos',
    description: 'Larger of Mars\'s two moons. Irregular, potato-shaped body covered in regolith. Orbits very close to Mars.',
    position: new THREE.Vector3(360, -25, -45),
    radius: 0.4,
    type: 'moon',
    category: 'inner',
    color: '#5c5c5c',
    rotationSpeed: 0.005,
    parentId: 'mars',
    distance: 405,
    surfaceFeatures: ['Stickney Crater', 'Grooves'],
  },
  {
    id: 'deimos',
    name: 'Deimos',
    description: 'Smaller of Mars\'s two moons. Smoother surface than Phobos. May be a captured asteroid.',
    position: new THREE.Vector3(370, -35, -60),
    radius: 0.3,
    type: 'moon',
    category: 'inner',
    color: '#6b6b6b',
    rotationSpeed: 0.004,
    parentId: 'mars',
    distance: 415,
  },

  // === ASTEROID BELT ===
  {
    id: 'ceres',
    name: 'Ceres',
    description: 'Largest object in the asteroid belt. Dwarf planet with water ice beneath its surface. Important mining hub.',
    position: new THREE.Vector3(500, 20, 100),
    radius: 1.2,
    type: 'dwarf',
    category: 'belt',
    color: '#9e9e9e',
    rotationSpeed: 0.02,
    orbitRadius: 2.77,
    distance: 550,
    starfleetPresence: 'Ceres Station - Mining operations',
    surfaceFeatures: ['Occator Crater', 'Bright spots'],
  },
  {
    id: 'vesta',
    name: 'Vesta',
    description: 'Second largest asteroid. Has a differentiated interior like planets. Giant impact basin at south pole.',
    position: new THREE.Vector3(480, -15, 150),
    radius: 0.8,
    type: 'asteroid',
    category: 'belt',
    color: '#8a8a8a',
    rotationSpeed: 0.025,
    orbitRadius: 2.36,
    distance: 530,
    surfaceFeatures: ['Rheasilvia Basin', 'Troughs'],
  },

  // === OUTER PLANETS (GAS GIANTS) ===
  {
    id: 'jupiter',
    name: 'Jupiter',
    description: 'Largest planet in the solar system. Gas giant with iconic Great Red Spot storm. Has 95 known moons.',
    position: new THREE.Vector3(700, 40, 400),
    radius: 15,
    type: 'planet',
    category: 'outer',
    color: '#d4a574',
    atmosphere: '#e8c89e',
    rotationSpeed: 0.04,
    orbitRadius: 5.2,
    distance: 850,
    moons: ['io', 'europa', 'ganymede', 'callisto'],
    starfleetPresence: 'Jupiter Station - Deep space research',
    surfaceFeatures: ['Great Red Spot', 'Cloud bands', 'Storms'],
  },
  {
    id: 'io',
    name: 'Io',
    description: 'Innermost Galilean moon. Most volcanically active body in the solar system. Over 400 active volcanoes.',
    position: new THREE.Vector3(730, 45, 390),
    radius: 1,
    type: 'moon',
    category: 'outer',
    color: '#e8d44d',
    atmosphere: '#ffff88',
    rotationSpeed: 0.008,
    parentId: 'jupiter',
    distance: 860,
    surfaceFeatures: ['Loki Patera', 'Pele', 'Sulfur plains'],
  },
  {
    id: 'europa',
    name: 'Europa',
    description: 'Ice-covered moon with subsurface ocean. Prime candidate for extraterrestrial life. Smooth, young surface.',
    position: new THREE.Vector3(745, 35, 410),
    radius: 0.9,
    type: 'moon',
    category: 'outer',
    color: '#d4c9a8',
    rotationSpeed: 0.006,
    parentId: 'jupiter',
    distance: 875,
    starfleetPresence: 'Europa Science Station - Life detection research',
    surfaceFeatures: ['Ice ridges', 'Chaos terrain', 'Possible geysers'],
  },
  {
    id: 'ganymede',
    name: 'Ganymede',
    description: 'Largest moon in the solar system. Bigger than Mercury. Has its own magnetic field and possible subsurface ocean.',
    position: new THREE.Vector3(760, 50, 430),
    radius: 1.5,
    type: 'moon',
    category: 'outer',
    color: '#8c8c8c',
    rotationSpeed: 0.005,
    parentId: 'jupiter',
    distance: 895,
    surfaceFeatures: ['Grooved terrain', 'Dark regions', 'Craters'],
  },
  {
    id: 'callisto',
    name: 'Callisto',
    description: 'Outermost Galilean moon. Most heavily cratered object in the solar system. Ancient, geologically dead surface.',
    position: new THREE.Vector3(780, 30, 450),
    radius: 1.3,
    type: 'moon',
    category: 'outer',
    color: '#5c5047',
    rotationSpeed: 0.004,
    parentId: 'jupiter',
    distance: 915,
    surfaceFeatures: ['Valhalla Basin', 'Multi-ring structures'],
  },
  {
    id: 'saturn',
    name: 'Saturn',
    description: 'Iconic ringed gas giant. Second largest planet. Less dense than water. Has 146 known moons.',
    position: new THREE.Vector3(1000, -50, 800),
    radius: 13,
    type: 'planet',
    category: 'outer',
    color: '#f4d59e',
    atmosphere: '#ffe4aa',
    hasRings: true,
    ringColor: '#c9b896',
    ringInnerRadius: 16,
    ringOuterRadius: 32,
    rotationSpeed: 0.038,
    orbitRadius: 9.5,
    distance: 1300,
    moons: ['titan', 'enceladus', 'mimas', 'rhea'],
    starfleetPresence: 'Titan Station - Outer system command',
    surfaceFeatures: ['Hexagonal storm', 'Cloud bands', 'Ring system'],
  },
  {
    id: 'titan',
    name: 'Titan',
    description: 'Saturn\'s largest moon. Only moon with dense atmosphere. Has lakes and rivers of liquid methane and ethane.',
    position: new THREE.Vector3(1040, -40, 820),
    radius: 1.6,
    type: 'moon',
    category: 'outer',
    color: '#d4a574',
    atmosphere: '#ff9944',
    rotationSpeed: 0.003,
    parentId: 'saturn',
    distance: 1340,
    starfleetPresence: 'Titan Research Facility',
    surfaceFeatures: ['Kraken Mare', 'Methane lakes', 'Dunes'],
  },
  {
    id: 'enceladus',
    name: 'Enceladus',
    description: 'Small icy moon with active geysers. Shoots water vapor into space. Has subsurface ocean and potential for life.',
    position: new THREE.Vector3(1020, -60, 790),
    radius: 0.6,
    type: 'moon',
    category: 'outer',
    color: '#ffffff',
    rotationSpeed: 0.005,
    parentId: 'saturn',
    distance: 1310,
    starfleetPresence: 'Enceladus Geyser Observatory',
    surfaceFeatures: ['Tiger stripes', 'Geysers', 'Ice surface'],
  },
  {
    id: 'mimas',
    name: 'Mimas',
    description: 'Small moon resembling the Death Star due to giant Herschel crater. Mostly composed of water ice.',
    position: new THREE.Vector3(985, -45, 780),
    radius: 0.4,
    type: 'moon',
    category: 'outer',
    color: '#c8c8c8',
    rotationSpeed: 0.006,
    parentId: 'saturn',
    distance: 1280,
    surfaceFeatures: ['Herschel Crater'],
  },
  {
    id: 'rhea',
    name: 'Rhea',
    description: 'Saturn\'s second-largest moon. Heavily cratered icy body. May have a tenuous ring system.',
    position: new THREE.Vector3(1060, -55, 840),
    radius: 0.8,
    type: 'moon',
    category: 'outer',
    color: '#b8b8b8',
    rotationSpeed: 0.004,
    parentId: 'saturn',
    distance: 1360,
  },
  {
    id: 'uranus',
    name: 'Uranus',
    description: 'Ice giant tilted on its side. Rotates nearly perpendicular to its orbit. Blue-green color from methane atmosphere.',
    position: new THREE.Vector3(1400, 80, 1400),
    radius: 9,
    type: 'planet',
    category: 'outer',
    color: '#7de3f4',
    atmosphere: '#a8f0ff',
    hasRings: true,
    ringColor: '#444444',
    ringInnerRadius: 11,
    ringOuterRadius: 15,
    rotationSpeed: 0.03,
    orbitRadius: 19.2,
    distance: 2000,
    moons: ['miranda', 'ariel', 'titania'],
    starfleetPresence: 'Uranus Survey Station',
    surfaceFeatures: ['Featureless atmosphere', 'Extreme axial tilt'],
  },
  {
    id: 'miranda',
    name: 'Miranda',
    description: 'Small moon with the most extreme and varied terrain in the solar system. Massive canyons and chevron features.',
    position: new THREE.Vector3(1420, 85, 1390),
    radius: 0.5,
    type: 'moon',
    category: 'outer',
    color: '#a8a8a8',
    rotationSpeed: 0.005,
    parentId: 'uranus',
    distance: 2010,
    surfaceFeatures: ['Verona Rupes', 'Chevron', 'Coronae'],
  },
  {
    id: 'ariel',
    name: 'Ariel',
    description: 'Fourth largest moon of Uranus. Brightest of Uranian moons with complex geological history.',
    position: new THREE.Vector3(1430, 75, 1415),
    radius: 0.6,
    type: 'moon',
    category: 'outer',
    color: '#b0b0b0',
    rotationSpeed: 0.004,
    parentId: 'uranus',
    distance: 2025,
  },
  {
    id: 'titania',
    name: 'Titania',
    description: 'Largest moon of Uranus. Has huge fault valleys and impact craters.',
    position: new THREE.Vector3(1445, 90, 1425),
    radius: 0.8,
    type: 'moon',
    category: 'outer',
    color: '#9a9a9a',
    rotationSpeed: 0.003,
    parentId: 'uranus',
    distance: 2045,
  },
  {
    id: 'neptune',
    name: 'Neptune',
    description: 'Outermost planet. Ice giant with strongest winds in solar system (2100 km/h). Deep blue color from methane.',
    position: new THREE.Vector3(1800, -100, 2000),
    radius: 8,
    type: 'planet',
    category: 'outer',
    color: '#3d5ef5',
    atmosphere: '#6688ff',
    hasRings: true,
    ringColor: '#333333',
    ringInnerRadius: 9.5,
    ringOuterRadius: 13,
    rotationSpeed: 0.032,
    orbitRadius: 30.1,
    distance: 2700,
    moons: ['triton'],
    starfleetPresence: 'Neptune Listening Post - Edge of Sol system',
    surfaceFeatures: ['Great Dark Spot', 'Scooter', 'High-speed winds'],
  },
  {
    id: 'triton',
    name: 'Triton',
    description: 'Neptune\'s largest moon. Retrograde orbit suggests it was captured. Has nitrogen geysers and very thin atmosphere.',
    position: new THREE.Vector3(1830, -95, 2020),
    radius: 1.2,
    type: 'moon',
    category: 'outer',
    color: '#d4b896',
    atmosphere: '#ffddcc',
    rotationSpeed: 0.002,
    parentId: 'neptune',
    distance: 2730,
    surfaceFeatures: ['Nitrogen geysers', 'Cantaloupe terrain', 'Ice cap'],
  },

  // === KUIPER BELT / DWARF PLANETS ===
  {
    id: 'pluto',
    name: 'Pluto',
    description: 'Largest known dwarf planet. Has heart-shaped nitrogen glacier (Sputnik Planitia). Five known moons.',
    position: new THREE.Vector3(2200, 150, 2500),
    radius: 1,
    type: 'dwarf',
    category: 'kuiper',
    color: '#c9b896',
    atmosphere: '#ddccaa',
    rotationSpeed: 0.001,
    orbitRadius: 39.5,
    distance: 3350,
    moons: ['charon'],
    starfleetPresence: 'Pluto Research Outpost',
    surfaceFeatures: ['Sputnik Planitia', 'Tombaugh Regio', 'Mountains'],
  },
  {
    id: 'charon',
    name: 'Charon',
    description: 'Pluto\'s largest moon. So large relative to Pluto that they orbit a common center. Has canyons and red polar cap.',
    position: new THREE.Vector3(2215, 155, 2510),
    radius: 0.6,
    type: 'moon',
    category: 'kuiper',
    color: '#8a8a8a',
    rotationSpeed: 0.001,
    parentId: 'pluto',
    distance: 3365,
    surfaceFeatures: ['Mordor Macula', 'Canyons'],
  },
  {
    id: 'eris',
    name: 'Eris',
    description: 'Most massive known dwarf planet. More massive than Pluto. Located in scattered disc beyond Kuiper Belt.',
    position: new THREE.Vector3(2800, -200, 3200),
    radius: 1.05,
    type: 'dwarf',
    category: 'kuiper',
    color: '#e8e8e8',
    rotationSpeed: 0.0005,
    orbitRadius: 67.8,
    distance: 4300,
    moons: ['dysnomia'],
    surfaceFeatures: ['Highly reflective surface', 'Possible methane frost'],
  },
  {
    id: 'dysnomia',
    name: 'Dysnomia',
    description: 'Only known moon of Eris. Named after the daughter of Eris in Greek mythology.',
    position: new THREE.Vector3(2815, -195, 3210),
    radius: 0.3,
    type: 'moon',
    category: 'kuiper',
    color: '#707070',
    rotationSpeed: 0.0004,
    parentId: 'eris',
    distance: 4315,
  },
  {
    id: 'makemake',
    name: 'Makemake',
    description: 'Second brightest Kuiper belt object after Pluto. Extremely low temperature (-243°C). Reddish-brown color.',
    position: new THREE.Vector3(2500, 100, 2800),
    radius: 0.9,
    type: 'dwarf',
    category: 'kuiper',
    color: '#c49a6c',
    rotationSpeed: 0.001,
    orbitRadius: 45.8,
    distance: 3800,
  },
  {
    id: 'haumea',
    name: 'Haumea',
    description: 'Elongated dwarf planet. Fastest rotating large object in solar system (4-hour day). Has two moons and a ring.',
    position: new THREE.Vector3(2600, -50, 2900),
    radius: 0.8,
    type: 'dwarf',
    category: 'kuiper',
    color: '#d4d4d4',
    hasRings: true,
    ringColor: '#888888',
    ringInnerRadius: 1.2,
    ringOuterRadius: 2,
    rotationSpeed: 0.1, // Very fast!
    orbitRadius: 43.2,
    distance: 3950,
    surfaceFeatures: ['Elongated shape', 'Dark red spot'],
  },

  // === SPACE STATIONS ===
  {
    id: 'spacedock',
    name: 'Earth Spacedock',
    description: 'Massive orbital station above Earth. Primary maintenance and construction facility for Starfleet vessels.',
    position: new THREE.Vector3(220, 10, -185), // Moved further from starting position
    radius: 1.5,
    type: 'station',
    category: 'station',
    color: '#cccccc',
    rotationSpeed: 0.005,
    distance: 290,
    starfleetPresence: 'Primary Starfleet spacedock',
  },
  {
    id: 'deepspace1',
    name: 'Deep Space 1',
    description: 'Federation research and resupply station at the edge of the asteroid belt.',
    position: new THREE.Vector3(550, 0, 180),
    radius: 1,
    type: 'station',
    category: 'station',
    color: '#8888aa',
    rotationSpeed: 0.008,
    distance: 600,
    starfleetPresence: 'Research and resupply station',
  },
];

// Get destination by ID
export function getDestination(id: string): Destination | undefined {
  return DESTINATIONS.find(d => d.id === id);
}

// Get destinations by category
export function getDestinationsByCategory(category: string): Destination[] {
  return DESTINATIONS.filter(d => d.category === category);
}

// Get destinations by type
export function getDestinationsByType(type: string): Destination[] {
  return DESTINATIONS.filter(d => d.type === type);
}

// Get all planets (not moons or dwarf planets)
export function getPlanets(): Destination[] {
  return DESTINATIONS.filter(d => d.type === 'planet');
}

// Get moons of a specific body
export function getMoonsOf(parentId: string): Destination[] {
  return DESTINATIONS.filter(d => d.parentId === parentId);
}

// Calculate distance between two positions
export function calculateDistance(from: THREE.Vector3, to: THREE.Vector3): number {
  return from.distanceTo(to);
}

// Calculate ETA based on warp level
export function calculateWarpETA(distance: number, warpLevel: number): number {
  const baseSpeed = 50; // Units per second at Warp 1
  const speed = Math.pow(warpLevel, 3) * baseSpeed;
  return distance / speed;
}

// Format ETA to human readable string
export function formatETA(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '--:--';
  
  if (seconds < 60) {
    return `${Math.ceil(seconds)}s`;
  } else if (seconds < 3600) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}m ${secs}s`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${mins}m`;
  }
}

// Get sorted destinations by distance from a point
export function getDestinationsSortedByDistance(from: THREE.Vector3): Destination[] {
  return [...DESTINATIONS].sort((a, b) => {
    const distA = from.distanceTo(a.position);
    const distB = from.distanceTo(b.position);
    return distA - distB;
  });
}

// Get navigable destinations (excludes moons and small asteroids for main nav)
export function getNavigableDestinations(): Destination[] {
  return DESTINATIONS.filter(d => 
    d.type === 'planet' || d.type === 'dwarf' || d.type === 'station' || d.id === 'ceres'
  );
}

// Asteroid belt boundaries (for AsteroidBelt component)
export const ASTEROID_BELT = {
  innerRadius: 420,    // Just past Mars
  outerRadius: 600,    // Before Jupiter
  centerY: 0,
  thickness: 80,       // Vertical spread
  count: 3000,         // Number of asteroids to render
};

// Kuiper belt boundaries
export const KUIPER_BELT = {
  innerRadius: 2100,   // Past Neptune
  outerRadius: 3500,   // Outer edge
  centerY: 0,
  thickness: 200,
  count: 1500,
};
