// The MicroFire Observatory: an original, procedural three.js scene (artistic interpretation, not a NASA reconstruction).
// Loaded only by the home page, after first paint. All geometry and textures are generated in code; no external assets.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

export type Anchor = { x: number; y: number; visible: boolean };
export type ObservatoryApi = { setGravity(g: number): void; setMotion(on: boolean): void; focusStation(i: number | null): void; resize(): void; stop(): void };
export type ObservatoryOptions = {
  canvas: HTMLCanvasElement; host: HTMLElement; stage: () => DOMRect | null; stations: string[];
  mobile: boolean; motion: boolean; gravity: number;
  onAnchors: (anchors: Anchor[]) => void; onLost: () => void; onRestored: () => void;
};

const ease = (t: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);
const BLUE = new THREE.Color('#6fa6ff'), ORANGE = new THREE.Color('#ff9446');

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
function glowTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const x = c.getContext('2d')!; const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.25, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
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
  scene.fog = new THREE.FogExp2('#04070c', 0.022);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = new RoomEnvironment();
  scene.environment = pmrem.fromScene(env, 0.04).texture;
  scene.environmentIntensity = 0.32;
  const camera = new THREE.PerspectiveCamera(o.mobile ? 44 : 34, 1, 0.1, 400);

  // ---- light ----
  scene.add(new THREE.HemisphereLight('#4a73a0', '#05070b', 0.7));
  const rim = new THREE.DirectionalLight('#9fd8ef', 1.6); rim.position.set(-8, 9, -12); scene.add(rim);
  const key = new THREE.DirectionalLight('#ffd2a6', 0.5); key.position.set(6, 5, 8); scene.add(key);
  const flameLight = new THREE.PointLight('#ff9446', 30, 18, 1.5); scene.add(flameLight);

  // ---- materials ----
  const metal = new THREE.MeshStandardMaterial({ color: '#1d2a38', metalness: 0.85, roughness: 0.32 });
  const trim = new THREE.MeshStandardMaterial({ color: '#33475b', metalness: 0.7, roughness: 0.45 });
  const cyanLine = new THREE.MeshStandardMaterial({ color: '#000000', emissive: '#73bbd9', emissiveIntensity: 1.6 });
  const orangeLine = new THREE.MeshStandardMaterial({ color: '#000000', emissive: '#ff8738', emissiveIntensity: 1.8 });

  // ---- space: stars, planet limb ----
  const n = o.mobile ? 900 : 1800, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const u = Math.random() * 2 - 1, th = Math.random() * Math.PI * 2, r = 70 + Math.random() * 30, s = Math.sqrt(1 - u * u);
    pos.set([r * s * Math.cos(th), r * u * 0.8 + 10, -Math.abs(r * s * Math.sin(th)) - 10], i * 3);
  }
  const starGeo = new THREE.BufferGeometry(); starGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: '#dbe9ff', size: 0.28, sizeAttenuation: true, transparent: true, opacity: 0.85, depthWrite: false, fog: false }));
  scene.add(stars);
  const planetMat = new THREE.ShaderMaterial({
    fog: false,
    uniforms: { sun: { value: new THREE.Vector3(-0.6, 0.5, 0.6).normalize() } },
    vertexShader: 'varying vec3 vN; varying vec3 vV; varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.); vW = normalize(position); vN = normalize(mat3(modelMatrix) * normal); vV = normalize(cameraPosition - w.xyz); gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: `uniform vec3 sun; varying vec3 vN; varying vec3 vV; varying vec3 vW;
      float h(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,37.719))) * 43758.5453); }
      float n3(vec3 p){ vec3 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(mix(h(i),h(i+vec3(1,0,0)),f.x),mix(h(i+vec3(0,1,0)),h(i+vec3(1,1,0)),f.x),f.y),mix(mix(h(i+vec3(0,0,1)),h(i+vec3(1,0,1)),f.x),mix(h(i+vec3(0,1,1)),h(i+vec3(1,1,1)),f.x),f.y),f.z); }
      void main(){ float l = clamp(dot(vN, sun), 0., 1.); float land = smoothstep(.55,.62, n3(vW*4.)*.6 + n3(vW*9.)*.4);
        float cloud = smoothstep(.6,.8, n3(vW*7. + 3.)); vec3 ocean = mix(vec3(.015,.05,.11), vec3(.05,.17,.32), l);
        vec3 col = mix(ocean, vec3(.16,.22,.17)*(.3+l), land*.7); col = mix(col, vec3(.85,.9,1.)*(.25+l), cloud*.55);
        float rim = pow(1. - max(dot(vN, vV), 0.), 2.6); col += vec3(.3,.55,.9) * rim * (.15 + .6 * l);
        gl_FragColor = vec4(col, 1.); }`
  });
  const planet = new THREE.Mesh(new THREE.SphereGeometry(30, 96, 64), planetMat);
  planet.position.set(24, -36, -78); scene.add(planet);
  const atmosphere = new THREE.Mesh(new THREE.SphereGeometry(31.6, 64, 48), new THREE.ShaderMaterial({
    fog: false, transparent: true, blending: THREE.AdditiveBlending, side: THREE.BackSide, depthWrite: false,
    vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vec4 w = modelMatrix * vec4(position,1.); vN = normalize(mat3(modelMatrix)*normal); vV = normalize(cameraPosition - w.xyz); gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: 'varying vec3 vN; varying vec3 vV; void main(){ float r = pow(max(dot(vN, vV), 0.), 3.); gl_FragColor = vec4(vec3(.28,.52,.9) * r * .85, r * .8); }'
  }));
  atmosphere.position.copy(planet.position); scene.add(atmosphere);

  // ---- observation deck: window ring, struts, floor ----
  const deck = new THREE.Group(); scene.add(deck);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(17, 0.32, 20, 200), metal); ring.position.set(0, 3, -20); deck.add(ring);
  const ringLine = new THREE.Mesh(new THREE.TorusGeometry(16.55, 0.04, 8, 200), cyanLine); ringLine.position.copy(ring.position); deck.add(ringLine);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2, strut = new THREE.Mesh(new THREE.BoxGeometry(0.22, 2.6, 0.5), trim);
    strut.position.set(Math.cos(a) * 18.6, 3 + Math.sin(a) * 18.6, -20); strut.rotation.z = a + Math.PI / 2; deck.add(strut);
  }
  const floorMat = new THREE.ShaderMaterial({
    fog: true, uniforms: { ...THREE.UniformsLib.fog },
    vertexShader: '#include <fog_pars_vertex>\nvarying vec2 vP; void main(){ vP = position.xz; vec4 mvPosition = modelViewMatrix * vec4(position,1.); gl_Position = projectionMatrix * mvPosition;\n#include <fog_vertex>\n}',
    fragmentShader: `#include <fog_pars_fragment>
      varying vec2 vP; void main(){ float r = length(vP); float a = atan(vP.y, vP.x);
      float rings = smoothstep(.04, .0, abs(fract(r * .8) - .5) - .46); float spokes = smoothstep(.02, .0, abs(fract(a * 12. / 6.2831) - .5) - .48) * step(1.9, r);
      vec3 base = vec3(.035,.05,.07) * (1. - r * .03); vec3 col = base + vec3(.27,.55,.7) * (rings * .35 + spokes * .18) * smoothstep(12., 2., r);
      gl_FragColor = vec4(col, 1.);
      #include <fog_fragment>
      }`
  });
  const floor = new THREE.Mesh(new THREE.CircleGeometry(14, 96), floorMat); floor.rotation.x = -Math.PI / 2; floor.position.y = -2.45; deck.add(floor);

  // ---- combustion observation chamber (artistic) ----
  const chamber = new THREE.Group(); scene.add(chamber);
  const glass = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 2.2, 72, 1, true), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vec4 w = modelMatrix * vec4(position,1.); vN = normalize(mat3(modelMatrix)*normal); vV = normalize(cameraPosition - w.xyz); gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: 'varying vec3 vN; varying vec3 vV; void main(){ float f = pow(1. - abs(dot(vN, vV)), 2.2); gl_FragColor = vec4(vec3(.45,.78,.95) * (f * .55 + .02), 1.); }'
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
  const pedLine = new THREE.Mesh(new THREE.TorusGeometry(1.62, 0.028, 8, 96), orangeLine); pedLine.rotation.x = Math.PI / 2; pedLine.position.y = -1.48; chamber.add(pedLine);
  const glowTex = glowTexture();
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: ORANGE.clone(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.55 }));
  chamber.add(glow);

  // ---- research stations: each leads to a real, implemented page ----
  const stationGroups: THREE.Group[] = [], screens: THREE.MeshBasicMaterial[] = [], pads: THREE.MeshBasicMaterial[] = [], anchors: THREE.Vector3[] = [];
  const angles = o.stations.map((_, i) => THREE.MathUtils.degToRad(-48 + i * (100 / Math.max(1, o.stations.length - 1))));
  let pixHead: THREE.Group | null = null;
  o.stations.forEach((title, i) => {
    const g = new THREE.Group(), a = angles[i]!, R = 6;
    g.position.set(Math.sin(a) * R + 0.6, -2.45, -Math.cos(a) * R - 2.2); g.lookAt(0, -2.45, 0);
    const pad = new THREE.MeshBasicMaterial({ color: '#73bbd9', transparent: true, opacity: 0.25 }); pads.push(pad);
    const ringMesh = new THREE.Mesh(new THREE.RingGeometry(0.85, 0.95, 48), pad); ringMesh.rotation.x = -Math.PI / 2; ringMesh.position.y = 0.02; g.add(ringMesh);
    if (title === 'PIX') {
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.4, 0.9, 32), metal); body.position.y = 0.45; g.add(body);
      pixHead = new THREE.Group(); pixHead.position.y = 1.35; g.add(pixHead);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.42, 32, 24), trim); head.scale.set(1.25, 0.95, 1); pixHead.add(head);
      const visor = new THREE.Mesh(new THREE.SphereGeometry(0.36, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2.2), new THREE.MeshStandardMaterial({ color: '#05080d', metalness: 0.2, roughness: 0.2 }));
      visor.rotation.x = Math.PI / 2; visor.position.z = 0.1; visor.scale.set(1.15, 1, 0.8); pixHead.add(visor);
      for (const x of [-0.13, 0.13]) { const eye = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 8), new THREE.MeshBasicMaterial({ color: '#9fe3e3' })); eye.position.set(x, 0.02, 0.4); pixHead.add(eye); }
      const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.3, 8), trim); ant.position.y = 0.48; pixHead.add(ant);
      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), new THREE.MeshBasicMaterial({ color: '#ff8738' })); tip.position.y = 0.66; pixHead.add(tip);
      screens.push(new THREE.MeshBasicMaterial()); // placeholder so indices line up
      anchors.push(new THREE.Vector3(0, 2.2, 0));
    } else {
      const base = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.95, 0.7), metal); base.position.y = 0.48; g.add(base);
      const lip = new THREE.Mesh(new THREE.BoxGeometry(1.56, 0.05, 0.76), cyanLine); lip.position.y = 0.97; g.add(lip);
      const mat = new THREE.MeshBasicMaterial({ map: screenTexture(i, title), toneMapped: false, color: new THREE.Color(0.75, 0.75, 0.75) }); screens.push(mat);
      const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.36, 0.85), mat); screen.position.set(0, 1.55, 0.05); screen.rotation.x = -0.2; g.add(screen);
      const frameMesh = new THREE.Mesh(new THREE.BoxGeometry(1.46, 0.95, 0.06), trim); frameMesh.position.set(0, 1.55, 0.01); frameMesh.rotation.x = -0.2; g.add(frameMesh);
      anchors.push(new THREE.Vector3(0, 2.15, 0));
    }
    scene.add(g); stationGroups.push(g);
  });

  // ---- camera rig: orbit about the chamber so it stays aligned with the HTML flame stage ----
  const rig = { yaw: -0.9, pitch: 0.45, dist: 9, tYaw: 0, tPitch: o.mobile ? 0.24 : 0.2, px: 0, py: 0, drag: 0 };
  let width = 1, height = 1, g = o.gravity, shownG = g, motion = o.motion, focus: number | null = null, frame = 0, lost = false, t0 = performance.now();
  const entranceStart = performance.now(), entranceMs = o.motion ? 2600 : 0;
  if (!o.motion) { rig.yaw = rig.tYaw; rig.pitch = rig.tPitch; }

  const layout = () => {
    const r = o.host.getBoundingClientRect(); width = Math.max(1, r.width); height = Math.max(1, r.height);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    const s = o.stage();
    const sx = s ? s.left + s.width / 2 - r.left : width * 0.7, sy = s ? s.top + s.height / 2 - r.top : height * 0.5;
    const half = s ? Math.min(s.width, s.height) / 2 : Math.min(width, height) * 0.3;
    // Glass radius (1 unit) projects to ~42% of the stage's half-size (38% on phones), so the HTML flame sits inside the chamber.
    rig.dist = (height / 2) / (Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * half * (o.mobile ? 0.38 : 0.42));
    camera.setViewOffset(width, height, width / 2 - sx, height / 2 - sy, width, height);
    camera.updateProjectionMatrix();
  };
  const v = new THREE.Vector3();
  const render = (now: number) => {
    const t = (now - t0) / 1000;
    const k = entranceMs ? ease((now - entranceStart) / entranceMs) : 1;
    const targetYaw = rig.tYaw + rig.px + rig.drag + (focus !== null ? angles[focus]! * 0.32 : 0) + (motion ? Math.sin(t * 0.06) * 0.03 : 0);
    const targetPitch = rig.tPitch + rig.py;
    if (k < 1) { rig.yaw = THREE.MathUtils.lerp(-0.9, targetYaw, k); rig.pitch = THREE.MathUtils.lerp(0.45, targetPitch, k); }
    else { rig.yaw += (targetYaw - rig.yaw) * (motion ? 0.06 : 1); rig.pitch += (targetPitch - rig.pitch) * (motion ? 0.06 : 1); }
    camera.position.set(Math.sin(rig.yaw) * Math.cos(rig.pitch) * rig.dist, Math.sin(rig.pitch) * rig.dist, Math.cos(rig.yaw) * Math.cos(rig.pitch) * rig.dist);
    camera.lookAt(0, 0, 0);
    shownG += (g - shownG) * (motion ? 0.1 : 1);
    const flicker = motion ? 1 + Math.sin(t * 13.1) * 0.04 * shownG + Math.sin(t * 7.3) * 0.03 : 1;
    flameLight.color.copy(BLUE).lerp(ORANGE, shownG); flameLight.intensity = (14 + 26 * shownG) * flicker;
    glow.material.color.copy(BLUE).lerp(ORANGE, shownG); glow.scale.set(1.9 - shownG * 0.5, 1.9 + shownG * 1.1, 1); glow.position.y = shownG * 0.25;
    glow.material.opacity = (0.45 + 0.2 * shownG) * flicker;
    if (pixHead) { (pixHead as THREE.Group).position.y = 1.35 + (motion ? Math.sin(t * 1.6) * 0.05 : 0); (pixHead as THREE.Group).rotation.y = motion ? Math.sin(t * 0.5) * 0.25 : 0; }
    stars.rotation.y = motion ? t * 0.003 : 0;
    screens.forEach((m, i) => m.color.setScalar(focus === i ? 1.25 : 0.75));
    pads.forEach((m, i) => { m.color.set(focus === i ? '#ff8738' : '#73bbd9'); m.opacity = focus === i ? 0.9 : 0.25; });
    renderer.render(scene, camera);
    o.onAnchors(stationGroups.map((grp, i) => {
      v.copy(anchors[i]!); grp.localToWorld(v); v.project(camera);
      return { x: ((v.x + 1) / 2) * width, y: ((1 - v.y) / 2) * height, visible: v.z < 1 && Math.abs(v.x) < 1.05 && Math.abs(v.y) < 1.05 };
    }));
    return k < 1 || Math.abs(targetYaw - rig.yaw) > 0.0005 || Math.abs(targetPitch - rig.pitch) > 0.0005 || Math.abs(g - shownG) > 0.002;
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
    rig.px = (((e.clientX - r.left) / r.width) - 0.5) * 0.16; rig.py = (((e.clientY - r.top) / r.height) - 0.5) * 0.06; kick();
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
    setMotion(on) { motion = on; if (on) t0 = performance.now() - 1; kick(); },
    focusStation(i) { focus = i; kick(); },
    resize() { layout(); kick(); },
    stop() {
      cancelAnimationFrame(frame); frame = 0; lost = true;
      o.canvas.removeEventListener('pointerdown', onDown); window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp);
      o.canvas.removeEventListener('webglcontextlost', onLost); o.canvas.removeEventListener('webglcontextrestored', onRestored);
      scene.traverse((obj) => {
        const m = obj as THREE.Mesh;
        m.geometry?.dispose();
        (Array.isArray(m.material) ? m.material : m.material ? [m.material] : []).forEach((mat) => { (mat as THREE.MeshBasicMaterial).map?.dispose(); mat.dispose(); });
      });
      glowTex.dispose(); scene.environment?.dispose(); pmrem.dispose(); env.dispose?.(); renderer.dispose();
    }
  };
}
