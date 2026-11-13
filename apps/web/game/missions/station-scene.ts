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
  { url: `${M3}/observation-console/observation-console.gltf`, height: 1.0, at: [-1.4, 0, -0.5], turn: 1.0, hotspot: 'select', labelY: 0.75 },
  { url: `${M3}/prediction-board/prediction-board.gltf`, height: 1.3, at: [-1.2, 0, -2.2], turn: 0.7, hotspot: 'predict', labelY: 1.35 },
  { url: `${M3}/gauge-panel/gauge-panel.gltf`, height: 0.9, at: [-1.95, 1.1, -1.4], turn: 1.4 },
  { url: `${M3}/sample-holder/sample-holder.gltf`, height: 0.45, at: [1.25, 0.78, -1.75], turn: -0.9 },
  { url: `${M3}/viewing-window/viewing-window.gltf`, height: 1.3, at: [0.2, 0.5, -3.6], turn: 0, hotspot: 'reveal', labelY: 0.2 },
  { url: `${M3}/inspection-microscope/inspection-microscope.gltf`, height: 1.0, at: [1.5, 0, -1.6], turn: -1.2, hotspot: 'explain', labelY: 1.1 },
  { url: `${M3}/sample-carousel/sample-carousel.gltf`, height: 0.8, at: [0.9, 0, -2.6], turn: -0.5, hotspot: 'report', labelY: 0.35 },
  { url: `${M3}/camera-housing/camera-housing.gltf`, height: 0.7, at: [-0.4, 0, -2.4], turn: 0.6 },
  { url: `${M3}/optical-bench/optical-bench.gltf`, height: 0.6, at: [1.7, 0, 0.3], turn: -1.5 },
];
// Mission 04: an evidence hall. Statements on the board, sources in the archive, appraisal at the review desk.
export const TRIAL_PROPS: Prop[] = [
  { url: `${M4}/document-board/document-board.gltf`, height: 1.5, at: [-1.4, 0, -1.2], turn: 0.9, hotspot: 'statements', labelY: 1.0 },
  { url: `${M4}/archive-unit/archive-unit.gltf`, height: 1.9, at: [-1.55, 0, -0.5], turn: 1.3, hotspot: 'archive', labelY: 0.45 },
  { url: `${M4}/review-desk/review-desk.gltf`, height: 1.1, at: [0.3, 0, -2.6], turn: 0, hotspot: 'appraise', labelY: 1.15 },
  { url: `${M4}/evidence-lectern/evidence-lectern.gltf`, height: 1.2, at: [1.5, 0, -1.0], turn: -1.2, hotspot: 'report', labelY: 1.0 },
  { url: `${M4}/comparison-console/comparison-console.gltf`, height: 0.8, at: [1.7, 0, -0.3], turn: -1.4 },
  { url: `${M4}/evidence-table/evidence-table.gltf`, height: 0.95, at: [-0.2, 0, -1.4], turn: 0.15 },
  { url: `${M4}/claim-card-stand/claim-card-stand.gltf`, height: 0.35, at: [-0.2, 0.62, -1.4], turn: 0.15 },
  { url: `${M4}/evidence-podium/evidence-podium.gltf`, height: 0.8, at: [-1.0, 0, -2.8], turn: 0.3 },
  { url: `${M4}/filing-cart/filing-cart.gltf`, height: 0.9, at: [1.0, 0, -3.0], turn: -0.6 },
];
// Mission 05: a FICTIONAL lunar habitat research room (scenario, not NASA evidence).
export const HABITAT_PROPS: Prop[] = [
  { url: `${M5}/research-workstation/research-workstation.gltf`, height: 1.3, at: [-2.1, 0, -0.4], turn: 0.9, hotspot: 'conditions', labelY: 1.05 },
  { url: `${M5}/life-support/life-support.gltf`, height: 1.6, at: [2.3, 0, -1.6], turn: -1.1, hotspot: 'assess', labelY: 0.95 },
  { url: `${M5}/utility-robot/utility-robot.gltf`, height: 1.0, at: [0.5, 0, -1.2], turn: 0.4, hotspot: 'decide', labelY: 1.15 },
  { url: `${M5}/airlock-hatch/airlock-hatch.gltf`, height: 2.0, at: [0.9, 0, -5.2], turn: 0, hotspot: 'report', labelY: 0.85 },
  { url: `${M5}/ventilation-unit/ventilation-unit.gltf`, height: 1.2, at: [-2.6, 0, -3.0], turn: 1.1, hotspot: 'evidence', labelY: 1.0 },
  { url: `${M5}/inspection-drone/inspection-drone.gltf`, height: 0.4, at: [1.4, 2.1, -2.6], turn: -0.4 },
  { url: `${M5}/oxygen-rack/oxygen-rack.gltf`, height: 1.1, at: [3.0, 0, -3.4], turn: -1.2 },
];
export type StationScene = { setActive(id: HotspotId | null): void; dispose(): void };
/** Each mission has its own world: architecture, light, sky and camera differ, not just the props or a colour. */
export type Environment = 'station' | 'lab' | 'court' | 'lunar';
type World = { background: string; exposure: number; camera: [number, number, number]; target: [number, number, number]; fov: number; drift: number; far: number };
const WORLDS: Record<Environment, World> = {
  station: { background: '#eef1ff', exposure: 1.0, camera: [0, 1.55, 2.6], target: [0, 1.0, -1.6], fov: 52, drift: 0.18, far: 40 },
  lab: { background: '#04050d', exposure: 1.15, camera: [0, 2.05, 2.7], target: [0, 0.9, -1.8], fov: 50, drift: 0.12, far: 40 },
  court: { background: '#120d0a', exposure: 1.05, camera: [0, 1.7, 3.4], target: [0, 1.45, -2.2], fov: 54, drift: 0.1, far: 40 },
  lunar: { background: '#000000', exposure: 1.1, camera: [0, 1.75, 4.6], target: [0, 1.2, -3.0], fov: 55, drift: 0.22, far: 160 },
};

export function mountStationScene(canvas: HTMLCanvasElement, opts: {
  props?: Prop[]; environment?: Environment;
  onPositions(p: Partial<Record<HotspotId, { x: number; y: number; visible: boolean }>>): void;
  onReady(): void; reducedMotion: boolean;
}): StationScene | null {
  const PROPS = opts.props ?? STATION_PROPS;
  let renderer: THREE.WebGLRenderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false }); } catch { return null; }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.outputColorSpace = THREE.SRGBColorSpace;
  const world = WORLDS[opts.environment ?? 'station'];
  renderer.toneMappingExposure = world.exposure;
  const scene = new THREE.Scene(); scene.background = new THREE.Color(world.background);
  const camera = new THREE.PerspectiveCamera(world.fov, 1, 0.05, world.far); camera.position.set(...world.camera);
  const target = new THREE.Vector3(...world.target);
  const disposables: { dispose(): void }[] = [];
  const mat = (color: string, extra: THREE.MeshStandardMaterialParameters = {}) => { const m = new THREE.MeshStandardMaterial({ color, roughness: 0.75, ...extra }); disposables.push(m); return m; };
  const geo = <G extends THREE.BufferGeometry>(g: G) => { disposables.push(g); return g; };
  let pulse: THREE.Mesh | null = null;
  const box = (w: number, h: number, d: number, m: THREE.Material, x: number, y: number, z: number) => { const o = new THREE.Mesh(geo(new THREE.BoxGeometry(w, h, d)), m); o.position.set(x, y, z); scene.add(o); return o; };
  ({ station: buildStation, lab: buildLab, court: buildCourt, lunar: buildLunar })[opts.environment ?? 'station']();

  // Mission 01 — orbital module: cream panels, ultramarine ribs, lavender floor, a porthole onto Earth.
  function buildStation() {
    scene.add(new THREE.HemisphereLight('#ffffff', '#c9cdff', 1.7));
    const key = new THREE.DirectionalLight('#fff4dc', 2.2); key.position.set(2, 4, 3); scene.add(key);
    const shell = new THREE.Mesh(geo(new THREE.CylinderGeometry(2.2, 2.2, 7, 24, 1, true)), mat('#f7f8ff', { side: THREE.BackSide }));
    shell.rotation.x = Math.PI / 2; shell.position.set(0, 1.2, -0.6); scene.add(shell);
    for (let z = -3.4; z <= 2.2; z += 1.4) { const rib = new THREE.Mesh(geo(new THREE.TorusGeometry(2.18, 0.022, 6, 48)), mat('#5b5ce6')); rib.position.set(0, 1.2, z); scene.add(rib); }
    const floor = new THREE.Mesh(geo(new THREE.PlaneGeometry(3.6, 7)), mat('#c9cdff')); floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, -0.6); scene.add(floor);
    const endWall = new THREE.Mesh(geo(new THREE.CircleGeometry(2.2, 32)), mat('#e4e7ff')); endWall.position.set(0, 1.2, -4.05); scene.add(endWall);
    const port = new THREE.Mesh(geo(new THREE.CircleGeometry(0.42, 32)), mat('#3d6dff', { emissive: '#2346d6', emissiveIntensity: 0.6 })); port.position.set(-1.25, 1.9, -4.0); scene.add(port);
    const land = new THREE.Mesh(geo(new THREE.CircleGeometry(0.2, 20)), mat('#2ee6a6', { emissive: '#0a7a52', emissiveIntensity: 0.4 })); land.position.set(-1.33, 1.82, -3.99); scene.add(land);
    const portRim = new THREE.Mesh(geo(new THREE.TorusGeometry(0.44, 0.04, 8, 32)), mat('#15153d')); portRim.position.copy(port.position); scene.add(portRim);
  }

  // Mission 03 — dark observation laboratory: a rectangular instrument room lit by ceiling strips, an instrument grid
  // on the floor and a glass test chamber holding an ILLUSTRATIVE blue flame (not B20 footage, not a measurement).
  function buildLab() {
    scene.fog = new THREE.Fog('#04050d', 5, 12);
    scene.add(new THREE.HemisphereLight('#7f9cff', '#04050d', 0.45));
    const room = new THREE.Mesh(geo(new THREE.BoxGeometry(5.6, 3.4, 8)), mat('#141826', { side: THREE.BackSide, roughness: 0.9 })); room.position.set(0, 1.7, -1.2); scene.add(room);
    const grid = new THREE.GridHelper(5.6, 28, '#2a4dff', '#17213f'); grid.position.set(0, 0.002, -1.2); scene.add(grid); disposables.push(grid.geometry, grid.material as THREE.Material);
    const strip = mat('#cfe0ff', { emissive: '#9fc0ff', emissiveIntensity: 1.6 });
    for (const x of [-1.6, 0, 1.6]) box(0.08, 0.03, 6.4, strip, x, 3.38, -1.2);
    const spot = new THREE.SpotLight('#bcd2ff', 26, 9, 0.5, 0.6, 1.6); spot.position.set(0, 3.3, -0.6); spot.target.position.set(0, 0.6, -1.9); scene.add(spot, spot.target);
    const rim = new THREE.PointLight('#4f7dff', 6, 5, 2); rim.position.set(0, 1.2, -1.9); scene.add(rim);
    // Test chamber: pedestal, glass cylinder, steel caps, a sample rod and a glowing spherical illustrative flame.
    box(0.9, 0.55, 0.9, mat('#20253a', { metalness: 0.6, roughness: 0.4 }), 0, 0.275, -1.9);
    const glass = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.38, 0.38, 0.9, 40, 1, true)), new THREE.MeshPhysicalMaterial({ color: '#9fd0ff', transparent: true, opacity: 0.16, roughness: 0.05, metalness: 0, side: THREE.DoubleSide }));
    disposables.push(glass.material as THREE.Material); glass.position.set(0, 1.0, -1.9); scene.add(glass);
    for (const y of [0.55, 1.45]) { const cap = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.42, 0.42, 0.05, 40)), mat('#8a93ad', { metalness: 0.8, roughness: 0.3 })); cap.position.set(0, y, -1.9); scene.add(cap); }
    const rod = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.012, 0.012, 0.36, 12)), mat('#d9dde8')); rod.rotation.z = Math.PI / 2; rod.position.set(-0.13, 1.0, -1.9); scene.add(rod);
    const flame = new THREE.Mesh(geo(new THREE.SphereGeometry(0.1, 24, 16)), new THREE.MeshBasicMaterial({ color: '#4f8dff', transparent: true, opacity: 0.55 }));
    disposables.push(flame.material as THREE.Material); flame.scale.set(1.3, 1, 1); flame.position.set(0.05, 1.0, -1.9); scene.add(flame); pulse = flame;
  }

  // Mission 04 — evidence hall: a tall, warm panelled courtroom with a raised bench and a lit exhibit wall of four
  // claim cards. Rectangular, high-ceilinged and wood-toned: nothing like the orbital module.
  function buildCourt() {
    scene.add(new THREE.HemisphereLight('#ffe7c4', '#1a120c', 0.55));
    const key = new THREE.SpotLight('#ffd9a8', 34, 12, 0.7, 0.5, 1.4); key.position.set(0, 4.6, 1.2); key.target.position.set(0, 1.0, -2.4); scene.add(key, key.target);
    const room = new THREE.Mesh(geo(new THREE.BoxGeometry(7, 5.2, 9)), mat('#2b1d14', { side: THREE.BackSide, roughness: 0.85 })); room.position.set(0, 2.6, -1.5); scene.add(room);
    const floor = new THREE.Mesh(geo(new THREE.PlaneGeometry(7, 9)), mat('#3a2a20', { roughness: 0.35, metalness: 0.1 })); floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0.001, -1.5); scene.add(floor);
    const pilaster = mat('#6b4c35', { roughness: 0.6 });
    for (const x of [-3.3, -1.8, 1.8, 3.3]) box(0.28, 5.2, 0.2, pilaster, x, 2.6, -5.85);
    for (const z of [-4.2, -2.2, -0.2, 1.8]) { box(0.2, 5.2, 0.28, pilaster, -3.45, 2.6, z); box(0.2, 5.2, 0.28, pilaster, 3.45, 2.6, z); }
    // Raised bench across the back wall, with a lit exhibit wall of four claim cards above it.
    box(4.6, 0.35, 1.4, mat('#4a3322', { roughness: 0.5 }), 0, 0.175, -5.0);
    box(4.2, 1.05, 0.5, mat('#5a3d28', { roughness: 0.45 }), 0, 0.875, -4.6);
    box(4.6, 1.5, 0.06, mat('#1d1510'), 0, 3.15, -5.82);
    const card = mat('#f3e6cf', { emissive: '#ffcf8a', emissiveIntensity: 0.35, roughness: 0.6 });
    for (let i = 0; i < 4; i++) box(0.9, 1.1, 0.03, card, -1.65 + i * 1.1, 3.15, -5.77);
    for (const x of [-2.2, 2.2]) { const lamp = new THREE.PointLight('#ffb870', 5, 6, 2); lamp.position.set(x, 3.9, -1.6); scene.add(lamp);
      const shade = new THREE.Mesh(geo(new THREE.ConeGeometry(0.22, 0.28, 20, 1, true)), mat('#e8c08a', { emissive: '#ffb870', emissiveIntensity: 0.9, side: THREE.DoubleSide })); shade.position.set(x, 4.05, -1.6); scene.add(shade); }
  }

  // Mission 05 — FICTIONAL lunar outpost exterior: grey regolith with craters, a black sky with stars, the Earth low
  // over the horizon, a habitat dome, and a low hard Sun. An original illustration, not NASA imagery.
  function buildLunar() {
    scene.add(new THREE.HemisphereLight('#9fb4ff', '#1b1a18', 0.28));
    const sun = new THREE.DirectionalLight('#fff6e8', 3.4); sun.position.set(-8, 4, 3); scene.add(sun);
    const ground = geo(new THREE.PlaneGeometry(120, 120, 120, 120)), pos = ground.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), r = Math.hypot(x, y + 3);
      let z = Math.sin(x * 0.35) * Math.cos(y * 0.29) * 0.12 + Math.sin(x * 1.7 + y * 1.3) * 0.03;
      for (const [cx, cy, cr] of [[-5, 6, 2.4], [6, 9, 3.2], [-9, -2, 1.6], [4, -6, 1.2], [11, 2, 2.0]] as const) {
        const d = Math.hypot(x - cx, y - cy) / cr; if (d < 1.25) z += d < 1 ? -0.35 * (1 - d * d) : 0.18 * (1.25 - d) * 4 * (d - 1);
      }
      pos.setZ(i, r < 3.5 ? z * 0.2 : z);
    }
    ground.computeVertexNormals();
    const regolith = new THREE.Mesh(ground, mat('#8e8a84', { roughness: 1, flatShading: true })); regolith.rotation.x = -Math.PI / 2; regolith.position.set(0, -0.02, -3); scene.add(regolith);
    // Stars on a far sphere; the Earth low over the horizon.
    const starsGeo = geo(new THREE.BufferGeometry()), pts: number[] = [];
    let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 1400; i++) { const t = rnd() * Math.PI * 2, u = rnd() * 0.95; const r = 140; pts.push(Math.cos(t) * Math.sqrt(1 - u * u) * r, u * r, Math.sin(t) * Math.sqrt(1 - u * u) * r); }
    starsGeo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    const starMat = new THREE.PointsMaterial({ color: '#ffffff', size: 0.35, sizeAttenuation: true }); disposables.push(starMat); scene.add(new THREE.Points(starsGeo, starMat));
    const earth = new THREE.Mesh(geo(new THREE.SphereGeometry(5, 48, 32)), mat('#2f62d8', { emissive: '#1a3c9e', emissiveIntensity: 0.55, roughness: 0.7 })); earth.position.set(22, 18, -95); scene.add(earth);
    const land = new THREE.Mesh(geo(new THREE.SphereGeometry(5.05, 24, 16, 0.6, 1.3, 0.9, 0.8)), mat('#3f8f5a', { emissive: '#1d4d2b', emissiveIntensity: 0.4 })); land.position.copy(earth.position); scene.add(land);
    // Habitat: a pressurised dome, two cylinder modules and a connecting tunnel, set back on the plain.
    const shell = mat('#e9ecf1', { roughness: 0.55, metalness: 0.15 }), band = mat('#9aa3b3', { roughness: 0.5, metalness: 0.4 });
    const dome = new THREE.Mesh(geo(new THREE.SphereGeometry(2.6, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2)), shell); dome.position.set(-0.4, 0, -8.5); scene.add(dome);
    const ringBand = new THREE.Mesh(geo(new THREE.TorusGeometry(2.62, 0.08, 8, 64)), band); ringBand.rotation.x = Math.PI / 2; ringBand.position.set(-0.4, 0.05, -8.5); scene.add(ringBand);
    for (const [x, z, ry] of [[4.2, -9.6, 0.25], [-5.4, -9.2, -0.2]] as const) { const mod = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.95, 0.95, 3.4, 28)), shell); mod.rotation.set(0, ry, Math.PI / 2); mod.position.set(x, 0.95, z); scene.add(mod); }
    const tunnel = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.55, 0.55, 3.2, 20)), band); tunnel.rotation.set(Math.PI / 2, 0, 0); tunnel.position.set(0.9, 0.6, -6.6); scene.add(tunnel);
    const window1 = new THREE.Mesh(geo(new THREE.CircleGeometry(0.45, 24)), mat('#ffd38a', { emissive: '#ffb04a', emissiveIntensity: 1.2 })); window1.position.set(-1.4, 1.5, -6.05); window1.lookAt(camera.position); scene.add(window1);
  }

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
    if (!opts.reducedMotion) drift = Math.sin(t / 4000) * world.drift;
    camera.position.x = world.camera[0] + drift; camera.lookAt(target);
    if (pulse && !opts.reducedMotion) { const k = 1 + Math.sin(t / 900) * 0.05; pulse.scale.set(1.3 * k, k, k); }
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
