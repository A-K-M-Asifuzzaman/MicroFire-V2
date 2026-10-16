// Artistic training-bay environment around the procedural apparatus: Meshy-generated architecture, props and an
// animated astronaut, plus procedural structure and an illustrative Earth view through an open porthole.
// Pure decoration — nothing here is NASA hardware, defines a mount or affects game state.
// Scale is consistent: 1 scene unit = 10 cm, so the 17 cm duct sits on a ~0.9 m bench beside a ~1.75 m astronaut.
// Lights are added at construction (a later light-count change would recompile every apparatus shader); geometry and
// models arrive only after start(), i.e. after the apparatus has drawn its first frame. Any failure leaves the bench as it was.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/** `tint` darkens a model's base colour (0–1) so it sits back from the apparatus; `footprint` scales width and depth only. */
type Placement = { url: string; height: number; position: [number, number, number]; rotationY?: number; tint?: number; footprint?: number; detail: 'full' | 'lite' };
type Clip = 'idle' | 'look' | 'wave' | 'cheer';
/** Astronaut acknowledgement: clips, plus a procedural head nod. */
export type EnvCue = 'look' | 'nod' | 'wave' | 'cheer';
export type EnvOptions = { manifest: Placement[]; astronaut: { url: string; clips: Record<Clip, string> } | null; lite: boolean };
export type EnvProgress = { loaded: number; total: number };

/** Floor (y) of the bay: the bench top sits just under the apparatus base plate. */
export const BENCH_TOP = -0.68, BENCH_HEIGHT = 9, FLOOR = BENCH_TOP - BENCH_HEIGHT;
/** Back-wall line (front face) and the porthole, which sits left of the bench so the bench's back panel never hides it. */
const WALL_Z = -7, PORT = { x: -15.6, y: FLOOR + 15.5, r: 5 };

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

const canvasTexture = (size: number, paint: (x: CanvasRenderingContext2D) => void) => {
  const cv = document.createElement('canvas'); cv.width = cv.height = size; paint(cv.getContext('2d')!);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
};
/** Deterministic pseudo-random, so the illustrative planet looks the same on every load. */
const rng = (seed: number) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

/** Clearly illustrative planet: painted, not imagery. Day side lit from the upper left; soft atmosphere rim. */
function paintEarth(x: CanvasRenderingContext2D, clouds: boolean) {
  const R = 470, c = 512, rand = rng(clouds ? 7 : 3);
  x.save(); x.beginPath(); x.arc(c, c, R, 0, Math.PI * 2); x.clip();
  if (!clouds) {
    const sea = x.createRadialGradient(c - 160, c - 180, 40, c, c, R); sea.addColorStop(0, '#3f8fd0'); sea.addColorStop(0.6, '#1d4f8f'); sea.addColorStop(1, '#0b2147');
    x.fillStyle = sea; x.fillRect(0, 0, 1024, 1024);
    for (let i = 0; i < 26; i++) { // soft land masses
      const px = 140 + rand() * 740, py = 140 + rand() * 740, s = 30 + rand() * 90;
      x.fillStyle = rand() > 0.5 ? 'rgba(92,128,78,.55)' : 'rgba(150,132,92,.45)';
      x.beginPath(); for (let k = 0; k < 9; k++) { const a = (k / 9) * Math.PI * 2, rr = s * (0.6 + rand() * 0.6); x.lineTo(px + Math.cos(a) * rr, py + Math.sin(a) * rr * 0.7); } x.fill();
    }
  } else {
    x.strokeStyle = 'rgba(255,255,255,.5)'; x.lineCap = 'round';
    for (let i = 0; i < 70; i++) { x.lineWidth = 6 + rand() * 18; const px = rand() * 1024, py = rand() * 1024, w = 40 + rand() * 160; x.beginPath(); x.moveTo(px, py); x.bezierCurveTo(px + w * 0.3, py - 12, px + w * 0.7, py + 12, px + w, py); x.stroke(); }
  }
  const night = x.createLinearGradient(c - R * 0.2, c - R * 0.4, c + R, c + R * 0.6); night.addColorStop(0, 'rgba(2,5,12,0)'); night.addColorStop(0.55, 'rgba(2,5,12,.55)'); night.addColorStop(1, 'rgba(2,5,12,.97)');
  x.fillStyle = night; x.fillRect(0, 0, 1024, 1024); x.restore();
  if (!clouds) { x.lineWidth = 14; x.strokeStyle = 'rgba(120,190,255,.35)'; x.beginPath(); x.arc(c, c, R + 4, Math.PI * 0.75, Math.PI * 1.75); x.stroke(); }
}

export function addEnvironment(scene: THREE.Scene, renderer: THREE.WebGLRenderer, camera: THREE.Camera, opts: EnvOptions & { onChange: () => void; onProgress: (p: EnvProgress) => void }) {
  const root = new THREE.Group(); root.name = 'environment'; scene.add(root);
  // Lights first: a pale overhead fill, a cool bay light, and blue "earthlight" spilling in through the porthole.
  const fill = new THREE.SpotLight('#cfe6ff', 140, 90, 0.6, 0.6, 1.4); fill.position.set(6, 30, 18); fill.target.position.set(0, FLOOR, 0);
  const bay = new THREE.PointLight('#73bbd9', 60, 60, 1.6); bay.position.set(14, 8, -2);
  const earthlight = new THREE.PointLight('#6fa8ff', 70, 30, 1.4); earthlight.position.set(PORT.x, PORT.y, WALL_Z + 2.5);
  root.add(fill, fill.target, bay, earthlight);

  const mixerState = { mixer: null as THREE.AnimationMixer | null, current: null as THREE.AnimationAction | null };
  const actions = new Map<Clip, THREE.AnimationAction>();
  let head: THREE.Bone | null = null, holderAstro: THREE.Group | null = null, nod = 0, disposed = false, started = false;
  const leds: { mat: THREE.MeshBasicMaterial; phase: number; base: number }[] = [];
  let clouds: THREE.Mesh | null = null;

  const manifest = opts.manifest.filter((p) => !opts.lite || p.detail === 'lite');
  const total = manifest.length + (opts.astronaut ? 1 : 0);
  let loaded = 0;
  const done = () => { loaded++; opts.onProgress({ loaded, total }); opts.onChange(); };

  // Soft contact shadow under each model (no shadow maps): grounds props that would otherwise float.
  const blob = canvasTexture(128, (x) => { const g = x.createRadialGradient(64, 64, 8, 64, 64, 64); g.addColorStop(0, 'rgba(0,0,0,.7)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); });
  const ground = (holder: THREE.Group, model: THREE.Object3D) => {
    const size = new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3());
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(size.x * 1.4, size.z * 1.4), new THREE.MeshBasicMaterial({ map: blob, transparent: true, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.03; holder.add(shadow);
  };
  /** Compile off the critical path where the driver allows it, then show. */
  const reveal = async (obj: THREE.Object3D) => { await renderer.compileAsync(obj, camera, scene).catch(() => undefined); if (!disposed) root.add(obj); };

  function buildStructure() {
    // Floor stops at the wall line, so the porthole looks out on space, not on more floor.
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(120, 60), new THREE.MeshStandardMaterial({ color: '#0a121c', metalness: 0.35, roughness: 0.6 }));
    floor.rotation.x = -Math.PI / 2; floor.position.set(0, FLOOR, WALL_Z + 30); root.add(floor);
    const plates = new THREE.GridHelper(120, 30, '#14202e', '#111b27'); plates.position.set(0, FLOOR + 0.02, WALL_Z + 30); plates.scale.z = 0.5; root.add(plates);

    // Bulkhead with a genuinely open porthole (a hole in the extruded panel), framed by a bolted ring.
    const metal = new THREE.MeshStandardMaterial({ color: '#141f2c', metalness: 0.6, roughness: 0.45 });
    // It spans everything left of the Meshy walls, and a backing plate closes the right, so space shows only through the porthole.
    const panel = new THREE.Shape(); panel.moveTo(-40, 0); panel.lineTo(9.8, 0); panel.lineTo(9.8, 45); panel.lineTo(-40, 45); panel.lineTo(-40, 0);
    const hole = new THREE.Path(); hole.absarc(PORT.x + 19.6, PORT.y - FLOOR, PORT.r, 0, Math.PI * 2, true); panel.holes.push(hole);
    const bulk = new THREE.Mesh(new THREE.ExtrudeGeometry(panel, { depth: 1.2, bevelEnabled: false, curveSegments: 48 }), metal);
    bulk.position.set(-19.6, FLOOR, WALL_Z - 1.2); root.add(bulk);
    const backing = new THREE.Mesh(new THREE.PlaneGeometry(80, 45), metal); backing.position.set(30, FLOOR + 22.5, -18.5); root.add(backing);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(PORT.r + 0.2, 0.42, 16, 64), new THREE.MeshStandardMaterial({ color: '#8d9cab', metalness: 0.9, roughness: 0.3 }));
    ring.position.set(PORT.x, PORT.y, WALL_Z + 0.1); root.add(ring);
    const bolt = new THREE.CylinderGeometry(0.16, 0.16, 0.25, 10), boltMat = new THREE.MeshStandardMaterial({ color: '#5d6b79', metalness: 0.9, roughness: 0.35 });
    for (let i = 0; i < 16; i++) { const b = new THREE.Mesh(bolt, boltMat), a = (i / 16) * Math.PI * 2; b.rotation.x = Math.PI / 2; b.position.set(PORT.x + Math.cos(a) * (PORT.r + 1), PORT.y + Math.sin(a) * (PORT.r + 1), WALL_Z + 0.15); root.add(b); }
    const pane = new THREE.Mesh(new THREE.CircleGeometry(PORT.r, 48), new THREE.MeshPhysicalMaterial({ color: '#9fd8ef', transparent: true, opacity: 0.06, roughness: 0.05, depthWrite: false }));
    pane.position.set(PORT.x, PORT.y, WALL_Z - 0.6); root.add(pane);

    // Space beyond: stars and an illustrative planet, far behind the porthole (never lit by the bay lights).
    const rand = rng(11), pts: number[] = [];
    for (let i = 0; i < 900; i++) pts.push((rand() - 0.5) * 400, FLOOR + (rand() - 0.3) * 260, -60 - rand() * 120);
    const stars = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)), new THREE.PointsMaterial({ color: '#dfe9ff', size: 0.9, sizeAttenuation: true }));
    root.add(stars);
    const earthAt = new THREE.Vector3(PORT.x - 26, PORT.y - 30, -150);
    const earth = new THREE.Mesh(new THREE.PlaneGeometry(130, 130), new THREE.MeshBasicMaterial({ map: canvasTexture(1024, (x) => paintEarth(x, false)), transparent: true, depthWrite: false }));
    clouds = new THREE.Mesh(new THREE.PlaneGeometry(130, 130), new THREE.MeshBasicMaterial({ map: canvasTexture(1024, (x) => paintEarth(x, true)), transparent: true, depthWrite: false }));
    earth.position.copy(earthAt); clouds.position.copy(earthAt).setZ(earthAt.z + 0.5); root.add(earth, clouds);

    // Dark structural ribs between wall modules, each with a restrained light strip and a small status-light cluster.
    const rib = new THREE.BoxGeometry(1.6, 30, 1.6), strip = new THREE.BoxGeometry(0.14, 22, 0.1), led = new THREE.BoxGeometry(0.3, 0.3, 0.1);
    const ribMat = new THREE.MeshStandardMaterial({ color: '#0f1823', metalness: 0.7, roughness: 0.4 });
    const stripMat = new THREE.MeshBasicMaterial({ color: '#4f93ab' });
    for (const x of opts.lite ? [-9.8, 9.8] : [-29.4, -9.8, 9.8, 29.4]) {
      const r = new THREE.Mesh(rib, ribMat); r.position.set(x, FLOOR + 15, WALL_Z + 0.3); root.add(r);
      const s = new THREE.Mesh(strip, stripMat); s.position.set(x, FLOOR + 16, WALL_Z + 1.15); root.add(s);
      ['#73bbd9', '#e2b04a', '#7fd6d1'].forEach((col, i) => {
        const mat = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.8 });
        const l = new THREE.Mesh(led, mat); l.position.set(x + 0.45, FLOOR + 4 + i * 0.5, WALL_Z + 1.15); root.add(l);
        leds.push({ mat, phase: x * 0.37 + i * 1.9, base: 0.55 });
      });
    }
    const header = new THREE.Mesh(new THREE.BoxGeometry(80, 1.4, 1.8), ribMat); header.position.set(0, FLOOR + 30.7, WALL_Z + 0.2); root.add(header);
  }

  /** Every model counts towards progress, loaded or not, so the status never hangs on a failed fetch. */
  const counted = (f: () => Promise<void>) => async () => { try { await f(); } finally { if (!disposed) done(); } };
  const place = async (p: Placement) => {
    const gltf = await load(p.url);
    if (!gltf || disposed) return;
    const holder = new THREE.Group();
    holder.add(fit(gltf.scene, p.height)); ground(holder, gltf.scene);
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
    holder.add(fit(base.scene, 17.5)); ground(holder, base.scene);
    holder.position.set(PORT.x + 3, FLOOR, 1); holder.rotation.y = 1.25; // by the porthole, turned towards the bench
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

  // Gentle, non-repeating head motion layered on whatever clip plays: slow glances plus an optional nod.
  const qParent = new THREE.Quaternion(), qDelta = new THREE.Quaternion(), qPitch = new THREE.Quaternion(), right = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  function headMotion(t: number, dt: number) {
    if (!head?.parent || !holderAstro) return;
    const calm = mixerState.current === actions.get('idle') ? 1 : 0.25;
    const yaw = calm * (0.22 * Math.sin(t * 0.31) + 0.1 * Math.sin(t * 0.83 + 1.3)) - 0.15;
    let pitch = calm * 0.05 * Math.sin(t * 0.47);
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
      for (const l of leds) l.mat.opacity = l.base + 0.35 * Math.max(0, Math.sin(t * 0.9 + l.phase)) ** 6;
      if (clouds) clouds.rotation.z = t * 0.004;
      if (mixerState.mixer) { mixerState.mixer.update(dt); headMotion(t, dt); }
      return true;
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
        if (!(o instanceof THREE.Mesh || o instanceof THREE.Points)) return;
        o.geometry.dispose();
        (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => { Object.values(m).forEach((v) => { if (v instanceof THREE.Texture) v.dispose(); }); m.dispose(); });
      });
      scene.remove(root);
    }
  };
}
