// Design B: the volumetric flame illustration in a small 3D window. It turns slowly so you can see it is a solid
// shape, and the gravity control reshapes it. Illustrative, like the Gravity Lens.
import * as THREE from 'three';
import { flameVolume } from '../flame-volume';

export type JarApi = { setGravity(g: number): void; setMotion(on: boolean): void; resize(): void; stop(): void };

export function startJar(canvas: HTMLCanvasElement, host: HTMLElement, motionOn: boolean, background = '#15153d'): JarApi | null {
  let renderer: THREE.WebGLRenderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true }); } catch { return null; }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.2;
  const scene = new THREE.Scene(); scene.background = new THREE.Color(background);
  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 50); camera.position.set(0, 0.5, 5.2); camera.lookAt(0, 0.15, 0);
  const flame = flameVolume(2.4, 3.2); flame.mesh.position.y = 0.15; scene.add(flame.mesh);
  // Slow sparks around the flame (decorative): a few soft points.
  const N = 60, pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) pos.set([(Math.random() - 0.5) * 2.4, (Math.random() - 0.5) * 2.4, (Math.random() - 0.5) * 1.2], i * 3);
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const dots = new THREE.Points(geo, new THREE.PointsMaterial({ color: '#ffd27a', size: 0.035, transparent: true, opacity: 0.6 })); scene.add(dots);
  let g = 0, shown = 0, motion = motionOn, frame = 0, lost = false;
  const t0 = performance.now();
  const size = () => { const r = host.getBoundingClientRect(); renderer.setSize(r.width, r.height, false); camera.aspect = r.width / Math.max(1, r.height); camera.updateProjectionMatrix(); };
  const loop = (now: number) => {
    frame = 0; if (lost) return;
    const t = (now - t0) / 1000;
    shown += (g - shown) * (motion ? 0.06 : 1);
    flame.update(motion ? t : 3, shown);
    flame.mesh.rotation.y = motion ? t * 0.25 : 0.4;
    dots.rotation.y = motion ? t * 0.05 : 0; dots.position.y = motion ? ((t * 0.08 * (0.2 + shown)) % 0.6) : 0;
    renderer.render(scene, camera);
    if (motion || Math.abs(g - shown) > 0.002) frame = requestAnimationFrame(loop);
  };
  const kick = () => { if (!frame && !lost) frame = requestAnimationFrame(loop); };
  const onLost = (e: Event) => { e.preventDefault(); lost = true; cancelAnimationFrame(frame); };
  canvas.addEventListener('webglcontextlost', onLost);
  size(); kick();
  return {
    setGravity(next) { g = next; kick(); }, setMotion(on) { motion = on; kick(); }, resize() { size(); kick(); },
    stop() { lost = true; cancelAnimationFrame(frame); canvas.removeEventListener('webglcontextlost', onLost); flame.dispose(); geo.dispose(); (dots.material as THREE.Material).dispose(); renderer.dispose(); renderer.forceContextLoss(); }
  };
}
