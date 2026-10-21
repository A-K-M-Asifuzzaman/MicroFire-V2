// Cinematic 3D training bench: procedural geometry only (no Meshy mesh defines a mount). Units: 1 = 10 cm, so the
// flow duct is the sourced 1.7 × 0.76 × 0.76 (17 × 7.6 × 7.6 cm). Every other position/size is schematic.
// The scene is a VIEW: it shows confirmed state, previews intents, and reports clicks/drops. It never decides progress.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import type { PartSpec } from '../contract';
import { addEnvironment, DESK, type EnvCue, type EnvOptions, type EnvProgress } from './bench-environment';

export type BenchState = {
  installed: Record<string, { anchorId: string; orientation: 'correct' | 'reversed' }>;
  flagged: string[];
  pendingRepair: string | null;
  qualified: boolean;
  selectedPart: string | null;
  selectedAnchor: string | null;
  orientation: 'correct' | 'reversed';
  /** A part is selected and not fitted, so mounts are offered. */
  choosing: boolean;
  /** Mount of an install request awaiting the server. */
  pendingTarget: string | null;
  focus: 'overview' | 'fan' | 'wide';
};
export type BenchCallbacks = {
  onSelectPart(partId: string): void;
  onSelectAnchor(anchorId: string): void;
  onDrop(partId: string, anchorId: string): void;
  onHover(h: { x: number; y: number; text: string } | null): void;
  onLost(): void;
  /** The apparatus has drawn its first frame (the scene is visible, not just constructed). */
  onFirstFrame?(): void;
  /** Lab scenery progress: real model counts for the tier in use (`lite` on small screens and software renderers). */
  onEnvProgress?(p: EnvProgress, lite: boolean): void;
  /** No lab scenery on this device: software rasterisers spend ~0.5 s compiling each scenery shader and would block the page. */
  onEnvOff?(): void;
};
/** Camera compositions: establishing bay shot, assembly work view, fault inspection, qualified wide view. */
export type BenchView = 'establish' | 'work' | 'inspect' | 'wide';
export type BenchApi = { update(s: BenchState): void; faultMoment(): void; react(cue: EnvCue): void; view(v: BenchView): void; resize(): void; setMotion(on: boolean): void; stop(): void };
/** Artistic environment (Meshy). Absent → the bench renders exactly as before. */
export type BenchEnvironment = EnvOptions | null;

const L = 1.7, H = 0.76, hx = L / 2, hy = H / 2;
export const ANCHORS3D: Record<string, [number, number, number]> = {
  'msg-work-volume-mount': [0, -hy - 0.24, 0], 'duct-inlet': [-hx - 0.16, 0, 0], 'duct-honeycomb-slot': [-hx + 0.24, 0, 0],
  'test-section-n2-port': [-0.18, -hy, 0], 'top-mounting-rail': [0.04, hy, 0], 'front-window-igniter-lever': [0.34, -0.14, hy + 0.06],
  'top-window': [0.46, hy + 0.42, 0], 'front-window-mirror': [0.58, -hy - 0.18, hy + 0.26], 'downstream-top-back-corner': [hx - 0.14, hy - 0.12, -hy + 0.12],
  'duct-exit': [hx + 0.06, 0, 0]
};
const C = { cyan: new THREE.Color('#73bbd9'), amber: new THREE.Color('#e2b04a'), flame: new THREE.Color('#ff8738'), teal: new THREE.Color('#7fd6d1') };

function mats() {
  return {
    metal: new THREE.MeshStandardMaterial({ color: '#c3d0dc', metalness: 0.85, roughness: 0.25 }),
    dark: new THREE.MeshStandardMaterial({ color: '#22344a', metalness: 0.55, roughness: 0.42 }),
    copper: new THREE.MeshStandardMaterial({ color: '#e08a48', metalness: 0.8, roughness: 0.28 }),
    sample: new THREE.MeshStandardMaterial({ color: '#dfe9ef', metalness: 0, roughness: 0.15, transparent: true, opacity: 0.85 }),
    glass: new THREE.MeshPhysicalMaterial({ color: '#9fd8ef', metalness: 0, roughness: 0.08, transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide }),
    cone: new THREE.MeshBasicMaterial({ color: C.cyan, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide }),
    accent: new THREE.MeshStandardMaterial({ color: '#0b111a', emissive: C.cyan, emissiveIntensity: 1.4 }),
    coil: new THREE.MeshStandardMaterial({ color: '#3a2214', emissive: C.flame, emissiveIntensity: 0.6, metalness: 0.4, roughness: 0.5 })
  };
}
type Mats = ReturnType<typeof mats>;

function arrow(m: Mats, len = 0.36) {
  const g = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, len, 12), m.accent); shaft.rotation.z = -Math.PI / 2; shaft.position.x = len / 2;
  const head = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.11, 16), m.accent); head.rotation.z = -Math.PI / 2; head.position.x = len + 0.04;
  g.add(shaft, head); return g;
}
function viewCone(m: Mats, length: number, radius: number) {
  const cone = new THREE.Mesh(new THREE.ConeGeometry(radius, length, 32, 1, true), m.cone.clone());
  cone.rotation.z = Math.PI / 2; cone.position.x = -length / 2; // apex at origin, opening along -x
  return cone;
}

/** Each part is built facing its "standard orientation"; reversed rotates the whole group by 180° about Y. */
function buildPart(id: string, m: Mats): THREE.Group {
  const g = new THREE.Group(); g.name = id;
  const add = (o: THREE.Object3D) => { g.add(o); return o; };
  switch (id) {
    case 'flow-duct': {
      const box = new THREE.BoxGeometry(L, H, H);
      add(new THREE.Mesh(box, m.glass));
      add(new THREE.LineSegments(new THREE.EdgesGeometry(box), new THREE.LineBasicMaterial({ color: '#73bbd9', transparent: true, opacity: 0.75 })));
      const win = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.5), new THREE.MeshPhysicalMaterial({ color: '#bfe7f5', transparent: true, opacity: 0.18, roughness: 0, depthWrite: false }));
      win.position.set(0.36, 0, hy + 0.002); add(win);
      const frame = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(0.62, 0.5)), new THREE.LineBasicMaterial({ color: '#e9eef2', transparent: true, opacity: 0.5 }));
      frame.position.copy(win.position); add(frame);
      for (const y of [-hy, hy]) for (const z of [-hy, hy]) { const r = new THREE.Mesh(new THREE.BoxGeometry(L + 0.02, 0.03, 0.03), m.metal); r.position.set(0, y, z); add(r); }
      const base = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.06, 0.6), m.dark); base.position.set(0, -hy - 0.24, 0); add(base);
      for (const x of [-0.3, 0.3]) { const post = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.22, 16), m.metal); post.position.set(x, -hy - 0.12, 0); add(post); }
      break;
    }
    case 'fan': {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.04, 16, 48), m.dark); ring.rotation.y = Math.PI / 2; add(ring);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.12, 24), m.metal); hub.rotation.z = Math.PI / 2; add(hub);
      const blades = new THREE.Group(); blades.name = 'blades';
      for (let i = 0; i < 6; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.22, 0.08), m.metal); b.position.y = 0.15; b.rotation.y = 0.5; const p = new THREE.Group(); p.add(b); p.rotation.x = (i / 6) * Math.PI * 2; blades.add(p); }
      add(blades);
      const a = arrow(m); a.position.x = 0.08; a.name = 'marker'; add(a); // standard: points +x, into the duct
      break;
    }
    case 'flow-straightener': {
      const cell = new THREE.CylinderGeometry(0.045, 0.045, 0.1, 6, 1, true);
      const inst = new THREE.InstancedMesh(cell, m.metal, 36); const d = new THREE.Object3D(); let n = 0;
      for (let r = 0; r < 6; r++) for (let q = 0; q < 6; q++) { d.position.set(0, -0.26 + r * 0.1 + (q % 2) * 0.05, -0.26 + q * 0.1); d.rotation.set(0, 0, Math.PI / 2); d.updateMatrix(); inst.setMatrixAt(n++, d.matrix); }
      add(inst); const frame = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.7, 0.7), m.glass); add(frame);
      break;
    }
    case 'nitrogen-nozzle': {
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.14, 24), m.metal); body.position.y = 0.02; add(body);
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.1, 24), m.metal); tip.position.y = 0.14; add(tip);
      const a = arrow(m, 0.2); a.rotation.z = Math.PI / 2; a.position.y = 0.16; a.name = 'marker'; add(a);
      break;
    }
    case 'sample-holder': {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.04, 0.12), m.metal); add(rail);
      const card = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.008, 0.2), m.sample); card.position.y = -0.2; card.rotation.z = 0; add(card);
      const clip = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.2, 0.05), m.dark); clip.position.y = -0.1; add(clip);
      const a = arrow(m, 0.26); a.rotation.y = Math.PI; a.position.set(0.14, -0.3, 0); a.name = 'marker'; add(a); // standard: opposed to the duct flow (-x)
      break;
    }
    case 'igniter': {
      const lever = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.34, 12), m.metal); lever.rotation.z = 0.7; lever.position.set(0.05, -0.05, 0); add(lever);
      const coil = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.012, 8, 24), m.coil); coil.position.set(-0.08, 0.1, 0); add(coil);
      break;
    }
    case 'still-camera': case 'video-camera': {
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.16, 0.18), m.dark); add(body);
      const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.1, 24), m.metal); lens.rotation.z = Math.PI / 2; lens.position.x = -0.15; add(lens);
      const cone = viewCone(m, 0.75, 0.24); cone.position.x -= 0.2; cone.name = 'cone'; add(cone);
      if (id === 'still-camera') g.rotation.z = Math.PI / 2; // looks down through the top window (-y after rotation)
      else { g.rotation.y = -Math.PI / 4; const mirror = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.18), new THREE.MeshStandardMaterial({ color: '#cfe6ff', metalness: 1, roughness: 0.05 })); mirror.position.set(-0.4, 0, 0); mirror.rotation.y = Math.PI / 4; add(mirror); }
      break;
    }
    case 'radiometer': {
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.16, 24), m.dark); body.rotation.z = Math.PI / 2; add(body);
      const cone = viewCone(m, 0.9, 0.22); cone.position.x -= 0.08; cone.name = 'cone'; add(cone); // standard: views upstream (-x)
      break;
    }
    case 'exit-plate': {
      const tex = (() => {
        const cv = document.createElement('canvas'); cv.width = cv.height = 128; const x = cv.getContext('2d')!;
        x.fillStyle = '#b9733f'; x.fillRect(0, 0, 128, 128); x.fillStyle = '#06090e';
        for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { x.beginPath(); x.arc(8 + i * 16, 8 + j * 16, 4.5, 0, Math.PI * 2); x.fill(); }
        const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
      })();
      const plate = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.72, 0.72), new THREE.MeshStandardMaterial({ map: tex, metalness: 0.7, roughness: 0.4 })); add(plate);
      const screen = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.72, 0.72), new THREE.MeshStandardMaterial({ color: '#c9a14a', metalness: 0.9, roughness: 0.3, transparent: true, opacity: 0.5 })); screen.position.x = 0.05; add(screen);
      break;
    }
  }
  g.traverse((o) => { o.userData.partId = id; });
  return g;
}

export async function startBench(canvas: HTMLCanvasElement, host: HTMLElement, parts: readonly PartSpec[], cb: BenchCallbacks, motionOn: boolean, environment: BenchEnvironment = null): Promise<BenchApi | null> {
  let renderer: THREE.WebGLRenderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' }); }
  catch { return null; }
  // Software rasterisers (SwiftShader, llvmpipe) pay ~170 ms per shader program: draw fewer pixels and load only the lite scenery.
  const gl = renderer.getContext(), dbg = gl.getExtension('WEBGL_debug_renderer_info');
  const software = /swiftshader|llvmpipe|softpipe|software/i.test(dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : '');
  renderer.setPixelRatio(software ? 1 : Math.min(devicePixelRatio || 1, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.55;
  const camera = new THREE.PerspectiveCamera(environment ? 30 : 34, 1, 0.05, environment ? 320 : 60);
  const hemi = new THREE.HemisphereLight('#cfe6ff', '#070c14', 0.7); scene.add(hemi);
  const key = new THREE.DirectionalLight('#fff1e0', 2.4); key.position.set(2.5, 4, 3); scene.add(key);
  const rim = new THREE.PointLight('#73bbd9', 14, 9); rim.position.set(-2.4, 1.4, -2); scene.add(rim);
  const warm = new THREE.PointLight('#ff8738', 5, 6); warm.position.set(1.8, -0.6, 2); scene.add(warm);
  const alarm = new THREE.PointLight('#e2b04a', 0, 3); alarm.position.set(-1.2, 0.5, 0.8); scene.add(alarm);

  // Bench surface: soft contact glow + glovebox frame (schematic).
  const glowTex = (() => { const cv = document.createElement('canvas'); cv.width = cv.height = 256; const x = cv.getContext('2d')!; const g = x.createRadialGradient(128, 128, 10, 128, 128, 128); g.addColorStop(0, 'rgba(115,187,217,.38)'); g.addColorStop(1, 'rgba(115,187,217,0)'); x.fillStyle = g; x.fillRect(0, 0, 256, 256); return new THREE.CanvasTexture(cv); })();
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(5, 3.4), new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, depthWrite: false }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -hy - 0.28; scene.add(floor);
  const grid = new THREE.GridHelper(5, 20, '#1d6475', '#16263a'); grid.position.y = -hy - 0.275; (grid.material as THREE.Material).transparent = true; (grid.material as THREE.Material).opacity = 0.35; scene.add(grid);
  const glovebox = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(3.1, 2.05, 1.9)), new THREE.LineBasicMaterial({ color: '#2a3d52' }));
  glovebox.position.y = 0.37; scene.add(glovebox);

  // Optional artistic environment: lights now, scenery after the apparatus's first frame. Establishing shot, then dolly in.
  const lite = !!environment?.lite;
  // The establishing shot holds (timestamp) until the scenery has arrived, at most 2.5 s after the first frame; any input ends it.
  let hold = 0, firstFrame = false, firstAt = 0;
  if (environment && software) cb.onEnvOff?.();
  const env = environment && !software ? addEnvironment(scene, renderer, camera, { ...environment, lite, onChange: () => kick(), onProgress: (p) => {
    if (p.loaded >= p.total) hold = Math.min(hold, Math.max(performance.now() + 500, firstAt + 1500)); // a beat on the full room
    cb.onEnvProgress?.(p, lite);
  } }) : null;
  const m = mats();
  // Cinematic look (lab environment only): atmosphere, a cinematic key with real apparatus shadows, bloom on light sources.
  // The heavy parts (shadow map, bloom) are skipped on the lite tier (phones, software renderers).
  let composer: EffectComposer | null = null;
  if (env) {
    scene.background = new THREE.Color('#03060b');
    scene.fog = new THREE.FogExp2('#050a12', 0.016);
    hemi.intensity = 0.35; key.intensity = 1.4;
    // Instrument plate: covers the workstation top so close-ups never look past it; the cyan outline marks the work zone.
    const mat = new THREE.Mesh(new THREE.PlaneGeometry(DESK.w - 0.4, DESK.d - 0.4), new THREE.MeshBasicMaterial({ color: '#0a0f16' })); // unlit: stays near-black under the key
    mat.position.z = DESK.z;
    const edge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(5.6, 5)), new THREE.LineBasicMaterial({ color: C.cyan, transparent: true, opacity: 0.8 }));
    const catcher = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 5), new THREE.ShadowMaterial({ opacity: 0.6, color: '#000000' })); catcher.receiveShadow = true;
    for (const o of [mat, edge, catcher]) { o.rotation.x = -Math.PI / 2; o.position.y = -hy - 0.284; scene.add(o); }
    catcher.position.y += 0.002;
    floor.visible = false; // the cyan contact glow was for the empty void; on the plate it read as a pale veil
    m.glass.envMapIntensity = 0.35; m.glass.opacity = 0.07; m.glass.color.set('#7fc4e0'); // keep the duct glass from veiling the parts inside it
    m.metal.color.set('#a7b4c2'); m.metal.roughness = 0.32; // satin rather than mirror: highlights stay below the bloom threshold
    const hero = new THREE.SpotLight('#fff2e2', 34, 16, 0.26, 0.55, 1); hero.position.set(2.2, 6.5, 3.2); hero.target.position.set(0, 0, 0); scene.add(hero, hero.target);
    // Every light costs every lit shader (software rasterisers pay ~0.5 s per program), so existing lights are re-purposed:
    // the rim becomes a teal back light and the warm fill becomes the igniter accent.
    rim.color.copy(C.teal); rim.intensity = 26; rim.distance = 8; rim.position.set(-0.6, 1.8, -2.6);
    warm.distance = 2.2; warm.decay = 1.6; warm.position.set(0.3, -0.05, 0.75); warm.intensity = 0;
    if (!lite) {
      renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      hero.castShadow = true; hero.shadow.mapSize.set(1024, 1024); hero.shadow.bias = -0.0004; hero.shadow.camera.near = 3; hero.shadow.camera.far = 12; hero.shadow.radius = 4;
      composer = new EffectComposer(renderer);
      composer.addPass(new RenderPass(scene, camera));
      composer.addPass(new UnrealBloomPass(new THREE.Vector2(512, 512), 0.6, 0.5, 2.0)); // threshold 2 (linear HDR): only the deliberately over-range light sources bloom
      composer.addPass(new OutputPass());
    }
    scene.environmentIntensity = 0.7; renderer.toneMappingExposure = 1.0;
  }
  const groups = new Map<string, THREE.Group>();
  const placed = new Map<string, { target: THREE.Vector3; yaw: number; drop: number }>();
  for (const p of parts) { const g = buildPart(p.id, m); g.visible = false; scene.add(g); groups.set(p.id, g); }
  const baseRot = new Map([...groups].map(([id, g]) => [id, g.rotation.clone()]));
  // Per-part material copies, so a highlight on one part never leaks into another.
  for (const g of groups.values()) g.traverse((o) => {
    if (o instanceof THREE.Mesh && o.material instanceof THREE.MeshStandardMaterial) {
      o.material = o.material.clone(); o.userData.emissive = o.material.emissive.clone(); o.userData.ei = o.material.emissiveIntensity;
    }
  });
  for (const g of groups.values()) g.traverse((o) => { if (o instanceof THREE.Mesh && !(o.material as THREE.Material).transparent) o.castShadow = true; });
  // Under the lab key light the 36 straightener cells summed into a white blow-out: satin finish there (material only).
  if (env) groups.get('flow-straightener')?.traverse((o) => { if (o instanceof THREE.Mesh && o.material instanceof THREE.MeshStandardMaterial && !o.material.transparent) o.material.roughness = 0.6; });
  let flaggedMats: THREE.MeshStandardMaterial[] = [];
  // Install feedback: a confirmed fit flashes its mount ring once (presentation of a server-confirmed change).
  const flash = new Map<string, number>();

  // Mount rings + generous invisible hit targets (touch friendly).
  const anchorObjs = new Map<string, { ring: THREE.Mesh; hit: THREE.Mesh }>();
  const ringGeo = new THREE.TorusGeometry(0.09, 0.012, 8, 40), hitGeo = new THREE.SphereGeometry(0.16, 12, 12);
  for (const [id, [x, y, z]] of Object.entries(ANCHORS3D)) {
    const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: C.cyan, transparent: true, opacity: 0, depthWrite: false }));
    ring.position.set(x, y, z); ring.lookAt(x, y, z + 1); scene.add(ring);
    const hit = new THREE.Mesh(hitGeo, new THREE.MeshBasicMaterial({ visible: false })); hit.position.set(x, y, z); hit.userData.anchorId = id; scene.add(hit);
    anchorObjs.set(id, { ring, hit });
  }
  // Direction markers along the duct axis (schematic direction only, never a measured velocity).
  const chevrons = new THREE.Group();
  for (let i = 0; i < 7; i++) { const c = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.08, 3), new THREE.MeshBasicMaterial({ color: C.cyan, transparent: true, opacity: 0.55 })); c.rotation.z = -Math.PI / 2; c.position.x = -0.6 + i * 0.2; chevrons.add(c); }
  chevrons.visible = false; scene.add(chevrons);
  const scan = new THREE.Mesh(new THREE.PlaneGeometry(0.02, 0.9), new THREE.MeshBasicMaterial({ color: C.teal, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
  scan.scale.z = 1; scan.rotation.y = Math.PI / 2; scene.add(scan);
  const scanWide = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), new THREE.MeshBasicMaterial({ color: C.teal, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
  scanWide.rotation.y = Math.PI / 2; scene.add(scanWide);

  // Ghost: preview of the selected loose part; draggable onto a mount. Purely visual until the server answers.
  let ghost: THREE.Group | null = null, ghostId: string | null = null;
  const ghostHome = new THREE.Vector3(0, 1.0, 0.75), ghostPos = ghostHome.clone();
  const ghostMat = new THREE.MeshStandardMaterial({ color: '#9fd8ef', emissive: C.cyan, emissiveIntensity: 0.6, transparent: true, opacity: 0.55, depthWrite: false });
  const setGhost = (id: string | null) => {
    if (ghostId === id) return;
    if (ghost) { scene.remove(ghost); ghost = null; }
    ghostId = id;
    if (!id) return;
    ghost = buildPart(id, m); ghost.traverse((o) => { if (o instanceof THREE.Mesh) o.material = ghostMat; o.userData.ghost = true; });
    if (id === 'flow-duct') ghost.scale.setScalar(0.35);
    ghostPos.copy(ghostHome); ghost.position.copy(ghostPos); scene.add(ghost);
  };

  // Orbit camera (drag empty space / arrow keys), damped.
  // In the lab, the work view is a low, close hero framing: the apparatus fills the frame with the window behind it.
  // Compositions. Work: the apparatus and its mounts fill roughly half the frame, low and close, window behind.
  // Inspect: closer, on the flagged part. Establish / wide: the bay (lab only). Narrow screens pull back per view.
  type Shot = { r: number; theta: number; phi: number; target: [number, number, number] };
  const VIEWS: Partial<Record<BenchView, Shot>> = env
    ? { establish: { r: 29, theta: 0.42, phi: 1.1, target: [-4.5, 0.5, -2] }, work: { r: 3.7, theta: -0.5, phi: 1.3, target: [0.05, 0.1, 0] }, inspect: { r: 2.6, theta: -0.95, phi: 1.24, target: [-0.6, 0, 0] }, wide: { r: 12, theta: -0.3, phi: 1.3, target: [-4, -2.5, 0] } }
    : { work: { r: 4.4, theta: -0.55, phi: 1.12, target: [0, 0.05, 0] }, inspect: { r: 3.4, theta: -0.95, phi: 1.12, target: [-0.6, 0, 0] } };
  const maxR = environment ? 30 : 6.5, HERO = VIEWS.work!;
  const orbit = { theta: HERO.theta, phi: HERO.phi, r: HERO.r, tTheta: HERO.theta, tPhi: HERO.phi, tR: HERO.r, target: new THREE.Vector3(...HERO.target), tTarget: new THREE.Vector3(...HERO.target) };
  let view: BenchView = 'work', viewFocus: THREE.Vector3 | null = null;
  const fitR = (r: number) => r * (camera.aspect < 0.9 ? 1.6 : camera.aspect < 1.3 ? 1.2 : 1);
  const setView = (v: BenchView, focus: THREE.Vector3 | null = null) => {
    const shot = VIEWS[v] ?? HERO; view = VIEWS[v] ? v : 'work'; viewFocus = focus;
    orbit.tR = fitR(shot.r); orbit.tTheta = shot.theta; orbit.tPhi = shot.phi;
    if (focus) orbit.tTarget.copy(focus); else orbit.tTarget.set(...shot.target);
  };
  /** The first fitted part the confirmed state flags (authored fault or a finding), as a world point. */
  const flaggedPoint = (s: BenchState | null) => {
    const id = s?.flagged.find((f) => s.installed[f]);
    const at = id ? ANCHORS3D[s!.installed[id]!.anchorId] : undefined;
    return at ? new THREE.Vector3(...at) : null;
  };
  /** Flagged part first, otherwise the selected fitted part (what Inspect and the arm's lamp look at). */
  const focusPoint = (s: BenchState | null) => {
    const at = s?.selectedPart && s.installed[s.selectedPart] ? ANCHORS3D[s.installed[s.selectedPart]!.anchorId] : undefined;
    return flaggedPoint(s) ?? (at ? new THREE.Vector3(...at) : null);
  };
  if (env && motionOn) { hold = Infinity; orbit.r = 29; orbit.theta = 0.42; orbit.phi = 1.1; orbit.target.set(-4.5, 0.5, -2); } // opening crane: high three-quarter view of the bay, then down onto the bench
  let lastInput = 0, drift = 0;
  const applyCamera = () => {
    const { phi, r, target } = orbit, theta = orbit.theta + drift;
    camera.position.set(target.x + r * Math.sin(phi) * Math.sin(theta), target.y + r * Math.cos(phi), target.z + r * Math.sin(phi) * Math.cos(theta));
    camera.lookAt(target);
  };

  const t0 = performance.now();
  let state: BenchState | null = null, motion = motionOn, frame = 0, lost = false, fault = 0, sweep = 0, wasQualified = false;
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const pick = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
  };
  const hitAnchor = () => ray.intersectObjects([...anchorObjs.values()].map((a) => a.hit), false)[0]?.object.userData.anchorId as string | undefined;
  const hitPart = () => { for (const h of ray.intersectObjects([...groups.values()].filter((g) => g.visible), true)) if (h.object.userData.partId) return h.object.userData.partId as string; };
  const hitGhost = () => (ghost ? ray.intersectObject(ghost, true).length > 0 : false);
  const nearestAnchor = (p: THREE.Vector3) => {
    let best: string | null = null, d = 0.42;
    for (const [id, [x, y, z]] of Object.entries(ANCHORS3D)) { const dist = p.distanceTo(new THREE.Vector3(x, y, z)); if (dist < d) { d = dist; best = id; } }
    return best;
  };
  const label = (partId?: string, anchorId?: string) => {
    if (partId) { const p = parts.find((x) => x.id === partId); return p ? `${p.label}${state?.installed[partId] ? ' · fitted' : ''}` : partId; }
    if (anchorId) { const p = parts.find((x) => x.anchorId === anchorId); return p ? `${p.anchorLabel}${state?.choosing ? ' · drop or click to choose' : ''}` : anchorId; }
    return '';
  };

  let drag: { kind: 'orbit' | 'ghost'; x: number; y: number; moved: boolean } | null = null;
  const plane = new THREE.Plane(), hitPoint = new THREE.Vector3();
  const onDown = (e: PointerEvent) => {
    hold = 0; lastInput = performance.now(); pick(e);
    drag = { kind: state?.choosing && hitGhost() ? 'ghost' : 'orbit', x: e.clientX, y: e.clientY, moved: false };
    if (drag.kind === 'ghost' && ghost) plane.setFromNormalAndCoplanarPoint(camera.getWorldDirection(new THREE.Vector3()).negate(), ghost.position);
    canvas.setPointerCapture(e.pointerId); kick();
  };
  const onMove = (e: PointerEvent) => {
    pick(e);
    if (!drag) {
      const a = hitAnchor(), p = a ? undefined : hitPart();
      const r = canvas.getBoundingClientRect();
      cb.onHover(a || p ? { x: e.clientX - r.left, y: e.clientY - r.top, text: label(p, a) } : null);
      canvas.style.cursor = a && state?.choosing ? 'copy' : a || p || (state?.choosing && hitGhost()) ? 'pointer' : 'grab';
      return;
    }
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true;
    if (drag.kind === 'orbit') { orbit.tTheta -= dx * 0.006; orbit.tPhi = THREE.MathUtils.clamp(orbit.tPhi - dy * 0.005, 0.45, 1.5); drag.x = e.clientX; drag.y = e.clientY; }
    else if (ray.ray.intersectPlane(plane, hitPoint)) { ghostPos.copy(hitPoint); const near = nearestAnchor(ghostPos); highlight(near); }
    kick();
  };
  const onUp = (e: PointerEvent) => {
    const d = drag; drag = null; pick(e);
    if (!d) return;
    if (d.kind === 'ghost') {
      const near = nearestAnchor(ghostPos);
      if (near && ghostId) { cb.onDrop(ghostId, near); } else ghostPos.copy(ghostHome);
      highlight(null);
    } else if (!d.moved) {
      const a = hitAnchor(), p = a ? undefined : hitPart();
      if (a && state?.choosing) cb.onSelectAnchor(a);
      else if (p) cb.onSelectPart(p);
      else if (a) { const occupant = Object.entries(state?.installed ?? {}).find(([, v]) => v.anchorId === a)?.[0]; if (occupant) cb.onSelectPart(occupant); }
    }
    kick();
  };
  const onWheel = (e: WheelEvent) => { e.preventDefault(); hold = 0; lastInput = performance.now(); orbit.tR = THREE.MathUtils.clamp(orbit.tR + e.deltaY * 0.0025 * (orbit.tR / 4), 2.6, maxR); kick(); };
  const onKey = (e: KeyboardEvent) => {
    hold = 0; lastInput = performance.now();
    const step = { ArrowLeft: [0.12, 0], ArrowRight: [-0.12, 0], ArrowUp: [0, -0.08], ArrowDown: [0, 0.08] }[e.key];
    if (step) { e.preventDefault(); orbit.tTheta += step[0]!; orbit.tPhi = THREE.MathUtils.clamp(orbit.tPhi + step[1]!, 0.45, 1.5); kick(); }
    if (e.key === '+' || e.key === '=') { orbit.tR = Math.max(2.6, orbit.tR - 0.3); kick(); }
    if (e.key === '-') { orbit.tR = Math.min(maxR, orbit.tR + 0.3 * (orbit.tR / 4)); kick(); }
  };
  // Callouts: HTML labels pinned to parts (amber for flagged, cyan for selected, the duct when nothing else).
  // aria-hidden: the same information is in the 2D panels; the text is the frozen equipment copy, never a measurement.
  const calloutLayer = document.createElement('div'); calloutLayer.className = 'm2-callouts'; calloutLayer.setAttribute('aria-hidden', 'true'); host.appendChild(calloutLayer);
  const callouts = new Map<string, HTMLElement>(), proj = new THREE.Vector3();
  const placeCallouts = () => {
    if (!state) return;
    const want = new Map<string, 'amber' | 'cyan'>();
    for (const id of state.flagged) if (state.installed[id]) want.set(id, 'amber');
    if (state.selectedPart && state.installed[state.selectedPart] && !want.has(state.selectedPart)) want.set(state.selectedPart, 'cyan');
    if (!want.size && state.installed['flow-duct']) want.set('flow-duct', 'cyan');
    for (const [id, el] of callouts) if (!want.has(id)) { el.remove(); callouts.delete(id); }
    const r = host.getBoundingClientRect();
    for (const [id, tone] of want) {
      let el = callouts.get(id);
      if (!el) { el = document.createElement('span'); el.className = 'm2-callout'; el.textContent = parts.find((p) => p.id === id)?.label ?? id; calloutLayer.appendChild(el); callouts.set(id, el); }
      el.dataset.tone = tone;
      const [x, y, z] = ANCHORS3D[state.installed[id]!.anchorId] ?? [0, 0, 0];
      proj.set(x, y + (id === 'flow-duct' ? hy + 0.15 : 0.12), z).project(camera);
      const hidden = proj.z > 1 || Math.abs(proj.x) > 1.05 || Math.abs(proj.y) > 1.05 || orbit.r > 9;
      el.style.opacity = hidden ? '0' : '1';
      el.style.transform = `translate(${((proj.x + 1) / 2) * r.width}px, ${((1 - proj.y) / 2) * r.height}px) translate(-50%, calc(-100% - 14px))`; // leader line ends on the part
    }
  };
  let highlighted: string | null = null;
  const highlight = (id: string | null) => { highlighted = id; };

  const size = () => {
    const r = host.getBoundingClientRect();
    renderer.setSize(r.width, r.height, false); composer?.setSize(r.width, r.height); composer?.setPixelRatio(renderer.getPixelRatio());
    camera.aspect = r.width / Math.max(1, r.height);
    // Narrow viewports: the current composition pulls back so the whole duct stays framed.
    setView(view, viewFocus);
    camera.updateProjectionMatrix();
  };

  const render = (now: number) => {
    // Far camera moves (establishing shot, wide framing) glide slowly; close work stays snappy.
    const t = (now - t0) / 1000, ease = motion ? (Math.max(orbit.r, orbit.tR) > 8 ? 0.035 : 0.14) : 1;
    let busy = false;
    const step = (a: number, b: number) => { const v = a + (b - a) * ease; if (Math.abs(b - v) > 1e-4) busy = true; return Math.abs(b - v) > 1e-4 ? v : b; };
    if (now >= hold) {
      orbit.theta = step(orbit.theta, orbit.tTheta); orbit.phi = step(orbit.phi, orbit.tPhi); orbit.r = step(orbit.r, orbit.tR);
      orbit.target.lerp(orbit.tTarget, ease); if (orbit.target.distanceTo(orbit.tTarget) > 1e-3) busy = true;
    } else busy = true;
    // A slow, small idle drift once the learner has left the camera alone for a while (never under reduced motion).
    const idle = env && motion && !drag && now >= hold && now - lastInput > 6000;
    drift = step(drift, idle ? 0.07 * Math.sin(t * 0.11) : 0); if (idle) busy = true;
    applyCamera();
    for (const [id, p] of placed) {
      const g = groups.get(id)!;
      p.drop = step(p.drop, 0);
      g.position.set(p.target.x, p.target.y + p.drop, p.target.z);
      const base = baseRot.get(id)!;
      const yaw = step(g.userData.yaw ?? p.yaw, p.yaw); g.userData.yaw = yaw;
      g.rotation.set(base.x, base.y + yaw, base.z);
    }
    if (env?.update(1 / 60, motion, t)) busy = true;
    if (motion) { const blades = groups.get('fan')?.getObjectByName('blades'); if (blades && state?.installed.fan) { blades.rotation.x = t * 1.6; busy = true; } }
    if (ghost) {
      if (!drag) { const tgt = state?.pendingTarget ? new THREE.Vector3(...ANCHORS3D[state.pendingTarget]!) : ghostHome; ghostPos.lerp(tgt, motion ? 0.12 : 1); if (ghostPos.distanceTo(tgt) > 1e-3) busy = true; }
      ghost.position.copy(ghostPos); ghost.position.y += motion && !state?.pendingTarget ? Math.sin(t * 2) * 0.03 : 0;
      ghost.rotation.y = state?.orientation === 'reversed' ? Math.PI : 0;
      ghostMat.opacity = state?.pendingTarget ? 0.35 + Math.sin(t * 6) * 0.15 : 0.55;
      if (motion) busy = true;
    }
    for (const [id, a] of anchorObjs) {
      const mat = a.ring.material as THREE.MeshBasicMaterial;
      const target = id === highlighted || id === state?.selectedAnchor;
      const occupied = Object.values(state?.installed ?? {}).some((v) => v.anchorId === id);
      const want = state?.choosing ? (target ? 1 : occupied ? 0.12 : 0.55) : id === state?.pendingTarget ? 0.8 : 0;
      const f = flash.get(id) ?? 0;
      mat.opacity = Math.max(step(mat.opacity, want), f); mat.color.copy(target ? C.flame : f > 0 ? C.teal : C.cyan);
      if (f > 0) { a.ring.scale.setScalar(1 + (1 - f) * 2.2); const nf = motion ? f - 0.025 : 0; if (nf > 0) flash.set(id, nf); else flash.delete(id); busy = true; }
      else if (state?.choosing && motion) { a.ring.scale.setScalar(1 + (target ? 0.25 : 0.08) * Math.sin(t * 4)); busy = true; } else a.ring.scale.setScalar(1);
    }
    // Flagged parts (server findings or the authored fault record only) pulse amber; narrower in the lab so the peak never blooms.
    if (flaggedMats.length) { const [mid, amp] = env ? [0.6, 0.25] : [0.75, 0.45]; const k = motion ? mid + amp * Math.sin(t * 3) : 0.9; for (const mm of flaggedMats) mm.emissiveIntensity = k; if (motion) busy = true; }
    for (const [id, g] of groups) g.scale.setScalar(step(g.scale.x, id === state?.selectedPart ? 1.06 : 1));
    if (fault > 0) { alarm.intensity = 9 * fault * (0.6 + 0.4 * Math.sin(t * 9)); fault = Math.max(0, fault - (motion ? 0.006 : 1)); busy = true; } else alarm.intensity = state?.flagged.length ? 2.2 : 0;
    if (sweep > 0) {
      const x = -hx + (1 - sweep) * L; scan.position.x = x; scanWide.position.x = x;
      (scan.material as THREE.MeshBasicMaterial).opacity = 0.9 * Math.sin(sweep * Math.PI); (scanWide.material as THREE.MeshBasicMaterial).opacity = 0.25 * Math.sin(sweep * Math.PI);
      sweep = Math.max(0, sweep - (motion ? 0.012 : 1)); busy = true;
    } else { (scan.material as THREE.MeshBasicMaterial).opacity = 0; (scanWide.material as THREE.MeshBasicMaterial).opacity = 0; }
    if (chevrons.visible && motion) { chevrons.children.forEach((c, i) => { ((c as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = 0.25 + 0.4 * (0.5 + 0.5 * Math.sin(t * 3 - i * 0.7 * chevrons.scale.x)); }); busy = true; }
    // Warm accent at the igniter while it is fitted: a gentle breath, never a flicker (no combustion is simulated).
    if (env) warm.intensity = state?.installed.igniter ? 1.6 + (motion ? 0.4 * Math.sin(t * 1.3) : 0) : 0;
    placeCallouts();
    if (composer) composer.render(); else renderer.render(scene, camera);
    if (!firstFrame) { firstFrame = true; firstAt = now; hold = Math.min(hold, now + 2500); cb.onFirstFrame?.(); setTimeout(() => env?.start(), 0); }
    return busy || !!drag;
  };
  const loop = (now: number) => { frame = 0; if (lost) return; if (render(now)) frame = requestAnimationFrame(loop); };
  const kick = () => { if (!frame && !lost) frame = requestAnimationFrame(loop); };
  const lose = (e: Event) => { e.preventDefault(); lost = true; cancelAnimationFrame(frame); frame = 0; cb.onLost(); };

  canvas.addEventListener('pointerdown', onDown); canvas.addEventListener('pointermove', onMove); canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointerleave', () => cb.onHover(null)); canvas.addEventListener('wheel', onWheel, { passive: false });
  canvas.addEventListener('keydown', onKey); canvas.addEventListener('webglcontextlost', lose);
  size(); applyCamera(); kick();

  return {
    update(s) {
      const prev = state; state = s;
      for (const [id, g] of groups) {
        const inst = s.installed[id];
        if (!inst) { g.visible = false; placed.delete(id); continue; }
        const [x, y, z] = ANCHORS3D[inst.anchorId] ?? [0, 0, 0];
        const fresh = !prev?.installed[id];
        g.visible = true;
        placed.set(id, { target: new THREE.Vector3(x, y, z), yaw: inst.orientation === 'reversed' ? Math.PI : 0, drop: fresh && prev ? 0.7 : 0 });
        if (fresh) g.userData.yaw = inst.orientation === 'reversed' ? Math.PI : 0;
        if (fresh && prev) flash.set(inst.anchorId, 1);
      }
      flaggedMats = [];
      for (const [id, g] of groups) {
        const flagged = s.flagged.includes(id);
        g.traverse((o) => {
          if (!(o instanceof THREE.Mesh) || !(o.material instanceof THREE.MeshStandardMaterial) || !o.userData.emissive) return;
          if (flagged) { o.material.emissive.copy(C.amber); flaggedMats.push(o.material); }
          else { o.material.emissive.copy(o.userData.emissive); o.material.emissiveIntensity = o.userData.ei; }
        });
      }
      const fan = s.installed.fan;
      chevrons.visible = !!fan && !!s.installed['flow-duct'];
      chevrons.scale.x = fan?.orientation === 'reversed' ? -1 : 1;
      setGhost(s.choosing ? s.selectedPart : null);
      if (s.qualified && !wasQualified && prev) sweep = 1;
      wasQualified = s.qualified;
      // Stage changes pick the composition; within a stage the learner's own view choice stands.
      if (s.focus !== prev?.focus) setView(s.focus === 'fan' ? 'inspect' : s.focus === 'wide' ? 'wide' : 'work', s.focus === 'fan' ? flaggedPoint(s) : null);
      const mount = s.choosing && s.selectedAnchor ? ANCHORS3D[s.selectedAnchor] : undefined;
      env?.aim(mount ? new THREE.Vector3(...mount) : focusPoint(s), motion);
      kick();
    },
    faultMoment() {
      fault = 1;
      const g = groups.get('fan'), p = placed.get('fan');
      if (g && p) g.userData.yaw = 0; // turn from standard to reversed on screen: the server already did it
      setView('inspect', flaggedPoint(state));
      kick();
    },
    react(cue) { env?.react(cue); kick(); },
    view(v) { hold = 0; lastInput = performance.now(); setView(v, v === 'inspect' ? focusPoint(state) : null); kick(); },
    resize() { size(); kick(); },
    setMotion(on) { motion = on; kick(); },
    stop() {
      lost = true; cancelAnimationFrame(frame);
      canvas.removeEventListener('pointerdown', onDown); canvas.removeEventListener('pointermove', onMove); canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('wheel', onWheel); canvas.removeEventListener('keydown', onKey); canvas.removeEventListener('webglcontextlost', lose);
      scene.traverse((o) => { if (o instanceof THREE.Mesh || o instanceof THREE.LineSegments) { o.geometry.dispose(); const mm = o.material; (Array.isArray(mm) ? mm : [mm]).forEach((x) => x.dispose()); } });
      env?.dispose(); composer?.dispose(); calloutLayer.remove(); pmrem.dispose(); glowTex.dispose(); renderer.dispose();
      renderer.forceContextLoss(); // release the GPU context now, not at GC: page-to-page navigation never stacks contexts
    }
  };
}
