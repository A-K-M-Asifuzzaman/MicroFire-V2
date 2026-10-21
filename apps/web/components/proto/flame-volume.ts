// A volumetric flame you can walk around: raymarched inside a box in object space. It is the same TEACHING
// ILLUSTRATION as the Gravity Lens (still air): at 0 g a round, dim, blue diffusion shell; at 1 g buoyancy stretches it
// into a tall, yellow, sooty teardrop. Nothing here is computed from or compared with NASA data.
import * as THREE from 'three';

const vert = /* glsl */ `
varying vec3 vPos; varying vec3 vCam;
void main() {
  vPos = position;
  vCam = (inverse(modelMatrix) * vec4(cameraPosition, 1.0)).xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const frag = /* glsl */ `
uniform float uTime; uniform float uG; uniform float uGain; uniform vec3 uHalf;
varying vec3 vPos; varying vec3 vCam;
float h(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
float n3(vec3 p) { vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(h(i), h(i + vec3(1,0,0)), f.x), mix(h(i + vec3(0,1,0)), h(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(h(i + vec3(0,0,1)), h(i + vec3(1,0,1)), f.x), mix(h(i + vec3(0,1,1)), h(i + vec3(1,1,1)), f.x), f.y), f.z); }
float fbm(vec3 p) { return n3(p) * 0.55 + n3(p * 2.03) * 0.3 + n3(p * 4.1) * 0.15; }
// Emission at p: rgb colour, a density.
vec4 flame(vec3 p) {
  float g = uG;
  vec3 q = p;
  q.y -= mix(0.0, 0.18, g);
  float lift = mix(1.0, 2.5, g);                          // buoyancy stretches it upward
  float taper = 1.0 + max(q.y, 0.0) * g * 2.2;            // and pinches the tip
  vec3 e = vec3(q.x * taper, q.y / lift, q.z * taper);
  float turb = fbm(p * 4.0 + vec3(0.0, -uTime * mix(0.25, 1.9, g), 0.0));
  float r = length(e) + (turb - 0.5) * mix(0.05, 0.14, g);
  // Microgravity: a thin glowing shell where fuel and slowly diffusing oxygen meet; the core stays dark.
  float shell = exp(-pow((r - 0.27) / 0.045, 2.0));
  // Gravity: a filled luminous teardrop with a hot base and sooty yellow body.
  float body = smoothstep(0.30, 0.16, r);
  float d = mix(shell * 1.1, body * 1.25, g);
  float heightT = clamp(q.y / (0.3 * lift) * 0.5 + 0.5, 0.0, 1.0);
  vec3 blue = mix(vec3(0.16, 0.32, 1.0), vec3(0.55, 0.42, 1.0), smoothstep(0.2, 0.9, heightT)); // faint violet crown
  vec3 hot = mix(vec3(1.0, 0.92, 0.7), vec3(1.0, 0.55, 0.12), smoothstep(0.25, 0.85, heightT));
  hot = mix(hot, vec3(0.9, 0.22, 0.04), smoothstep(0.8, 1.0, heightT));
  vec3 baseBlue = vec3(0.2, 0.4, 1.0) * smoothstep(0.35, 0.0, heightT);   // blue skirt at the base, even at 1 g
  vec3 col = mix(blue, hot + baseBlue * 0.6, g);
  return vec4(col, d);
}
bool inside(vec3 p) { return all(lessThanEqual(abs(p), uHalf + 1e-3)); }
void main() {
  vec3 dir = normalize(vPos - vCam);
  vec3 p = inside(vCam) ? vCam : vPos;
  float stepLen = length(uHalf) * 2.0 / 64.0;
  vec3 acc = vec3(0.0); float a = 0.0;
  for (int i = 0; i < 64; i++) {
    if (!inside(p) || a > 0.97) break;
    vec4 f = flame(p);
    float k = f.a * stepLen * 9.0;
    acc += f.rgb * k * (1.0 - a);
    a += k * 0.18 * (1.0 - a);
    p += dir * stepLen;
  }
  gl_FragColor = vec4(acc * uGain * mix(0.24, 0.5, uG), 1.0); // the still-air flame is dim; buoyancy makes it bright
}`;

export type FlameVolume = { mesh: THREE.Mesh; update(t: number, g: number): void; dispose(): void };

/** `size` is the box height in scene units; the flame fills about two thirds of it at 1 g. */
export function flameVolume(size = 1.8, gain = 2.2): FlameVolume {
  const half = new THREE.Vector3(0.45, 0.9, 0.45);
  const geo = new THREE.BoxGeometry(half.x * 2, half.y * 2, half.z * 2);
  const mat = new THREE.ShaderMaterial({
    vertexShader: vert, fragmentShader: frag, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.FrontSide,
    uniforms: { uTime: { value: 0 }, uG: { value: 0 }, uGain: { value: gain }, uHalf: { value: half } }
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.scale.setScalar(size / 1.8);
  mesh.frustumCulled = false;
  return {
    mesh,
    update(t, g) { mat.uniforms.uTime!.value = t; mat.uniforms.uG!.value = g; },
    dispose() { geo.dispose(); mat.dispose(); }
  };
}
