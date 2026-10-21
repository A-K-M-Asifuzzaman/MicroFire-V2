// Design A: the orbital observatory as a lit exhibit hall. One hero object (the Meshy chamber with MicroFire's own
// volumetric flame illustration inside), a colonnade of Meshy structural arches, and the Training Bay gateway glowing
// behind it. Light carries meaning: an arch lights only when its station is chosen. Everything here is illustrative.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { cleanFinish, loadModel } from '../../model-loader';
import { flameVolume } from '../flame-volume';

export type AApi = { setGravity(g: number): void; setStation(i: number | null): void; setBay(on: boolean): void; setMotion(on: boolean): void; resize(): void; stop(): void };
export type AOptions = { canvas: HTMLCanvasElement; host: HTMLElement; mobile: boolean; motion: boolean; stations: number;
  onProgress(loaded: number, total: number): void; onLost(): void };

const glowTexture = () => {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const x = c.getContext('2d')!, g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.3, 'rgba(255,255,255,.45)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
};
const fit = (obj: THREE.Object3D, height: number) => {
  const box = new THREE.Box3().setFromObject(obj), size = box.getSize(new THREE.Vector3());
  obj.scale.multiplyScalar(height / Math.max(1e-6, size.y));
  box.setFromObject(obj); const c = box.getCenter(new THREE.Vector3());
  obj.position.sub(new THREE.Vector3(c.x, box.min.y, c.z));
};
const ease = (t: number) => { const x = Math.min(1, Math.max(0, t)); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };

export function startA(o: AOptions): AApi | null {
  let renderer: THREE.WebGLRenderer;
  try { renderer = new THREE.WebGLRenderer({ canvas: o.canvas, antialias: true, powerPreference: 'high-performance' }); } catch { return null; }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, o.mobile ? 1.5 : 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#07080a');
  scene.fog = new THREE.FogExp2('#07080a', o.mobile ? 0.05 : 0.055);
  const pmrem = new THREE.PMREMGenerator(renderer), room = new RoomEnvironment();
  scene.environment = pmrem.fromScene(room, 0.04).texture; scene.environmentIntensity = 0.32;
  const camera = new THREE.PerspectiveCamera(o.mobile ? 42 : 30, 1, 0.1, 200);
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.5, 0.6, 0.8); composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const glowTex = glowTexture();
  const disposables: { dispose(): void }[] = [glowTex];

  // ---- light: top key on the titanium, teal back rim, the flame, and the gateway beyond ----
  scene.add(new THREE.HemisphereLight('#2c3238', '#050607', 0.32));
  const key = new THREE.SpotLight('#e4ecff', 70, 18, 0.42, 0.65, 1.6); key.position.set(1.2, 7.5, 2.4); key.target.position.set(0, 1.4, 0); scene.add(key, key.target);
  // Cool neutral back light separates the titanium from the dark; teal is kept for live state only.
  const rim = new THREE.DirectionalLight('#a9bccb', 0.9); rim.position.set(-3, 4, -8); scene.add(rim);
  const warm = new THREE.PointLight('#ff6a1f', 10, 7, 1.6); warm.position.set(0, 1.65, 0); scene.add(warm);
  const gate = new THREE.PointLight('#bfefff', 22, 14, 1.4); gate.position.set(0, 2.6, -6.2); scene.add(gate);

  // ---- floor: dark machined deck with inlaid rings and the flame's light pool ----
  const floor = new THREE.Mesh(new THREE.CircleGeometry(30, 96), new THREE.MeshStandardMaterial({ color: '#101316', metalness: 0.75, roughness: 0.32 }));
  floor.rotation.x = -Math.PI / 2; scene.add(floor);
  const inlay = new THREE.MeshStandardMaterial({ color: '#000', emissive: '#8c959c', emissiveIntensity: 0.18 });
  for (const r of [1.7, 2.6, 4.4]) { const ring = new THREE.Mesh(new THREE.RingGeometry(r, r + 0.012, 160), inlay); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.003; scene.add(ring); }
  const poolMesh = new THREE.Mesh(new THREE.PlaneGeometry(5, 5), new THREE.MeshBasicMaterial({ map: glowTex, color: '#ff7a2a', transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false }));
  poolMesh.rotation.x = -Math.PI / 2; poolMesh.position.y = 0.01; scene.add(poolMesh);

  // ---- the hero: MicroFire's volumetric flame illustration, then the Meshy chamber around it ----
  const flame = flameVolume(1.3, 2.4); flame.mesh.position.set(0, 1.66, 0); scene.add(flame.mesh); disposables.push(flame);
  const chamber = new THREE.Group(); scene.add(chamber);
  // ---- colonnade of structural arches; the central one is the Training Bay gateway ----
  const arches = new THREE.Group(); scene.add(arches);
  const N = 7, R = 7.2, archGlows: THREE.MeshBasicMaterial[] = [];
  const slots = Array.from({ length: N }, (_, i) => { const a = THREE.MathUtils.degToRad(-66 + (i * 132) / (N - 1)); return new THREE.Vector3(Math.sin(a) * R, 0, -Math.cos(a) * R); });
  // Light through each arch's opening: a rounded-top panel just behind it. Dim until its station is chosen; the
  // central gateway (the Training Bay) is always lit, warm white.
  // Light falls off upward and softens at the edges, as through a real doorway (brightest at the floor).
  const gradient = (() => { const c = document.createElement('canvas'); c.width = 64; c.height = 128; const x = c.getContext('2d')!, img = x.createImageData(64, 128);
    for (let yy = 0; yy < 128; yy++) for (let xx = 0; xx < 64; xx++) {
      const v = Math.pow(yy / 127, 1.6), e = Math.sin((xx / 63) * Math.PI), a = v * (0.25 + 0.75 * Math.pow(e, 0.8));
      img.data.set([255, 255, 255, Math.round(255 * a)], (yy * 64 + xx) * 4);
    }
    x.putImageData(img, 0, 0); const t = new THREE.CanvasTexture(c); t.flipY = false; return t; })();
  disposables.push(gradient);
  const opening = (w: number, h: number) => { const s = new THREE.Shape(), r = w / 2; s.moveTo(-r, 0); s.lineTo(-r, h - r); s.absarc(0, h - r, r, Math.PI, 0, true); s.lineTo(r, 0); s.lineTo(-r, 0);
    const geo = new THREE.ShapeGeometry(s, 24); const uv = geo.attributes.uv!; const pos = geo.attributes.position!;
    for (let k = 0; k < uv.count; k++) uv.setXY(k, pos.getX(k) / w + 0.5, 1 - pos.getY(k) / h);
    return geo; };
  const placeOpenings = (w: number, h: number) => slots.forEach((p, i) => {
    const m = new THREE.MeshBasicMaterial({ map: gradient, color: i === 3 ? '#dff6ff' : '#3fd2c7', transparent: true, opacity: i === 3 ? 0.6 : 0.04, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide });
    const k = i === 3 ? 1.22 : 1, mesh = new THREE.Mesh(opening(w * k, h * k), m);
    mesh.position.copy(p).multiplyScalar(1 + 0.25 / R); mesh.lookAt(0, 0, 0); scene.add(mesh); archGlows[i] = m;
  });
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: '#9fd8ef', transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  halo.scale.set(9, 9, 1); halo.position.set(0, 2.2, -8.6); scene.add(halo);
  // A soft shaft of light from above onto the chamber, and slow dust in it.
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 2.2, 7, 48, 1, true), new THREE.MeshBasicMaterial({ map: glowTex, color: '#9fb4c8', transparent: true, opacity: 0.05, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  shaft.position.y = 4.4; scene.add(shaft);
  const DUST = o.mobile ? 160 : 360, dustPos = new Float32Array(DUST * 3);
  for (let i = 0; i < DUST; i++) dustPos.set([(Math.random() - 0.5) * 9, Math.random() * 6, (Math.random() - 0.5) * 9], i * 3);
  const dustGeo = new THREE.BufferGeometry(); dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ map: glowTex, size: 0.04, color: '#c9d6e2', transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false })); scene.add(dust);

  // ---- PIX, hovering beside the exhibit ----
  const PIX_HOME = o.mobile ? new THREE.Vector3(-1.45, 3.35, 0.6) : new THREE.Vector3(-1.35, 2.75, 1.1);
  const pix = new THREE.Group(); pix.position.copy(PIX_HOME); scene.add(pix);
  const pixRim = new THREE.PointLight('#7fe3ff', 6, 2.6, 2); pixRim.position.set(0.2, 0.9, -0.6); pix.add(pixRim);
  const pixGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: '#3fd2c7', transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false })); pixGlow.scale.set(0.8, 0.3, 1); pixGlow.position.y = -0.1; pix.add(pixGlow);

  let disposed = false, loaded = 0;
  const total = 3, done = () => { loaded++; o.onProgress(loaded, total); kick(); };
  o.onProgress(0, total);
  void loadModel('/models/m4/hero-chamber/hero-chamber.gltf').then((m) => { if (m && !disposed) { fit(m, 3.4); chamber.add(m); } done(); });
  void loadModel('/models/m4/orbital-arch/orbital-arch.gltf').then((m) => {
    if (m && !disposed) {
      fit(m, 5.4);
      const size = new THREE.Box3().setFromObject(m).getSize(new THREE.Vector3());
      placeOpenings(Math.min(size.x, size.z) > 0.5 ? Math.max(size.x, size.z) * 0.6 : 2, size.y * 0.84);
      slots.forEach((p, i) => {
        const a = i === 3 ? m : m.clone(); a.position.copy(p); a.lookAt(0, 0, 0);
        if (i === 3) a.scale.multiplyScalar(1.22);
        arches.add(a);
      });
    }
    done();
  });
  void loadModel('/models/pix/pix.gltf').then((m) => { if (m && !disposed) { cleanFinish(m); fit(m, 0.95); pix.add(m); } done(); });

  // ---- camera: rest pose frames the chamber right of centre (the headline plaque sits lower left) ----
  const target = new THREE.Vector3(), cam = { yaw: 0.34, pitch: 0.2, dist: 9.6 };
  const REST = o.mobile ? { yaw: 0.16, pitch: 0.16, dist: 13.5, tx: 0, ty: 2.3 } : { yaw: 0.3, pitch: 0.13, dist: 12.8, tx: -2.5, ty: 2.25 };
  const START = { yaw: -0.6, pitch: 0.03, dist: 19, tx: REST.tx + 1.2, ty: 1.4 };
  let motion = o.motion, frame = 0, lost = false, g = 0, shownG = 0, station: number | null = null, bay = false, look = 0;
  const t0 = performance.now(); let last = t0;
  const introMs = o.motion ? 2800 : 0;
  let px = 0, py = 0;
  let width = 1, height = 1;
  const layout = () => {
    const r = o.host.getBoundingClientRect(); width = Math.max(1, r.width); height = Math.max(1, r.height);
    renderer.setSize(width, height, false); composer.setSize(width, height); composer.setPixelRatio(renderer.getPixelRatio());
    camera.aspect = width / height; camera.updateProjectionMatrix();
  };
  const render = (now: number) => {
    const t = (now - t0) / 1000, dt = Math.min(0.05, (now - last) / 1000); last = now;
    const k = introMs ? ease((now - t0) / introMs) : 1;
    const drift = motion ? Math.sin(t * 0.09) * 0.05 : 0;
    const focusYaw = station !== null ? (station - 2.5) * 0.035 : 0;
    const yaw = THREE.MathUtils.lerp(START.yaw, REST.yaw, k) + drift + px * 0.06 + focusYaw;
    const pitch = THREE.MathUtils.lerp(START.pitch, REST.pitch, k) + py * 0.03;
    const dist = THREE.MathUtils.lerp(START.dist, REST.dist, k) * (bay ? 0.93 : 1);
    cam.yaw += (yaw - cam.yaw) * (motion && k >= 1 ? 0.05 : 1); cam.pitch += (pitch - cam.pitch) * (motion && k >= 1 ? 0.05 : 1); cam.dist += (dist - cam.dist) * (motion && k >= 1 ? 0.05 : 1);
    target.set(THREE.MathUtils.lerp(START.tx, REST.tx, k), THREE.MathUtils.lerp(START.ty, REST.ty, k), 0);
    camera.position.set(target.x + Math.sin(cam.yaw) * Math.cos(cam.pitch) * cam.dist, target.y + Math.sin(cam.pitch) * cam.dist, target.z + Math.cos(cam.yaw) * Math.cos(cam.pitch) * cam.dist);
    camera.lookAt(target);
    shownG += (g - shownG) * (motion ? 0.06 : 1);
    flame.update(motion ? t : 4.2, shownG);
    const flick = motion ? 1 + Math.sin(t * 11.3) * 0.05 * shownG + Math.sin(t * 6.1) * 0.03 : 1;
    warm.color.set('#4a7dff').lerp(new THREE.Color('#ff6a1f'), shownG); warm.intensity = (4 + 8 * shownG) * flick;
    (poolMesh.material as THREE.MeshBasicMaterial).color.set('#3a63ff').lerp(new THREE.Color('#ff7a2a'), shownG);
    (poolMesh.material as THREE.MeshBasicMaterial).opacity = (0.12 + 0.2 * shownG) * flick;
    archGlows.forEach((m, i) => {
      const want = i === 3 ? (bay ? 0.95 : 0.6) : station !== null && i - (i > 3 ? 1 : 0) === station ? 0.55 : 0.035;
      m.opacity += (want - m.opacity) * (motion ? 0.08 : 1);
    });
    gate.intensity = bay ? 40 : 22;
    // PIX: hover, face the visitor, glance at the flame when gravity changes or toward a chosen arch.
    look = Math.max(0, look - dt);
    pix.position.y = PIX_HOME.y + (motion ? Math.sin(t * 1.5) * 0.06 : 0);
    const faceCam = Math.atan2(camera.position.x - pix.position.x, camera.position.z - pix.position.z);
    const poi = look > 0 ? new THREE.Vector3(0, 1.6, 0) : station !== null ? slots[station + (station >= 3 ? 1 : 0)]! : bay ? slots[3]! : null;
    const want = poi ? THREE.MathUtils.lerp(faceCam, Math.atan2(poi.x - pix.position.x, poi.z - pix.position.z), 0.6) : faceCam + px * 0.3;
    pix.rotation.y += (want - pix.rotation.y) * (motion ? 0.08 : 1);
    pix.rotation.z = motion ? Math.sin(t * 0.8) * 0.04 : 0;
    if (motion) { dust.rotation.y = t * 0.008; }
    composer.render();
    return k < 1 || Math.abs(g - shownG) > 0.002;
  };
  const loop = (now: number) => { frame = 0; if (lost) return; if (render(now) || motion) frame = requestAnimationFrame(loop); };
  const kick = () => { if (!frame && !lost) frame = requestAnimationFrame(loop); };
  const onMove = (e: PointerEvent) => { if (e.pointerType !== 'mouse') return; const r = o.host.getBoundingClientRect(); px = ((e.clientX - r.left) / r.width - 0.5) * 2; py = ((e.clientY - r.top) / r.height - 0.5) * 2; kick(); };
  const onLost = (e: Event) => { e.preventDefault(); lost = true; cancelAnimationFrame(frame); o.onLost(); };
  window.addEventListener('pointermove', onMove, { passive: true });
  o.canvas.addEventListener('webglcontextlost', onLost);
  layout(); kick();
  return {
    setGravity(next) { if (Math.abs(next - g) > 0.05) look = 1.8; g = next; kick(); },
    setStation(i) { station = i; kick(); },
    setBay(on) { bay = on; kick(); },
    setMotion(on) { motion = on; kick(); },
    resize() { layout(); kick(); },
    stop() {
      disposed = true; lost = true; cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', onMove); o.canvas.removeEventListener('webglcontextlost', onLost);
      scene.traverse((ob) => { const m = ob as THREE.Mesh; m.geometry?.dispose(); (Array.isArray(m.material) ? m.material : m.material ? [m.material] : []).forEach((x) => { (x as THREE.MeshStandardMaterial).map?.dispose(); x.dispose(); }); });
      disposables.forEach((d) => d.dispose()); scene.environment?.dispose(); pmrem.dispose(); room.dispose?.(); composer.dispose(); renderer.dispose(); renderer.forceContextLoss();
    }
  };
}
