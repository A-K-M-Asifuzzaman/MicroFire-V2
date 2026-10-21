// PIX in 3D: the Meshy model (public/models/pix.glb) with procedural, state-driven motion. Loaded on demand only.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { loadModel, cleanFinish } from './model-loader';
import type { PixState } from './pix-avatar';

export type PixApi = { setState(s: PixState): void; setMotion(on: boolean): void; resize(): void; stop(): void };

const MOOD: Record<PixState, string> = { idle: '#73bbd9', searching: '#8ff0f6', cited: '#7fd6d1', abstained: '#f0c35a', error: '#ff6a5c' };

export async function startPix(canvas: HTMLCanvasElement, host: HTMLElement, initial: PixState, motion: boolean, onLost: () => void): Promise<PixApi | null> {
  let renderer: THREE.WebGLRenderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' }); }
  catch { return null; }
  const loaded = await loadModel('/models/pix/pix.gltf');
  const model = loaded && cleanFinish(loaded);
  if (!model) { renderer.dispose(); return null; }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer), env = new RoomEnvironment();
  scene.environment = pmrem.fromScene(env, 0.04).texture; scene.environmentIntensity = 0.9;
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50); camera.position.set(0, 0.05, 5.3); camera.lookAt(0, 0, 0);
  scene.add(new THREE.HemisphereLight('#cfe6ff', '#0b111a', 1.1));
  const key = new THREE.DirectionalLight('#fff1e0', 2.2); key.position.set(2, 3, 4); scene.add(key);
  const rim = new THREE.PointLight(MOOD[initial], 18, 8); rim.position.set(-1.6, 0.8, -1.2); scene.add(rim);
  const warm = new THREE.PointLight('#ff8738', 6, 6); warm.position.set(1.4, -0.6, 1.2); scene.add(warm);

  // Fit: 2 units tall, centred.
  const box = new THREE.Box3().setFromObject(model), dim = box.getSize(new THREE.Vector3());
  model.scale.multiplyScalar(2 / dim.y); box.setFromObject(model); model.position.sub(box.getCenter(new THREE.Vector3()));
  const body = new THREE.Group(); body.add(model); scene.add(body);
  // Hover ring + scan ring.
  const ringMat = new THREE.MeshBasicMaterial({ color: MOOD[initial], transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false });
  const hover = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.018, 8, 96), ringMat); hover.rotation.x = Math.PI / 2; hover.position.y = -1.22; scene.add(hover);
  const scanMat = ringMat.clone(); scanMat.opacity = 0;
  const scan = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.012, 8, 128), scanMat); scan.rotation.x = Math.PI / 2; scene.add(scan);

  let state = initial, moving = motion, frame = 0, lost = false, hop = 0, shake = 0;
  const pointer = { x: 0, y: 0 }, mood = new THREE.Color(MOOD[initial]);
  const t0 = performance.now();
  const size = () => { const r = host.getBoundingClientRect(); renderer.setSize(r.width, r.height, false); camera.aspect = r.width / Math.max(1, r.height); camera.updateProjectionMatrix(); };
  const render = (now: number) => {
    const t = moving ? (now - t0) / 1000 : 0;
    mood.lerp(new THREE.Color(MOOD[state]), moving ? 0.08 : 1);
    rim.color.copy(mood); ringMat.color.copy(mood); scanMat.color.copy(mood);
    const speed = state === 'searching' ? 2.4 : state === 'abstained' ? 0.6 : 1;
    const rx = -pointer.y * 0.2;
    let y = Math.sin(t * 1.6 * speed) * 0.07, ry = Math.sin(t * 0.5 * speed) * 0.35 + pointer.x * 0.5, rz = 0;
    if (state === 'searching') ry = Math.sin(t * 3) * 0.6;
    if (state === 'abstained') rz = 0.16;
    if (state === 'cited' && hop > 0) { y += Math.sin((1 - hop) * Math.PI) * 0.28; hop = Math.max(0, hop - 0.025); }
    if (state === 'error' && shake > 0) { body.position.x = Math.sin(t * 60) * 0.04 * shake; shake = Math.max(0, shake - 0.02); } else body.position.x = 0;
    body.position.y = y; body.rotation.set(rx, ry, rz);
    hover.scale.setScalar(1 + Math.sin(t * 2) * 0.06); ringMat.opacity = 0.45 + 0.25 * Math.sin(t * 2);
    scanMat.opacity = state === 'searching' ? 0.85 : Math.max(0, scanMat.opacity - 0.05);
    scan.position.y = Math.sin(t * 3.2) * 1.0;
    rim.intensity = 14 + (state === 'cited' ? 10 : 0) + Math.sin(t * 3) * 3;
    renderer.render(scene, camera);
    return moving || hop > 0 || shake > 0;
  };
  const loop = (now: number) => { frame = 0; if (lost) return; if (render(now)) frame = requestAnimationFrame(loop); };
  const kick = () => { if (!frame && !lost) frame = requestAnimationFrame(loop); };
  const onMove = (e: PointerEvent) => {
    if (!moving || e.pointerType !== 'mouse') return;
    const r = host.getBoundingClientRect();
    pointer.x = THREE.MathUtils.clamp((e.clientX - (r.left + r.width / 2)) / innerWidth, -0.6, 0.6);
    pointer.y = THREE.MathUtils.clamp((e.clientY - (r.top + r.height / 2)) / innerHeight, -0.6, 0.6);
  };
  const lose = (e: Event) => { e.preventDefault(); lost = true; cancelAnimationFrame(frame); frame = 0; onLost(); };
  window.addEventListener('pointermove', onMove, { passive: true });
  canvas.addEventListener('webglcontextlost', lose);
  size(); kick();
  return {
    setState(s) { if (s === 'cited' && state !== 'cited') hop = 1; if (s === 'error') shake = 1; state = s; kick(); },
    setMotion(on) { moving = on; kick(); },
    resize() { size(); kick(); },
    stop() {
      lost = true; cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', onMove); canvas.removeEventListener('webglcontextlost', lose);
      scene.traverse((o) => { const m = o as THREE.Mesh; m.geometry?.dispose(); (Array.isArray(m.material) ? m.material : m.material ? [m.material] : []).forEach((x) => x.dispose()); });
      scene.environment?.dispose(); pmrem.dispose(); env.dispose?.(); renderer.dispose();
      renderer.forceContextLoss(); // free the GPU context on navigation instead of waiting for GC
    }
  };
}
