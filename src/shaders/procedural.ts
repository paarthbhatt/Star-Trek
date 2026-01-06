// Advanced procedural texture shaders for realistic planets and celestial bodies

export const noiseGLSL = `
// Simplex 3D Noise 
vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}

float snoise(vec3 v){ 
  const vec2 C = vec2(1.0/6.0, 1.0/3.0) ;
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

  vec3 i  = floor(v + dot(v, C.yyy) );
  vec3 x0 =   v - i + dot(i, C.xxx) ;

  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min( g.xyz, l.zxy );
  vec3 i2 = max( g.xyz, l.zxy );

  vec3 x1 = x0 - i1 + 1.0 * C.xxx;
  vec3 x2 = x0 - i2 + 2.0 * C.xxx;
  vec3 x3 = x0 - 1. + 3.0 * C.xxx;

  i = mod(i, 289.0 ); 
  vec4 p = permute( permute( permute( 
             i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) 
           + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

  float n_ = 1.0/7.0;
  vec3  ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z *ns.z);

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_ );

  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4( x.xy, y.xy );
  vec4 b1 = vec4( x.zw, y.zw );

  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;

  vec3 p0 = vec3(a0.xy,h.x);
  vec3 p1 = vec3(a0.zw,h.y);
  vec3 p2 = vec3(a1.xy,h.z);
  vec3 p3 = vec3(a1.zw,h.w);

  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3) ) );
}

float fbm(vec3 p, int octaves) {
  float value = 0.0;
  float amplitude = 0.5;
  float frequency = 1.0;
  for (int i = 0; i < 8; i++) {
    if (i >= octaves) break;
    value += amplitude * snoise(p * frequency);
    amplitude *= 0.5;
    frequency *= 2.0;
  }
  return value;
}

// Worley/Voronoi noise for craters
float worley(vec3 p) {
  vec3 id = floor(p);
  vec3 fd = fract(p);
  float minDist = 1.0;
  for(int x = -1; x <= 1; x++) {
    for(int y = -1; y <= 1; y++) {
      for(int z = -1; z <= 1; z++) {
        vec3 coord = vec3(x, y, z);
        vec3 rId = id + coord;
        vec3 r = coord + (vec3(
          snoise(rId * 127.1),
          snoise(rId * 269.5),
          snoise(rId * 419.2)
        ) * 0.5 + 0.5) - fd;
        float d = dot(r, r);
        minDist = min(minDist, d);
      }
    }
  }
  return sqrt(minDist);
}
`;

export const proceduralPlanetVertex = `
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;
varying vec3 vWorldPosition;

void main() {
  vUv = uv;
  vNormal = normalize(normalMatrix * normal);
  vPosition = position;
  vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

// ==================== EARTH SHADER ====================
export const earthFragment = `
${noiseGLSL}

uniform float uTime;
uniform vec3 uSunDirection;
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;
varying vec3 vWorldPosition;

void main() {
  vec3 pos = vPosition * 2.0;
  
  // Reduced octaves: 6->4, 4->3
  float continent = fbm(pos * 1.2, 4);
  continent += fbm(pos * 2.5 + 10.0, 3) * 0.4;
  continent = smoothstep(-0.15, 0.25, continent);
  
  // Add coastal shelf / shallow water
  float shelf = smoothstep(-0.15, 0.05, fbm(pos * 1.2, 4) + fbm(pos * 2.5 + 10.0, 3) * 0.4);
  
  // Ocean depth variation
  float oceanDepth = fbm(pos * 0.8, 2) * 0.5 + 0.5;
  vec3 oceanDeep = vec3(0.01, 0.05, 0.15);
  vec3 oceanMid = vec3(0.02, 0.12, 0.35);
  vec3 oceanShallow = vec3(0.05, 0.25, 0.45);
  vec3 ocean = mix(oceanDeep, oceanMid, oceanDepth);
  ocean = mix(ocean, oceanShallow, shelf * (1.0 - continent));
  
  // Land with varied terrain (reduced octaves: 5->3, 3->2)
  float elevation = fbm(pos * 4.0, 3);
  float moisture = fbm(pos * 2.0 + 50.0, 2);
  
  // Biome colors
  vec3 desert = vec3(0.76, 0.7, 0.5);
  vec3 grassland = vec3(0.2, 0.45, 0.15);
  vec3 forest = vec3(0.1, 0.3, 0.08);
  vec3 tundra = vec3(0.5, 0.55, 0.45);
  vec3 mountain = vec3(0.4, 0.38, 0.35);
  vec3 snow = vec3(0.95, 0.97, 1.0);
  
  // Latitude factor for biomes
  float latitude = abs(vUv.y - 0.5) * 2.0;
  
  // Select biome based on latitude, moisture, and elevation
  vec3 land = grassland;
  land = mix(land, forest, smoothstep(0.3, 0.6, moisture) * (1.0 - latitude));
  land = mix(land, desert, smoothstep(0.4, 0.7, 1.0 - moisture) * smoothstep(0.0, 0.4, 1.0 - latitude));
  land = mix(land, tundra, smoothstep(0.5, 0.8, latitude));
  land = mix(land, mountain, smoothstep(0.4, 0.7, elevation));
  land = mix(land, snow, smoothstep(0.6, 0.8, elevation) * smoothstep(0.3, 0.6, latitude));
  
  // Polar ice caps
  float iceCap = smoothstep(0.75, 0.92, latitude);
  iceCap += smoothstep(0.85, 0.95, latitude) * 0.5;
  
  // Combine land and ocean
  vec3 surface = mix(ocean, land, continent);
  surface = mix(surface, snow, iceCap * 0.9);
  
  // Lighting
  vec3 lightDir = normalize(uSunDirection);
  float NdotL = max(dot(vNormal, lightDir), 0.0);
  
  // Day/night transition
  float dayFactor = NdotL;
  float twilight = smoothstep(-0.1, 0.2, NdotL);
  
  // City lights on dark side (only on land) - reduced octaves 3->2
  float cityNoise = fbm(pos * 20.0, 2);
  float cities = smoothstep(0.6, 0.8, cityNoise) * continent;
  cities *= smoothstep(0.1, -0.1, NdotL); // Only on night side
  cities *= (1.0 - iceCap); // No cities on ice
  vec3 cityLight = vec3(1.0, 0.9, 0.6) * cities * 2.0;
  
  // Apply lighting
  vec3 ambient = surface * 0.08;
  vec3 diffuse = surface * dayFactor * 0.9;
  
  // Specular for ocean (reduced for more realistic look)
  vec3 viewDir = normalize(-vWorldPosition);
  vec3 halfDir = normalize(lightDir + viewDir);
  float spec = pow(max(dot(vNormal, halfDir), 0.0), 96.0); // Higher exponent = smaller highlight
  vec3 specular = vec3(1.0) * spec * 0.15 * (1.0 - continent) * dayFactor; // Reduced from 0.3 to 0.15
  
  vec3 finalColor = ambient + diffuse + specular + cityLight;
  
  gl_FragColor = vec4(finalColor, 1.0);
}
`;

// ==================== EARTH CLOUDS SHADER ====================
export const earthCloudsFragment = `
${noiseGLSL}

uniform float uTime;
uniform vec3 uSunDirection;
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;

void main() {
  vec3 pos = vPosition * 2.0 + vec3(uTime * 0.01, 0.0, 0.0);
  
  // Multi-layered cloud noise - reduced octaves 5->3, 4->3
  float clouds = fbm(pos * 2.0, 3);
  clouds += fbm(pos * 4.0 + 100.0, 3) * 0.5;
  clouds = smoothstep(0.1, 0.6, clouds);
  
  // Reduce clouds at poles
  float latitude = abs(vUv.y - 0.5) * 2.0;
  clouds *= smoothstep(0.95, 0.7, latitude);
  
  // Hurricane/cyclone patterns
  float cyclone = fbm(pos * 1.5 + vec3(uTime * 0.005, 0.0, 0.0), 4);
  float swirl = sin(atan(vPosition.z, vPosition.x) * 3.0 + cyclone * 5.0) * 0.5 + 0.5;
  clouds = max(clouds, swirl * smoothstep(0.7, 0.9, cyclone) * 0.6);
  
  // Lighting
  vec3 lightDir = normalize(uSunDirection);
  float NdotL = max(dot(vNormal, lightDir), 0.0);
  float dayFactor = NdotL * 0.8 + 0.2;
  
  vec3 cloudColor = vec3(1.0, 1.0, 1.0) * dayFactor;
  
  // Sunset/sunrise tint on terminator
  float terminator = smoothstep(-0.1, 0.1, NdotL) * smoothstep(0.3, 0.0, NdotL);
  cloudColor = mix(cloudColor, vec3(1.0, 0.7, 0.5), terminator * 0.5);
  
  gl_FragColor = vec4(cloudColor, clouds * 0.65);
}
`;

// ==================== MARS SHADER ====================
export const marsFragment = `
${noiseGLSL}

uniform float uTime;
uniform vec3 uSunDirection;
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;

void main() {
  vec3 pos = vPosition * 2.0;
  
  // Terrain height
  float terrain = fbm(pos * 1.5, 6);
  float detail = fbm(pos * 6.0, 4) * 0.3;
  float height = terrain + detail;
  
  // Mars colors - rust reds and oranges
  vec3 dustLight = vec3(0.85, 0.55, 0.35);
  vec3 dustDark = vec3(0.6, 0.25, 0.15);
  vec3 rockDark = vec3(0.35, 0.18, 0.12);
  vec3 sand = vec3(0.9, 0.7, 0.5);
  
  // Mix based on elevation
  vec3 color = mix(dustDark, dustLight, height * 0.5 + 0.5);
  color = mix(color, rockDark, smoothstep(0.3, 0.6, terrain));
  color = mix(color, sand, smoothstep(0.5, 0.8, detail) * 0.4);
  
  // Olympus Mons-like feature
  vec2 olympusPos = vec2(0.3, 0.55);
  float olympusDist = length(vUv - olympusPos);
  float olympus = smoothstep(0.15, 0.05, olympusDist);
  color = mix(color, vec3(0.45, 0.25, 0.18), olympus * 0.6);
  
  // Valles Marineris-like canyon
  float canyon = smoothstep(0.48, 0.5, vUv.y) * smoothstep(0.52, 0.5, vUv.y);
  canyon *= smoothstep(0.2, 0.4, vUv.x) * smoothstep(0.8, 0.6, vUv.x);
  canyon *= (1.0 - fbm(pos * 10.0, 2) * 0.5);
  color = mix(color, rockDark * 0.6, canyon * 0.7);
  
  // Polar ice caps (CO2 ice)
  float latitude = abs(vUv.y - 0.5) * 2.0;
  float iceCap = smoothstep(0.8, 0.95, latitude);
  iceCap *= 0.5 + fbm(pos * 8.0, 3) * 0.5;
  vec3 ice = vec3(0.92, 0.88, 0.85);
  color = mix(color, ice, iceCap * 0.8);
  
  // Dust storms (animated)
  float storm = fbm(pos * 3.0 + vec3(uTime * 0.02, 0.0, 0.0), 3);
  storm = smoothstep(0.5, 0.8, storm);
  color = mix(color, dustLight * 1.2, storm * 0.2);
  
  // Lighting
  vec3 lightDir = normalize(uSunDirection);
  float NdotL = max(dot(vNormal, lightDir), 0.0);
  float light = NdotL * 0.75 + 0.25;
  
  gl_FragColor = vec4(color * light, 1.0);
}
`;

// ==================== GAS GIANT (JUPITER) SHADER ====================
export const gasGiantFragment = `
${noiseGLSL}

uniform float uTime;
uniform vec3 uSunDirection;
uniform vec3 uBandColor1;
uniform vec3 uBandColor2;
uniform vec3 uBandColor3;
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;

void main() {
  vec3 pos = vPosition;
  
  // Animated zonal bands
  float bandNoise = fbm(vec3(pos.x * 0.5, pos.y * 2.0, uTime * 0.02), 4);
  float bands = sin(vUv.y * 40.0 + bandNoise * 3.0);
  bands = bands * 0.5 + 0.5;
  
  // Secondary finer bands
  float fineBands = sin(vUv.y * 120.0 + bandNoise * 2.0) * 0.5 + 0.5;
  bands = mix(bands, fineBands, 0.3);
  
  // Storm turbulence
  float turbulence = fbm(vec3(pos.x * 4.0 + uTime * 0.05, pos.y * 2.0, pos.z * 4.0), 5);
  
  // Jupiter-like colors
  vec3 orange = vec3(0.9, 0.6, 0.35);
  vec3 cream = vec3(0.95, 0.9, 0.8);
  vec3 brown = vec3(0.55, 0.35, 0.2);
  vec3 white = vec3(0.98, 0.95, 0.9);
  
  vec3 color = mix(orange, cream, bands);
  color = mix(color, brown, smoothstep(0.4, 0.6, turbulence) * 0.5);
  color = mix(color, white, smoothstep(0.7, 0.9, bands) * 0.4);
  
  // Great Red Spot
  vec2 spotCenter = vec2(0.25, 0.35);
  float spotDist = length((vUv - spotCenter) * vec2(1.0, 1.5));
  float spot = smoothstep(0.12, 0.02, spotDist);
  
  // Swirling pattern in spot
  float spotAngle = atan(vUv.y - spotCenter.y, vUv.x - spotCenter.x);
  float swirl = sin(spotAngle * 6.0 - uTime * 0.5 + spotDist * 20.0) * 0.5 + 0.5;
  vec3 spotColor = mix(vec3(0.7, 0.25, 0.15), vec3(0.85, 0.4, 0.25), swirl);
  color = mix(color, spotColor, spot * 0.85);
  
  // White oval storms
  vec2 ovalPos = vec2(0.6, 0.55);
  float oval = smoothstep(0.06, 0.02, length((vUv - ovalPos) * vec2(1.2, 1.8)));
  color = mix(color, white, oval * 0.7);
  
  // Lighting with limb darkening
  vec3 lightDir = normalize(uSunDirection);
  float NdotL = max(dot(vNormal, lightDir), 0.0);
  float NdotV = max(dot(vNormal, normalize(-vPosition)), 0.0);
  float limb = pow(NdotV, 0.5);
  float light = NdotL * 0.6 + 0.4;
  light *= limb;
  
  gl_FragColor = vec4(color * light, 1.0);
}
`;

// ==================== ICE GIANT (URANUS/NEPTUNE) SHADER ====================
export const iceGiantFragment = `
${noiseGLSL}

uniform float uTime;
uniform vec3 uSunDirection;
uniform vec3 uBaseColor;
uniform float uBandIntensity;
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;

void main() {
  vec3 pos = vPosition;
  
  // Subtle banding
  float bands = sin(vUv.y * 25.0 + fbm(pos * 2.0 + uTime * 0.01, 3) * 1.5);
  bands = bands * 0.5 + 0.5;
  
  // Storm systems
  float storms = fbm(vec3(pos.x * 3.0 + uTime * 0.03, pos.y * 1.5, pos.z * 3.0), 4);
  
  // Color variation
  vec3 darkBlue = uBaseColor * 0.7;
  vec3 lightBlue = uBaseColor * 1.2;
  vec3 cyan = vec3(0.5, 0.9, 0.95);
  
  vec3 color = mix(darkBlue, lightBlue, bands * uBandIntensity);
  color = mix(color, cyan, smoothstep(0.6, 0.8, storms) * 0.15);
  
  // Bright spots (like Neptune's Great Dark Spot)
  vec2 spotPos = vec2(0.4, 0.4);
  float spot = smoothstep(0.1, 0.03, length((vUv - spotPos) * vec2(1.3, 1.0)));
  color = mix(color, darkBlue * 0.6, spot * 0.5);
  
  // Atmospheric haze at limb
  float NdotV = max(dot(vNormal, normalize(-vPosition)), 0.0);
  float haze = 1.0 - pow(NdotV, 0.6);
  color = mix(color, lightBlue * 1.3, haze * 0.3);
  
  // Lighting
  vec3 lightDir = normalize(uSunDirection);
  float NdotL = max(dot(vNormal, lightDir), 0.0);
  float light = NdotL * 0.65 + 0.35;
  
  gl_FragColor = vec4(color * light, 1.0);
}
`;

// ==================== ROCKY PLANET (MERCURY/MOON) SHADER ====================
export const rockyPlanetFragment = `
${noiseGLSL}

uniform float uTime;
uniform vec3 uSunDirection;
uniform vec3 uBaseColor;
uniform float uCraterDensity;
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;

void main() {
  vec3 pos = vPosition * 3.0;
  
  // Base terrain
  float terrain = fbm(pos * 1.5, 5);
  
  // Crater field using Worley noise
  float craters = worley(pos * uCraterDensity);
  craters = smoothstep(0.0, 0.4, craters);
  
  // Large impact basins
  float basins = worley(pos * 0.5);
  basins = smoothstep(0.0, 0.5, basins);
  
  // Color variation
  vec3 bright = uBaseColor * 1.2;
  vec3 dark = uBaseColor * 0.5;
  vec3 crater = uBaseColor * 0.35;
  
  vec3 color = mix(dark, bright, terrain * 0.5 + 0.5);
  color = mix(crater, color, craters);
  color = mix(color * 0.7, color, basins);
  
  // Ray patterns from large craters
  float rays = fbm(pos * 8.0, 2);
  float rayPattern = smoothstep(0.6, 0.8, rays) * (1.0 - craters);
  color = mix(color, bright * 1.1, rayPattern * 0.3);
  
  // Lighting with terrain shadows
  vec3 lightDir = normalize(uSunDirection);
  float NdotL = max(dot(vNormal, lightDir), 0.0);
  
  // Harsh shadows for airless body
  float shadow = smoothstep(0.0, 0.05, NdotL);
  float light = NdotL * shadow * 0.9 + 0.1;
  
  gl_FragColor = vec4(color * light, 1.0);
}
`;

// ==================== VOLCANIC MOON (IO) SHADER ====================
export const volcanicMoonFragment = `
${noiseGLSL}

uniform float uTime;
uniform vec3 uSunDirection;
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;

void main() {
  vec3 pos = vPosition * 3.0;
  
  // Sulfur deposits
  float sulfur = fbm(pos * 2.0, 5);
  float deposits = fbm(pos * 5.0, 4);
  
  // Volcanic hotspots
  float volcanoes = worley(pos * 4.0);
  volcanoes = 1.0 - smoothstep(0.0, 0.15, volcanoes);
  
  // Lava flows
  float lava = fbm(pos * 8.0 + vec3(uTime * 0.1, 0.0, 0.0), 3);
  lava = smoothstep(0.5, 0.7, lava) * volcanoes;
  
  // Colors - Io's distinctive yellow/orange/red
  vec3 yellow = vec3(0.95, 0.9, 0.3);
  vec3 orange = vec3(0.95, 0.6, 0.2);
  vec3 red = vec3(0.8, 0.25, 0.1);
  vec3 white = vec3(0.95, 0.95, 0.85);
  vec3 black = vec3(0.15, 0.1, 0.08);
  vec3 lavaColor = vec3(1.0, 0.4, 0.1);
  
  vec3 color = mix(yellow, orange, sulfur * 0.5 + 0.5);
  color = mix(color, red, deposits * 0.4);
  color = mix(color, white, smoothstep(0.6, 0.9, sulfur) * 0.4);
  color = mix(color, black, volcanoes * 0.7);
  
  // Glowing lava
  vec3 finalColor = color;
  finalColor = mix(finalColor, lavaColor, lava);
  
  // Lighting
  vec3 lightDir = normalize(uSunDirection);
  float NdotL = max(dot(vNormal, lightDir), 0.0);
  float light = NdotL * 0.8 + 0.2;
  
  // Lava glow emission
  vec3 emission = lavaColor * lava * 2.0;
  
  gl_FragColor = vec4(finalColor * light + emission, 1.0);
}
`;

// ==================== ICY MOON (EUROPA/ENCELADUS) SHADER ====================
export const icyMoonFragment = `
${noiseGLSL}

uniform float uTime;
uniform vec3 uSunDirection;
uniform vec3 uIceColor;
uniform float uCrackIntensity;
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;

void main() {
  vec3 pos = vPosition * 4.0;
  
  // Ice surface variation
  float ice = fbm(pos * 1.0, 4);
  
  // Linear crack patterns (Europa's lineae)
  float cracks = 0.0;
  for (float i = 0.0; i < 5.0; i++) {
    float angle = i * 0.628 + fbm(pos * 0.5, 2) * 0.5;
    vec2 dir = vec2(cos(angle), sin(angle));
    float line = abs(dot(vUv - 0.5, dir));
    float crackNoise = fbm(pos * 10.0 + i * 10.0, 2);
    line = smoothstep(0.02 + crackNoise * 0.02, 0.0, line);
    cracks = max(cracks, line * smoothstep(0.3, 0.7, crackNoise));
  }
  cracks *= uCrackIntensity;
  
  // Colors
  vec3 iceWhite = uIceColor;
  vec3 iceBlue = uIceColor * vec3(0.85, 0.9, 1.0);
  vec3 crackColor = vec3(0.6, 0.4, 0.3);
  
  vec3 color = mix(iceWhite, iceBlue, ice * 0.3 + 0.3);
  color = mix(color, crackColor, cracks * 0.7);
  
  // Subtle blue tint at limb (subsurface scattering simulation)
  float NdotV = max(dot(vNormal, normalize(-vPosition)), 0.0);
  float sss = 1.0 - pow(NdotV, 0.5);
  color = mix(color, vec3(0.7, 0.85, 1.0), sss * 0.15);
  
  // Lighting
  vec3 lightDir = normalize(uSunDirection);
  float NdotL = max(dot(vNormal, lightDir), 0.0);
  float light = NdotL * 0.85 + 0.15;
  
  // Specular for ice
  vec3 viewDir = normalize(-vPosition);
  vec3 halfDir = normalize(lightDir + viewDir);
  float spec = pow(max(dot(vNormal, halfDir), 0.0), 32.0);
  
  gl_FragColor = vec4(color * light + vec3(1.0) * spec * 0.1, 1.0);
}
`;

// ==================== TITAN (HAZY MOON) SHADER ====================
export const hazyMoonFragment = `
${noiseGLSL}

uniform float uTime;
uniform vec3 uSunDirection;
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;

void main() {
  vec3 pos = vPosition * 2.0;
  
  // Surface features (barely visible through haze)
  float surface = fbm(pos * 2.0, 4);
  float lakes = fbm(pos * 1.5, 3);
  lakes = smoothstep(0.4, 0.5, lakes);
  
  // Surface color
  vec3 surfaceColor = vec3(0.4, 0.35, 0.25);
  vec3 lakeColor = vec3(0.15, 0.12, 0.1); // Methane lakes
  vec3 color = mix(surfaceColor, lakeColor, lakes * 0.6);
  
  // Thick atmospheric haze
  float NdotV = max(dot(vNormal, normalize(-vPosition)), 0.0);
  float haze = 1.0 - pow(NdotV, 0.3);
  
  // Haze color (orange-brown)
  vec3 hazeColor = vec3(0.85, 0.6, 0.35);
  
  // Strong limb brightening from haze
  color = mix(color, hazeColor, haze * 0.85);
  
  // Additional atmospheric glow
  float glow = 1.0 - pow(NdotV, 0.15);
  color = mix(color, hazeColor * 1.2, glow * 0.3);
  
  // Lighting (very diffuse due to haze)
  vec3 lightDir = normalize(uSunDirection);
  float NdotL = max(dot(vNormal, lightDir), 0.0);
  float light = NdotL * 0.4 + 0.6; // Very soft lighting
  
  gl_FragColor = vec4(color * light, 1.0);
}
`;

// ==================== MOON (LUNA) SHADER ====================
export const moonFragment = `
${noiseGLSL}

uniform float uTime;
uniform vec3 uSunDirection;
varying vec3 vNormal;
varying vec3 vPosition;
varying vec2 vUv;

void main() {
  vec3 pos = vPosition * 3.0;
  
  // Highlands and maria (seas)
  float terrain = fbm(pos * 1.0, 5);
  float maria = fbm(pos * 0.8 + 10.0, 3);
  maria = smoothstep(0.3, 0.5, maria);
  
  // Craters at multiple scales
  float largeCraters = worley(pos * 1.5);
  float medCraters = worley(pos * 4.0);
  float smallCraters = worley(pos * 12.0);
  
  largeCraters = smoothstep(0.0, 0.35, largeCraters);
  medCraters = smoothstep(0.0, 0.25, medCraters);
  smallCraters = smoothstep(0.0, 0.2, smallCraters);
  
  // Moon colors
  vec3 highland = vec3(0.75, 0.73, 0.7);
  vec3 mariaColor = vec3(0.35, 0.35, 0.38);
  vec3 craterFloor = vec3(0.25, 0.25, 0.27);
  vec3 bright = vec3(0.85, 0.83, 0.8);
  
  vec3 color = mix(highland, mariaColor, maria);
  color = mix(craterFloor, color, largeCraters);
  color = mix(color * 0.8, color, medCraters);
  color = mix(color * 0.9, color, smallCraters);
  
  // Crater rays
  float rays = fbm(pos * 15.0, 2);
  rays = smoothstep(0.65, 0.8, rays) * (1.0 - maria);
  color = mix(color, bright, rays * 0.4);
  
  // Lighting
  vec3 lightDir = normalize(uSunDirection);
  float NdotL = max(dot(vNormal, lightDir), 0.0);
  
  // Sharp terminator for airless body
  float shadow = smoothstep(-0.02, 0.02, NdotL);
  float light = NdotL * shadow * 0.95 + 0.05;
  
  gl_FragColor = vec4(color * light, 1.0);
}
`;

// ==================== VENUS SHADER ====================
export const venusFragment = `
${noiseGLSL}

uniform float uTime;
uniform vec3 uSunDirection;
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;

void main() {
  vec3 pos = vPosition * 2.0;
  
  // Dense cloud layers
  float clouds1 = fbm(pos * 1.5 + vec3(uTime * 0.02, 0.0, 0.0), 5);
  float clouds2 = fbm(pos * 3.0 + vec3(uTime * 0.03, uTime * 0.01, 0.0), 4);
  float clouds3 = fbm(pos * 6.0 + vec3(uTime * 0.04, 0.0, uTime * 0.02), 3);
  
  // Combine cloud layers
  float clouds = clouds1 * 0.5 + clouds2 * 0.35 + clouds3 * 0.15;
  
  // Venus colors - yellowish/white clouds
  vec3 cloudLight = vec3(0.95, 0.9, 0.75);
  vec3 cloudDark = vec3(0.7, 0.6, 0.4);
  vec3 cloudMid = vec3(0.85, 0.75, 0.55);
  
  vec3 color = mix(cloudDark, cloudLight, clouds * 0.5 + 0.5);
  color = mix(color, cloudMid, smoothstep(0.3, 0.7, clouds2));
  
  // Y-shaped cloud pattern (characteristic of Venus)
  float yPattern = abs(sin(vUv.x * 6.28 + vUv.y * 3.0)) * 0.5;
  yPattern *= smoothstep(0.3, 0.5, abs(vUv.y - 0.5));
  color = mix(color, cloudLight, yPattern * 0.2);
  
  // Limb darkening/brightening
  float NdotV = max(dot(vNormal, normalize(-vPosition)), 0.0);
  float limb = pow(NdotV, 0.5);
  
  // Lighting
  vec3 lightDir = normalize(uSunDirection);
  float NdotL = max(dot(vNormal, lightDir), 0.0);
  float light = NdotL * 0.6 + 0.4;
  light *= limb;
  
  gl_FragColor = vec4(color * light, 1.0);
}
`;
