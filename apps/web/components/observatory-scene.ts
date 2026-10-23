// The MicroFire Observatory: an original three.js scene (artistic interpretation, not a NASA reconstruction).
// Loaded only by the home page, after first paint. Geometry is procedural; two optional GLB props (PIX and the
// research console, generated with Meshy and rights-logged in data/asset-rights.json) replace the procedural
// stand-ins when they load. If they fail, the procedural versions simply stay.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { loadModel, cleanFinish } from './model-loader';

export type Anchor = { x: number; y: number; visible: boolean };
/** Where PIX flies: its home beside the chamber, a station (index), or the Training Bay door. */
export type PixTarget = 'home' | 'bay' | number;
export type PixGesture = 'wave' | 'nod' | 'shake' | 'spin' | 'hop';
export type ObservatoryApi = {
  setGravity(g: number): void; setMotion(on: boolean): void; focusStation(i: number | null, pan?: boolean): void;
  setScroll(p: number): void; resize(): void; stop(): void;
  /** Fast-forward the opening flight (any visitor input does this). */
  skipIntro(): void;
  setPix(target: PixTarget, gesture?: PixGesture): void;
  /** Turn toward the Training Bay door and open it a little (hover/focus on the entrance). */
  peekBay(on: boolean): void;
  /** Fly to the Training Bay door and open it; resolves when the shot is complete. */
  enterBay(): Promise<void>;
};
export type ObservatoryOptions = {
  canvas: HTMLCanvasElement; host: HTMLElement; stage: () => DOMRect | null; stations: string[];
  mobile: boolean; motion: boolean; gravity: number;
  /** Play the directed opening flight (once per session; never under reduced motion). */
  intro: boolean; onIntroDone: () => void;
  onAnchors: (anchors: Anchor[]) => void; onPix: (a: Anchor) => void; onLost: () => void; onRestored: () => void;
};

const ease = (t: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const inOut = (t: number) => { const x = clamp01(t); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
/** Eased progress of a sub-span [a, b] of the 0..1 timeline. */
const span = (u: number, a: number, b: number) => inOut((u - a) / (b - a));
const INTRO_MS = 6800, ENTER_MS = 1500;
const BLUE = new THREE.Color('#6fa6ff'), ORANGE = new THREE.Color('#ff9446');
const FRESNEL_VERT = 'varying vec3 vN; varying vec3 vV; varying vec3 vP; void main(){ vec4 w = modelMatrix * vec4(position,1.); vP = position; vN = normalize(mat3(modelMatrix)*normal); vV = normalize(cameraPosition - w.xyz); gl_Position = projectionMatrix * viewMatrix * w; }';

function screenTexture(kind: number, title: string): THREE.CanvasTexture {
  const c = document.createElement('canvas'); c.width = 320; c.height = 200;
  const x = c.getContext('2d')!;
  const bg = x.createLinearGradient(0, 0, 0, 200); bg.addColorStop(0, '#0d2233'); bg.addColorStop(1, '#06111b');
  x.fillStyle = bg; x.fillRect(0, 0, 320, 200);
  x.strokeStyle = 'rgba(115,187,217,.55)'; x.lineWidth = 2; x.strokeRect(6, 6, 308, 188);
  x.fillStyle = '#9fd8ef'; x.font = '600 15px ui-monospace, Menlo, monospace'; x.fillText(title, 18, 30);
  x.strokeStyle = 'rgba(115,187,217,.8)'; x.fillStyle = '#ff8738';
  if (kind === 0) { // atlas: one admitted record among quarantined candidates (1 + 55 cells)
    for (let i = 0; i < 56; i++) { const cx = 20 + (i % 14) * 20, cy = 52 + Math.floor(i / 14) * 34; x.globalAlpha = i === 0 ? 1 : .35; x.fillStyle = i === 0 ? '#ff8738' : '#5d7f97'; x.fillRect(cx, cy, 14, 24); }
    x.globalAlpha = 1;
  } else if (kind === 1) { // dossier: a document and a duct sketch
    x.fillStyle = 'rgba(201,212,221,.75)'; for (let i = 0; i < 6; i++) x.fillRect(18, 50 + i * 20, 150 - (i % 3) * 30, 6);
    x.strokeRect(190, 70, 110, 50); x.fillStyle = '#ff8738'; x.beginPath(); x.ellipse(245, 95, 12, 16, 0, 0, Math.PI * 2); x.fill();
  } else if (kind === 2) { // workstation: question → … → source chain
    for (let i = 0; i < 6; i++) { const cx = 34 + i * 50; x.beginPath(); x.arc(cx, 110, 13, 0, Math.PI * 2); x.fillStyle = i === 3 ? '#ff8738' : '#163447'; x.fill(); x.stroke(); if (i < 5) { x.beginPath(); x.moveTo(cx + 13, 110); x.lineTo(cx + 37, 110); x.stroke(); } }
  } else if (kind === 4) { // frontier: an empty classification grid (no data implied)
    for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) x.strokeRect(70 + k * 50, 48 + r * 34, 42, 26);
  } else if (kind === 5) { // missions: five places on a path
    const pts = [[40, 140], [100, 70], [160, 140], [220, 70], [280, 140]];
    x.beginPath(); pts.forEach(([a, b], i) => (i ? x.lineTo(a!, b!) : x.moveTo(a!, b!))); x.stroke();
    pts.forEach(([a, b]) => { x.beginPath(); x.arc(a!, b!, 14, 0, Math.PI * 2); x.fillStyle = '#163447'; x.fill(); x.stroke(); });
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
function signTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas'); c.width = 520; c.height = 100;
  const x = c.getContext('2d')!;
  x.fillStyle = 'rgba(6,16,26,.85)'; x.fillRect(0, 0, 520, 100);
  x.strokeStyle = 'rgba(127,214,209,.8)'; x.lineWidth = 3; x.strokeRect(3, 3, 514, 94);
  x.fillStyle = '#e9f6ff'; x.font = '700 34px ui-monospace, Menlo, monospace'; x.textAlign = 'center'; x.fillText('TRAINING BAY', 260, 46);
  x.fillStyle = '#7fd6d1'; x.font = '500 17px ui-monospace, Menlo, monospace'; x.fillText('BASS-II · ILLUSTRATIVE TOUR', 260, 78);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
function glowTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const x = c.getContext('2d')!; const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.25, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}
/** Fit a loaded model into a box of the given height (or width), feet on y = 0, centred in x/z. */
function fit(obj: THREE.Object3D, size: number, by: 'height' | 'width') {
  const box = new THREE.Box3().setFromObject(obj), dim = box.getSize(new THREE.Vector3());
  const s = size / Math.max(1e-6, by === 'height' ? dim.y : Math.max(dim.x, dim.z));
  obj.scale.multiplyScalar(s);
  box.setFromObject(obj); const c = box.getCenter(new THREE.Vector3());
  obj.position.sub(new THREE.Vector3(c.x, box.min.y, c.z));
}

export function startObservatory(o: ObservatoryOptions): ObservatoryApi | null {
  let renderer: THREE.WebGLRenderer;
  try { renderer = new THREE.WebGLRenderer({ canvas: o.canvas, antialias: !o.mobile, powerPreference: 'high-performance' }); }
  catch { return null; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, o.mobile ? 1.5 : 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#04070c');
  scene.fog = new THREE.FogExp2('#04070c', 0.02);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = new RoomEnvironment();
  scene.environment = pmrem.fromScene(env, 0.04).texture;
  scene.environmentIntensity = 0.38;
  const camera = new THREE.PerspectiveCamera(o.mobile ? 44 : 34, 1, 0.1, 400);
  const shared = { t: { value: 0 }, g: { value: o.gravity } };

  // ---- cinematic post: bloom only on bright emissive parts. The custom shaders below write linear colour (pow 2.2)
  // because OutputPass converts the whole frame to sRGB. ----
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), o.mobile ? 0.36 : 0.4, 0.3, 0.92);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  // ---- light ----
  scene.add(new THREE.HemisphereLight('#4a73a0', '#05070b', 0.7));
  const rim = new THREE.DirectionalLight('#9fd8ef', 1.8); rim.position.set(-8, 9, -12); scene.add(rim);
  const key = new THREE.DirectionalLight('#ffd2a6', 0.6); key.position.set(6, 5, 8); scene.add(key);
  const flameLight = new THREE.PointLight('#ff9446', 30, 18, 1.5); scene.add(flameLight);

  // ---- materials ----
  const metal = new THREE.MeshStandardMaterial({ color: '#1d2a38', metalness: 0.85, roughness: 0.3 });
  const trim = new THREE.MeshStandardMaterial({ color: '#33475b', metalness: 0.75, roughness: 0.4 });
  const cyanLine = new THREE.MeshStandardMaterial({ color: '#000000', emissive: '#73bbd9', emissiveIntensity: 2.2 });

  // ---- space: two star layers (parallax), planet limb ----
  const starLayer = (n: number, r0: number, size: number) => {
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const u = Math.random() * 2 - 1, th = Math.random() * Math.PI * 2, r = r0 + Math.random() * 30, s = Math.sqrt(1 - u * u);
      pos.set([r * s * Math.cos(th), r * u * 0.8 + 10, -Math.abs(r * s * Math.sin(th)) - 10], i * 3);
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: '#dbe9ff', size, sizeAttenuation: true, transparent: true, opacity: 0.9, depthWrite: false, fog: false }));
    scene.add(pts); return pts;
  };
  const stars = starLayer(o.mobile ? 700 : 1400, 70, 0.26), starsNear = starLayer(o.mobile ? 160 : 320, 45, 0.42);
  // Earth: a vivid, half-lit planet (day side, sun glint on the oceans, sunset band, city lights on the night side).
  const sunDir = new THREE.Vector3(1, 0.35, -0.25).normalize();
  const planetMat = new THREE.ShaderMaterial({
    fog: false,
    uniforms: { sun: { value: sunDir }, t: shared.t },
    vertexShader: 'varying vec3 vN; varying vec3 vV; varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.); vW = normalize(position); vN = normalize(mat3(modelMatrix) * normal); vV = normalize(cameraPosition - w.xyz); gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: `uniform vec3 sun; uniform float t; varying vec3 vN; varying vec3 vV; varying vec3 vW;
      float h(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,37.719))) * 43758.5453); }
      float n3(vec3 p){ vec3 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(mix(h(i),h(i+vec3(1,0,0)),f.x),mix(h(i+vec3(0,1,0)),h(i+vec3(1,1,0)),f.x),f.y),mix(mix(h(i+vec3(0,0,1)),h(i+vec3(1,0,1)),f.x),mix(h(i+vec3(0,1,1)),h(i+vec3(1,1,1)),f.x),f.y),f.z); }
      float fbm(vec3 p){ return n3(p) * .5 + n3(p * 2.1) * .3 + n3(p * 4.3) * .2; }
      void main(){
        float d = dot(vN, sun), l = clamp(d, 0., 1.);
        float land = smoothstep(.5, .56, fbm(vW * 3.2));
        float cloud = smoothstep(.52, .78, fbm(vW * 5. + vec3(t * .006, 3., 0.)));
        vec3 ocean = mix(vec3(.01,.06,.2), vec3(.05,.32,.72), l);
        vec3 ground = mix(vec3(.12,.3,.12), vec3(.55,.45,.25), smoothstep(.55, .7, fbm(vW * 7.))) * (.15 + l);
        vec3 col = mix(ocean, ground, land);
        float glint = pow(max(dot(reflect(-sun, vN), vV), 0.), 28.) * (1. - land) * (1. - cloud);
        col += vec3(1., .9, .7) * glint * 1.4;
        col = mix(col, vec3(1.) * (.12 + 1.05 * l), cloud * .8);
        col += vec3(1., .45, .15) * smoothstep(.22, 0., abs(d - .02)) * .5;               // sunset band at the terminator
        float night = smoothstep(.05, -.15, d);
        float city = step(.82, h(floor(vW * 140.))) * land * (1. - cloud * .8) * smoothstep(.45, .7, fbm(vW * 11.));
        col += vec3(1., .66, .3) * city * night * 1.3;
        float rim = pow(1. - max(dot(vN, vV), 0.), 2.4); col += vec3(.3,.6,1.) * rim * (.25 + 1.2 * smoothstep(-.2, .6, d));
        gl_FragColor = vec4(pow(col, vec3(2.2)), 1.); }`
  });
  const planet = new THREE.Mesh(new THREE.SphereGeometry(30, 128, 96), planetMat);
  // Desktop: a broad limb rising over the deck horizon; phones: the familiar corner view.
  planet.position.copy(o.mobile ? new THREE.Vector3(24, -36, -78) : new THREE.Vector3(6, -52, -140)); planet.scale.setScalar(o.mobile ? 1 : 1.5); scene.add(planet);
  const atmosphere = new THREE.Mesh(new THREE.SphereGeometry(33, 96, 64), new THREE.ShaderMaterial({
    fog: false, transparent: true, blending: THREE.AdditiveBlending, side: THREE.BackSide, depthWrite: false, uniforms: { sun: { value: sunDir } },
    vertexShader: FRESNEL_VERT,
    fragmentShader: 'uniform vec3 sun; varying vec3 vN; varying vec3 vV; void main(){ float r = pow(max(dot(vN, vV), 0.), 2.4); float lit = .35 + .9 * smoothstep(-.4, .7, dot(-vN, sun)); gl_FragColor = vec4(pow(vec3(.35,.65,1.) * r * 1.3 * lit, vec3(2.2)), r); }'
  }));
  atmosphere.position.copy(planet.position); atmosphere.scale.copy(planet.scale); scene.add(atmosphere);

  // A generic satellite on a slow orbit across the sky (decorative; not a specific spacecraft).
  const satellite = new THREE.Group();
  const foil = new THREE.MeshStandardMaterial({ color: '#d4a64a', metalness: 1, roughness: 0.32, emissive: '#3a2604', emissiveIntensity: 0.4 });
  const panelMat = new THREE.MeshStandardMaterial({ color: '#16325e', metalness: 0.7, roughness: 0.25, emissive: '#0b2a55', emissiveIntensity: 0.6 });
  const bodyS = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 1.3, 16), foil); bodyS.rotation.z = Math.PI / 2; satellite.add(bodyS);
  const cap = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.62, 0.62), trim); cap.position.x = 0.85; satellite.add(cap);
  for (const side of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.9, 6), trim); arm.position.z = side * 0.75; arm.rotation.x = Math.PI / 2; satellite.add(arm);
    for (let k = 0; k < 3; k++) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.03, 0.95), panelMat); p.position.set(0, 0, side * (1.7 + k * 1)); satellite.add(p); }
  }
  const dish = new THREE.Mesh(new THREE.SphereGeometry(0.42, 20, 10, 0, Math.PI * 2, 0, Math.PI / 3), new THREE.MeshStandardMaterial({ color: '#e7ecf0', metalness: 0.3, roughness: 0.4, side: THREE.DoubleSide }));
  dish.rotation.z = Math.PI / 2; dish.position.x = -0.95; satellite.add(dish);
  const beacons = [new THREE.MeshBasicMaterial({ color: '#ff3b2f' }), new THREE.MeshBasicMaterial({ color: '#3bff8a' })];
  beacons.forEach((m, k) => { const b = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), m); b.position.set(0, 0.05, (k ? 1 : -1) * 3.75); satellite.add(b); });
  satellite.scale.setScalar(o.mobile ? 0.8 : 1);
  scene.add(satellite);
  const orbitC = new THREE.Vector3(0, o.mobile ? 4 : 0.8, -24), orbitR = o.mobile ? 11 : 15;
  const trail = new THREE.Mesh(new THREE.TorusGeometry(orbitR, 0.02, 4, 220), new THREE.MeshBasicMaterial({ color: '#73bbd9', transparent: true, opacity: 0.18, depthWrite: false, fog: false }));
  trail.position.copy(orbitC); trail.rotation.x = Math.PI / 2 - 0.12; scene.add(trail);

  // ---- observation deck: window ring, struts, animated floor ----
  const deck = new THREE.Group(); scene.add(deck);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(17, 0.32, 20, 200), metal); ring.position.set(0, 3, -20); deck.add(ring);
  const ringLine = new THREE.Mesh(new THREE.TorusGeometry(16.55, 0.04, 8, 200), cyanLine); ringLine.position.copy(ring.position); deck.add(ringLine);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2, strut = new THREE.Mesh(new THREE.BoxGeometry(0.22, 2.6, 0.5), trim);
    strut.position.set(Math.cos(a) * 18.6, 3 + Math.sin(a) * 18.6, -20); strut.rotation.z = a + Math.PI / 2; deck.add(strut);
  }
  const floorMat = new THREE.ShaderMaterial({
    fog: true, uniforms: { ...THREE.UniformsLib.fog, t: shared.t, g: shared.g },
    vertexShader: '#include <fog_pars_vertex>\nvarying vec2 vP; void main(){ vP = position.xy; vec4 mvPosition = modelViewMatrix * vec4(position,1.); gl_Position = projectionMatrix * mvPosition;\n#include <fog_vertex>\n}',
    fragmentShader: `#include <fog_pars_fragment>
      uniform float t; uniform float g; varying vec2 vP;
      void main(){ float r = length(vP); float a = atan(vP.y, vP.x);
      float rings = smoothstep(.04, .0, abs(fract(r * .8) - .5) - .46); float spokes = smoothstep(.02, .0, abs(fract(a * 12. / 6.2831) - .5) - .48) * step(1.9, r);
      float pulse = smoothstep(.35, 0., abs(r - mod(t * 1.6, 14.))) * smoothstep(14., 3., r);   // energy wave from the chamber
      vec3 tint = mix(vec3(.27,.55,.7), vec3(1.,.53,.22), g);
      vec3 base = vec3(.035,.05,.07) * (1. - r * .03); vec3 col = base + vec3(.27,.55,.7) * (rings * .35 + spokes * .18) * smoothstep(12., 2., r);
      col += tint * pulse * (.12 + rings * .45);
      col += tint * .1 * smoothstep(2.6, 1.4, r);   // glow pool under the chamber
      gl_FragColor = vec4(pow(col, vec3(2.2)), 1.);
      #include <fog_fragment>
      }`
  });
  const floor = new THREE.Mesh(new THREE.CircleGeometry(14, 96), floorMat); floor.rotation.x = -Math.PI / 2; floor.position.y = -2.45; deck.add(floor);

  // ---- combustion observation chamber (artistic) ----
  const chamber = new THREE.Group(); scene.add(chamber);
  const glass = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 2.2, 72, 1, true), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, uniforms: { t: shared.t },
    vertexShader: FRESNEL_VERT,
    fragmentShader: 'uniform float t; varying vec3 vN; varying vec3 vV; varying vec3 vP; void main(){ float f = pow(1. - abs(dot(vN, vV)), 2.2); float sweep = smoothstep(.06, 0., abs(fract(vP.y * .45 - t * .18) - .5)); gl_FragColor = vec4(pow(vec3(.45,.78,.95) * (f * .55 + .02 + sweep * .12), vec3(2.2)), 1.); }'
  }));
  chamber.add(glass);
  for (const y of [-1.25, 1.25]) {
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(1.24, 1.24, 0.32, 72), metal); cap.position.y = y; chamber.add(cap);
    const band = new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.03, 8, 96), cyanLine); band.rotation.x = Math.PI / 2; band.position.y = y + (y > 0 ? -0.17 : 0.17); chamber.add(band);
  }
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + (i * Math.PI) / 2, rod = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 2.5, 12), trim);
    rod.position.set(Math.cos(a) * 1.16, 0, Math.sin(a) * 1.16); chamber.add(rod);
  }
  const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(1.45, 1.85, 0.7, 72), metal); pedestal.position.y = -1.75; chamber.add(pedestal);
  const pedLine = new THREE.Mesh(new THREE.TorusGeometry(1.62, 0.02, 8, 96), new THREE.MeshStandardMaterial({ color: '#000000', emissive: '#ff8738', emissiveIntensity: 0.9 })); pedLine.rotation.x = Math.PI / 2; pedLine.position.y = -1.48; chamber.add(pedLine);
  // Gyroscope rings: slow machinery motion around the chamber.
  const gyros: THREE.Mesh[] = [];
  // Kept to the chamber's base and crown so no ring crosses the flame silhouette; dimmer than the flame.
  const gyroLine = new THREE.MeshStandardMaterial({ color: '#000000', emissive: '#73bbd9', emissiveIntensity: 0.8 });
  const gyroWarm = new THREE.MeshStandardMaterial({ color: '#000000', emissive: '#ff8738', emissiveIntensity: 0.9 });
  [[1.75, gyroLine, 0.06, 0, -1.05], [1.95, trim, -0.05, 1.1, 1.08], [2.15, gyroWarm, 0.04, 2.2, -1.2]].forEach(([r, mat, tilt, phase, y]) => {
    const m = new THREE.Mesh(new THREE.TorusGeometry(r as number, mat === trim ? 0.03 : 0.012, 8, 160), mat as THREE.Material);
    m.position.y = y as number; m.rotation.set(Math.PI / 2 + (tilt as number), 0, phase as number); m.userData = { tilt, phase }; chamber.add(m); gyros.push(m);
  });
  // Light shaft from the ceiling into the chamber.
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 2.4, 8, 48, 1, true), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, uniforms: { t: shared.t, g: shared.g },
    vertexShader: FRESNEL_VERT,
    fragmentShader: 'uniform float t; uniform float g; varying vec3 vN; varying vec3 vV; varying vec3 vP; void main(){ float f = pow(abs(dot(vN, vV)), 1.5); float h = smoothstep(4., -4., vP.y) * smoothstep(-4., -2.5, vP.y); vec3 c = mix(vec3(.35,.6,1.), vec3(1.,.6,.3), g); gl_FragColor = vec4(pow(c * f * h * (.08 + .02 * sin(t * 2.)), vec3(2.2)), 1.); }'
  }));
  shaft.position.y = 4.2; scene.add(shaft);
  const glowTex = glowTexture();
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: ORANGE.clone(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.55 }));
  chamber.add(glow);
  // Embers: they drift in still air and rise with buoyancy, mirroring the gravity control.
  const EMBERS = o.mobile ? 90 : 180, emberPos = new Float32Array(EMBERS * 3), emberVel = new Float32Array(EMBERS * 3);
  const respawn = (i: number, anywhere: boolean) => {
    const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * 0.85;
    emberPos.set([Math.cos(a) * r, anywhere ? Math.random() * 2 - 1 : -1, Math.sin(a) * r], i * 3);
    emberVel.set([(Math.random() - .5) * .2, (Math.random() - .5) * .2, (Math.random() - .5) * .2], i * 3);
  };
  for (let i = 0; i < EMBERS; i++) respawn(i, true);
  const emberGeo = new THREE.BufferGeometry(); emberGeo.setAttribute('position', new THREE.BufferAttribute(emberPos, 3));
  const emberMat = new THREE.PointsMaterial({ map: glowTex, size: 0.09, color: BLUE.clone(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.9 });
  chamber.add(new THREE.Points(emberGeo, emberMat));
  // Ambient dust across the deck.
  const DUST = o.mobile ? 160 : 320, dustPos = new Float32Array(DUST * 3);
  for (let i = 0; i < DUST; i++) dustPos.set([(Math.random() - .5) * 22, Math.random() * 9 - 2.4, (Math.random() - .5) * 18 - 2], i * 3);
  const dustGeo = new THREE.BufferGeometry(); dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ map: glowTex, size: 0.07, color: '#9fd8ef', transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false }));
  scene.add(dust);

  // ---- research stations: each leads to a real, implemented page ----
  const stationGroups: THREE.Group[] = [], screens: THREE.MeshBasicMaterial[] = [], pads: THREE.MeshBasicMaterial[] = [], anchors: THREE.Vector3[] = [];
  const holos: THREE.Mesh[] = [], leds: THREE.MeshBasicMaterial[] = [], procedural: THREE.Object3D[][] = [];
  const angles = o.stations.map((_, i) => THREE.MathUtils.degToRad(-48 + i * (100 / Math.max(1, o.stations.length - 1))));
  const scanMat = (i: number) => new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { t: shared.t, o: { value: i * 0.17 } },
    vertexShader: 'varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: 'uniform float t; uniform float o; varying vec2 vU; void main(){ float y = fract(t * .22 + o); float b = smoothstep(.06, 0., abs(vU.y - (1. - y))); float lines = .04 * step(.5, fract(vU.y * 60.)); gl_FragColor = vec4(pow(vec3(.45,.85,1.) * (b * .5 + lines), vec3(2.2)), 1.); }'
  });
  // PIX is a free-flying companion (below); its station is a charging dock it returns to.
  const pix = new THREE.Group(), pixBody = new THREE.Group(); pix.add(pixBody); scene.add(pix);
  {
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.3, 0.6, 32), trim); body.position.y = 0.3; pixBody.add(body);
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.34, 32, 24), trim); skull.scale.set(1.25, 0.95, 1); skull.position.y = 0.95; pixBody.add(skull);
    for (const x of [-0.11, 0.11]) { const eye = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 8), new THREE.MeshBasicMaterial({ color: '#9fe3e3' })); eye.position.set(x, 0.97, 0.32); pixBody.add(eye); }
  }
  // Rim light behind PIX (separates the white shell from the dark deck) and a soft hover glow beneath it.
  const pixRim = new THREE.PointLight('#8fd3ff', o.mobile ? 5 : 7, 3.2, 2); pixRim.position.set(0, 1.1, -0.7); pix.add(pixRim);
  const pixThruster = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: '#73bbd9', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.5 }));
  pixThruster.scale.set(0.9, 0.35, 1); pixThruster.position.y = -0.12; pix.add(pixThruster);
  let pixStation = -1;
  o.stations.forEach((title, i) => {
    const g = new THREE.Group(), a = angles[i]!, R = 6, parts: THREE.Object3D[] = [];
    g.position.set(Math.sin(a) * R + 0.6, -2.45, -Math.cos(a) * R - 2.2); g.lookAt(0, -2.45, 0);
    const pad = new THREE.MeshBasicMaterial({ color: '#73bbd9', transparent: true, opacity: 0.25 }); pads.push(pad);
    const ringMesh = new THREE.Mesh(new THREE.RingGeometry(0.85, 0.95, 48), pad); ringMesh.rotation.x = -Math.PI / 2; ringMesh.position.y = 0.02; g.add(ringMesh);
    const holo = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.012, 6, 64), new THREE.MeshBasicMaterial({ color: '#ff9a5c', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
    holo.rotation.x = -Math.PI / 2; g.add(holo); holos.push(holo);
    if (title === 'PIX') {
      pixStation = i;
      const dock = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.62, 0.32, 48), metal); dock.position.y = 0.16; g.add(dock);
      const dockLine = new THREE.Mesh(new THREE.TorusGeometry(0.52, 0.018, 8, 64), cyanLine); dockLine.rotation.x = Math.PI / 2; dockLine.position.y = 0.33; g.add(dockLine);
      screens.push(new THREE.MeshBasicMaterial()); // placeholder so indices line up
      anchors.push(new THREE.Vector3(0, 2.2, 0));
    } else {
      const base = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.95, 0.7), metal); base.position.y = 0.48; g.add(base); parts.push(base);
      const lip = new THREE.Mesh(new THREE.BoxGeometry(1.56, 0.05, 0.76), cyanLine); lip.position.y = 0.97; g.add(lip); parts.push(lip);
      const mat = new THREE.MeshBasicMaterial({ map: screenTexture(i, title), toneMapped: false, color: new THREE.Color(0.75, 0.75, 0.75) }); screens.push(mat);
      const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.36, 0.85), mat); screen.position.set(0, 1.55, 0.05); screen.rotation.x = -0.2; g.add(screen);
      const scan = new THREE.Mesh(new THREE.PlaneGeometry(1.36, 0.85), scanMat(i)); scan.position.set(0, 1.55, 0.06); scan.rotation.x = -0.2; g.add(scan);
      const frameMesh = new THREE.Mesh(new THREE.BoxGeometry(1.46, 0.95, 0.06), trim); frameMesh.position.set(0, 1.55, 0.01); frameMesh.rotation.x = -0.2; g.add(frameMesh); parts.push(frameMesh);
      const led = new THREE.MeshBasicMaterial({ color: i % 2 ? '#ff8738' : '#73bbd9' }); leds.push(led);
      for (const x of [-0.55, -0.42]) { const l = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), led); l.position.set(x, 0.8, 0.36); g.add(l); parts.push(l); }
      anchors.push(new THREE.Vector3(0, 2.15, 0));
    }
    procedural.push(parts);
    scene.add(g); stationGroups.push(g);
  });

  // ---- optional Meshy props: swap in when loaded, keep the procedural stand-ins otherwise ----
  let disposed = false;
  void loadModel('/models/console/console.gltf').then((model) => {
    if (!model || disposed) return;
    fit(model, 1.6, 'width');
    stationGroups.forEach((g, i) => {
      if (o.stations[i] === 'PIX') return;
      procedural[i]!.forEach((p) => { p.visible = false; });
      const c = model.clone(); c.position.z -= 0.25; g.add(c);
      // The honest screen content becomes a floating hologram panel above the generated console.
      g.children.forEach((ch) => { if ((ch as THREE.Mesh).geometry?.type === 'PlaneGeometry') { ch.position.y = 1.95; ch.position.z = 0.15; } });
    });
    kick();
  });
  void loadModel('/models/pix/pix.gltf').then((model) => {
    if (!model || disposed) return;
    cleanFinish(model); fit(model, 1.25, 'height');
    pixBody.traverse((ob) => { const m = ob as THREE.Mesh; m.geometry?.dispose(); });
    pixBody.clear(); pixBody.add(model);
    kick();
  });

  // ---- Training Bay entrance: a bulkhead off the deck, joined to the chamber by a lit floor path ----
  const bay = new THREE.Group(); scene.add(bay);
  const BAY_POS = new THREE.Vector3(-6.4, -2.45, -3.6);
  bay.position.copy(BAY_POS); bay.lookAt(0, -2.45, 0);
  const W = 2.3, Hh = 3.3, T = 0.34;
  const frameParts: [number, number, number, number, number][] = [[-W / 2 - T / 2, Hh / 2, T, Hh + T, 0.6], [W / 2 + T / 2, Hh / 2, T, Hh + T, 0.6], [0, Hh + T / 2, W + T * 2, T, 0.6]];
  frameParts.forEach(([x, y, w, h, d]) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), metal); m.position.set(x, y, 0); bay.add(m); });
  for (const [x, y, w, h] of [[-W / 2 - 0.02, Hh / 2, 0.035, Hh], [W / 2 + 0.02, Hh / 2, 0.035, Hh], [0, Hh + 0.02, W + 0.06, 0.035]] as const) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.05), cyanLine); m.position.set(x, y, 0.31); bay.add(m);
  }
  const doorMat = new THREE.MeshStandardMaterial({ color: '#2a3a4c', metalness: 0.8, roughness: 0.38 });
  const seamMat = new THREE.MeshStandardMaterial({ color: '#000000', emissive: '#7fd6d1', emissiveIntensity: 1.6 });
  const doors = [-1, 1].map((side) => {
    const d = new THREE.Group();
    const panel = new THREE.Mesh(new THREE.BoxGeometry(W / 2, Hh, 0.12), doorMat); panel.position.set(side * W / 4, Hh / 2, 0); d.add(panel);
    const seam = new THREE.Mesh(new THREE.BoxGeometry(0.03, Hh * 0.92, 0.13), seamMat); seam.position.set(side * 0.02, Hh / 2, 0.01); d.add(seam);
    for (let k = 0; k < 3; k++) { const rib = new THREE.Mesh(new THREE.BoxGeometry(W / 2 - 0.2, 0.04, 0.14), trim); rib.position.set(side * W / 4, 0.7 + k * 0.95, 0.02); d.add(rib); }
    d.userData.side = side; bay.add(d); return d;
  });
  // Light from inside: a bright back wall and a cyan point light that rises as the doors open.
  const bayGlowMat = new THREE.SpriteMaterial({ map: glowTex, color: '#bff3ff', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.25 });
  const bayGlow = new THREE.Sprite(bayGlowMat); bayGlow.scale.set(3.2, 4.2, 1); bayGlow.position.set(0, Hh / 2, -0.9); bay.add(bayGlow);
  const bayLight = new THREE.PointLight('#8fe6ff', 4, 9, 1.6); bayLight.position.set(0, 1.8, 0.6); bay.add(bayLight);
  const back = new THREE.Mesh(new THREE.PlaneGeometry(W, Hh), new THREE.MeshBasicMaterial({ color: '#0d2a3a' })); back.position.set(0, Hh / 2, -1.6); bay.add(back);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.5), new THREE.MeshBasicMaterial({ map: signTexture(), transparent: true, toneMapped: false }));
  sign.position.set(0, Hh + 0.62, 0.32); bay.add(sign);
  // Floor path: chevrons from the chamber to the door, lit in sequence.
  const chevrons: THREE.MeshBasicMaterial[] = [];
  const toBay = new THREE.Vector3(BAY_POS.x, 0, BAY_POS.z), N = 9;
  for (let k = 0; k < N; k++) {
    const p = toBay.clone().multiplyScalar(0.3 + (k / (N - 1)) * 0.55);
    const shape = new THREE.Shape(); shape.moveTo(-0.22, -0.1); shape.lineTo(0, 0.1); shape.lineTo(0.22, -0.1); shape.lineTo(0.22, -0.02); shape.lineTo(0, 0.18); shape.lineTo(-0.22, -0.02);
    const m = new THREE.MeshBasicMaterial({ color: '#73bbd9', transparent: true, opacity: 0.15, blending: THREE.AdditiveBlending, depthWrite: false });
    const c = new THREE.Mesh(new THREE.ShapeGeometry(shape), m); c.position.set(p.x, -2.43, p.z); c.rotation.x = -Math.PI / 2;
    c.rotation.z = Math.atan2(-toBay.x, -toBay.z); scene.add(c); chevrons.push(m); // tip points toward the door
  }
  const bayCenter = new THREE.Vector3(0, Hh / 2, 0); bay.localToWorld(bayCenter);
  const bayFront = new THREE.Vector3(0, Hh * 0.55, 3.4); bay.localToWorld(bayFront);
  const bayThreshold = new THREE.Vector3(0, Hh * 0.5, 0.9); bay.localToWorld(bayThreshold); // the enter shot ends at the door
  const bayInside = new THREE.Vector3(0, Hh * 0.45, -1.4); bay.localToWorld(bayInside);
  let door = 0, peek = 0, peekGoal = 0, bayModel = false;
  // The real Meshy chamber gantry from the training bay stands behind the doors (desktop; loaded after the intro).
  const loadBayModel = () => {
    if (bayModel || o.mobile) return; bayModel = true;
    void loadModel('/models/lab/chamber/chamber.gltf').then((model) => {
      if (!model || disposed) return;
      fit(model, 2.4, 'height'); model.position.z -= 1.0; model.rotation.y = 0.5; bay.add(model); kick();
    });
  };

  // ---- camera rig: orbit about the chamber so it stays aligned with the HTML flame stage ----
  const rig = { yaw: -1.6, pitch: 0.75, dist: 9, tYaw: o.mobile ? 0 : 0.38, tPitch: o.mobile ? 0.24 : 0.2, px: 0, py: 0, drag: 0, scroll: 0 };
  let width = 1, height = 1, g = o.gravity, shownG = g, motion = o.motion, focus: number | null = null, pan = false, frame = 0, lost = false, t0 = performance.now(), last = t0;
  let offX = 0, offY = 0; // view offset that puts the chamber behind the HTML flame stage
  // Opening flight (once per session): from high above the deck, Earth and the window ring in view, down onto the
  // chamber, then the stations boot in sequence. Any visitor input fast-forwards it. Otherwise one short settle.
  let intro = o.intro && o.motion, introU = intro ? 0 : 1, introSpeed = 1;
  const entranceStart = performance.now(), entranceMs = !intro && o.motion ? 700 : 0;
  if (!o.motion) { rig.yaw = rig.tYaw; rig.pitch = rig.tPitch; }
  const INTRO_LOOK = new THREE.Vector3(6, -34, -125), ORIGIN = new THREE.Vector3();
  // Entering the bay: a short move from wherever the camera is to the door, which opens on the way.
  let enter: { u: number; from: THREE.Vector3; look: THREE.Vector3; done: (() => void) | null } | null = null;
  const lookAt = new THREE.Vector3();

  // PIX: flies between its home beside the chamber, the stations and the bay door; gestures are short and never loop.
  let pixTarget: PixTarget = intro && pixStation >= 0 ? pixStation : 'home', gesture: { kind: PixGesture; t: number } | null = null;
  const homeSlot = o.mobile ? new THREE.Vector3(-1.25, 1.5, 0.7) : new THREE.Vector3(-2.45, -0.35, 0.9);
  const pixGoal = new THREE.Vector3(), pixStep = new THREE.Vector3(), tmp = new THREE.Vector3();
  const goalFor = (tg: PixTarget, out: THREE.Vector3) => {
    if (tg === 'home') return out.copy(homeSlot);
    if (tg === 'bay') return out.copy(bayCenter).lerp(bayFront, 0.5).add(tmp.set(0.9, 0.2, 0));
    const st = stationGroups[tg];
    if (!st) return out.copy(homeSlot);
    if (tg === pixStation) return out.copy(st.position).add(tmp.set(0, 0.42, 0)); // back on its dock
    return out.copy(st.position).lerp(ORIGIN, 0.38).setY(-0.5);
  };
  goalFor(pixTarget, pix.position);

  const applyOffset = (k: number) => { camera.setViewOffset(width, height, offX * k, offY * k, width, height); camera.updateProjectionMatrix(); };
  const layout = () => {
    const r = o.host.getBoundingClientRect(); width = Math.max(1, r.width); height = Math.max(1, r.height);
    renderer.setSize(width, height, false);
    composer.setPixelRatio(renderer.getPixelRatio()); composer.setSize(width, height);
    bloom.resolution.set(width / 2, height / 2);
    camera.aspect = width / height;
    const s = o.stage();
    const sx = s ? s.left + s.width / 2 - r.left : width * 0.7, sy = s ? s.top + s.height / 2 - r.top : height * 0.5;
    const half = s ? Math.min(s.width, s.height) / 2 : Math.min(width, height) * 0.3;
    // Glass radius (1 unit) projects to ~42% of the stage's half-size (38% on phones), so the HTML flame sits inside the chamber.
    rig.dist = (height / 2) / (Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * half * (o.mobile ? 0.38 : 0.42));
    offX = width / 2 - sx; offY = height / 2 - sy;
    applyOffset(enter ? 1 - inOut(enter.u) : 1);
  };
  const v = new THREE.Vector3();
  const BLOOM = bloom.strength;
  const render = (now: number) => {
    const raw = Math.min(0.25, (now - last) / 1000), t = (now - t0) / 1000, dt = Math.min(0.05, raw); last = now;
    shared.t.value = motion ? t : 0;
    const k = entranceMs ? ease((now - entranceStart) / entranceMs) : 1;
    const targetYaw = rig.tYaw + rig.px + rig.drag + (focus !== null && pan ? angles[focus]! * 0.32 : 0) + peek * (o.mobile ? 0.55 : 0.42) + (motion ? Math.sin(t * 0.06) * 0.04 : 0);
    const targetPitch = rig.tPitch + rig.py + rig.scroll * 0.35 + peek * 0.04;
    let dist: number;
    lookAt.copy(ORIGIN);
    if (intro) {
      introU = Math.min(1, introU + (raw * 1000 * introSpeed) / INTRO_MS);
      const u = introU, d = span(u, 0.08, 1);
      rig.yaw = targetYaw + 1.2 * (1 - span(u, 0, 1)); rig.pitch = targetPitch + 0.8 * (1 - span(u, 0.06, 0.94));
      dist = rig.dist * (1 + 3.4 * (1 - d));
      lookAt.copy(INTRO_LOOK).lerp(ORIGIN, span(u, 0.18, 0.88));
      (scene.fog as THREE.FogExp2).density = 0.005 + 0.015 * d;
      if (u >= 1) { intro = false; o.onIntroDone(); loadBayModel(); }
    } else {
      if (k < 1) { rig.yaw = THREE.MathUtils.lerp(targetYaw - 0.25, targetYaw, k); rig.pitch = THREE.MathUtils.lerp(targetPitch + 0.08, targetPitch, k); }
      else { rig.yaw += (targetYaw - rig.yaw) * (motion ? 0.06 : 1); rig.pitch += (targetPitch - rig.pitch) * (motion ? 0.06 : 1); }
      dist = rig.dist * (1 + (1 - k) * 0.12 + rig.scroll * 0.25 - peek * 0.06);
    }
    camera.position.set(Math.sin(rig.yaw) * Math.cos(rig.pitch) * dist, Math.sin(rig.pitch) * dist, Math.cos(rig.yaw) * Math.cos(rig.pitch) * dist);
    if (enter) {
      enter.u = Math.min(1, enter.u + (raw * 1000) / ENTER_MS);
      const e = inOut(enter.u);
      camera.position.copy(enter.from).lerp(bayThreshold, e); lookAt.copy(enter.look).lerp(bayInside, e);
      applyOffset(1 - e);
      bloom.strength = BLOOM + e * 0.5;
      if (enter.u >= 1 && enter.done) { const done = enter.done; enter.done = null; done(); }
    }
    camera.lookAt(lookAt);
    shownG += (g - shownG) * (motion ? 0.1 : 1); shared.g.value = shownG;
    const flicker = motion ? 1 + Math.sin(t * 13.1) * 0.04 * shownG + Math.sin(t * 7.3) * 0.03 : 1;
    flameLight.color.copy(BLUE).lerp(ORANGE, shownG); flameLight.intensity = (14 + 26 * shownG) * flicker;
    glow.material.color.copy(BLUE).lerp(ORANGE, shownG); glow.scale.set(1.9 - shownG * 0.5, 1.9 + shownG * 1.1, 1); glow.position.y = shownG * 0.25;
    glow.material.opacity = (0.45 + 0.2 * shownG) * flicker;
    gyros.forEach((m, i) => { const u = m.userData as { tilt: number; phase: number }; m.rotation.z = u.phase + (motion ? t * (0.12 + i * 0.07) * (i % 2 ? -1 : 1) : 0); m.rotation.x = Math.PI / 2 + u.tilt + (motion ? Math.sin(t * 0.3 + i) * 0.02 : 0); });
    if (motion) {
      // Embers: buoyancy lifts them at 1 g; in still air they wander and hang.
      for (let i = 0; i < EMBERS; i++) {
        const j = i * 3;
        emberVel[j + 1]! += (shownG * 1.6 - emberVel[j + 1]! * 0.8) * dt;
        for (let a = 0; a < 3; a++) { emberVel[j + a]! += (Math.random() - .5) * 0.3 * dt * (1.2 - shownG); emberPos[j + a]! += emberVel[j + a]! * dt * (0.35 + shownG * 0.65); }
        const x = emberPos[j]!, y = emberPos[j + 1]!, z = emberPos[j + 2]!;
        if (y > 1.05 || y < -1.05 || x * x + z * z > 0.85) respawn(i, shownG < 0.5);
      }
      emberGeo.attributes.position!.needsUpdate = true;
      dust.rotation.y = t * 0.01;
    }
    emberMat.color.copy(BLUE).lerp(ORANGE, shownG);
    // PIX: glide toward the goal, lean into the move, face the visitor (or what it is pointing at), then any gesture.
    goalFor(pixTarget, pixGoal);
    if (motion) { pixStep.copy(pixGoal).sub(pix.position).multiplyScalar(1 - Math.exp(-dt * 2.6)); pix.position.add(pixStep); } else { pixStep.set(0, 0, 0); pix.position.copy(pixGoal); }
    const faceCam = Math.atan2(camera.position.x - pix.position.x, camera.position.z - pix.position.z);
    const poi = pixTarget === 'bay' ? bayCenter : typeof pixTarget === 'number' && pixTarget !== pixStation ? stationGroups[pixTarget]?.position : null;
    pix.rotation.y = poi ? THREE.MathUtils.lerp(faceCam, Math.atan2(poi.x - pix.position.x, poi.z - pix.position.z), 0.45) : faceCam;
    const speed = pixStep.length() / Math.max(dt, 1e-3);
    let rx = THREE.MathUtils.clamp(speed * 0.08, 0, 0.3), ry = 0, rz = 0, hop = 0;
    if (gesture) {
      const p = (now - gesture.t) / 1300, env = Math.sin(Math.min(1, p) * Math.PI);
      if (gesture.kind === 'wave') rz = Math.sin(p * Math.PI * 6) * 0.38 * env;
      if (gesture.kind === 'nod') rx += Math.sin(p * Math.PI * 4) * 0.3 * env;
      if (gesture.kind === 'shake') ry = Math.sin(p * Math.PI * 6) * 0.5 * env;
      if (gesture.kind === 'spin') ry = inOut(p) * Math.PI * 2;
      if (gesture.kind === 'hop' || gesture.kind === 'spin') hop = Math.sin(Math.min(1, p) * Math.PI) * 0.3;
      if (p >= 1) gesture = null;
    }
    pixBody.rotation.set(rx, ry, rz);
    pixBody.position.y = hop + (motion ? Math.sin(t * 1.7) * 0.07 : 0);
    pixThruster.material.opacity = 0.3 + (motion ? 0.12 * Math.sin(t * 6) : 0) + Math.min(0.3, speed * 0.1);
    // Training Bay door, inner light and the marching floor path.
    door += ((enter ? 1 : peekGoal ? 0.38 : 0.06) - door) * (motion ? 0.07 : 1);
    peek += (peekGoal - peek) * (motion ? 0.06 : 1);
    doors.forEach((d) => { d.position.x = (d.userData.side as number) * door * (W / 2 + 0.04); });
    bayGlowMat.opacity = 0.18 + door * 0.8; bayLight.intensity = 3 + door * 16 + (motion ? Math.sin(t * 2) * 0.6 : 0);
    const boot = (i: number) => clamp01((introU - 0.6 - i * 0.05) / 0.14);
    chevrons.forEach((m, i) => { m.opacity = boot(i * 0.4) * (0.12 + (0.45 + peek * 0.4) * Math.pow(Math.max(0, Math.sin((motion ? t * 3 : 1) - i * 0.7)), 6)); m.color.set(peek > 0.3 ? '#ff8738' : '#73bbd9'); });
    stars.rotation.y = motion ? t * 0.003 : 0; starsNear.rotation.y = motion ? t * 0.006 : 0;
    planet.rotation.y = motion ? t * 0.004 : 0;
    { // satellite orbit: angle along the tilted trail, slow tumble, blinking beacons
      const a = 2.2 + (motion ? t * 0.07 : 0), tilt = 0.12;
      satellite.position.set(orbitC.x + Math.cos(a) * orbitR, orbitC.y + Math.sin(a) * orbitR * Math.sin(tilt), orbitC.z + Math.sin(a) * orbitR * Math.cos(tilt));
      satellite.rotation.set(0.3, -a + Math.PI / 2, motion ? Math.sin(t * 0.2) * 0.15 : 0);
      beacons.forEach((m, k) => m.color.set(motion && (Math.floor(t * 1.4 + k * 0.5) % 2) ? '#160303' : k ? '#3bff8a' : '#ff3b2f'));
    }
    screens.forEach((m, i) => m.color.setScalar((focus === i ? 1.25 : 0.75) * boot(i)));
    pads.forEach((m, i) => { m.color.set(focus === i ? '#ff8738' : '#73bbd9'); m.opacity = (focus === i ? 0.9 : 0.25 + (motion ? 0.1 * Math.sin(t * 2 + i) : 0)) * boot(i); });
    holos.forEach((h, i) => { const on = focus === i; const p = motion ? (t * 0.8 + i * 0.3) % 1 : 0.5; h.position.y = on ? 0.1 + p * 2.2 : 0; (h.material as THREE.MeshBasicMaterial).opacity = on ? (1 - p) * 0.9 : 0; });
    leds.forEach((m, i) => m.color.setScalar(motion && Math.sin(t * (2 + i)) > 0.6 ? 0.25 : 1).multiply(new THREE.Color(i % 2 ? '#ff8738' : '#73bbd9')));
    composer.render();
    const project = (p: THREE.Vector3): Anchor => { p.project(camera); return { x: ((p.x + 1) / 2) * width, y: ((1 - p.y) / 2) * height, visible: p.z < 1 && Math.abs(p.x) < 1.05 && Math.abs(p.y) < 1.05 }; };
    o.onAnchors(stationGroups.map((grp, i) => { v.copy(anchors[i]!); grp.localToWorld(v); return project(v); }));
    o.onPix(project(v.copy(pix.position).add(tmp.set(0, 1.45, 0))));
    return intro || !!enter || k < 1 || Math.abs(targetYaw - rig.yaw) > 0.0005 || Math.abs(targetPitch - rig.pitch) > 0.0005 || Math.abs(g - shownG) > 0.002 || !!gesture || pixStep.lengthSq() > 1e-8;
  };
  const loop = (now: number) => {
    frame = 0;
    if (lost) return;
    const unsettled = render(now);
    if (motion || unsettled) frame = requestAnimationFrame(loop);
  };
  const kick = () => { if (!frame && !lost) frame = requestAnimationFrame(loop); };

  // ---- input: pointer parallax and drag-to-look (keyboard users focus stations instead) ----
  let dragging: { x: number; base: number } | null = null;
  const onMove = (e: PointerEvent) => {
    const r = o.host.getBoundingClientRect();
    if (dragging) { rig.drag = THREE.MathUtils.clamp(dragging.base + ((e.clientX - dragging.x) / r.width) * 1.6, -0.75, 0.75); kick(); return; }
    if (!motion || e.pointerType !== 'mouse') return;
    rig.px = (((e.clientX - r.left) / r.width) - 0.5) * 0.2; rig.py = (((e.clientY - r.top) / r.height) - 0.5) * 0.08; kick();
  };
  const onDown = (e: PointerEvent) => { dragging = { x: e.clientX, base: rig.drag }; o.canvas.setPointerCapture?.(e.pointerId); };
  const onUp = () => { dragging = null; };
  o.canvas.addEventListener('pointerdown', onDown);
  window.addEventListener('pointermove', onMove, { passive: true });
  window.addEventListener('pointerup', onUp);
  const onLost = (e: Event) => { e.preventDefault(); lost = true; cancelAnimationFrame(frame); frame = 0; o.onLost(); };
  const onRestored = () => { lost = false; layout(); o.onRestored(); kick(); };
  o.canvas.addEventListener('webglcontextlost', onLost);
  o.canvas.addEventListener('webglcontextrestored', onRestored);

  layout();
  kick();
  return {
    setGravity(next) { g = next; kick(); },
    setMotion(on) { motion = on; if (on) { t0 = performance.now() - 1; last = t0; } kick(); },
    // pan=false for hovering the 3D labels: moving the camera would slide the label away from the pointer and loop.
    focusStation(i, p = true) { focus = i; pan = p; kick(); },
    setScroll(p) { rig.scroll = Math.min(1, Math.max(0, p)); kick(); },
    resize() { layout(); kick(); },
    skipIntro() { if (intro) { introSpeed = 7; kick(); } },
    setPix(target, gest) { pixTarget = target; if (gest) gesture = { kind: gest, t: performance.now() }; kick(); },
    peekBay(on) { peekGoal = on ? 1 : 0; if (on) loadBayModel(); kick(); },
    enterBay() {
      if (!motion || lost) return Promise.resolve();
      intro = false; loadBayModel();
      return new Promise<void>((done) => { enter = { u: 0, from: camera.position.clone(), look: lookAt.clone(), done }; pixTarget = 'bay'; kick(); });
    },
    stop() {
      disposed = true;
      cancelAnimationFrame(frame); frame = 0; lost = true;
      o.canvas.removeEventListener('pointerdown', onDown); window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp);
      o.canvas.removeEventListener('webglcontextlost', onLost); o.canvas.removeEventListener('webglcontextrestored', onRestored);
      scene.traverse((obj) => {
        const m = obj as THREE.Mesh;
        m.geometry?.dispose();
        (Array.isArray(m.material) ? m.material : m.material ? [m.material] : []).forEach((mat) => { (mat as THREE.MeshBasicMaterial).map?.dispose(); mat.dispose(); });
      });
      glowTex.dispose(); scene.environment?.dispose(); pmrem.dispose(); env.dispose?.(); composer.dispose(); renderer.dispose();
      renderer.forceContextLoss(); // free the GPU context on navigation instead of waiting for GC
    }
  };
}
