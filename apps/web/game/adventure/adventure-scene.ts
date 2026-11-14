// ISS Adventure world (three.js, client only). A walk-through ILLUSTRATION of a microgravity laboratory module:
// the player floats with inertia, finds BASS-II parts, installs them in the glovebox and runs a toy flame at B20's
// recorded oxygen and airflow. Everything here is presentation; the quest logic lives in the React layer.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

export type TargetId = 'terminal' | 'part-duct' | 'part-fan' | 'part-igniter' | 'part-camera' | 'glovebox' | 'comms';
export type Input = { move: { x: number; y: number; z: number }; look: { yaw: number; pitch: number } };
export type Frame = { near: TargetId | null; dist: Record<string, number>; heading: number | null; pos: [number, number, number] };
export type AdventureApi = {
  input: Input;
  setVisible(id: TargetId, on: boolean): void;
  setActive(id: TargetId | null): void;
  installParts(n: number): void;
  ignite(on: boolean): void;
  teleportTo(id: TargetId): void;
  resize(): void;
  dispose(): void;
};

const LEN = 22, R = 2.15; // module length (z) and radius (metres, illustrative)
const TARGETS: Record<TargetId, THREE.Vector3> = {
  terminal: new THREE.Vector3(-1.35, 0.1, -3.2),
  'part-duct': new THREE.Vector3(1.1, 0.9, -6.5),
  'part-fan': new THREE.Vector3(-1.0, -0.8, -10.2),
  'part-igniter': new THREE.Vector3(1.2, -0.6, 1.8),
  'part-camera': new THREE.Vector3(-0.9, 1.1, -13.4),
  glovebox: new THREE.Vector3(1.35, -0.1, -16.0),
  comms: new THREE.Vector3(0, 0.2, -18.85), // just in front of the end wall at z = -19
};

export function startAdventure(canvas: HTMLCanvasElement, opts: { lite: boolean; reduced: boolean; onFrame(f: Frame): void; onReady(): void }): AdventureApi | null {
  let renderer: THREE.WebGLRenderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: !opts.lite, powerPreference: 'high-performance' }); } catch { return null; }
  renderer.setPixelRatio(Math.min(devicePixelRatio, opts.lite ? 1.25 : 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.92; renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#05060f'); scene.fog = new THREE.Fog('#070a1e', 9, 26);
  const pmrem = new THREE.PMREMGenerator(renderer); const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture; scene.environment = env; scene.environmentIntensity = 0.32;
  const camera = new THREE.PerspectiveCamera(70, 1, 0.05, 120); camera.position.set(0, 0, 6);
  const dispose: { dispose(): void }[] = [env, pmrem];
  const geo = <G extends THREE.BufferGeometry>(g: G) => { dispose.push(g); return g; };
  const mat = (p: THREE.MeshStandardMaterialParameters) => { const m = new THREE.MeshStandardMaterial(p); dispose.push(m); return m; };

  // ---- the module: hull, ribs, rack walls, handrails, lights, a window onto Earth
  scene.add(new THREE.HemisphereLight('#c9d4ff', '#14183a', 0.35));
  const hull = new THREE.Mesh(geo(new THREE.CylinderGeometry(R + 0.25, R + 0.25, LEN, 32, 1, true)), mat({ color: '#4a5272', side: THREE.BackSide, roughness: 0.8, metalness: 0.25 }));
  hull.rotation.x = Math.PI / 2; hull.position.z = -LEN / 2 + 3; scene.add(hull);
  const rackMat = mat({ color: '#8a93ad', roughness: 0.6, metalness: 0.3 }), panelMat = mat({ color: '#5f6886', roughness: 0.6, metalness: 0.35 });
  const accent = mat({ color: '#2a2bd6', roughness: 0.4, metalness: 0.4 }), rail = mat({ color: '#ffb020', roughness: 0.35, metalness: 0.5 });
  const screenMat = mat({ color: '#0b1a3a', emissive: '#3db7ff', emissiveIntensity: 1.4, roughness: 0.2 });
  const ledMat = mat({ color: '#ffffff', emissive: '#bfe3ff', emissiveIntensity: 1.6 });
  const rackGeo = geo(new THREE.BoxGeometry(1.15, 1.9, 0.5)), railGeo = geo(new THREE.CylinderGeometry(0.03, 0.03, 1.1, 8)), screenGeo = geo(new THREE.PlaneGeometry(0.5, 0.32));
  for (let z = 2; z > -LEN + 4; z -= 1.3) {
    for (const [x, ry] of [[-1.62, Math.PI / 2], [1.62, -Math.PI / 2]] as const) {
      const r = new THREE.Mesh(rackGeo, (Math.round(z * 10) % 3 === 0) ? panelMat : rackMat); r.position.set(x, 0, z); r.rotation.y = ry; scene.add(r);
      if (Math.round(-z * 10) % 4 === 0) { const s = new THREE.Mesh(screenGeo, screenMat); s.position.set(x + (x < 0 ? 0.26 : -0.26), 0.4, z); s.rotation.y = ry; scene.add(s); }
      const h = new THREE.Mesh(railGeo, rail); h.rotation.x = Math.PI / 2; h.position.set(x * 0.82, -0.75, z); scene.add(h);
    }
    const rib = new THREE.Mesh(geo(new THREE.TorusGeometry(R + 0.05, 0.04, 6, 40)), accent); rib.position.z = z; scene.add(rib);
    const led = new THREE.Mesh(geo(new THREE.BoxGeometry(0.9, 0.04, 0.12)), ledMat); led.position.set(0, R - 0.1, z); scene.add(led);
    if (Math.round(-z * 10) % 26 === 0) { const l = new THREE.PointLight('#dbe6ff', 3.2, 6, 1.8); l.position.set(0, 1.4, z); scene.add(l); }
  }
  // floor and ceiling panels
  const deck = new THREE.Mesh(geo(new THREE.PlaneGeometry(2.4, LEN)), mat({ color: '#3c435e', roughness: 0.85, metalness: 0.2 })); deck.rotation.x = -Math.PI / 2; deck.position.set(0, -1.55, -LEN / 2 + 3); scene.add(deck);
  // window with Earth (procedural texture: no external image)
  const earthTex = (() => { const c = document.createElement('canvas'); c.width = 512; c.height = 256; const g = c.getContext('2d')!; const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, '#1d4fd8'); gr.addColorStop(1, '#0b2a7a'); g.fillStyle = gr; g.fillRect(0, 0, 512, 256);
    let seed = 3; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    g.fillStyle = '#3f8f5a'; for (let i = 0; i < 26; i++) { g.beginPath(); g.ellipse(rnd() * 512, 40 + rnd() * 180, 20 + rnd() * 60, 10 + rnd() * 30, rnd() * 3, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = 'rgba(255,255,255,0.75)'; for (let i = 0; i < 40; i++) { g.beginPath(); g.ellipse(rnd() * 512, rnd() * 256, 10 + rnd() * 40, 3 + rnd() * 8, rnd() * 3, 0, Math.PI * 2); g.fill(); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; dispose.push(t); return t; })();
  const earth = new THREE.Mesh(geo(new THREE.SphereGeometry(30, 48, 32)), mat({ map: earthTex, emissive: '#1a3c9e', emissiveIntensity: 0.35, roughness: 0.9 })); earth.position.set(0, -42, -40); scene.add(earth);
  const port = new THREE.Mesh(geo(new THREE.CircleGeometry(0.75, 40)), mat({ color: '#0a1340', transparent: true, opacity: 0.18, roughness: 0.05 })); port.position.set(0, -1.52, -8); port.rotation.x = -Math.PI / 2; scene.add(port);
  const portRim = new THREE.Mesh(geo(new THREE.TorusGeometry(0.78, 0.06, 8, 40)), accent); portRim.rotation.x = Math.PI / 2; portRim.position.set(0, -1.5, -8); scene.add(portRim);
  // end wall with the hatch toward Mission Control
  const endWall = new THREE.Mesh(geo(new THREE.CircleGeometry(R + 0.25, 40)), mat({ color: '#525b7c', roughness: 0.7 })); endWall.position.z = -LEN + 3; scene.add(endWall);
  const startWall = endWall.clone(); startWall.position.z = 3; startWall.rotation.y = Math.PI; scene.add(startWall);

  // ---- interactables
  const beacon = (color: string) => { const g = new THREE.Group();
    const core = new THREE.Mesh(geo(new THREE.IcosahedronGeometry(0.16, 1)), mat({ color, emissive: color, emissiveIntensity: 2.4, roughness: 0.3 }));
    const ring = new THREE.Mesh(geo(new THREE.TorusGeometry(0.32, 0.018, 8, 48)), mat({ color, emissive: color, emissiveIntensity: 2, roughness: 0.3 })); g.add(core, ring); return g; };
  const objects: Record<TargetId, THREE.Group> = {} as never;
  // terminal: a console with a glowing screen
  const terminal = new THREE.Group(); const tBody = new THREE.Mesh(geo(new THREE.BoxGeometry(0.7, 0.9, 0.35)), panelMat); const tScreen = new THREE.Mesh(geo(new THREE.PlaneGeometry(0.58, 0.4)), screenMat); tScreen.position.set(0.18, 0.12, 0); tScreen.rotation.y = Math.PI / 2; terminal.add(tBody, tScreen); terminal.position.copy(TARGETS.terminal); objects.terminal = terminal;
  // BASS-II parts as recognisable illustrative shapes
  const partMat = mat({ color: '#f4f6fb', roughness: 0.35, metalness: 0.6 }), copper = mat({ color: '#d98c4a', roughness: 0.3, metalness: 0.9, emissive: '#5a2a00', emissiveIntensity: 0.4 });
  const duct = new THREE.Group(); duct.add(new THREE.Mesh(geo(new THREE.BoxGeometry(0.9, 0.22, 0.22)), mat({ color: '#bfe3ff', transparent: true, opacity: 0.55, roughness: 0.05, metalness: 0.1 }))); objects['part-duct'] = duct;
  const fan = new THREE.Group(); fan.add(new THREE.Mesh(geo(new THREE.TorusGeometry(0.2, 0.035, 8, 32)), partMat)); for (let i = 0; i < 5; i++) { const b = new THREE.Mesh(geo(new THREE.BoxGeometry(0.16, 0.05, 0.01)), partMat); b.rotation.z = (i / 5) * Math.PI * 2; b.position.set(Math.cos((i / 5) * Math.PI * 2) * 0.08, Math.sin((i / 5) * Math.PI * 2) * 0.08, 0); fan.add(b); } objects['part-fan'] = fan;
  const ign = new THREE.Group(); const coil = new THREE.Mesh(geo(new THREE.TorusKnotGeometry(0.08, 0.015, 80, 8, 2, 7)), copper); ign.add(coil, new THREE.Mesh(geo(new THREE.CylinderGeometry(0.02, 0.02, 0.4, 8)), partMat)); objects['part-igniter'] = ign;
  const cam = new THREE.Group(); cam.add(new THREE.Mesh(geo(new THREE.BoxGeometry(0.26, 0.18, 0.18)), mat({ color: '#2b2f45', roughness: 0.4, metalness: 0.5 }))); const lens = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.06, 0.06, 0.12, 20)), mat({ color: '#111', metalness: 0.8, roughness: 0.2 })); lens.rotation.z = Math.PI / 2; lens.position.x = 0.17; cam.add(lens); objects['part-camera'] = cam;
  for (const id of ['part-duct', 'part-fan', 'part-igniter', 'part-camera'] as const) { objects[id].position.copy(TARGETS[id]); }
  // glovebox (Microgravity Science Glovebox, illustrative) with the BASS-II duct inside
  const glove = new THREE.Group();
  const box = new THREE.Mesh(geo(new THREE.BoxGeometry(1.2, 0.85, 0.75)), mat({ color: '#bfe3ff', transparent: true, opacity: 0.22, roughness: 0.05, metalness: 0.1 })); glove.add(box);
  const outline = new THREE.LineSegments(geo(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.2, 0.85, 0.75))), new THREE.LineBasicMaterial({ color: "#2a2bd6" })); glove.add(outline);
  const installed: THREE.Object3D[] = [];
  for (const [id, x] of [['part-duct', 0], ['part-fan', -0.45], ['part-igniter', 0.15], ['part-camera', 0.35]] as const) { const c = objects[id].clone(); c.scale.setScalar(0.7); c.position.set(x, id === 'part-camera' ? 0.3 : -0.1, 0); c.visible = false; glove.add(c); installed.push(c); }
  const sample = new THREE.Mesh(geo(new THREE.BoxGeometry(0.42, 0.01, 0.08)), mat({ color: '#f5efe2', roughness: 0.6 })); sample.position.set(0.05, -0.1, 0); glove.add(sample);
  // the toy flame: layered additive sprites with a soft glow texture (microgravity look: rounded, dim, blue)
  const glowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d')!; const r = g.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.35, 'rgba(255,255,255,0.5)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 128, 128); const t = new THREE.CanvasTexture(c); dispose.push(t); return t; })();
  const flame = new THREE.Group(); flame.position.set(0.18, -0.06, 0); flame.visible = false;
  const layers = [['#3d7bff', 0.34, 0.9], ['#7fb2ff', 0.24, 0.8], ['#ffffff', 0.12, 0.9], ['#ffb26b', 0.08, 0.5]] as const;
  for (const [c, s, o] of layers) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: c, transparent: true, opacity: o, blending: THREE.AdditiveBlending, depthWrite: false })); dispose.push(sp.material); sp.scale.set(s * 1.25, s, 1); flame.add(sp); }
  const flameLight = new THREE.PointLight('#6aa0ff', 0, 2.5, 2); flame.add(flameLight); glove.add(flame);
  glove.position.copy(TARGETS.glovebox); objects.glovebox = glove;
  // comms panel at the far end: Mission Control's question
  const comms = new THREE.Group(); const cBody = new THREE.Mesh(geo(new THREE.BoxGeometry(1.4, 0.9, 0.1)), panelMat); const cScreen = new THREE.Mesh(geo(new THREE.PlaneGeometry(1.2, 0.7)), mat({ color: '#0b1a3a', emissive: '#ffb020', emissiveIntensity: 1.1 })); cScreen.position.z = 0.06; comms.add(cBody, cScreen); comms.position.copy(TARGETS.comms); objects.comms = comms;
  const beacons: Partial<Record<TargetId, THREE.Group>> = {};
  for (const id of Object.keys(objects) as TargetId[]) { scene.add(objects[id]); const b = beacon(id.startsWith('part') ? '#2ee6a6' : '#ffb020'); b.position.copy(TARGETS[id]).add(new THREE.Vector3(0, id.startsWith('part') ? 0 : 0.75, 0)); b.visible = false; scene.add(b); beacons[id] = b; }

  // ---- models from the project's own reviewed Meshy assets (decorative; the game works without them)
  const loader = new GLTFLoader();
  const place = (url: string, h: number, pos: [number, number, number], ry: number) => loader.loadAsync(url).then((g) => { const o = g.scene; const b = new THREE.Box3().setFromObject(o), s = b.getSize(new THREE.Vector3()); o.scale.setScalar(h / Math.max(s.y, 1e-3)); const b2 = new THREE.Box3().setFromObject(o), c = b2.getCenter(new THREE.Vector3()); o.position.set(pos[0] - c.x, pos[1] - b2.min.y, pos[2] - c.z); o.rotation.y = ry; scene.add(o); }).catch(() => {});
  const M = '/models/missions/m1';
  const loads = opts.lite ? [] : [
    place(`${M}/science-rack/science-rack.gltf`, 1.8, [1.55, -1.5, -1.0], -Math.PI / 2), place(`${M}/storage-lockers/storage-lockers.gltf`, 1.7, [-1.55, -1.5, -7.6], Math.PI / 2),
    place(`${M}/stowage-bags/stowage-bags.gltf`, 0.8, [1.2, -1.5, -11.6], -0.5), place('/models/astronaut-suit/astronaut.gltf', 1.7, [-0.9, -1.2, -14.8], 0.8),
    place('/models/pix/pix.gltf', 0.55, [0.6, 0.6, 2.2], Math.PI),
  ];
  void Promise.all(loads).then(() => opts.onReady());
  if (opts.lite) queueMicrotask(() => opts.onReady());

  // ---- post-processing: bloom makes screens, beacons and the flame glow
  let composer: EffectComposer | null = null;
  if (!opts.lite) { composer = new EffectComposer(renderer); composer.addPass(new RenderPass(scene, camera)); composer.addPass(new UnrealBloomPass(new THREE.Vector2(512, 512), 0.6, 0.45, 0.9)); composer.addPass(new OutputPass()); }

  // ---- movement: microgravity float with inertia, clamped to the module
  const input: Input = { move: { x: 0, y: 0, z: 0 }, look: { yaw: 0, pitch: 0 } };
  const vel = new THREE.Vector3(); let yaw = 0, pitch = 0, flying: THREE.Vector3 | null = null;
  let active: TargetId | null = null, ignited = false, raf = 0, last = performance.now(), w = 0, h = 0, disposed = false;
  const resize = () => { const r = canvas.getBoundingClientRect(); if (!r.width || (r.width === w && r.height === h)) return; w = r.width; h = r.height; renderer.setSize(w, h, false); composer?.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); };
  const fwd = new THREE.Vector3(), right = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), tmp = new THREE.Vector3();
  const frame = (now: number) => {
    if (disposed) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now; resize();
    yaw += input.look.yaw; pitch = THREE.MathUtils.clamp(pitch + input.look.pitch, -1.2, 1.2); input.look.yaw = 0; input.look.pitch = 0;
    camera.rotation.set(pitch, yaw, 0, 'YXZ');
    camera.getWorldDirection(fwd); right.crossVectors(fwd, up).normalize();
    const acc = tmp.set(0, 0, 0).addScaledVector(fwd, input.move.z).addScaledVector(right, input.move.x).addScaledVector(up, input.move.y);
    if (flying) { const d = flying.clone().sub(camera.position); if (d.length() < 0.12) { flying = null; vel.set(0, 0, 0); } else vel.copy(d.multiplyScalar(2.6).clampLength(0.6, 6)); }
    else { vel.addScaledVector(acc, 3.2 * dt); vel.multiplyScalar(Math.pow(0.35, dt)); } // gentle drag keeps the float controllable
    camera.position.addScaledVector(vel, dt);
    // stay in the aisle between the racks
    const rr = Math.hypot(camera.position.x, camera.position.y), lim = 1.1; if (rr > lim) { camera.position.x *= lim / rr; camera.position.y *= lim / rr; vel.multiplyScalar(0.5); }
    camera.position.z = THREE.MathUtils.clamp(camera.position.z, -LEN + 3.7, 2.4);
    // animation: parts drift and spin, beacons pulse, flame flickers
    const t = now / 1000;
    for (const id of ['part-duct', 'part-fan', 'part-igniter', 'part-camera'] as const) { const o = objects[id]; if (!o.visible) continue; o.rotation.y += dt * 0.6; o.rotation.x += dt * 0.25; o.position.y = TARGETS[id].y + Math.sin(t * 0.8 + TARGETS[id].z) * 0.08; }
    if (!opts.reduced) (objects['part-fan'].children as THREE.Object3D[]).forEach((c, i) => { if (i) c.rotation.z += dt * 4; });
    for (const id of Object.keys(beacons) as TargetId[]) { const b = beacons[id]!; if (!b.visible) continue; const k = id === active ? 1.15 + Math.sin(t * 4) * 0.12 : 0.85; b.scale.setScalar(k); b.rotation.y += dt; }
    if (ignited) { const f = opts.reduced ? 1 : 1 + Math.sin(t * 13) * 0.05 + Math.sin(t * 7.3) * 0.04; flame.scale.set(f, f * 0.96, f); flameLight.intensity = 3.2 * f; }
    // what is near, and which way is the active objective
    const dist: Record<string, number> = {}; let near: TargetId | null = null, best = 2.2;
    for (const id of Object.keys(objects) as TargetId[]) { if (!objects[id].visible && id.startsWith('part')) continue; const d = camera.position.distanceTo(TARGETS[id]); dist[id] = d; if (d < best) { best = d; near = id; } }
    let heading: number | null = null;
    if (active) { const to = TARGETS[active].clone().sub(camera.position); to.applyQuaternion(camera.quaternion.clone().invert()); heading = Math.atan2(to.x, -to.z); }
    opts.onFrame({ near, dist, heading, pos: [camera.position.x, camera.position.y, camera.position.z] });
    if (composer) composer.render(); else renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); cancelAnimationFrame(raf); });

  return {
    input,
    setVisible: (id, on) => { objects[id].visible = on; },
    setActive: (id) => { active = id; for (const k of Object.keys(beacons) as TargetId[]) beacons[k]!.visible = k === id; },
    installParts: (n) => installed.forEach((c, i) => { c.visible = i < n; }),
    ignite: (on) => { ignited = on; flame.visible = on; if (!on) flameLight.intensity = 0; },
    teleportTo: (id) => { const t = TARGETS[id]; flying = new THREE.Vector3(t.x * 0.35, t.y * 0.5, Math.max(-LEN + 3.75, Math.min(2.2, t.z + 0.9))); yaw = Math.atan2(-(t.x - flying.x), -(t.z - flying.z)); pitch = Math.atan2(t.y - flying.y, Math.hypot(t.x - flying.x, t.z - flying.z)) * 0.6; },
    resize,
    dispose: () => { disposed = true; cancelAnimationFrame(raf); composer?.dispose(); dispose.forEach((d) => d.dispose()); renderer.dispose(); },
  };
}
