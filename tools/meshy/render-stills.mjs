// Renders QA turnarounds and a card still for downloaded Meshy GLBs with the repo's own three.js in headless Chromium.
// Usage: node tools/meshy/render-stills.mjs <out-dir> <glb> [<glb> …]
// Writes <name>-qa.png (front/right/back/left/top contact sheet, 5 × 400 px) and <name>.webp (800 × 600 card still, transparent).
// Free and local: no network, no Meshy calls. Stills are illustrations, never evidence.
import { chromium } from '@playwright/test';
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';

const [out, ...glbs] = process.argv.slice(2);
if (!out || !glbs.length) { console.error('usage: render-stills.mjs <out-dir> <glb>…'); process.exit(1); }
mkdirSync(out, { recursive: true });
const root = process.cwd();
const types = { '.js': 'text/javascript', '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json', '.bin': 'application/octet-stream', '.webp': 'image/webp', '.png': 'image/png', '.html': 'text/html' };
const page = `<!doctype html><script type="importmap">{"imports":{"three":"/node_modules/three/build/three.module.js","three/addons/":"/node_modules/three/examples/jsm/"}}</script>
<script type="module">
import * as THREE from 'three'; import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.05; r.outputColorSpace = THREE.SRGBColorSpace; r.setClearColor(0, 0);
document.body.append(r.domElement);
const scene = new THREE.Scene();
scene.add(new THREE.HemisphereLight(0xeef1ff, 0x2a2bd6, 1.6));
const key = new THREE.DirectionalLight(0xffffff, 2.4); key.position.set(4, 6, 5); scene.add(key);
const rim = new THREE.DirectionalLight(0xc9cdff, 1.2); rim.position.set(-5, 3, -4); scene.add(rim);
window.shot = async (url, views, w, h, type) => {
  const g = (await new GLTFLoader().loadAsync(url)).scene; scene.add(g);
  const box = new THREE.Box3().setFromObject(g), size = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
  const radius = size.length() / 2, cam = new THREE.PerspectiveCamera(30, w / h, radius / 50, radius * 50);
  r.setSize(w, h); const shots = [];
  for (const [az, el] of views) {
    const d = radius / Math.sin(THREE.MathUtils.degToRad(15)) * (w >= 800 ? 0.68 : 1.02);
    cam.position.set(c.x + d * Math.cos(el) * Math.sin(az), c.y + d * Math.sin(el), c.z + d * Math.cos(el) * Math.cos(az)); cam.lookAt(c);
    r.render(scene, cam); shots.push(r.domElement.toDataURL(type, 0.9));
  }
  scene.remove(g);
  return { shots, size: size.toArray(), tris: (() => { let t = 0; g.traverse((o) => { if (o.isMesh) t += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; }); return t; })() };
};
window.ready = true;
</script>`;
const server = createServer((req, res) => {
  const u = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (u === '/') { res.writeHead(200, { 'content-type': 'text/html' }); return res.end(page); }
  const f = path.join(root, u);
  if (!f.startsWith(root) || !existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': types[path.extname(f)] ?? 'application/octet-stream' }); res.end(readFileSync(f));
}).listen(0, '127.0.0.1');
await new Promise((ok) => server.once('listening', ok));
const browser = await chromium.launch({ args: ['--use-angle=metal', '--ignore-gpu-blocklist', '--enable-gpu'] });
const p = await browser.newPage();
await p.goto(`http://127.0.0.1:${server.address().port}/`); await p.waitForFunction('window.ready');
const deg = Math.PI / 180;
for (const glb of glbs) {
  const name = path.basename(glb, path.extname(glb)), url = '/' + path.relative(root, path.resolve(glb));
  const qa = await p.evaluate(([u, v]) => window.shot(u, v, 400, 400, 'image/png'), [url, [[0, 10 * deg], [90 * deg, 10 * deg], [180 * deg, 10 * deg], [270 * deg, 10 * deg], [0, 89 * deg]]]);
  const card = await p.evaluate(([u, v]) => window.shot(u, v, 800, 600, 'image/webp'), [url, [[22 * deg, 22 * deg]]]);
  // Contact sheet: five QA views side by side, composited in the page canvas.
  const sheet = await p.evaluate(async (shots) => { const c = Object.assign(document.createElement('canvas'), { width: 2000, height: 400 }), x = c.getContext('2d'); x.fillStyle = '#eef1ff'; x.fillRect(0, 0, 2000, 400);
    for (let i = 0; i < shots.length; i++) { const im = new Image(); im.src = shots[i]; await im.decode(); x.drawImage(im, i * 400, 0); } return c.toDataURL('image/png'); }, qa.shots);
  writeFileSync(path.join(out, `${name}-qa.png`), Buffer.from(sheet.split(',')[1], 'base64'));
  writeFileSync(path.join(out, `${name}.webp`), Buffer.from(card.shots[0].split(',')[1], 'base64'));
  console.log(`${name}: size ${qa.size.map((n) => n.toFixed(2)).join(' × ')}, ${Math.round(qa.tris)} triangles`);
}
await browser.close(); server.close();
