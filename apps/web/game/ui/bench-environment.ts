// Artistic training-bay environment around the procedural apparatus: Meshy-generated architecture, props and an
// animated astronaut. Pure decoration — nothing here is NASA hardware, defines a mount or affects game state.
// Scale is consistent: 1 scene unit = 10 cm, so the 17 cm duct sits on a ~0.9 m bench beside a ~1.75 m astronaut.
// Loaded after the bench is interactive; any failure leaves the bench exactly as it was.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

type Placement = { url: string; height: number; position: [number, number, number]; rotationY?: number; detail: 'full' | 'lite' };
export type EnvReaction = 'idle' | 'wave' | 'look' | 'cheer';

/** Floor (y) of the bay: the bench top sits just under the apparatus base plate. */
export const BENCH_TOP = -0.68, BENCH_HEIGHT = 9, FLOOR = BENCH_TOP - BENCH_HEIGHT;

const loader = new GLTFLoader();
const load = (url: string) => loader.loadAsync(url).catch(() => null);

/** Scale a model uniformly to a target height (scene units) and stand it on y = 0 of its own group. */
function fit(obj: THREE.Object3D, height: number) {
  const box = new THREE.Box3().setFromObject(obj), size = box.getSize(new THREE.Vector3());
  const s = height / Math.max(size.y, 1e-6);
  obj.scale.multiplyScalar(s);
  box.setFromObject(obj);
  const c = box.getCenter(new THREE.Vector3());
  obj.position.x -= c.x; obj.position.z -= c.z; obj.position.y -= box.min.y;
  return obj;
}

export function addEnvironment(scene: THREE.Scene, opts: { manifest: Placement[]; astronaut: { url: string; clips: Record<EnvReaction, string> } | null; lite: boolean; onReady: () => void }) {
  const root = new THREE.Group(); root.name = 'environment'; scene.add(root);
  // Bay floor + soft pools of light so the props sit in a believable room even before models arrive.
  const floor = new THREE.Mesh(new THREE.CircleGeometry(60, 64), new THREE.MeshStandardMaterial({ color: '#0b1520', metalness: 0.4, roughness: 0.55 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = FLOOR; root.add(floor);
  const fill = new THREE.SpotLight('#cfe6ff', 600, 90, 0.6, 0.6, 1.4); fill.position.set(6, 30, 18); fill.target.position.set(0, FLOOR, 0); root.add(fill, fill.target);
  const bay = new THREE.PointLight('#73bbd9', 120, 60, 1.6); bay.position.set(-14, 8, -10); root.add(bay);

  let mixer: THREE.AnimationMixer | null = null;
  const actions = new Map<EnvReaction, THREE.AnimationAction>();
  let current: THREE.AnimationAction | null = null, disposed = false;

  const place = async (p: Placement) => {
    if (opts.lite && p.detail === 'full') return;
    const gltf = await load(p.url);
    if (!gltf || disposed) return;
    const holder = new THREE.Group();
    holder.add(fit(gltf.scene, p.height));
    holder.position.set(...p.position); holder.rotation.y = p.rotationY ?? 0;
    holder.traverse((o) => { if (o instanceof THREE.Mesh) { o.castShadow = false; o.receiveShadow = false; } });
    root.add(holder);
    opts.onReady();
  };
  const loadAstronaut = async () => {
    if (!opts.astronaut) return;
    const base = await load(opts.astronaut.url);
    if (!base || disposed) return;
    const holder = new THREE.Group();
    holder.add(fit(base.scene, 17.5));
    holder.position.set(-13.5, FLOOR, 4); holder.rotation.y = 0.75;
    root.add(holder);
    mixer = new THREE.AnimationMixer(base.scene);
    for (const [kind, url] of Object.entries(opts.astronaut.clips) as [EnvReaction, string][]) {
      const g = await load(url);
      const clip = g?.animations[0];
      if (clip && !disposed) actions.set(kind, mixer.clipAction(clip));
    }
    const idle = actions.get('idle');
    if (idle) { idle.play(); current = idle; }
    opts.onReady();
  };
  void Promise.all([...opts.manifest.map(place), loadAstronaut()]);

  return {
    /** Advance animation; returns true while something is moving. */
    update(dt: number, motion: boolean) { if (mixer && motion) { mixer.update(dt); return true; } return false; },
    /** One-shot reaction, then back to idle. Purely presentational. */
    react(kind: EnvReaction) {
      const next = actions.get(kind), idle = actions.get('idle');
      if (!next || !mixer) return;
      if (kind !== 'idle') { next.reset(); next.setLoop(THREE.LoopOnce, 1); next.clampWhenFinished = false; }
      next.enabled = true; next.play();
      if (current && current !== next) current.crossFadeTo(next, 0.35, false);
      current = next;
      if (kind !== 'idle' && idle) {
        const back = (e: { action: THREE.AnimationAction }) => { if (e.action !== next) return; mixer?.removeEventListener('finished', back); idle.reset().play(); next.crossFadeTo(idle, 0.4, false); current = idle; };
        mixer.addEventListener('finished', back);
      }
    },
    dispose() {
      disposed = true; mixer?.stopAllAction();
      root.traverse((o) => { if (o instanceof THREE.Mesh) { o.geometry.dispose(); (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => { Object.values(m).forEach((v) => { if (v instanceof THREE.Texture) v.dispose(); }); m.dispose(); }); } });
      scene.remove(root);
    }
  };
}
