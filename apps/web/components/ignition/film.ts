// Operation Ignition: MicroFire's opening film, rendered live in three.js (about 7.6 s).
// A FICTIONAL story: a spacecraft between Earth and the Moon, a small fire anomaly inside its oxygen-containing cabin,
// PIX explaining why fire behaves differently in microgravity, and a hologram that opens into the observatory.
// Not a reenactment of any NASA incident, mission, trajectory or telemetry. The flame is the site's teaching
// illustration at low gravity (round, dim, blue); smoke spreads in all directions because nothing makes it rise.
// Every model except the astronaut and PIX is procedural (no downloads). One renderer, disposed with its context on stop.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { cleanFinish } from '../model-loader';
import { flameVolume } from '../proto/flame-volume';
import { FILM_SECONDS } from './state';

/** Story beats in film seconds. The page shows captions and controls on these; the film never waits for the page. */
export const BEATS = { earth: 0, cabin: 1.8, alert: 3.0, pix: 4.2, explain: 5.0, holo: 5.8, title: 6.5, exit: 7.1 } as const;
export type Beat = keyof typeof BEATS;
export type FilmApi = { stop(): void; resize(): void; setSound(on: boolean): void };
export type FilmOptions = {
  canvas: HTMLCanvasElement; host: HTMLElement; mobile: boolean;
  onBeat(b: Beat): void; onEnd(): void;
  /** Model download progress, 0–1 (files finished / files expected). */
  onProgress?(fraction: number): void;
  /** Aborted when this playback is skipped, replaced or unmounted: a start still loading disposes its renderer and returns null. */
  signal?: AbortSignal;
  /** Evidence only: hold the film at this time (seconds). */
  freezeAt?: number;
};

const ease = (x: number) => x * x * x * (x * (x * 6 - 15) + 10); // smootherstep
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const span = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

function canvasTexture(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, srgb = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d')!);
  const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

// ---------------------------------------------------------------------------------------------------------------
// Shared GLSL noise
const NOISE = /* glsl */ `
float h3(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
float n3(vec3 p) { vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(h3(i), h3(i + vec3(1,0,0)), f.x), mix(h3(i + vec3(0,1,0)), h3(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(h3(i + vec3(0,0,1)), h3(i + vec3(1,0,1)), f.x), mix(h3(i + vec3(0,1,1)), h3(i + vec3(1,1,1)), f.x), f.y), f.z); }
float fbm(vec3 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++) { s += a * n3(p); p *= 2.03; a *= 0.5; } return s; }`;

/** Earth: procedural continents, ocean glint, soft terminator, cloud deck and an atmospheric rim. Illustrative. */
function buildEarth(radius: number, sun: THREE.Vector3) {
  const g = new THREE.Group();
  const surface = new THREE.ShaderMaterial({
    uniforms: { uSun: { value: sun } },
    vertexShader: /* glsl */ `varying vec3 vObj; varying vec3 vN; varying vec3 vW;
      void main() { vObj = normalize(position); vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */ `uniform vec3 uSun; varying vec3 vObj; varying vec3 vN; varying vec3 vW; ${NOISE}
      void main() {
        vec3 p = vObj; float c = fbm(p * 2.1 + vec3(3.1, 0.7, 1.3));
        float land = smoothstep(0.53, 0.56, c);
        vec3 ocean = mix(vec3(0.015, 0.06, 0.16), vec3(0.04, 0.17, 0.33), smoothstep(0.38, 0.53, c));
        float tex = fbm(p * 9.0);
        vec3 ground = mix(vec3(0.16, 0.21, 0.09), vec3(0.42, 0.36, 0.22), smoothstep(0.35, 0.7, tex));
        ground = mix(ground, vec3(0.86, 0.88, 0.9), smoothstep(0.8, 0.9, abs(p.y)));
        vec3 col = mix(ocean, ground, land);
        vec3 N = normalize(vN), L = normalize(uSun), Vd = normalize(cameraPosition - vW);
        float diff = smoothstep(-0.12, 0.35, dot(N, L));
        float spec = pow(max(dot(N, normalize(L + Vd)), 0.0), 60.0) * (1.0 - land) * 0.9;
        float rim = pow(1.0 - max(dot(N, Vd), 0.0), 3.0);
        vec3 lit = col * (0.03 + 1.0 * diff) + vec3(1.0, 0.93, 0.8) * spec * diff;
        lit += vec3(0.25, 0.5, 1.0) * rim * (0.15 + 0.85 * diff) * 0.9;
        gl_FragColor = vec4(lit, 1.0);
        #include <colorspace_fragment>
      }`
  });
  g.add(new THREE.Mesh(new THREE.SphereGeometry(radius, 128, 96), surface));
  const clouds = new THREE.ShaderMaterial({
    uniforms: { uSun: { value: sun }, uTime: { value: 0 } }, transparent: true, depthWrite: false,
    vertexShader: /* glsl */ `varying vec3 vObj; varying vec3 vN; void main() { vObj = normalize(position); vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `uniform vec3 uSun; uniform float uTime; varying vec3 vObj; varying vec3 vN; ${NOISE}
      void main() { vec3 p = vObj * 3.2 + vec3(uTime * 0.012, 0.0, 0.0); float c = fbm(p) * 0.65 + fbm(p * 2.7) * 0.45;
        float a = smoothstep(0.62, 0.88, c) * 0.6; float diff = smoothstep(-0.1, 0.4, dot(normalize(vN), normalize(uSun)));
        gl_FragColor = vec4(vec3(0.82) * (0.04 + 0.85 * diff), a * (0.2 + 0.8 * diff)); }`
  });
  const cloudMesh = new THREE.Mesh(new THREE.SphereGeometry(radius * 1.012, 128, 96), clouds); g.add(cloudMesh);
  const atmo = new THREE.ShaderMaterial({
    uniforms: { uSun: { value: sun } }, transparent: true, depthWrite: false, side: THREE.BackSide, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `varying vec3 vN; varying vec3 vW; void main() { vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */ `uniform vec3 uSun; varying vec3 vN; varying vec3 vW;
      void main() { vec3 Vd = normalize(cameraPosition - vW); float f = pow(clamp(1.0 + dot(normalize(vN), Vd) * 1.05, 0.0, 1.0), 5.0);
        float lit = smoothstep(-0.35, 0.5, dot(-normalize(vN), normalize(uSun)));
        gl_FragColor = vec4(vec3(0.3, 0.6, 1.0) * f * (0.25 + 1.6 * lit), 1.0); }`
  });
  g.add(new THREE.Mesh(new THREE.SphereGeometry(radius * 1.07, 96, 64), atmo));
  return { group: g, clouds };
}

function buildStars(count: number, radius: number) {
  const pos = new Float32Array(count * 3), size = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const u = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2, s = Math.sqrt(1 - u * u);
    pos.set([Math.cos(a) * s * radius, u * radius, Math.sin(a) * s * radius], i * 3);
    size[i] = Math.pow(Math.random(), 6) * 2.6 + 0.6;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('size', new THREE.BufferAttribute(size, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: { uScale: { value: 1 } }, transparent: true, depthWrite: false,
    vertexShader: /* glsl */ `attribute float size; uniform float uScale; varying float vB; void main() { vB = size; gl_PointSize = size * uScale; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `varying float vB; void main() { float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.0, d) * min(1.0, vB * 0.45); gl_FragColor = vec4(vec3(0.85, 0.9, 1.0) * a, a); }`
  });
  return new THREE.Points(geo, mat);
}

// ---------------------------------------------------------------------------------------------------------------
/** An original crew vehicle: tri-wing solar arrays, gold-foil adapter, radiator-striped service module, docking nose. */
function buildShip() {
  const panel = canvasTexture(512, 512, (g) => {
    g.fillStyle = '#c9ced4'; g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${Math.random() < 0.5 ? '255,255,255' : '90,96,104'},${Math.random() * 0.06})`; g.fillRect(Math.random() * 512, Math.random() * 512, 30, 30); }
    g.strokeStyle = 'rgba(60,66,74,.55)'; g.lineWidth = 2;
    for (let x = 0; x <= 512; x += 64) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 512); g.stroke(); }
    for (let y = 0; y <= 512; y += 96) { g.beginPath(); g.moveTo(0, y); g.lineTo(512, y); g.stroke(); }
    g.fillStyle = 'rgba(40,44,50,.5)'; for (let x = 8; x < 512; x += 32) for (let y = 6; y < 512; y += 48) g.fillRect(x, y, 2, 2);
  });
  panel.wrapS = panel.wrapT = THREE.RepeatWrapping; panel.repeat.set(4, 1);
  const radiator = canvasTexture(512, 256, (g) => {
    g.fillStyle = '#e8eaec'; g.fillRect(0, 0, 512, 256);
    for (let x = 0; x < 512; x += 16) { g.fillStyle = x % 32 ? '#dfe2e5' : '#f2f3f4'; g.fillRect(x, 0, 14, 256); }
    g.fillStyle = '#7d848c'; g.fillRect(0, 0, 512, 6); g.fillRect(0, 250, 512, 6); g.fillRect(0, 124, 512, 4);
    g.fillStyle = '#2b3036'; g.font = 'bold 26px sans-serif'; g.fillText('MF-1', 40, 100);
  });
  radiator.wrapS = THREE.RepeatWrapping; radiator.repeat.set(3, 1);
  const cells = canvasTexture(512, 256, (g) => {
    g.fillStyle = '#0c1630'; g.fillRect(0, 0, 512, 256);
    for (let x = 0; x < 512; x += 32) for (let y = 0; y < 256; y += 32) {
      const grd = g.createLinearGradient(x, y, x + 30, y + 30); grd.addColorStop(0, '#1d3270'); grd.addColorStop(1, '#122149');
      g.fillStyle = grd; g.fillRect(x + 2, y + 2, 28, 28);
      g.fillStyle = 'rgba(180,200,240,.25)'; g.fillRect(x + 2, y + 15, 28, 1);
    }
    g.strokeStyle = '#8a95a6'; g.lineWidth = 4; g.strokeRect(2, 2, 508, 252);
  });
  const foil = canvasTexture(256, 256, (g) => {
    g.fillStyle = '#b8862e'; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 260; i++) { const c = 150 + Math.random() * 90; g.fillStyle = `rgba(${c},${c * 0.75},${c * 0.3},.5)`; g.beginPath(); g.ellipse(Math.random() * 256, Math.random() * 256, 4 + Math.random() * 18, 2 + Math.random() * 8, Math.random() * 3, 0, 7); g.fill(); }
  });
  const m = {
    hull: new THREE.MeshStandardMaterial({ map: panel, color: '#ffffff', roughness: 0.58, metalness: 0.12 }),
    rad: new THREE.MeshStandardMaterial({ map: radiator, roughness: 0.5, metalness: 0.08 }),
    dark: new THREE.MeshStandardMaterial({ color: '#2a2f36', roughness: 0.42, metalness: 0.65 }),
    shield: new THREE.MeshStandardMaterial({ color: '#3b2c22', roughness: 0.85, metalness: 0.05 }),
    gold: new THREE.MeshStandardMaterial({ map: foil, color: '#ffffff', roughness: 0.32, metalness: 1 }),
    solar: new THREE.MeshStandardMaterial({ map: cells, roughness: 0.28, metalness: 0.35, side: THREE.DoubleSide }),
    frame: new THREE.MeshStandardMaterial({ color: '#9aa3ad', roughness: 0.4, metalness: 0.8 }),
    window: new THREE.MeshPhysicalMaterial({ color: '#04070b', roughness: 0.04, metalness: 0, clearcoat: 1, emissive: '#ffffff', emissiveIntensity: 0.9,
      emissiveMap: canvasTexture(128, 96, (g) => { const r = g.createRadialGradient(70, 52, 4, 64, 48, 80); r.addColorStop(0, '#9fe9f5'); r.addColorStop(0.35, '#2a8fb0'); r.addColorStop(1, '#03141c'); g.fillStyle = r; g.fillRect(0, 0, 128, 96); g.fillStyle = 'rgba(2,8,12,.85)'; g.beginPath(); g.ellipse(52, 70, 16, 26, 0, 0, 7); g.fill(); g.beginPath(); g.arc(52, 40, 11, 0, 7); g.fill(); }) }),
    engine: new THREE.MeshStandardMaterial({ color: '#4a4e55', roughness: 0.3, metalness: 0.9, side: THREE.DoubleSide })
  };
  const ship = new THREE.Group(); // built along +y, nose up
  const lathe = (pts: [number, number][], mat: THREE.Material, seg = 64) => new THREE.Mesh(new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg), mat);
  ship.add(lathe([[0, 0], [1.22, 0.02], [1.3, 0.1]], m.shield));
  ship.add(lathe([[1.3, 0.1], [1.12, 0.45], [0.58, 1.5], [0.46, 1.58]], m.hull));
  ship.add(lathe([[0.46, 1.58], [0.36, 1.6], [0.36, 1.86], [0.44, 1.9], [0.44, 2.02], [0.3, 2.06], [0, 2.06]], m.frame, 48));
  // Two crew windows on the camera side of the cone, glowing faintly from the cabin lights.
  for (const phi of [-0.32, 0.32]) {
    const y = 0.95, r = 1.3 - (0.72 * (y - 0.1)) / 1.4, n = V(Math.sin(phi), 0.51, Math.cos(phi)).normalize();
    const w = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.26, 0.04), m.window);
    w.position.set(Math.sin(phi) * r, y, Math.cos(phi) * r).addScaledVector(n, 0.005); w.lookAt(w.position.clone().add(n)); ship.add(w);
    const f = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.32, 0.02), m.frame); f.position.copy(w.position).addScaledVector(n, -0.012); f.quaternion.copy(w.quaternion); ship.add(f);
  }
  ship.add(new THREE.Mesh(new THREE.CylinderGeometry(1.27, 1.27, 0.2, 64, 1, true), m.gold).translateY(-0.1));
  const sm = new THREE.Mesh(new THREE.CylinderGeometry(1.24, 1.24, 2.2, 64, 1, true), m.rad); sm.position.y = -1.3; ship.add(sm);
  ship.add(new THREE.Mesh(new THREE.CylinderGeometry(1.24, 0.9, 0.25, 64), m.dark).translateY(-2.52));
  const bell = lathe([[0.26, -2.62], [0.32, -2.8], [0.52, -3.25], [0.66, -3.55]], m.engine, 48); ship.add(bell);
  for (let i = 0; i < 4; i++) { // reaction-control quads
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4, q = new THREE.Group();
    q.add(new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.24, 0.16), m.dark));
    for (const d of [-1, 1]) { const n = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.09, 12, 1, true), m.engine); n.position.y = d * 0.15; n.rotation.z = d > 0 ? 0 : Math.PI; q.add(n); }
    q.position.set(Math.cos(a) * 1.32, -0.5, Math.sin(a) * 1.32); q.rotation.y = -a; ship.add(q);
  }
  // Tri-wing solar arrays at 120°: boom, yoke, two hinged panels each.
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + Math.PI / 6, wing = new THREE.Group();
    const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.7, 12), m.frame); boom.rotation.z = Math.PI / 2; boom.position.x = 1.55; wing.add(boom);
    for (let k = 0; k < 2; k++) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.9, 0.025), m.solar); p.position.set(2.85 + k * 1.76, 0, 0); p.rotation.x = 0.35; wing.add(p);
      const rim = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.035, 0.035), m.frame); rim.position.set(p.position.x, 0, 0); wing.add(rim);
    }
    wing.position.y = -1.55; wing.rotation.y = -a; ship.add(wing);
  }
  const dish = new THREE.Group(); // high-gain antenna between two wings
  dish.add(lathe([[0, 0], [0.3, 0.08], [0.34, 0.12]], m.frame, 32));
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.9, 8), m.frame); mast.position.y = -0.45; dish.add(mast);
  dish.position.set(Math.cos(Math.PI / 2 + Math.PI / 6) * 1.7, -0.9, Math.sin(Math.PI / 2 + Math.PI / 6) * 1.7); dish.rotation.set(0.4, 0, 0.9); ship.add(dish);
  const navR = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 8), new THREE.MeshBasicMaterial({ color: '#ff3a3a' })); navR.position.set(-1.3, -0.4, 0.2);
  const navG = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 8), new THREE.MeshBasicMaterial({ color: '#3aff7a' })); navG.position.set(1.3, -0.4, 0.2);
  ship.add(navR, navG);
  const root = new THREE.Group(); root.add(ship); ship.rotation.z = -Math.PI / 2; ship.position.x = 0.4; // nose toward +x (the Moon)
  const windowAt = V(Math.sin(0.32) * 0.86, 0.95, Math.cos(0.32) * 0.86); // ship-local, before the nose-to-+x turn
  return { root, ship, windowAt, nav: [navR, navG], textures: [panel, radiator, cells, foil] };
}

// ---------------------------------------------------------------------------------------------------------------
type Display = { mesh: THREE.Mesh; draw(alert: number): void; tex: THREE.CanvasTexture };
function display(w: number, h: number, kind: 'nav' | 'status' | 'rack'): Display {
  const c = document.createElement('canvas'); c.width = 512; c.height = Math.round(512 * h / w);
  const g = c.getContext('2d')!, tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const draw = (alert: number) => {
    const W = c.width, H = c.height, warn = alert > 0.5;
    g.fillStyle = '#020609'; g.fillRect(0, 0, W, H);
    g.strokeStyle = warn ? '#ff8a3c' : '#2fd1e6'; g.lineWidth = 3; g.strokeRect(6, 6, W - 12, H - 12);
    g.font = 'bold 26px sans-serif'; g.fillStyle = warn ? '#ffb070' : '#7fe6f2';
    if (kind === 'nav') {
      g.fillText('NAV · EARTH → MOON (FICTIONAL)', 24, 44);
      g.strokeStyle = '#2b6f86'; g.lineWidth = 2; g.beginPath(); g.ellipse(W / 2, H * 0.62, W * 0.38, H * 0.22, 0, Math.PI, 2 * Math.PI); g.stroke();
      g.fillStyle = '#3b7bd9'; g.beginPath(); g.arc(W * 0.12, H * 0.62, 16, 0, 7); g.fill();
      g.fillStyle = '#c8ccd2'; g.beginPath(); g.arc(W * 0.88, H * 0.62, 9, 0, 7); g.fill();
      g.fillStyle = '#7fe6f2'; g.beginPath(); g.arc(W * 0.42, H * 0.43, 7, 0, 7); g.fill();
    } else if (kind === 'status') {
      g.fillText(warn ? 'FIRE ANOMALY DETECTED' : 'CABIN SYSTEMS', 24, 44);
      for (let i = 0; i < 5; i++) { const y = 80 + i * 34; g.fillStyle = warn && i === 2 ? '#ff6a3c' : '#16424f'; g.fillRect(24, y, W - 48, 18); g.fillStyle = warn && i === 2 ? '#ffd2a8' : '#2fd1e6'; g.fillRect(24, y, (W - 48) * [0.7, 0.55, warn ? 0.92 : 0.4, 0.8, 0.62][i]!, 18); }
    } else {
      g.fillText(warn ? 'EQUIPMENT BAY 3 · ALERT' : 'EQUIPMENT BAY 3', 24, 44);
      g.font = '20px sans-serif'; g.fillStyle = '#9fb3bf'; g.fillText('illustrative equipment', 24, 76);
    }
  };
  draw(0);
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
  return { mesh, draw: (a) => { draw(a); tex.needsUpdate = true; }, tex };
}

/** A compact cockpit seen from the aft: curved metal shell, a two-pane window onto Earth, a console, light strips. */
function buildCabin(sun: THREE.Vector3) {
  const g = new THREE.Group();
  const panels = canvasTexture(1024, 512, (c) => {
    c.fillStyle = '#20262d'; c.fillRect(0, 0, 1024, 512);
    for (let x = 0; x < 1024; x += 128) for (let y = 0; y < 512; y += 128) {
      const v = 30 + Math.random() * 14; c.fillStyle = `rgb(${v},${v + 6},${v + 13})`; c.fillRect(x + 4, y + 4, 120, 120);
      c.fillStyle = 'rgba(0,0,0,.35)'; for (const [dx, dy] of [[10, 10], [110, 10], [10, 110], [110, 110]]) c.fillRect(x + dx!, y + dy!, 4, 4);
    }
  });
  panels.wrapS = panels.wrapT = THREE.RepeatWrapping; panels.repeat.set(6, 2);
  const wall = new THREE.MeshStandardMaterial({ map: panels, roughness: 0.55, metalness: 0.55 });
  const metal = new THREE.MeshStandardMaterial({ color: '#39414a', roughness: 0.38, metalness: 0.8 });
  const darkm = new THREE.MeshStandardMaterial({ color: '#14181d', roughness: 0.5, metalness: 0.6 });
  const shell = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 6, 64, 1, true), wall); shell.rotation.x = Math.PI / 2; shell.material.side = THREE.BackSide; g.add(shell);
  // Front bulkhead with two window cut-outs (extruded, so the frames have real depth).
  const front = new THREE.Shape(); front.absarc(0, 0, 2.4, 0, Math.PI * 2, false);
  const pane = (x: number) => { const p = new THREE.Path(), w = 1.05, h = 0.8, r = 0.16, y = 0.55; p.moveTo(x - w / 2 + r, y - h / 2); p.lineTo(x + w / 2 - r, y - h / 2); p.quadraticCurveTo(x + w / 2, y - h / 2, x + w / 2, y - h / 2 + r); p.lineTo(x + w / 2, y + h / 2 - r); p.quadraticCurveTo(x + w / 2, y + h / 2, x + w / 2 - r, y + h / 2); p.lineTo(x - w / 2 + r, y + h / 2); p.quadraticCurveTo(x - w / 2, y + h / 2, x - w / 2, y + h / 2 - r); p.lineTo(x - w / 2, y - h / 2 + r); p.quadraticCurveTo(x - w / 2, y - h / 2, x - w / 2 + r, y - h / 2); return p; };
  front.holes.push(pane(-0.6), pane(0.6));
  const bulk = new THREE.Mesh(new THREE.ExtrudeGeometry(front, { depth: 0.18, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 3, curveSegments: 32 }), metal);
  bulk.position.z = -2.9; g.add(bulk);
  // The view: Earth below, stars beyond (a separate small set, so the cockpit never shows the exterior shot).
  const earth = buildEarth(26, sun); earth.group.position.set(-3, -25.5, -40); earth.group.rotation.set(0.3, 1.2, 0); g.add(earth.group);
  const stars = buildStars(900, 120); g.add(stars);
  // Console under the window, three displays, and the cyan light strips.
  const console_ = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.55, 0.6), darkm); console_.position.set(0, -0.45, -2.45); console_.rotation.x = -0.55; g.add(console_);
  const nav = display(0.8, 0.42, 'nav'), status = display(0.8, 0.42, 'status');
  nav.mesh.position.set(-0.55, -0.32, -2.16); status.mesh.position.set(0.55, -0.32, -2.16);
  for (const d of [nav, status]) { d.mesh.rotation.x = -0.55; g.add(d.mesh); }
  // The astronaut's work station on the left wall (what they are watching before the alert).
  const side = display(0.75, 0.42, 'status'); side.mesh.position.set(-1.62, 0.15, -0.95); side.mesh.rotation.y = Math.PI / 2 - 0.25; g.add(side.mesh);
  const sideBox = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.56, 0.08), darkm); sideBox.position.set(-1.66, 0.15, -0.96); sideBox.rotation.y = Math.PI / 2 - 0.25; g.add(sideBox);
  const strips: THREE.MeshBasicMaterial[] = [];
  for (const [x, y] of [[-1.5, 1.85], [1.5, 1.85], [-2.05, -0.2], [2.05, -0.2]] as const) {
    const sm = new THREE.MeshBasicMaterial({ color: new THREE.Color('#5fe0ff').multiplyScalar(1.3), toneMapped: false }); strips.push(sm);
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.022, 3.2), sm); s.position.set(x, y, -0.6); g.add(s);
  }
  // Illustrative equipment bay on the right wall, where the anomaly starts: an access hatch and a cable bundle.
  const bay = new THREE.Group(); bay.position.set(1.9, 0.15, -1.25); bay.rotation.y = -Math.PI / 2 + 0.25; g.add(bay);
  const rack = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.5, 0.35), darkm); bay.add(rack);
  for (let i = 0; i < 4; i++) { const d = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.02, 0.02), metal); d.position.set(0, -0.6 + i * 0.4, 0.18); bay.add(d); }
  const hatch = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.3, 0.03), metal); hatch.position.set(0.18, 0.12, 0.3); hatch.rotation.y = -1.1; bay.add(hatch);
  const cavity = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.28, 0.1), new THREE.MeshStandardMaterial({ color: '#07090b', roughness: 0.9 })); cavity.position.set(-0.05, 0.12, 0.14); bay.add(cavity);
  const cable = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(-0.22, 0.06, 0.16), V(-0.08, 0.16, 0.2), V(0.06, 0.06, 0.18), V(0.18, 0.14, 0.17)]), 32, 0.018, 8), new THREE.MeshStandardMaterial({ color: '#1d1f22', roughness: 0.7 }));
  bay.add(cable);
  const label = display(0.7, 0.22, 'rack'); label.mesh.position.set(0, 0.55, 0.181); bay.add(label.mesh);
  const flamePoint = new THREE.Vector3(-0.04, 0.13, 0.27); // in bay space
  return { group: g, earth, stars, nav, status, side, label, strips, bay, flamePoint, textures: [panels] };
}

// ---------------------------------------------------------------------------------------------------------------
/** PIX's holographic science panel: a rotating illustrative chamber with a microgravity flame, gravity comparison. */
function buildHologram() {
  const g = new THREE.Group();
  const panelMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uOpen: { value: 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `uniform float uTime; uniform float uOpen; varying vec2 vUv;
      void main() { vec2 p = vUv - 0.5; float edge = smoothstep(0.5, 0.47, max(abs(p.x), abs(p.y) * 1.6));
        float frame = edge - smoothstep(0.47, 0.44, max(abs(p.x), abs(p.y) * 1.6));
        vec2 gr = abs(fract(vUv * vec2(24.0, 15.0)) - 0.5); float grid = smoothstep(0.47, 0.5, max(gr.x, gr.y)) * 0.12;
        float scan = 0.5 + 0.5 * sin(vUv.y * 320.0 - uTime * 6.0); float sweep = smoothstep(0.08, 0.0, abs(fract(vUv.y - uTime * 0.35) - 0.5) - 0.42);
        float reveal = smoothstep(uOpen - 0.08, uOpen, 1.0 - abs(p.y) * 2.0 * 0.5 - 0.5 + uOpen * 0.5 + 0.25);
        float a = (frame * 1.2 + grid + 0.05 * scan + sweep * 0.12) * edge * clamp(uOpen * 1.4, 0.0, 1.0);
        gl_FragColor = vec4(vec3(0.35, 0.92, 1.0) * a, a); }`
  });
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 1.06), panelMat); g.add(panel);
  const cyan = new THREE.LineBasicMaterial({ color: new THREE.Color('#6ff2ff').multiplyScalar(1.6), transparent: true, opacity: 0, toneMapped: false });
  const chamber = new THREE.Group(); chamber.position.set(0, 0.02, 0.06); g.add(chamber);
  chamber.add(new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.CylinderGeometry(0.2, 0.2, 0.44, 20, 1, true), 1), cyan));
  for (const y of [-0.24, 0.24]) { const r = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.CylinderGeometry(0.25, 0.25, 0.04, 28), 1), cyan); r.position.y = y; chamber.add(r); }
  const flame = flameVolume(0.34, 1.8); chamber.add(flame.mesh);
  const side = canvasTexture(1024, 256, (c) => {
    c.clearRect(0, 0, 1024, 256);
    c.fillStyle = '#ffb36b'; c.beginPath(); c.moveTo(140, 200); c.bezierCurveTo(80, 170, 110, 90, 140, 30); c.bezierCurveTo(170, 90, 200, 170, 140, 200); c.fill();
    c.fillStyle = 'rgba(110,170,255,.9)'; c.beginPath(); c.arc(884, 130, 56, 0, 7); c.fill(); c.fillStyle = 'rgba(4,10,20,.9)'; c.beginPath(); c.arc(884, 130, 40, 0, 7); c.fill();
    c.font = 'bold 34px sans-serif'; c.fillStyle = '#bff6ff'; c.textAlign = 'center';
    c.fillText('1 g', 140, 245); c.fillText('microgravity', 884, 245);
  });
  const sideMat = new THREE.MeshBasicMaterial({ map: side, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  const sides = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.375), sideMat); sides.position.set(0, -0.02, 0.03); g.add(sides);
  const word = canvasTexture(1024, 160, (c) => { c.font = '800 96px sans-serif'; c.textAlign = 'center'; c.fillStyle = '#d8fbff'; c.fillText('MICROFIRE', 512, 112); });
  const wordMat = new THREE.MeshBasicMaterial({ map: word, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  const wordmark = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.14), wordMat); wordmark.position.set(0, -0.42, 0.03); g.add(wordmark);
  return { group: g, panelMat, cyan, chamber, flame, sideMat, wordMat, textures: [side, word] };
}

// ---------------------------------------------------------------------------------------------------------------
/** Original synthesized sound (no files): spacecraft hush, a soft two-note warning, PIX's chime, a hologram swell. */
function filmAudio() {
  let ctx: AudioContext | null = null, out: GainNode | null = null, bed: AudioScheduledSourceNode[] = [];
  const tone = (f: number, at: number, dur: number, type: OscillatorType = 'sine', vol = 0.1) => {
    if (!ctx || !out) return; const o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime + at;
    o.type = type; o.frequency.value = f; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(out); o.start(t); o.stop(t + dur + 0.05);
  };
  return {
    on() {
      if (ctx) { void ctx.resume(); return; }
      try { ctx = new AudioContext(); } catch { return; }
      out = ctx.createGain(); out.gain.value = 0.55; out.connect(ctx.destination);
      const n = ctx.createBufferSource(), buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      n.buffer = buf; n.loop = true; const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 300;
      const gn = ctx.createGain(); gn.gain.value = 0.06; n.connect(lp).connect(gn).connect(out);
      const hum = ctx.createOscillator(); hum.frequency.value = 48; const hg = ctx.createGain(); hg.gain.value = 0.02; hum.connect(hg).connect(out);
      n.start(); hum.start(); bed = [n, hum];
    },
    off() { void ctx?.suspend(); },
    cue(b: Beat) {
      if (!ctx || ctx.state !== 'running') return;
      if (b === 'alert') { tone(660, 0, 0.22, 'triangle', 0.08); tone(550, 0.28, 0.3, 'triangle', 0.08); }
      if (b === 'pix') { tone(880, 0, 0.18); tone(1175, 0.1, 0.22); tone(1568, 0.2, 0.4, 'sine', 0.07); }
      if (b === 'holo') { tone(220, 0, 1.2, 'sine', 0.06); tone(330, 0.15, 1.1, 'sine', 0.05); tone(440, 0.3, 1.0, 'sine', 0.04); }
    },
    stop() { bed.forEach((s) => { try { s.stop(); } catch { /* already stopped */ } }); void ctx?.close(); ctx = null; }
  };
}

// ---------------------------------------------------------------------------------------------------------------
type Key = { t: number; pos: THREE.Vector3; look: THREE.Vector3; fov: number };
/** Piecewise camera path: Catmull-Rom through key positions and targets, eased within each scene. */
function path(keys: Key[]) {
  const pc = new THREE.CatmullRomCurve3(keys.map((k) => k.pos), false, 'centripetal');
  const lc = new THREE.CatmullRomCurve3(keys.map((k) => k.look), false, 'centripetal');
  const a = keys[0]!.t, b = keys[keys.length - 1]!.t;
  return (t: number, cam: THREE.PerspectiveCamera) => {
    // time → curve parameter: linear between keys, then the whole scene eased in and out
    const x = ease(span(t, a, b)) * (b - a) + a;
    let i = 0; while (i < keys.length - 2 && x > keys[i + 1]!.t) i++;
    const k0 = keys[i]!, k1 = keys[i + 1]!, local = span(x, k0.t, k1.t), u = (i + local) / (keys.length - 1);
    cam.position.copy(pc.getPoint(u)); cam.lookAt(lc.getPoint(u));
    cam.fov = THREE.MathUtils.lerp(k0.fov, k1.fov, local); cam.updateProjectionMatrix();
  };
}

/** Files the two models fetch (2 × .gltf, 2 × .bin, 4 × .webp): the progress denominator until the loader has seen them all. */
const MODEL_FILES = 8;
/** Give up only when no file has finished for this long; a slow but moving connection still gets the film. */
const STALL_MS = 15000;

/**
 * Astronaut and PIX through one manager, so the page can show real progress. Null if either fails, the download
 * stalls or the playback is aborted. The film's own loader: nothing here is shared with the homepage's model cache,
 * so disposing the film never frees geometry the observatory still draws.
 */
async function loadModels(onProgress: ((f: number) => void) | undefined, signal: AbortSignal | undefined) {
  const mgr = new THREE.LoadingManager(), loader = new GLTFLoader(mgr);
  let last = performance.now(), timer = 0, onAbort = () => {};
  mgr.onProgress = (_u, done, total) => { last = performance.now(); if (!signal?.aborted) onProgress?.(done / Math.max(total, MODEL_FILES)); };
  const stalled = new Promise<null>((r) => { timer = window.setInterval(() => { if (performance.now() - last > STALL_MS) r(null); }, 500); });
  const aborted = new Promise<null>((r) => { onAbort = () => r(null); signal?.addEventListener('abort', onAbort, { once: true }); });
  // ponytail: an aborted download still finishes in the background (into the HTTP cache); GLTFLoader exposes no per-request abort.
  const both = Promise.all([loader.loadAsync('/models/astronaut-suit/astronaut.gltf'), loader.loadAsync('/models/pix/pix.gltf')]).then(([a, p]) => ({ astro: a, pixModel: p.scene }), () => null);
  const got = await Promise.race([both, stalled, aborted]);
  clearInterval(timer); signal?.removeEventListener('abort', onAbort);
  return signal?.aborted ? null : got;
}

export async function startFilm(o: FilmOptions): Promise<FilmApi | null> {
  if (o.signal?.aborted) return null;
  let renderer: THREE.WebGLRenderer;
  try { renderer = new THREE.WebGLRenderer({ canvas: o.canvas, antialias: true, powerPreference: 'high-performance' }); } catch { return null; }
  const gl = renderer.getContext(), dbg = gl.getExtension('WEBGL_debug_renderer_info');
  // Software rasterisers cannot hold 60 fps here: the visitor goes straight to the site instead.
  if (/swiftshader|llvmpipe|softpipe|software/i.test(dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : '')) { renderer.dispose(); renderer.forceContextLoss(); return null; }
  const models = await loadModels(o.onProgress, o.signal);
  // Failed, stalled or aborted (skipped, replaced, unmounted): release this run's context now, never hand it on.
  if (!models) { renderer.dispose(); renderer.forceContextLoss(); return null; }
  const { astro, pixModel } = models;

  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, o.mobile ? 2 : 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#010205');
  const camera = new THREE.PerspectiveCamera(36, 1, 0.02, 2000);
  const sun = V(-0.62, 0.42, 0.66).normalize();
  // Image-based light: a dark sky above, Earth-blue below, one warm sun spot (so metals and foil read in space).
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  const sky = new THREE.Mesh(new THREE.SphereGeometry(10, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'varying vec3 vP; void main(){ vec3 c = mix(vec3(0.12,0.28,0.55), vec3(0.01,0.012,0.02), smoothstep(-0.4,0.2,vP.y)); c += vec3(3.0,2.7,2.3) * pow(max(dot(vP, normalize(vec3(-0.62,0.42,0.66))),0.0), 64.0); gl_FragColor = vec4(c,1.0); }' }));
  envScene.add(sky);
  const env = pmrem.fromScene(envScene, 0.02).texture; scene.environment = env;

  // ---- Exterior (scene 01) ----
  const ext = new THREE.Group(); scene.add(ext);
  const earth = buildEarth(62, sun); earth.group.position.set(-26, -72, -46); earth.group.rotation.set(0.2, 2.3, 0.1); ext.add(earth.group);
  const moon = new THREE.Mesh(new THREE.SphereGeometry(5, 48, 32), new THREE.MeshStandardMaterial({ roughness: 1, metalness: 0, map: canvasTexture(512, 256, (c) => {
    c.fillStyle = '#8b8d90'; c.fillRect(0, 0, 512, 256);
    for (let i = 0; i < 160; i++) { const r = 2 + Math.pow(Math.random(), 3) * 26, v = 90 + Math.random() * 70; c.fillStyle = `rgba(${v},${v},${v + 4},.55)`; c.beginPath(); c.arc(Math.random() * 512, Math.random() * 256, r, 0, 7); c.fill(); }
  }) }));
  moon.position.set(240, 12, -210); moon.scale.setScalar(1.5); ext.add(moon);
  const extStars = buildStars(2400, 900); ext.add(extStars);
  const ship = buildShip(); ext.add(ship.root);
  const sunLight = new THREE.DirectionalLight('#fff4e6', 3.4); sunLight.position.copy(sun).multiplyScalar(50); ext.add(sunLight);
  const earthshine = new THREE.HemisphereLight('#05070c', '#2b5ea8', 0.6); ext.add(earthshine);

  // ---- Cabin (scenes 02–05), far from the exterior so neither shot sees the other ----
  const cab = new THREE.Group(); cab.position.set(0, 0, 4000); cab.visible = false; scene.add(cab);
  const cabin = buildCabin(sun); cab.add(cabin.group);
  const hemi = new THREE.HemisphereLight('#9cc4ff', '#0b0f15', 0.55); cab.add(hemi);
  const key = new THREE.SpotLight('#dcecff', 11, 9, 0.7, 0.6, 1.6); key.position.set(-1.0, 1.4, 1.6); key.target.position.set(-0.1, -0.2, -1.0); cab.add(key, key.target);
  const window_ = new THREE.DirectionalLight('#bfdcff', 1.2); window_.position.set(0, 0.6, -6); window_.target.position.set(0, 0, 0); cab.add(window_, window_.target);
  const cyanL = new THREE.PointLight('#5fe0ff', 3.5, 5, 1.6); cyanL.position.set(0, 1.7, -0.6); cab.add(cyanL);
  const warnA = new THREE.PointLight('#ff8a2a', 0, 6, 1.4); warnA.position.set(1.2, 1.7, -0.4); cab.add(warnA);
  const warnB = new THREE.PointLight('#ff3a2a', 0, 6, 1.4); warnB.position.set(-1.2, 1.7, -1.4); cab.add(warnB);
  // Astronaut: the rigged suit with its own breathing / look clips.
  const astronaut = astro.scene; const box = new THREE.Box3().setFromObject(astronaut), dim = box.getSize(new THREE.Vector3());
  astronaut.scale.multiplyScalar(1.72 / dim.y); box.setFromObject(astronaut); astronaut.position.sub(V((box.min.x + box.max.x) / 2, box.min.y, (box.min.z + box.max.z) / 2));
  const astroRig = new THREE.Group(); astroRig.add(astronaut); astroRig.position.set(-0.15, -1.3, -1.05); cab.add(astroRig);
  astronaut.traverse((m) => { if (m instanceof THREE.Mesh) { m.frustumCulled = false; const mm = m.material as THREE.MeshStandardMaterial; mm.envMapIntensity = 0.7; } });
  const mixer = new THREE.AnimationMixer(astronaut);
  const clip = (n: string) => astro.animations.find((a) => a.name === n);
  const idle = clip('Idle') && mixer.clipAction(clip('Idle')!), look = clip('Short_Breathe_and_Look_Around') && mixer.clipAction(clip('Short_Breathe_and_Look_Around')!);
  idle?.play();
  // PIX: the site's model with procedural hover, turn, scan and two glowing eyes.
  const pix = cleanFinish(pixModel); const pb = new THREE.Box3().setFromObject(pix), pd = pb.getSize(new THREE.Vector3());
  pix.scale.multiplyScalar(0.42 / pd.y); pb.setFromObject(pix); pix.position.sub(pb.getCenter(new THREE.Vector3()));
  const pixRig = new THREE.Group(); pixRig.add(pix); cab.add(pixRig);
  const glowTex = canvasTexture(64, 64, (c) => { const r = c.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(200,250,255,1)'); r.addColorStop(0.35, 'rgba(90,220,255,.6)'); r.addColorStop(1, 'rgba(90,220,255,0)'); c.fillStyle = r; c.fillRect(0, 0, 64, 64); });
  const eyes = [-1, 1].map((s) => { const e = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: '#8ff4ff', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })); e.scale.setScalar(0.07); e.position.set(s * 0.045, 0.055, 0.12); pixRig.add(e); return e; });
  const pixLight = new THREE.PointLight('#5fe8ff', 0, 1.6, 1.8); pixLight.position.set(0, 0.05, 0.45); pixRig.add(pixLight);
  const scanMat = new THREE.MeshBasicMaterial({ color: '#58e6ff', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false });
  const scanCone = new THREE.Mesh(new THREE.ConeGeometry(0.32, 1.8, 32, 1, true), scanMat); scanCone.rotation.x = -Math.PI / 2; scanCone.position.z = 0.9; const scanRig = new THREE.Group(); scanRig.add(scanCone); pixRig.add(scanRig);
  // The anomaly: a small round, dim, blue flame at the bay hatch (low-gravity illustration) and smoke spreading evenly.
  const flame = flameVolume(0.6, 1.5), flameBase = flame.mesh.scale.x; const fw = cabin.bay.localToWorld(cabin.flamePoint.clone()); cab.worldToLocal(fw); flame.mesh.position.copy(fw); flame.mesh.scale.setScalar(flameBase * 0.01); cab.add(flame.mesh);
  const flameLight = new THREE.PointLight('#ff9a4a', 0, 2.2, 1.6); flameLight.position.copy(fw).add(V(-0.25, 0, 0.1)); cab.add(flameLight);
  const smokeTex = canvasTexture(64, 64, (c) => { const r = c.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(120,124,130,.55)'); r.addColorStop(1, 'rgba(120,124,130,0)'); c.fillStyle = r; c.fillRect(0, 0, 64, 64); });
  const smoke = Array.from({ length: 14 }, (_, i) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTex, transparent: true, opacity: 0, depthWrite: false })); s.position.copy(fw); cab.add(s);
    const a = (i / 14) * Math.PI * 2, b = (Math.random() - 0.5) * 1.6;
    return { s, dir: V(Math.cos(a) * Math.cos(b), Math.sin(b), Math.sin(a) * Math.cos(b)).multiplyScalar(0.12 + Math.random() * 0.08), spin: Math.random() };
  });
  const holo = buildHologram(); cab.add(holo.group); holo.group.visible = false;

  // ---- Cameras: one directed path per scene, with separate phone framings (not a crop) ----
  const m = o.mobile, shipAt = (t: number) => V(1.15 * t, 0.06 * t, 0);
  const C = (x: number, y: number, z: number) => V(x, y, z).add(cab.position);
  const PIX_HOME = C(-0.62, 0.42, -0.35), PIX_UP = C(-0.62, 0.58, -0.3);
  // Where the crew window will be at the cut (ship-relative): the exterior shot ends looking into it.
  ship.root.rotation.set(0.12 + 1.8 * 0.01, -0.18, 0.05 + Math.sin(1.8 * 0.7) * 0.02); ship.root.position.set(0, 0, 0); ship.root.updateMatrixWorld(true);
  const winRel = ship.ship.localToWorld(ship.windowAt.clone());
  const winN = ship.ship.localToWorld(ship.windowAt.clone().add(V(Math.sin(0.32), 0.51, Math.cos(0.32)).normalize())).sub(winRel).normalize();
  const extPath = path(m ? [
    { t: 0, pos: V(-20, 6, 40), look: V(-1, -3, 0), fov: 58 },
    { t: 1.0, pos: V(-6, 2.6, 15), look: V(1.4, 0.2, 0), fov: 52 },
    { t: 1.8, pos: winRel.clone().addScaledVector(winN, 2.6).add(V(-0.3, 0.3, 0)), look: winRel, fov: 46 }
  ] : [
    { t: 0, pos: V(-22, 6.5, 30), look: V(0, -2.5, 0), fov: 40 },
    { t: 1.0, pos: V(-7, 2.2, 11), look: V(1.4, 0.1, 0), fov: 34 },
    { t: 1.8, pos: winRel.clone().addScaledVector(winN, 2.1).add(V(-0.45, 0.25, 0)), look: winRel, fov: 32 }
  ]);
  const cabPath = path(m ? [
    { t: 1.8, pos: C(0.4, 0.5, 3.3), look: C(0.1, 0.0, -1.4), fov: 62 },
    { t: 3.0, pos: C(0.3, 0.45, 2.7), look: C(0.3, 0.0, -1.3), fov: 60 },
    { t: 4.2, pos: C(-0.2, 0.35, 1.7), look: C(1.2, 0.05, -1.1), fov: 58 }
  ] : [
    { t: 1.8, pos: C(0.9, 0.62, 2.6), look: C(0.0, 0.05, -1.6), fov: 46 },
    { t: 3.0, pos: C(0.6, 0.5, 2.0), look: C(0.25, 0.05, -1.3), fov: 44 },
    { t: 4.2, pos: C(-0.3, 0.4, 1.2), look: C(1.55, 0.18, -1.15), fov: 42 }
  ]);
  const pixPath = path(m ? [
    { t: 4.2, pos: C(-0.4, 0.62, 0.7), look: C(-0.62, 0.55, -0.3), fov: 56 },
    { t: 5.0, pos: C(-0.55, 0.7, 0.95), look: C(-0.4, 0.5, -0.4), fov: 56 },
    { t: 5.8, pos: C(-1.0, 0.75, 1.5), look: C(0.4, 0.35, -0.8), fov: 58 }
  ] : [
    { t: 4.2, pos: C(-0.25, 0.62, 0.55), look: C(-0.62, 0.56, -0.3), fov: 38 },
    { t: 5.0, pos: C(-0.35, 0.68, 0.75), look: C(-0.45, 0.52, -0.35), fov: 40 },
    { t: 5.8, pos: C(-1.05, 0.78, 1.35), look: C(0.5, 0.3, -0.85), fov: 44 }
  ]);
  const HOLO = C(-0.2, 0.55, 0.25);
  const holoPath = path([
    { t: 5.8, pos: C(-0.55, 0.62, 1.7), look: HOLO, fov: m ? 58 : 44 },
    { t: 6.7, pos: C(-0.3, 0.57, 1.05), look: HOLO, fov: m ? 54 : 40 },
    { t: FILM_SECONDS, pos: HOLO.clone().add(V(0, 0.02, 0.1)), look: HOLO.clone().add(V(0, 0.02, -1)), fov: m ? 50 : 36 }
  ]);
  holo.group.position.copy(HOLO).sub(cab.position); if (m) holo.group.scale.setScalar(0.8);

  // ---- Post: bloom only on capable screens, for the deliberately bright sources (strips, eyes, hologram) ----
  let composer: EffectComposer | null = null, bloom: UnrealBloomPass | null = null;
  if (!m) {
    composer = new EffectComposer(renderer); composer.addPass(new RenderPass(scene, camera));
    bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), 0.4, 0.45, 1.25); composer.addPass(bloom); composer.addPass(new OutputPass());
  }
  const audio = filmAudio();
  const size = () => {
    const r = o.host.getBoundingClientRect();
    renderer.setSize(r.width, r.height, false); composer?.setSize(r.width, r.height); camera.aspect = r.width / Math.max(1, r.height); camera.updateProjectionMatrix();
    for (const st of [extStars, cabin.stars]) (st.material as THREE.ShaderMaterial).uniforms.uScale!.value = renderer.getPixelRatio();
  };
  size();

  const fired = new Set<Beat>();
  let t0 = 0, frame = 0, stopped = false;
  const lerp = THREE.MathUtils.lerp;
  const render = (now: number) => {
    if (stopped) return;
    if (!t0) t0 = now;
    const t = o.freezeAt ?? Math.min(FILM_SECONDS, (now - t0) / 1000);
    for (const [b, at] of Object.entries(BEATS) as [Beat, number][]) if (t >= at && !fired.has(b)) { fired.add(b); o.onBeat(b); audio.cue(b); }
    const dt = 1 / 60;
    const inside = t >= BEATS.cabin;
    ext.visible = !inside; cab.visible = inside;
    if (!inside) {
      // Scene 01: Earth departure. The ship coasts toward the Moon; the camera closes on the crew window.
      ship.root.position.copy(shipAt(t)); ship.root.rotation.set(0.12 + t * 0.01, -0.18, 0.05 + Math.sin(t * 0.7) * 0.02);
      earth.group.rotation.y = 2.3 + t * 0.004; earth.clouds.uniforms.uTime!.value = t;
      ship.nav.forEach((n, i) => { n.visible = Math.sin(t * 6 + i * 3) > 0.2; });
      extPath(t, camera);
      camera.position.add(shipAt(t).multiplyScalar(t > 1.0 ? 1 : ease(t))); camera.lookAt(camera.position.clone().add(new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion)));
      renderer.toneMappingExposure = 1.0;
    } else {
      cabin.earth.clouds.uniforms.uTime!.value = t;
      mixer.update(o.freezeAt !== undefined ? 0 : dt);
      const alert = span(t, BEATS.alert, BEATS.alert + 0.35);
      // Warning lights breathe at under 1 Hz (no strobe); the strips shift from cyan to amber; displays switch.
      const breathe = alert * (0.55 + 0.45 * Math.sin((t - BEATS.alert) * 5.2));
      warnA.intensity = 7 * breathe; warnB.intensity = 5 * breathe * 0.8; cyanL.intensity = lerp(3.5, 1.2, alert); hemi.intensity = lerp(0.55, 0.35, alert);
      const stripCol = new THREE.Color('#5fe0ff').lerp(new THREE.Color('#ff9a3c'), alert).multiplyScalar(1.3);
      cabin.strips.forEach((s, i) => { s.color.copy(stripCol).multiplyScalar(1 + 0.6 * clamp01(1 - Math.abs(span(t, BEATS.alert + 0.1, BEATS.alert + 0.7) * 5 - i - 0.5))); });
      if (alert > 0.5 && !cabin.status.mesh.userData.warn) { cabin.status.mesh.userData.warn = 1; cabin.status.draw(1); cabin.side.draw(1); cabin.label.draw(1); }
      // The flame: grows from nothing at the hatch into a small round blue shell (low-gravity illustration).
      const grow = ease(span(t, BEATS.alert + 0.15, BEATS.alert + 0.95));
      flame.mesh.scale.setScalar(flameBase * Math.max(0.01, grow)); flame.update(t, 0.08);
      flameLight.intensity = grow * (1.4 + 0.15 * Math.sin(t * 9)); flameLight.color.setHSL(0.07 - grow * 0.03, 1, 0.55);
      smoke.forEach((p, i) => {
        const age = Math.max(0, t - BEATS.alert - 0.4 - i * 0.05);
        p.s.position.copy(fw).addScaledVector(p.dir, age); p.s.scale.setScalar(0.08 + age * 0.14);
        (p.s.material as THREE.SpriteMaterial).opacity = Math.min(0.32, age * 0.6) * (1 - span(t, BEATS.holo + 0.6, FILM_SECONDS));
        (p.s.material as THREE.SpriteMaterial).rotation = p.spin + age * 0.4;
      });
      // Astronaut: breathing idle, then turns toward the anomaly and looks around; settles toward PIX.
      if (t >= BEATS.alert + 0.15 && look && !look.isRunning()) { look.reset().play(); idle?.crossFadeTo(look, 0.35, false); }
      const yaw = lerp(lerp(-0.55, 1.15, ease(span(t, BEATS.alert + 0.15, BEATS.alert + 0.85))), -0.45, ease(span(t, BEATS.pix + 0.3, BEATS.explain + 0.4)));
      astroRig.rotation.set(0.03 * Math.sin(t * 0.9), yaw, 0.04 * Math.sin(t * 0.6)); astroRig.position.y = -1.3 + 0.025 * Math.sin(t * 1.3);
      // PIX: dormant → wakes (eyes on, rises) → faces the anomaly → scans → opens the hologram.
      const wake = ease(span(t, BEATS.pix, BEATS.pix + 0.5));
      pixRig.position.lerpVectors(PIX_HOME, PIX_UP, wake).sub(cab.position); pixRig.position.y += wake * 0.02 * Math.sin(t * 2.4);
      const faceFlame = ease(span(t, BEATS.pix + 0.45, BEATS.pix + 0.9)), backToUs = ease(span(t, BEATS.holo - 0.2, BEATS.holo + 0.3));
      pixRig.rotation.set(lerp(0.5, 0, wake), lerp(lerp(0.15, 0.95, faceFlame), 0.1, backToUs), 0.06 * Math.sin(t * 1.7) * wake);
      eyes.forEach((e) => { (e.material as THREE.SpriteMaterial).opacity = wake * (0.85 + 0.15 * Math.sin(t * 7)); });
      pixLight.intensity = wake * 0.7;
      const scan = span(t, BEATS.explain - 0.2, BEATS.holo) * (1 - span(t, BEATS.holo - 0.15, BEATS.holo + 0.1));
      scanMat.opacity = Math.sin(scan * Math.PI) * 0.16; scanRig.rotation.y = Math.sin(t * 3) * 0.25;
      // Hologram: opens from PIX, the chamber turns, the gravity comparison and the wordmark appear.
      const open = ease(span(t, BEATS.holo, BEATS.holo + 0.6));
      holo.group.visible = open > 0; holo.group.scale.setScalar((m ? 0.8 : 1) * (0.3 + 0.7 * open)); holo.group.quaternion.copy(camera.quaternion);
      holo.panelMat.uniforms.uOpen!.value = open; holo.panelMat.uniforms.uTime!.value = t; holo.cyan.opacity = open;
      holo.chamber.rotation.y = t * 0.9; holo.flame.update(t, 0);
      holo.sideMat.opacity = ease(span(t, BEATS.holo + 0.35, BEATS.holo + 0.8)) * 0.9; holo.wordMat.opacity = ease(span(t, BEATS.title - 0.2, BEATS.title + 0.3));
      if (t < BEATS.pix) cabPath(t, camera); else if (t < BEATS.holo) pixPath(t, camera); else holoPath(t, camera);
      renderer.toneMappingExposure = lerp(1.0, 0.92, open); pixLight.intensity *= 1 - 0.8 * open; // the hologram leads the last shot; PIX steps back
    }
    if (bloom) bloom.strength = inside ? 0.4 : 0.18;
    if (composer) composer.render(); else renderer.render(scene, camera);
    if (t >= FILM_SECONDS && o.freezeAt === undefined) { o.onEnd(); return; }
    frame = requestAnimationFrame(render);
  };
  frame = requestAnimationFrame(render);
  return {
    resize: size,
    setSound(on) { if (on) audio.on(); else audio.off(); },
    stop() {
      if (stopped) return; stopped = true; cancelAnimationFrame(frame); audio.stop(); mixer.stopAllAction();
      scene.traverse((x) => {
        const mesh = x as THREE.Mesh; mesh.geometry?.dispose();
        const mats = mesh.material ? (Array.isArray(mesh.material) ? mesh.material : [mesh.material]) : [];
        mats.forEach((mm) => { for (const v of Object.values(mm)) if (v instanceof THREE.Texture) v.dispose(); mm.dispose(); });
      });
      flame.dispose(); holo.flame.dispose(); env.dispose(); pmrem.dispose(); composer?.dispose(); renderer.dispose();
      renderer.forceContextLoss(); // the observatory gets the GPU back immediately
    }
  };
}
