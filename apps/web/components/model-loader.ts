// Loads a glTF once per URL (quantized geometry, external WebP textures: same-origin only, no WASM, no blob: URLs,
// so the site CSP stays unchanged). Resolves null on any failure so callers keep their fallback.
import { LinearFilter, type Object3D } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const cache = new Map<string, Promise<Object3D | null>>();

export function loadModel(url: string): Promise<Object3D | null> {
  let p = cache.get(url);
  if (!p) {
    p = new GLTFLoader().loadAsync(url).then((gltf) => gltf.scene as Object3D, () => null);
    cache.set(url, p);
  }
  return p.then((m) => m?.clone(true) ?? null);
}

/**
 * PIX's generated normal and metal/roughness maps catch reflections as white "scratches" across the glossy visor;
 * a uniform glossy-plastic finish reads cleaner. Base colour (the design) is kept.
 */
export function cleanFinish<T extends Object3D>(obj: T): T {
  obj.traverse((o) => {
    const m = (o as { material?: Record<string, unknown> & { needsUpdate: boolean } }).material;
    if (!m || !('roughnessMap' in m)) return;
    Object.assign(m, { normalMap: null, roughnessMap: null, metalnessMap: null, roughness: 0.34, metalness: 0.05 });
    // Mip levels blend the white gutter between UV islands into the dark visor; sample the full-res texture only.
    const map = m.map as { minFilter: number; generateMipmaps: boolean; needsUpdate: boolean } | null;
    if (map) { map.minFilter = LinearFilter; map.generateMipmaps = false; map.needsUpdate = true; }
    m.needsUpdate = true;
  });
  return obj;
}
