// Artistic training-bay environment around the procedural apparatus: a procedural hero workstation in front of a
// panoramic observation window (illustrative Earth), dark panelled architecture, and Meshy props plus an animated astronaut.
// Pure decoration — nothing here is NASA hardware, defines a mount or affects game state.
// Scale is consistent: 1 scene unit = 10 cm, so the 17 cm duct sits on a 0.9 m bench beside a 1.75 m astronaut.
// Lights are added at construction (a later light-count change would recompile every apparatus shader); geometry and
// models arrive only after start(), i.e. after the apparatus has drawn its first frame. Any failure leaves the bench as it was.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/** `tint` darkens a model's base colour (0–1) so it sits back from the apparatus; `footprint` scales width and depth only. */
type Placement = { url: string; height: number; position: [number, number, number]; rotationY?: number; tint?: number; footprint?: number; detail: 'full' | 'lite' };
type Clip = 'idle' | 'look' | 'wave' | 'cheer';
/** Astronaut acknowledgement: clips, plus a procedural head nod. */
export type EnvCue = 'look' | 'nod' | 'wave' | 'cheer';
/** `tint` multiplies the suit colour (the original white suit is calmed with a cool grey; a textured suit can pass white). */
export type EnvOptions = { manifest: Placement[]; astronaut: { url: string; clips: Record<Clip, string>; tint?: string } | null; lite: boolean };
export type EnvProgress = { loaded: number; total: number };

/** Floor (y) of the bay: the bench top sits just under the apparatus base plate. */
export const BENCH_TOP = -0.68, BENCH_HEIGHT = 9, FLOOR = BENCH_TOP - BENCH_HEIGHT;
/** Window wall (front face) and the panoramic opening, centred behind the workstation so it backs the hero shot. */
const WALL_Z = -6.5, WIN = { w: 36, h: 16, y0: -2.2, r: 2.2 }; // sill sits below the bench line: the planet backs the work view
/** Procedural workstation top; the apparatus mat covers it. */
export const DESK = { w: 20, d: 8, z: -0.5 };

const loader = new GLTFLoader();
const cache = new Map<string, ReturnType<typeof loader.loadAsync>>();
/** One fetch per model; repeats are clones sharing geometry and textures. */
const load = async (url: string) => {
  if (!cache.has(url)) cache.set(url, loader.loadAsync(url));
  return cache.get(url)!.then((g) => ({ ...g, scene: g.scene.clone() }), () => null);
};

/** Scale a model uniformly to a target height (scene units) and stand it on y = 0 of its own group. */
function fit(obj: THREE.Object3D, height: number) {
  const box = new THREE.Box3().setFromObject(obj), size = box.getSize(new THREE.Vector3());
  obj.scale.multiplyScalar(height / Math.max(size.y, 1e-6));
  box.setFromObject(obj);
  const c = box.getCenter(new THREE.Vector3());
  obj.position.x -= c.x; obj.position.z -= c.z; obj.position.y -= box.min.y;
  return obj;
}

const canvasTexture = (w: number, h: number, paint: (x: CanvasRenderingContext2D) => void) => {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h; paint(cv.getContext('2d')!);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
};
/** Deterministic pseudo-random, so the illustrative planet and panels look the same on every load. */
const rng = (seed: number) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

/** Clearly illustrative planet: painted, not imagery. Day side towards the upper left; layered atmosphere rim. */
function paintEarth(x: CanvasRenderingContext2D, clouds: boolean) {
  const R = 470, c = 512, rand = rng(clouds ? 7 : 3);
  x.save(); x.beginPath(); x.arc(c, c, R, 0, Math.PI * 2); x.clip(); x.filter = 'blur(5px)';
  if (!clouds) {
    const sea = x.createRadialGradient(c - 170, c - 190, 30, c, c, R); sea.addColorStop(0, '#5fb0e8'); sea.addColorStop(0.5, '#1f5fa6'); sea.addColorStop(1, '#0a1f45');
    x.fillStyle = sea; x.fillRect(0, 0, 1024, 1024);
    for (let i = 0; i < 30; i++) {
      const px = 120 + rand() * 780, py = 120 + rand() * 780, s = 30 + rand() * 100;
      x.fillStyle = rand() > 0.45 ? 'rgba(86,132,80,.6)' : 'rgba(170,140,96,.5)';
      x.beginPath(); for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2, rr = s * (0.55 + rand() * 0.7); x.lineTo(px + Math.cos(a) * rr, py + Math.sin(a) * rr * 0.7); } x.fill();
    }
  } else {
    x.strokeStyle = 'rgba(255,255,255,.42)'; x.lineCap = 'round';
    for (let i = 0; i < 140; i++) { x.lineWidth = 3 + rand() * 12; const px = rand() * 1024, py = rand() * 1024, w = 40 + rand() * 180; x.beginPath(); x.moveTo(px, py); x.bezierCurveTo(px + w * 0.3, py - 14, px + w * 0.7, py + 14, px + w, py); x.stroke(); }
  }
  const night = x.createLinearGradient(c - R * 0.3, c - R * 0.5, c + R, c + R * 0.7); night.addColorStop(0, 'rgba(2,5,12,0)'); night.addColorStop(0.5, 'rgba(2,5,12,.5)'); night.addColorStop(1, 'rgba(2,5,12,.97)');
  x.filter = 'none'; x.fillStyle = night; x.fillRect(0, 0, 1024, 1024); x.restore();
  if (!clouds) for (const [w, a] of [[26, 0.12], [12, 0.3], [5, 0.55]] as const) { x.lineWidth = w; x.strokeStyle = `rgba(110,185,255,${a})`; x.beginPath(); x.arc(c, c, R + w / 2, Math.PI * 0.7, Math.PI * 1.8); x.stroke(); }
}

/** Wall display: abstract scrolling traces over a grid, with no numbers or readings (nothing here is data). */
function paintDisplay(x: CanvasRenderingContext2D, seed: number) {
  const rand = rng(seed);
  x.fillStyle = '#04101a'; x.fillRect(0, 0, 512, 256);
  x.strokeStyle = 'rgba(115,187,217,.12)'; x.lineWidth = 1;
  for (let i = 0; i <= 512; i += 32) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 256); x.stroke(); }
  for (let j = 0; j <= 256; j += 32) { x.beginPath(); x.moveTo(0, j); x.lineTo(512, j); x.stroke(); }
  ['rgba(127,214,209,.9)', 'rgba(115,187,217,.7)', 'rgba(226,176,74,.75)'].forEach((col, k) => {
    x.strokeStyle = col; x.lineWidth = 2; x.beginPath();
    const cycles = 2 + Math.floor(rand() * 4), amp = 16 + rand() * 22, base = 56 + k * 66;
    for (let i = 0; i <= 512; i += 4) x.lineTo(i, base + Math.sin((i / 512) * cycles * Math.PI * 2) * amp * (0.6 + 0.4 * Math.sin((i / 512) * Math.PI * 2 + k))); // whole cycles: tiles seamlessly
    x.stroke();
  });
  x.fillStyle = 'rgba(159,216,239,.6)'; x.font = '600 15px monospace'; x.fillText('TRAINING BAY · ILLUSTRATIVE', 14, 244);
}

export function addEnvironment(scene: THREE.Scene, renderer: THREE.WebGLRenderer, camera: THREE.Camera, opts: EnvOptions & { onChange: () => void; onProgress: (p: EnvProgress) => void }) {
  const root = new THREE.Group(); root.name = 'environment'; scene.add(root);
  // Lights first, and few of them (each one costs every lit shader). Blue earthlight from the window, which also rims the
  // astronaut; a cool overhead fill on the full tier only. Glow strips plus bloom stand in for practical lights.
  const earthlight = new THREE.PointLight('#7fb2ff', 110, 34, 1.3); earthlight.position.set(-13, 5, WALL_Z + 1.5); root.add(earthlight);
  if (!opts.lite) { const fill = new THREE.SpotLight('#bcd8ff', 120, 80, 0.7, 0.7, 1.4); fill.position.set(4, 28, 14); fill.target.position.set(0, FLOOR, -2); root.add(fill, fill.target); }

  const mixerState = { mixer: null as THREE.AnimationMixer | null, current: null as THREE.AnimationAction | null };
  const actions = new Map<Clip, THREE.AnimationAction>();
  let head: THREE.Bone | null = null, holderAstro: THREE.Group | null = null, nod = 0, disposed = false, started = false;
  const pulses: { mat: THREE.MeshBasicMaterial; phase: number; base: number; amp: number; speed: number }[] = [];
  const screens: THREE.Texture[] = [];
  let clouds: THREE.Mesh | null = null;
  // Illustrative inspection arm (procedural, jointed in Three.js): it points its lamp at whatever the confirmed state
  // makes relevant (a flagged part, a chosen mount) and otherwise idles in a slow scan. It never touches or decides anything.
  const arm = { root: null as THREE.Group | null, yaw: null as THREE.Group | null, shoulder: null as THREE.Group | null, elbow: null as THREE.Group | null, wrist: null as THREE.Group | null, aim: null as THREE.Vector3 | null, lamp: null as THREE.MeshBasicMaterial | null };

  const manifest = opts.manifest.filter((p) => !opts.lite || p.detail === 'lite');
  const total = manifest.length + (opts.astronaut ? 1 : 0);
  let loaded = 0;
  const done = () => { loaded++; opts.onProgress({ loaded, total }); opts.onChange(); };

  // Soft contact shadows (no shadow maps for the room): ground props that would otherwise float.
  const blob = canvasTexture(128, 128, (x) => { const g = x.createRadialGradient(64, 64, 8, 64, 64, 64); g.addColorStop(0, 'rgba(0,0,0,.75)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); });
  const shadowAt = (parent: THREE.Object3D, w: number, d: number, x = 0, y = 0.03, z = 0) => {
    const s = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ map: blob, transparent: true, depthWrite: false }));
    s.rotation.x = -Math.PI / 2; s.position.set(x, y, z); parent.add(s);
  };
  const groundModel = (holder: THREE.Group, model: THREE.Object3D) => { const s = new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3()); shadowAt(holder, s.x * 1.4, s.z * 1.4); };
  /** Compile off the critical path where the driver allows it, then show. */
  const reveal = async (obj: THREE.Object3D) => { await renderer.compileAsync(obj, camera, scene).catch(() => undefined); if (!disposed) root.add(obj); };
  /** Light-source material; `hdr` > 1 pushes it over the bloom threshold, so only real light sources glow. */
  const glow = (color: string, base: number, amp = 0, speed = 0.6, phase = 0, hdr = 4.5) => {
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: base }); mat.color.multiplyScalar(hdr);
    if (amp) pulses.push({ mat, phase, base, amp, speed });
    return mat;
  };

  function buildStructure() {
    const graphite = new THREE.MeshStandardMaterial({ color: '#0d141d', metalness: 0.55, roughness: 0.38 });
    const panelMat = new THREE.MeshStandardMaterial({ color: '#121c28', metalness: 0.5, roughness: 0.45 });
    const brushed = new THREE.MeshStandardMaterial({ color: '#5c6875', metalness: 0.9, roughness: 0.42, envMapIntensity: 0.5 }); // satin: no hot specular lines

    // Glossy dark floor with plating; it stops at the window wall so the window looks out on space.
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(120, 70), new THREE.MeshStandardMaterial({ color: '#070c13', metalness: 0.7, roughness: 0.22 }));
    floor.rotation.x = -Math.PI / 2; floor.position.set(0, FLOOR, WALL_Z + 35); root.add(floor);
    const plates = new THREE.GridHelper(120, 40, '#122030', '#0e1824'); plates.position.set(0, FLOOR + 0.02, WALL_Z + 35); plates.scale.z = 70 / 120; root.add(plates);

    // Window wall: one extruded panel with a genuinely open panoramic opening (rounded corners).
    const { w, h, y0, r } = WIN, x0 = -w / 2;
    const wall = new THREE.Shape(); wall.moveTo(-60, FLOOR); wall.lineTo(60, FLOOR); wall.lineTo(60, FLOOR + 40); wall.lineTo(-60, FLOOR + 40); wall.lineTo(-60, FLOOR);
    const opening = new THREE.Path();
    opening.moveTo(x0 + r, y0); opening.lineTo(x0 + w - r, y0); opening.quadraticCurveTo(x0 + w, y0, x0 + w, y0 + r); opening.lineTo(x0 + w, y0 + h - r);
    opening.quadraticCurveTo(x0 + w, y0 + h, x0 + w - r, y0 + h); opening.lineTo(x0 + r, y0 + h); opening.quadraticCurveTo(x0, y0 + h, x0, y0 + h - r); opening.lineTo(x0, y0 + r); opening.quadraticCurveTo(x0, y0, x0 + r, y0);
    wall.holes.push(opening);
    const wallMesh = new THREE.Mesh(new THREE.ExtrudeGeometry(wall, { depth: 1.4, bevelEnabled: false, curveSegments: 12 }), graphite);
    wallMesh.position.z = WALL_Z - 1.4; root.add(wallMesh);
    // Frame: a bevelled brushed-metal surround, a fine light line, and two mullions (three panes).
    const outline = opening.getPoints(12), grow = (k: number, ky: number) => outline.map((p) => new THREE.Vector2(p.x * k, (p.y - y0 - h / 2) * ky + y0 + h / 2));
    const frameShape = new THREE.Shape(grow(1.035, 1.08)); frameShape.holes.push(new THREE.Path(outline));
    const frame = new THREE.Mesh(new THREE.ExtrudeGeometry(frameShape, { depth: 0.5, bevelEnabled: true, bevelThickness: 0.25, bevelSize: 0.2, bevelSegments: 3 }), brushed);
    frame.position.z = WALL_Z - 0.1; root.add(frame);
    const line = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(grow(1.012, 1.03).map((p) => new THREE.Vector3(p.x, p.y, WALL_Z + 0.7))), new THREE.LineBasicMaterial({ color: '#7fd6d1' }));
    root.add(line);
    for (const mx of [-w / 6, w / 6]) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.5, h, 0.6), brushed); m.position.set(mx, y0 + h / 2, WALL_Z - 0.6); root.add(m); }
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshPhysicalMaterial({ color: '#a8d8ff', transparent: true, opacity: 0.05, roughness: 0.04, metalness: 0, depthWrite: false }));
    glass.position.set(0, y0 + h / 2, WALL_Z - 0.9); root.add(glass);

    // Panelling either side of and above the window, with pilasters, light lines and status lights.
    const rand = rng(21), panel = new THREE.BoxGeometry(1, 1, 0.3);
    const addPanel = (cx: number, cy: number, pw: number, ph: number) => {
      const p = new THREE.Mesh(panel, rand() > 0.7 ? graphite : panelMat); p.scale.set(pw - 0.25, ph - 0.25, 1); p.position.set(cx, cy, WALL_Z + 0.15); root.add(p);
    };
    for (const side of [-1, 1]) for (let i = 0; i < 4; i++) for (let j = 0; j < 6; j++) addPanel(side * (w / 2 + 4.6 + i * 5), FLOOR + 3 + j * 6, 5, 6);
    for (let i = 0; i < 8; i++) addPanel(x0 + 2.25 + i * 4.5, y0 + h + 3.4, 4.5, 4);
    for (const side of [-1, 1]) {
      const px = side * (w / 2 + 1.4);
      const pil = new THREE.Mesh(new THREE.BoxGeometry(1.8, 40, 1.4), graphite); pil.position.set(px, FLOOR + 20, WALL_Z + 0.4); root.add(pil);
      const s = new THREE.Mesh(new THREE.BoxGeometry(0.12, 24, 0.1), glow('#73bbd9', 0.75, 0.2, 0.35, side)); s.position.set(px, FLOOR + 17, WALL_Z + 1.15); root.add(s);
      ['#7fd6d1', '#e2b04a', '#73bbd9'].forEach((col, k) => { const l = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.28, 0.1), glow(col, 0.5, 0.45, 0.9, side * 2 + k * 1.7)); l.position.set(px, FLOOR + 4 + k * 0.5, WALL_Z + 1.15); root.add(l); });
    }
    const sill = new THREE.Mesh(new THREE.BoxGeometry(w + 8, 0.18, 0.12), glow('#73bbd9', 0.5, 0, 0.6, 0, 3)); sill.position.set(0, FLOOR + 0.6, WALL_Z + 0.4); root.add(sill);
    const header = new THREE.Mesh(new THREE.BoxGeometry(w + 2, 0.12, 0.1), glow('#7fd6d1', 0.5, 0.15, 0.25, 0, 2.6)); header.position.set(0, y0 + h + 1.1, WALL_Z + 0.75); root.add(header);

    // Wall displays (abstract, labelled illustrative): slow scrolling traces either side of the window.
    for (const [i, side] of [[0, -1], [1, 1]] as const) {
      const tex = canvasTexture(512, 256, (x) => paintDisplay(x, 5 + i)); tex.wrapS = THREE.RepeatWrapping; screens.push(tex);
      const scr = new THREE.Mesh(new THREE.PlaneGeometry(8, 4), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
      scr.position.set(side * (w / 2 + 9.6), FLOOR + 16, WALL_Z + 0.42); root.add(scr);
      const bezel = new THREE.Mesh(new THREE.BoxGeometry(8.6, 4.6, 0.2), graphite); bezel.position.set(scr.position.x, scr.position.y, WALL_Z + 0.3); root.add(bezel);
    }

    // Ceiling with long soft light panels (seen in the opening crane shot).
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(120, 70), new THREE.MeshStandardMaterial({ color: '#0a1018', metalness: 0.4, roughness: 0.6 }));
    ceil.rotation.x = Math.PI / 2; ceil.position.set(0, FLOOR + 40, WALL_Z + 35); root.add(ceil);
    for (const x of [-14, 0, 14]) { const l = new THREE.Mesh(new THREE.PlaneGeometry(2, 30), glow('#cfe6ff', 0.5)); l.rotation.x = Math.PI / 2; l.position.set(x, FLOOR + 39.9, WALL_Z + 20); root.add(l); }

    // The procedural hero workstation: graphite slab, brushed front trim, cyan under-glow, recessed panelled body.
    const topY = BENCH_TOP - 0.02, front = DESK.z + DESK.d / 2;
    const slab = new THREE.Mesh(new THREE.BoxGeometry(DESK.w, 0.8, DESK.d), graphite); slab.position.set(0, topY - 0.4, DESK.z); root.add(slab);
    const trim = new THREE.Mesh(new THREE.BoxGeometry(DESK.w + 0.1, 0.22, 0.3), brushed); trim.position.set(0, topY - 0.12, front); root.add(trim);
    const under = new THREE.Mesh(new THREE.BoxGeometry(DESK.w - 1, 0.08, 0.08), glow('#73bbd9', 0.7, 0.08, 0.3, 0, 3.2)); under.position.set(0, topY - 0.86, front - 0.4); root.add(under);
    const bodyH = BENCH_HEIGHT - 1.6;
    const body = new THREE.Mesh(new THREE.BoxGeometry(DESK.w - 2, bodyH, DESK.d - 1.6), panelMat); body.position.set(0, FLOOR + bodyH / 2, DESK.z - 0.4); root.add(body);
    for (const x of [-6, 0, 6]) { const seam = new THREE.Mesh(new THREE.BoxGeometry(0.06, bodyH - 0.8, 0.05), graphite); seam.position.set(x, FLOOR + bodyH / 2, front - 1.18); root.add(seam); }
    shadowAt(root, DESK.w * 1.2, DESK.d * 1.5, 0, FLOOR + 0.03, DESK.z);

    buildArm();

    // Space beyond the window: stars and an illustrative planet, unlit and unfogged.
    const sr = rng(11), pts: number[] = [];
    for (let i = 0; i < 1400; i++) pts.push((sr() - 0.5) * 520, FLOOR + (sr() - 0.25) * 300, -70 - sr() * 160);
    root.add(new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)), new THREE.PointsMaterial({ color: '#e6eeff', size: 0.8, sizeAttenuation: true, fog: false })));
    // A huge, distant planet whose upper limb arcs across the lower part of the window (the rest is starfield).
    const earthAt = new THREE.Vector3(60, -300, -265);
    const disc = (withClouds: boolean) => new THREE.Mesh(new THREE.PlaneGeometry(600, 600), new THREE.MeshBasicMaterial({ map: canvasTexture(1024, 1024, (x) => paintEarth(x, withClouds)), transparent: true, depthWrite: false, fog: false }));
    const earth = disc(false); clouds = disc(true);
    earth.position.copy(earthAt); clouds.position.copy(earthAt).setZ(earthAt.z + 0.5); root.add(earth, clouds);
  }

  const ARM = { base: new THREE.Vector3(2.85, BENCH_TOP, -0.5), // outside the chamber's open right side, reaching between its pillars
     shoulderH: 0.42, upper: 1.15, fore: 1.05, head: 0.26 };
  function buildArm() {
    const ti = new THREE.MeshStandardMaterial({ color: '#8b97a4', metalness: 0.9, roughness: 0.34 });
    const gr = new THREE.MeshStandardMaterial({ color: '#18212b', metalness: 0.6, roughness: 0.4 });
    const g = arm.root = new THREE.Group(); g.position.copy(ARM.base); root.add(g);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.34, 0.1, 32), gr); base.position.y = 0.05; g.add(base);
    const yaw = arm.yaw = new THREE.Group(); yaw.position.y = 0.1; g.add(yaw);
    const turret = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.19, ARM.shoulderH - 0.1, 24), ti); turret.position.y = (ARM.shoulderH - 0.1) / 2; yaw.add(turret);
    const led = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.02), glow('#e2b04a', 0.6, 0.4, 1.1, 0.5)); led.position.set(0, 0.12, 0.17); yaw.add(led);
    const joint = (r: number) => new THREE.Mesh(new THREE.SphereGeometry(r, 20, 16), gr);
    const seg = (len: number, r: number) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.8, r, len, 20), ti); m.rotation.z = -Math.PI / 2; m.position.x = len / 2; return m; };
    const shoulder = arm.shoulder = new THREE.Group(); shoulder.position.y = ARM.shoulderH - 0.1; yaw.add(shoulder); shoulder.add(joint(0.12), seg(ARM.upper, 0.065));
    const elbow = arm.elbow = new THREE.Group(); elbow.position.x = ARM.upper; shoulder.add(elbow); elbow.add(joint(0.09), seg(ARM.fore, 0.05));
    const wrist = arm.wrist = new THREE.Group(); wrist.position.x = ARM.fore; elbow.add(wrist); wrist.add(joint(0.065));
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.12, 0.13), gr); head.position.x = 0.1; wrist.add(head);
    arm.lamp = glow('#9fe6ff', 0.85, 0.15, 0.8, 0, 3);
    const lamp = new THREE.Mesh(new THREE.CircleGeometry(0.045, 20), arm.lamp); lamp.rotation.y = Math.PI / 2; lamp.position.x = ARM.head - 0.04; wrist.add(lamp);
    poseArm(new THREE.Vector3(0.2, 0.9, 0.4), 1);
  }
  /** Two-bone IK in the arm's vertical plane; `k` blends towards the solution (1 = snap). */
  const tmp = new THREE.Vector3();
  function poseArm(target: THREE.Vector3, k: number) {
    if (!arm.yaw || !arm.shoulder || !arm.elbow || !arm.wrist) return;
    tmp.copy(target).sub(ARM.base);
    const yaw = Math.atan2(-tmp.z, tmp.x), horiz = Math.hypot(tmp.x, tmp.z) - ARM.head, vert = tmp.y - ARM.shoulderH;
    const d = Math.min(Math.hypot(horiz, vert), ARM.upper + ARM.fore - 1e-3), a = Math.atan2(vert, horiz);
    const elbowAng = Math.acos(THREE.MathUtils.clamp((ARM.upper ** 2 + ARM.fore ** 2 - d * d) / (2 * ARM.upper * ARM.fore), -1, 1));
    const sh = a + Math.acos(THREE.MathUtils.clamp((ARM.upper ** 2 + d * d - ARM.fore ** 2) / (2 * ARM.upper * d), -1, 1));
    const el = -(Math.PI - elbowAng), wr = a - sh - el; // keep the lamp looking along the line to the target
    const lerp = (o: THREE.Object3D, axis: 'y' | 'z', v: number) => { o.rotation[axis] += (v - o.rotation[axis]) * k; };
    lerp(arm.yaw, 'y', yaw); lerp(arm.shoulder, 'z', sh); lerp(arm.elbow, 'z', el); lerp(arm.wrist, 'z', wr);
  }

  const place = async (p: Placement) => {
    const gltf = await load(p.url);
    if (!gltf || disposed) return;
    const holder = new THREE.Group();
    holder.add(fit(gltf.scene, p.height)); groundModel(holder, gltf.scene);
    holder.position.set(...p.position); holder.rotation.y = p.rotationY ?? 0;
    if (p.footprint) holder.scale.set(p.footprint, 1, p.footprint);
    if (p.tint !== undefined) holder.traverse((o) => {
      if (!(o instanceof THREE.Mesh) || !(o.material instanceof THREE.MeshStandardMaterial)) return;
      const m = o.material.clone(); m.color.multiplyScalar(p.tint!); m.envMapIntensity = p.tint!; // reflections too, or glass still glares
      o.material = m;
    });
    await reveal(holder);
  };
  const loadAstronaut = async () => {
    if (!opts.astronaut) return;
    const base = await loader.loadAsync(opts.astronaut.url).catch(() => null); // uncached: clone() would unbind the skeleton
    if (!base || disposed) return;
    const holder = holderAstro = new THREE.Group();
    holder.add(fit(base.scene, 17.5)); groundModel(holder, base.scene);
    holder.position.set(-15, FLOOR, -3); holder.rotation.y = 1.37; // before the window, rim-lit against the planet, turned to the apparatus
    // Art direction without regeneration: a cool satin suit instead of flat white, so it reads against the window light.
    base.scene.traverse((o) => {
      if (!(o instanceof THREE.Mesh) || !(o.material instanceof THREE.MeshStandardMaterial)) return;
      const m = o.material.clone(); m.color.multiply(new THREE.Color(opts.astronaut!.tint ?? '#aab8ca')); m.roughness = Math.min(1, m.roughness * 0.75 + 0.15); m.metalness = Math.max(m.metalness, 0.12); m.envMapIntensity = 0.9;
      o.material = m;
    });
    const mixer = mixerState.mixer = new THREE.AnimationMixer(base.scene);
    for (const [kind, name] of Object.entries(opts.astronaut.clips) as [Clip, string][]) {
      const clip = THREE.AnimationClip.findByName(base.animations, name);
      if (clip) actions.set(kind, mixer.clipAction(clip));
    }
    head = (base.scene.getObjectByName('Head') as THREE.Bone | undefined) ?? null;
    const idle = actions.get('idle');
    if (idle) { idle.play(); mixerState.current = idle; mixer.update(1.2); } // a natural idle frame even if nothing ever animates (reduced motion)
    await reveal(holder);
  };
  /** Every model counts towards progress, loaded or not, so the status never hangs on a failed fetch. */
  const counted = (f: () => Promise<void>) => async () => { try { await f(); } finally { if (!disposed) done(); } };

  // Gentle, non-repeating head motion layered on whatever clip plays: slow glances plus an optional nod.
  const qParent = new THREE.Quaternion(), qDelta = new THREE.Quaternion(), qPitch = new THREE.Quaternion(), right = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  function headMotion(t: number, dt: number) {
    if (!head?.parent || !holderAstro) return;
    const calm = mixerState.current === actions.get('idle') ? 1 : 0.25;
    const yaw = calm * (0.2 * Math.sin(t * 0.31) + 0.08 * Math.sin(t * 0.83 + 1.3)) - 0.12;
    let pitch = calm * 0.05 * Math.sin(t * 0.47) + 0.06; // a slight downward look at the bench
    if (nod > 0) { nod = Math.max(0, nod - dt / 1.1); pitch += 0.22 * Math.sin((1 - nod) * Math.PI * 2) * Math.sin((1 - nod) * Math.PI); }
    right.set(Math.cos(holderAstro.rotation.y), 0, -Math.sin(holderAstro.rotation.y));
    qDelta.setFromAxisAngle(up, yaw).multiply(qPitch.setFromAxisAngle(right, pitch));
    head.parent.getWorldQuaternion(qParent);
    head.quaternion.premultiply(qParent.clone().invert().multiply(qDelta).multiply(qParent));
  }

  return {
    /** Begin building and loading; call once the apparatus has drawn its first frame. */
    start() {
      if (started || disposed) return;
      started = true;
      buildStructure(); opts.onChange();
      opts.onProgress({ loaded, total });
      void Promise.all([...manifest.map((p) => counted(() => place(p))()), ...(opts.astronaut ? [counted(loadAstronaut)()] : [])]);
    },
    /** Advance ambient motion; returns true while something is moving. Nothing moves under reduced motion. */
    update(dt: number, motion: boolean, t: number) {
      if (!motion || !started) return false;
      for (const p of pulses) p.mat.opacity = p.base + p.amp * (0.5 + 0.5 * Math.sin(t * p.speed + p.phase)) ** 4;
      for (const [i, s] of screens.entries()) s.offset.x = (t * (0.02 + i * 0.01)) % 1;
      if (clouds) clouds.rotation.z = t * 0.003;
      // The arm settles on a confirmed point of interest, or scans slowly above the duct when there is none.
      poseArm(arm.aim ?? tmp.set(0.25 + 0.55 * Math.sin(t * 0.21), 0.95 + 0.12 * Math.sin(t * 0.37), 0.35 * Math.cos(t * 0.17)), 0.06);
      if (mixerState.mixer) { mixerState.mixer.update(dt); headMotion(t, dt); }
      return true;
    },
    /** Point the inspection arm at a confirmed point of interest (or null to idle). Snaps when nothing animates. */
    aim(p: THREE.Vector3 | null, motion: boolean) {
      arm.aim = p ? (arm.aim ?? new THREE.Vector3()).copy(p) : null;
      if (!motion && started) poseArm(arm.aim ?? new THREE.Vector3(0.2, 0.9, 0.4), 1);
      opts.onChange();
    },
    /** Presentational acknowledgement of an outcome the server already confirmed; a no-op until the astronaut loads. */
    react(cue: EnvCue) {
      const { mixer } = mixerState, idle = actions.get('idle');
      if (!mixer) return;
      if (cue === 'nod') { nod = 1; opts.onChange(); return; }
      const next = actions.get(cue);
      if (!next) return;
      next.reset(); next.setLoop(THREE.LoopOnce, 1); next.clampWhenFinished = false; next.enabled = true; next.play();
      if (mixerState.current && mixerState.current !== next) mixerState.current.crossFadeTo(next, 0.45, true);
      mixerState.current = next;
      if (idle) {
        const back = (e: { action: THREE.AnimationAction }) => {
          if (e.action !== next) return;
          mixer.removeEventListener('finished', back);
          if (mixerState.current !== next) return; // a newer cue took over
          idle.reset().play(); next.crossFadeTo(idle, 0.6, true); mixerState.current = idle;
        };
        mixer.addEventListener('finished', back);
      }
      opts.onChange();
    },
    dispose() {
      disposed = true; mixerState.mixer?.stopAllAction();
      root.traverse((o) => {
        if (!(o instanceof THREE.Mesh || o instanceof THREE.Points || o instanceof THREE.Line)) return;
        o.geometry.dispose();
        (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => { Object.values(m).forEach((v) => { if (v instanceof THREE.Texture) v.dispose(); }); m.dispose(); });
      });
      scene.remove(root);
    }
  };
}
