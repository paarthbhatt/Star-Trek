// Nebula shader for volumetric space clouds

import { noiseGLSL } from './procedural';

export const nebulaVertex = `
varying vec2 vUv;
varying vec3 vPosition;

void main() {
  vUv = uv;
  vPosition = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const nebulaFragment = `
${noiseGLSL}

uniform float uTime;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;
varying vec2 vUv;
varying vec3 vPosition;

void main() {
  vec3 pos = vPosition * 0.003 + uTime * 0.01;
  
  // Reduced octaves for performance: 4->3, 3->2, 5->3
  float noise1 = fbm(pos, 3);
  float noise2 = fbm(pos * 2.0 + 100.0, 2);
  float noise3 = fbm(pos * 0.5 + 200.0, 3);
  
  // Combine noises
  float combinedNoise = noise1 * 0.5 + noise2 * 0.3 + noise3 * 0.2;
  combinedNoise = smoothstep(-0.2, 0.8, combinedNoise);
  
  // Color mixing
  vec3 color = mix(uColor1, uColor2, noise1 * 0.5 + 0.5);
  color = mix(color, uColor3, noise2 * 0.3);
  
  // Distance-based fade
  float dist = length(vPosition) / 400.0;
  float fade = 1.0 - smoothstep(0.3, 1.0, dist);
  
  // Alpha based on noise
  float alpha = combinedNoise * 0.15 * fade;
  
  gl_FragColor = vec4(color, alpha);
}
`;
