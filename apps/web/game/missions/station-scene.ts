// Mission 01 scene: an illustrative orbital module interior dressed with QA'd Meshy props (data/asset-rights.json).
// Purely presentational: the scene never decides anything. Hotspot positions are reported to the React layer, which
// renders real <button>s over the canvas, so keyboard, touch and screen readers use the same controls as a pointer.
// Loaded only by the mission route (dynamic import); regular pages never download three.js.
import * as THREE from 'three';
import { cleanFinish, loadModel } from '../../components/model-loader';

export type HotspotId = string;
export type Prop = { url: string; height: number; at: [number, number, number]; turn: number; hotspot?: HotspotId; labelY?: number };
const M = '/models/missions/m1', M3 = '/models/missions/m3', M4 = '/models/missions/m4', M5 = '/models/missions/m5';
// Positions in metres inside a 4.4 m module, camera at +z looking toward the hatch at -z.
export const STATION_PROPS: Prop[] = [
  { url: `${M}/research-console/research-console.gltf`, height: 1.5, at: [-1.55, 0, -0.6], turn: 0.9, hotspot: 'terminal', labelY: 1.15 },
  { url: `${M}/evidence-scanner/evidence-scanner.gltf`, height: 1.05, at: [-0.55, 0, -2.1], turn: 0.45, hotspot: 'scanner', labelY: 0.55 },
  { url: `${M}/storage-lockers/storage-lockers.gltf`, height: 1.7, at: [1.6, 0.1, -1.4], turn: -1.35, hotspot: 'lockers', labelY: 0.9 },
  { url: `${M}/airlock-hatch/airlock-hatch.gltf`, height: 1.9, at: [0.35, 0.15, -3.15], turn: 0, hotspot: 'hatch', labelY: 1.05 },
  { url: `${M}/science-rack/science-rack.gltf`, height: 1.9, at: [1.7, 0, -0.1], turn: -1.5 },
  { url: `${M}/stowage-bags/stowage-bags.gltf`, height: 0.75, at: [0.95, 0, -2.4], turn: -0.4 },
  { url: `${M}/handrail-frame/handrail-frame.gltf`, height: 1.4, at: [-1.95, 0.6, 0.9], turn: 1.57 },
];

// Mission 03: an observation lab around the test chamber. Positions in metres, same module shell.
export const DETECTIVE_PROPS: Prop[] = [
  { url: `${M3}/observation-console/observation-console.gltf`, height: 1.0, at: [-1.4, 0, -0.5], turn: 1.0, hotspot: 'select', labelY: 1.2 },
  { url: `${M3}/gauge-panel/gauge-panel.gltf`, height: 0.9, at: [-1.9, 1.1, -2.1], turn: 1.3, hotspot: 'predict', labelY: 0.9 },
  { url: `${M3}/viewing-window/viewing-window.gltf`, height: 1.3, at: [0.2, 0.5, -3.6], turn: 0, hotspot: 'reveal', labelY: 0.85 },
  { url: `${M3}/inspection-microscope/inspection-microscope.gltf`, height: 1.0, at: [1.5, 0, -1.6], turn: -1.2, hotspot: 'explain', labelY: 1.1 },
  { url: `${M3}/sample-carousel/sample-carousel.gltf`, height: 0.8, at: [0.9, 0, -2.6], turn: -0.5, hotspot: 'report', labelY: 0.95 },
  { url: `${M3}/camera-housing/camera-housing.gltf`, height: 0.7, at: [-0.4, 0, -2.4], turn: 0.6 },
  { url: `${M3}/optical-bench/optical-bench.gltf`, height: 0.6, at: [1.7, 0, 0.3], turn: -1.5 },
];
// Mission 04: an evidence hall. Statements on the board, sources in the archive, appraisal at the review desk.
export const TRIAL_PROPS: Prop[] = [
  { url: `${M4}/document-board/document-board.gltf`, height: 1.5, at: [-1.4, 0, -1.2], turn: 0.9, hotspot: 'statements', labelY: 1.0 },
  { url: `${M4}/archive-unit/archive-unit.gltf`, height: 1.9, at: [-1.55, 0, -0.5], turn: 1.3, hotspot: 'archive', labelY: 0.85 },
  { url: `${M4}/review-desk/review-desk.gltf`, height: 1.1, at: [0.3, 0, -2.6], turn: 0, hotspot: 'appraise', labelY: 1.15 },
  { url: `${M4}/evidence-lectern/evidence-lectern.gltf`, height: 1.2, at: [1.5, 0, -1.0], turn: -1.2, hotspot: 'report', labelY: 1.0 },
  { url: `${M4}/comparison-console/comparison-console.gltf`, height: 0.8, at: [1.7, 0, -0.3], turn: -1.4 },
  { url: `${M4}/evidence-podium/evidence-podium.gltf`, height: 0.9, at: [-0.4, 0, -1.6], turn: 0.3 },
  { url: `${M4}/filing-cart/filing-cart.gltf`, height: 0.9, at: [1.0, 0, -3.0], turn: -0.6 },
];
// Mission 05: a FICTIONAL lunar habitat research room (scenario, not NASA evidence).
export const HABITAT_PROPS: Prop[] = [
  { url: `${M5}/research-workstation/research-workstation.gltf`, height: 1.3, at: [-1.4, 0, -0.6], turn: 1.0, hotspot: 'conditions', labelY: 1.05 },
  { url: `${M5}/life-support/life-support.gltf`, height: 1.6, at: [1.6, 0, -1.2], turn: -1.3, hotspot: 'assess', labelY: 0.95 },
  { url: `${M5}/utility-robot/utility-robot.gltf`, height: 1.0, at: [-0.3, 0, -2.2], turn: 0.4, hotspot: 'decide', labelY: 1.15 },
  { url: `${M5}/airlock-hatch/airlock-hatch.gltf`, height: 1.8, at: [0.3, 0.2, -3.5], turn: 0, hotspot: 'report', labelY: 0.85 },
  { url: `${M5}/ventilation-unit/ventilation-unit.gltf`, height: 1.2, at: [-1.8, 0.4, -2.4], turn: 1.3, hotspot: 'evidence', labelY: 1.0 },
  { url: `${M5}/inspection-drone/inspection-drone.gltf`, height: 0.4, at: [1.0, 1.7, -2.4], turn: -0.4 },
  { url: `${M5}/habitat-module/habitat-module.gltf`, height: 0.7, at: [1.6, 0, 0.6], turn: -1.5 },
];
export type StationScene = { setActive(id: HotspotId | null): void; dispose(): void };

export function mountStationScene(canvas: HTMLCanvasElement, opts: {
  props?: Prop[];
  onPositions(p: Partial<Record<HotspotId, { x: number; y: number; visible: boolean }>>): void;
  onReady(): void; reducedMotion: boolean;
}): StationScene | null {
  const PROPS = opts.props ?? STATION_PROPS;
  let renderer: THREE.WebGLRenderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false }); } catch { return null; }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#eef1ff');
  const camera = new THREE.PerspectiveCamera(52, 1, 0.05, 40); camera.position.set(0, 1.55, 2.6);
  const target = new THREE.Vector3(0, 1.0, -1.6);
  scene.add(new THREE.HemisphereLight('#ffffff', '#c9cdff', 1.7));
  const key = new THREE.DirectionalLight('#fff4dc', 2.2); key.position.set(2, 4, 3); scene.add(key);

  // Module shell: cream panels, ultramarine ribs, lavender floor, a porthole onto Earth.
  const disposables: { dispose(): void }[] = [];
  const mat = (color: string, extra: THREE.MeshStandardMaterialParameters = {}) => { const m = new THREE.MeshStandardMaterial({ color, roughness: 0.75, ...extra }); disposables.push(m); return m; };
  const geo = <G extends THREE.BufferGeometry>(g: G) => { disposables.push(g); return g; };
  const shell = new THREE.Mesh(geo(new THREE.CylinderGeometry(2.2, 2.2, 7, 24, 1, true)), mat('#f7f8ff', { side: THREE.BackSide }));
  shell.rotation.x = Math.PI / 2; shell.position.set(0, 1.2, -0.6); scene.add(shell);
  for (let z = -3.4; z <= 2.2; z += 1.4) { const rib = new THREE.Mesh(geo(new THREE.TorusGeometry(2.18, 0.022, 6, 48)), mat('#5b5ce6')); rib.position.set(0, 1.2, z); scene.add(rib); }
  const floor = new THREE.Mesh(geo(new THREE.PlaneGeometry(3.6, 7)), mat('#c9cdff')); floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, -0.6); scene.add(floor);
  const endWall = new THREE.Mesh(geo(new THREE.CircleGeometry(2.2, 32)), mat('#e4e7ff')); endWall.position.set(0, 1.2, -4.05); scene.add(endWall);
  const port = new THREE.Mesh(geo(new THREE.CircleGeometry(0.42, 32)), mat('#3d6dff', { emissive: '#2346d6', emissiveIntensity: 0.6 })); port.position.set(-1.25, 1.9, -4.0); scene.add(port);
  const land = new THREE.Mesh(geo(new THREE.CircleGeometry(0.2, 20)), mat('#2ee6a6', { emissive: '#0a7a52', emissiveIntensity: 0.4 })); land.position.set(-1.33, 1.82, -3.99); scene.add(land);
  const portRim = new THREE.Mesh(geo(new THREE.TorusGeometry(0.44, 0.04, 8, 32)), mat('#15153d')); portRim.position.copy(port.position); scene.add(portRim);

  // Active-objective marker: a sun-coloured ring on the floor under the prop PIX is pointing at.
  const ring = new THREE.Mesh(geo(new THREE.RingGeometry(0.42, 0.52, 40)), mat('#ffb020', { emissive: '#ffb020', emissiveIntensity: 0.8, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.01; ring.visible = false; scene.add(ring);

  const anchors = new Map<HotspotId, THREE.Vector3>();
  let loaded = 0;
  for (const p of PROPS) {
    if (p.hotspot) anchors.set(p.hotspot, new THREE.Vector3(p.at[0], p.at[1] + p.height * (p.labelY ?? 0.75), p.at[2]));
    void loadModel(p.url).then((obj) => {
      loaded++;
      if (obj && !disposed) {
        cleanFinish(obj);
        const box = new THREE.Box3().setFromObject(obj), size = box.getSize(new THREE.Vector3());
        obj.scale.setScalar(p.height / Math.max(size.y, 1e-3));
        const b2 = new THREE.Box3().setFromObject(obj), c = b2.getCenter(new THREE.Vector3());
        obj.position.set(p.at[0] - c.x, p.at[1] - b2.min.y, p.at[2] - c.z); obj.rotation.y = p.turn;
        scene.add(obj);
      }
      if (loaded === PROPS.length && !disposed) opts.onReady();
    });
  }

  let active: HotspotId | null = null, raf = 0, disposed = false, w = 0, h = 0, drift = 0;
  const v = new THREE.Vector3();
  const resize = () => { const r = canvas.getBoundingClientRect(); if (r.width === w && r.height === h) return; w = r.width; h = r.height; renderer.setSize(w, h, false); camera.aspect = w / Math.max(h, 1); camera.updateProjectionMatrix(); };
  const frame = (t: number) => {
    resize();
    if (!opts.reducedMotion) drift = Math.sin(t / 4000) * 0.18;
    camera.position.x = drift; camera.lookAt(target);
    if (ring.visible) ring.scale.setScalar(opts.reducedMotion ? 1 : 1 + Math.sin(t / 380) * 0.06);
    renderer.render(scene, camera);
    const out: Partial<Record<HotspotId, { x: number; y: number; visible: boolean }>> = {};
    for (const [id, p] of anchors) { v.copy(p).project(camera); out[id] = { x: (v.x + 1) / 2 * w, y: (1 - v.y) / 2 * h, visible: v.z < 1 }; }
    opts.onPositions(out);
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  return {
    setActive(id) { active = id; const a = id && PROPS.find((p) => p.hotspot === id); ring.visible = !!a; if (a) ring.position.set(a.at[0], 0.01, a.at[2]); },
    dispose() { disposed = true; cancelAnimationFrame(raf); scene.traverse((o) => { if (o instanceof THREE.Mesh && !disposables.includes(o.geometry)) { o.geometry.dispose(); (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose()); } }); disposables.forEach((d) => d.dispose()); renderer.dispose(); void active; }
  };
}
