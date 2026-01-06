// Atmospheric glow shader for planet atmospheres

export const atmosphereVertex = `
varying vec3 vNormal;
varying vec3 vPosition;

void main() {
  vNormal = normalize(normalMatrix * normal);
  vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const atmosphereFragment = `
uniform vec3 uAtmosphereColor;
uniform float uIntensity;
varying vec3 vNormal;
varying vec3 vPosition;

void main() {
  vec3 viewDir = normalize(-vPosition);
  
  // Fresnel effect for atmosphere glow
  float fresnel = 1.0 - max(dot(viewDir, vNormal), 0.0);
  fresnel = pow(fresnel, 3.0);
  
  // Intensity adjustment
  float intensity = fresnel * uIntensity;
  
  gl_FragColor = vec4(uAtmosphereColor, intensity);
}
`;

export const coronaVertex = `
varying vec2 vUv;
varying vec3 vNormal;

void main() {
  vUv = uv;
  vNormal = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const coronaFragment = `
uniform float uTime;
uniform vec3 uInnerColor;
uniform vec3 uOuterColor;
varying vec2 vUv;
varying vec3 vNormal;

void main() {
  vec2 center = vec2(0.5, 0.5);
  float dist = length(vUv - center) * 2.0;
  
  // Corona gradient
  float corona = 1.0 - smoothstep(0.0, 1.0, dist);
  corona = pow(corona, 2.0);
  
  // Pulsing effect
  float pulse = sin(uTime * 0.5) * 0.1 + 0.9;
  corona *= pulse;
  
  // Color gradient
  vec3 color = mix(uOuterColor, uInnerColor, corona);
  
  gl_FragColor = vec4(color, corona * 0.8);
}
`;
