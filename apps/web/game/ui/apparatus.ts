// The BASS-II training apparatus, procedurally built (no Meshy mesh defines a part or a mount). Units: 1 = 10 cm.
//
// Source-grounded (NASA NTRS 20210011385 §1.2, via the frozen equipment copy and docs/m2/02_MISSION_AND_SCIENCE.md):
//   flow duct 7.6 × 7.6 × 17 cm with rounded corners (radius not given) · fan blowing through the duct (form not given) ·
//   honeycomb straightener plus inlet screen (cell size not given) · N2 nozzle in the test section · top mounting rail for
//   solid samples (B20: PMMA film 2 cm wide, 0.1 mm thick) · hot-wire igniter coil on a deployment lever · still camera
//   (60-mm lens) at the top window · video camera with a turning mirror at the front window · thermopile radiometer in
//   the downstream top back corner viewing upstream · exit: perforated COPPER plate then BRASS screen.
// Schematic (not sourced, kept visibly simple): every radius, wall thickness, cell/hole size, bracket, housing, lens and
// lever shape below, and all positions other than the duct size. Nothing here is a NASA engineering reconstruction.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

export const L = 1.7, H = 0.76, hx = L / 2, hy = H / 2;
/** The duct group sits on its glovebox mount; the duct axis is this far above the mount anchor. */
export const DUCT_LIFT = hy + 0.24;
const C = { cyan: new THREE.Color('#73bbd9'), flame: new THREE.Color('#ff8738') };

export function mats() {
  return {
    // Kept names (the scene tunes these): glass, metal, cone, accent.
    glass: new THREE.MeshPhysicalMaterial({ color: '#d6eef8', metalness: 0, roughness: 0.04, transparent: true, opacity: 0.1, depthWrite: false, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 1.1 }),
    edge: new THREE.LineBasicMaterial({ color: '#bfe6f5', transparent: true, opacity: 0.55 }),
    metal: new THREE.MeshStandardMaterial({ color: '#b7c1cb', metalness: 1, roughness: 0.34 }),            // machined aluminium
    satin: new THREE.MeshStandardMaterial({ color: '#9aa6b2', metalness: 1, roughness: 0.55 }),            // honeycomb, screens
    dark: new THREE.MeshStandardMaterial({ color: '#2a3542', metalness: 0.7, roughness: 0.42 }),           // anodised housings
    black: new THREE.MeshStandardMaterial({ color: '#14181d', metalness: 0.2, roughness: 0.55 }),          // camera bodies
    copper: new THREE.MeshStandardMaterial({ color: '#b8703f', metalness: 1, roughness: 0.3 }),            // sourced: copper plate
    brass: new THREE.MeshStandardMaterial({ color: '#c9a14a', metalness: 1, roughness: 0.32, transparent: true, opacity: 0.85, alphaTest: 0.4 }), // sourced: brass screen
    lens: new THREE.MeshPhysicalMaterial({ color: '#0b141c', metalness: 0.1, roughness: 0.04, clearcoat: 1 }),
    film: new THREE.MeshPhysicalMaterial({ color: '#eef5f8', metalness: 0, roughness: 0.18, transparent: true, opacity: 0.62, clearcoat: 0.6 }), // B20: PMMA
    wire: new THREE.MeshStandardMaterial({ color: '#8d7f72', metalness: 0.9, roughness: 0.4 }),
    mirror: new THREE.MeshStandardMaterial({ color: '#e6f0f8', metalness: 1, roughness: 0.03 }),
    cone: new THREE.MeshBasicMaterial({ color: C.cyan, transparent: true, opacity: 0.06, depthWrite: false, side: THREE.DoubleSide }),
    accent: new THREE.MeshStandardMaterial({ color: '#0b111a', emissive: C.cyan, emissiveIntensity: 1.6 })
  };
}
export type Mats = ReturnType<typeof mats>;

const roundRect = (w: number, h: number, r: number, path: THREE.Path = new THREE.Shape()) => {
  const x = -w / 2, y = -h / 2;
  path.moveTo(x + r, y); path.lineTo(x + w - r, y); path.quadraticCurveTo(x + w, y, x + w, y + r); path.lineTo(x + w, y + h - r);
  path.quadraticCurveTo(x + w, y + h, x + w - r, y + h); path.lineTo(x + r, y + h); path.quadraticCurveTo(x, y + h, x, y + h - r);
  path.lineTo(x, y + r); path.quadraticCurveTo(x, y, x + r, y);
  return path;
};
/** Extrude a cross-section shape (drawn in the YZ plane as shape x→z, y→y) along +x, centred on x = 0. */
const alongX = (shape: THREE.Shape, depth: number, bevel = 0) => {
  const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 2, curveSegments: 10 });
  geo.translate(0, 0, -depth / 2); geo.rotateY(-Math.PI / 2); return geo; // shape x → world z, extrusion → world x
};
const box = (w: number, h: number, d: number, r: number, mat: THREE.Material) => new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2, h / 2, d / 2)), mat);
const lathe = (profile: [number, number][], mat: THREE.Material, segs = 40) => { // revolved about +x (profile: [x, radius])
  const pts = profile[0]![0] > profile[profile.length - 1]![0] ? [...profile].reverse() : profile; // ascending x keeps normals outward
  const geo = new THREE.LatheGeometry(pts.map(([x, r]) => new THREE.Vector2(r, x)), segs); geo.rotateZ(-Math.PI / 2); return new THREE.Mesh(geo, mat);
};
const meshTexture = (cells: number, line: number) => {
  const cv = document.createElement('canvas'); cv.width = cv.height = 256; const x = cv.getContext('2d')!;
  x.clearRect(0, 0, 256, 256); x.strokeStyle = '#fff'; x.lineWidth = line;
  for (let i = 0; i <= cells; i++) { const p = (i / cells) * 256; x.beginPath(); x.moveTo(p, 0); x.lineTo(p, 256); x.stroke(); x.beginPath(); x.moveTo(0, p); x.lineTo(256, p); x.stroke(); }
  const t = new THREE.CanvasTexture(cv); t.anisotropy = 4; return t;
};

/** The training orientation marker (gameplay: shows standard vs reversed). Points along +x of its group. */
export function arrow(m: Mats, len = 0.36) {
  const g = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, len, 12), m.accent); shaft.rotation.z = -Math.PI / 2; shaft.position.x = len / 2;
  const head = new THREE.Mesh(new THREE.ConeGeometry(0.038, 0.1, 20), m.accent); head.rotation.z = -Math.PI / 2; head.position.x = len + 0.04;
  g.add(shaft, head); return g;
}
/** Schematic viewing direction (apex at the instrument, opening along −x). Never a measured field of view. */
export function viewCone(m: Mats, length: number, radius: number) {
  const cone = new THREE.Mesh(new THREE.ConeGeometry(radius, length, 40, 1, true), m.cone.clone());
  cone.rotation.z = Math.PI / 2; cone.position.x = -length / 2;
  return cone;
}

/** Each part is built facing its standard orientation; reversed rotates the whole group by 180° about Y. */
export function buildPart(id: string, m: Mats): THREE.Group {
  const g = new THREE.Group(); g.name = id;
  const add = <T extends THREE.Object3D>(o: T) => { g.add(o); return o; };
  switch (id) {
    case 'flow-duct': { // sourced size and rounded corners; wall thickness and corner radius schematic
      const lift = DUCT_LIFT, R = 0.07, T = 0.022;
      const section = roundRect(H, H, R) as THREE.Shape; section.holes.push(roundRect(H - 2 * T, H - 2 * T, R - T * 0.6, new THREE.Path()));
      const shell = alongX(section, L); shell.translate(0, lift, 0);
      add(new THREE.Mesh(shell, m.glass));
      add(new THREE.LineSegments(new THREE.EdgesGeometry(shell, 25), m.edge));
      for (const [yy, zz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]] as const) { // corner highlights along the rounded edges
        const pts = [new THREE.Vector3(-hx, lift + yy * (hy - 0.02), zz * (hy - 0.02)), new THREE.Vector3(hx, lift + yy * (hy - 0.02), zz * (hy - 0.02))];
        add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), m.edge));
      }
      // Glovebox mount (schematic): a machined base plate and two cradles under the duct.
      add(box(1.05, 0.045, 0.66, 0.012, m.dark)).position.set(0, 0.02, 0);
      for (const x of [-0.5, 0.5]) {
        const cradle = add(box(0.1, 0.2, 0.7, 0.02, m.metal)); cradle.position.set(x, 0.14, 0);
        const pad = add(box(0.12, 0.012, 0.74, 0.004, m.black)); pad.position.set(x, 0.244, 0);
      }
      break;
    }
    case 'fan': { // schematic axial fan in a shroud matching the duct section; only "variable-speed fan" is sourced
      const shroudShape = roundRect(H + 0.04, H + 0.04, 0.08) as THREE.Shape; shroudShape.holes.push(new THREE.Path().absarc(0, 0, 0.33, 0, Math.PI * 2, true));
      const shroud = add(new THREE.Mesh(alongX(shroudShape, 0.16, 0.01), m.dark)); shroud.position.x = 0.04;
      add(lathe([[-0.09, 0], [-0.09, 0.07], [0.0, 0.09], [0.06, 0.08], [0.09, 0.04], [0.105, 0]], m.metal)); // spinner hub
      const motor = add(lathe([[-0.1, 0], [-0.1, 0.085], [0.0, 0.085], [0.0, 0]], m.black)); motor.position.x = -0.06;
      for (let i = 0; i < 4; i++) { // rear struts
        const s = add(box(0.03, 0.28, 0.02, 0.006, m.dark)); const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        s.position.set(-0.08, Math.sin(a) * 0.2, Math.cos(a) * 0.2); s.rotation.x = Math.PI / 2 - a; // long axis radial
      }
      const blades = new THREE.Group(); blades.name = 'blades';
      const bladeShape = new THREE.Shape(); // in its own plane: x = radius, y = chord
      bladeShape.moveTo(0.07, -0.035); bladeShape.quadraticCurveTo(0.2, -0.06, 0.31, -0.03); bladeShape.quadraticCurveTo(0.325, 0.02, 0.3, 0.07);
      bladeShape.quadraticCurveTo(0.19, 0.06, 0.07, 0.035); bladeShape.lineTo(0.07, -0.035);
      const bladeGeo = new THREE.ExtrudeGeometry(bladeShape, { depth: 0.012, bevelEnabled: true, bevelSize: 0.004, bevelThickness: 0.003, bevelSegments: 1, curveSegments: 8 });
      bladeGeo.translate(0, 0, -0.006);
      // Blade frame: shape x → radius (+y), shape y → chord (+z), thickness → +x; then pitched about its own radius.
      const basis = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(1, 0, 0)));
      for (let i = 0; i < 7; i++) {
        const holder = new THREE.Group(); holder.rotation.x = (i / 7) * Math.PI * 2;
        const pitch = new THREE.Group(); pitch.rotation.y = 0.55;
        const b = new THREE.Mesh(bladeGeo, m.metal); b.quaternion.copy(basis);
        pitch.add(b); holder.add(pitch); blades.add(holder);
      }
      add(blades);
      const a = arrow(m); a.position.set(0.12, 0, 0); a.name = 'marker'; add(a); // standard: points +x, into the duct
      break;
    }
    case 'flow-straightener': { // honeycomb (cell size schematic) plus the sourced inlet screen
      const W = 0.68, depth = 0.1, cell = 0.038; // hexagon circumradius
      const shape = roundRect(W, W, 0.05) as THREE.Shape;
      const dx = Math.sqrt(3) * cell, dy = 1.5 * cell;
      for (let row = 0; ; row++) {
        const y = -W / 2 + 0.035 + row * dy; if (y > W / 2 - 0.035) break;
        for (let col = 0; ; col++) {
          const x = -W / 2 + 0.04 + col * dx + (row % 2 ? dx / 2 : 0); if (x > W / 2 - 0.04) break;
          const hex = new THREE.Path(); const r = cell * 0.86;
          for (let k = 0; k <= 6; k++) { const ang = Math.PI / 6 + (k * Math.PI) / 3; const px = x + r * Math.cos(ang), py = y + r * Math.sin(ang); if (k) hex.lineTo(px, py); else hex.moveTo(px, py); }
          shape.holes.push(hex);
        }
      }
      add(new THREE.Mesh(alongX(shape, depth), m.satin));
      const frameShape = roundRect(W + 0.03, W + 0.03, 0.06) as THREE.Shape; frameShape.holes.push(roundRect(W - 0.004, W - 0.004, 0.05, new THREE.Path()));
      add(new THREE.Mesh(alongX(frameShape, depth + 0.02), m.dark));
      const screenMat = m.satin.clone(); screenMat.alphaMap = meshTexture(40, 2); screenMat.transparent = true; screenMat.alphaTest = 0.3; screenMat.side = THREE.DoubleSide;
      const screen = add(new THREE.Mesh(new THREE.PlaneGeometry(W, W), screenMat)); screen.rotation.y = Math.PI / 2; screen.position.x = -depth / 2 - 0.012;
      break;
    }
    case 'nitrogen-nozzle': { // sourced: a nozzle for N2 flow inside the test section; shape schematic
      const n = new THREE.Group(); n.rotation.z = Math.PI / 2; add(n); // build along +x, stand it up (+y)
      n.add(lathe([[-0.06, 0.05], [-0.02, 0.05], [-0.02, 0.035], [0.12, 0.03], [0.17, 0.018], [0.2, 0.012], [0.2, 0]], m.metal));
      const nut = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.04, 6), m.dark); nut.rotation.z = Math.PI / 2; nut.position.x = -0.04; n.add(nut);
      const a = arrow(m, 0.16); a.position.x = 0.24; a.name = 'marker'; n.add(a);
      break;
    }
    case 'sample-holder': { // sourced: top rail for solid samples (B20 film 2 cm wide); clamp and length schematic
      const rail = new THREE.Shape(); rail.moveTo(-0.07, 0); rail.lineTo(0.07, 0); rail.lineTo(0.07, 0.02); rail.lineTo(0.025, 0.02); rail.lineTo(0.025, 0.05); rail.lineTo(-0.025, 0.05); rail.lineTo(-0.025, 0.02); rail.lineTo(-0.07, 0.02); rail.lineTo(-0.07, 0);
      add(new THREE.Mesh(alongX(rail, 1.1, 0.004), m.metal));
      for (const x of [-0.27, 0.27]) { const h = add(box(0.024, 0.2, 0.024, 0.006, m.dark)); h.position.set(x, -0.1, 0); }
      const clamp = (z: number) => { const c = add(box(0.56, 0.018, 0.024, 0.006, m.metal)); c.position.set(0, -0.2, z); };
      clamp(0.112); clamp(-0.112);
      const film = add(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.004, 0.2), m.film)); film.position.y = -0.2; // 2 cm wide (sourced); thickness drawn visible
      film.name = 'film';
      const a = arrow(m, 0.24); a.rotation.y = Math.PI; a.position.set(0.14, -0.29, 0); a.name = 'marker'; add(a); // standard: opposed to the duct flow (−x)
      break;
    }
    case 'igniter': { // sourced: hot-wire coil moved into position with a lever, through the front window; shapes schematic
      const tip = new THREE.Vector3(-0.05, 0.32, -0.44); // the sample's downstream end inside the duct
      const knob = add(new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.05, 24), m.metal)); knob.rotation.x = Math.PI / 2;
      const len = tip.length() - 0.03, arm = add(box(0.022, len, 0.022, 0.008, m.dark));
      arm.position.copy(tip).multiplyScalar(0.5 * (len / tip.length())); arm.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tip.clone().normalize());
      const helix = new THREE.CatmullRomCurve3(Array.from({ length: 81 }, (_, k) => { const t = k / 80; return new THREE.Vector3(Math.cos(t * Math.PI * 10) * 0.018, t * 0.06 - 0.03, Math.sin(t * Math.PI * 10) * 0.018); }));
      const coil = add(new THREE.Mesh(new THREE.TubeGeometry(helix, 160, 0.0035, 6), m.wire)); coil.position.copy(tip); coil.name = 'coil';
      break;
    }
    case 'still-camera': case 'video-camera': { // cameras sourced by role only; bodies and lenses schematic
      add(box(0.22, 0.15, 0.17, 0.025, m.black)); // body
      const plate = add(box(0.2, 0.012, 0.14, 0.004, m.dark)); plate.position.y = -0.081;
      const barrel = add(lathe([[0, 0.055], [-0.02, 0.055], [-0.02, 0.05], [-0.06, 0.05], [-0.06, 0.058], [-0.09, 0.058], [-0.09, 0.05], [-0.13, 0.048], [-0.135, 0]], m.metal));
      barrel.position.x = -0.11;
      const ring = add(lathe([[-0.07, 0.0595], [-0.085, 0.0595], [-0.085, 0.052], [-0.07, 0.052]], m.black)); ring.position.x = -0.11;
      const glass = add(new THREE.Mesh(new THREE.CircleGeometry(0.044, 32), m.lens)); glass.rotation.y = -Math.PI / 2; glass.position.x = -0.244;
      const cone = viewCone(m, 0.75, 0.24); cone.position.x -= 0.25; cone.name = 'cone'; add(cone);
      if (id === 'still-camera') g.rotation.z = Math.PI / 2; // looks down through the top window
      else {
        g.rotation.y = -Math.PI / 4;
        const mount = new THREE.Group(); mount.position.set(-0.4, 0, 0); mount.rotation.y = Math.PI / 4; add(mount);
        mount.add(box(0.2, 0.2, 0.012, 0.004, m.dark).translateZ(-0.008));
        const mirror = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.18), m.mirror); mount.add(mirror);
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.16, 10), m.metal); post.position.y = -0.17; mount.add(post);
      }
      break;
    }
    case 'radiometer': { // sourced: thermopile detector viewing upstream, uncalibrated signal; housing schematic
      add(lathe([[0.1, 0], [0.1, 0.05], [0.0, 0.055], [-0.06, 0.055], [-0.07, 0.045], [-0.08, 0.035], [-0.08, 0]], m.metal));
      const win = add(new THREE.Mesh(new THREE.CircleGeometry(0.028, 24), m.lens)); win.rotation.y = -Math.PI / 2; win.position.x = -0.081;
      const clamp = add(box(0.05, 0.13, 0.12, 0.01, m.dark)); clamp.position.set(0.05, 0.06, 0);
      const cone = viewCone(m, 0.9, 0.22); cone.position.x -= 0.09; cone.name = 'cone'; add(cone); // standard: views upstream (−x)
      break;
    }
    case 'exit-plate': { // sourced: perforated copper plate followed by a brass screen; hole size/thickness schematic
      const W = 0.72, plateShape = roundRect(W, W, 0.06) as THREE.Shape;
      for (let i = 0; i < 9; i++) for (let j = 0; j < 9; j++) plateShape.holes.push(new THREE.Path().absarc(-W / 2 + 0.06 + i * 0.075, -W / 2 + 0.06 + j * 0.075, 0.022, 0, Math.PI * 2, true));
      add(new THREE.Mesh(alongX(plateShape, 0.022, 0.003), m.copper));
      const screenMat = m.brass.clone(); screenMat.alphaMap = meshTexture(56, 2.2); screenMat.side = THREE.DoubleSide;
      const screen = add(new THREE.Mesh(new THREE.PlaneGeometry(W - 0.02, W - 0.02), screenMat)); screen.rotation.y = Math.PI / 2; screen.position.x = 0.05;
      const frameShape = roundRect(W + 0.03, W + 0.03, 0.07) as THREE.Shape; frameShape.holes.push(roundRect(W - 0.02, W - 0.02, 0.05, new THREE.Path()));
      const frame = add(new THREE.Mesh(alongX(frameShape, 0.018), m.dark)); frame.position.x = 0.05;
      break;
    }
  }
  g.traverse((o) => { o.userData.partId = id; });
  return g;
}

/** Per-part inspection framing (offsets from the Inspect composition): each part from the side that shows it best. */
export const INSPECT: Record<string, { theta: number; phi: number; r: number }> = {
  'flow-duct': { theta: -0.6, phi: 1.15, r: 3.2 }, fan: { theta: -1.15, phi: 1.2, r: 2.0 }, 'flow-straightener': { theta: 0.72, phi: 1.02, r: 1.6 }, // from downstream, through the front glass: the fan never blocks the cells
  'nitrogen-nozzle': { theta: -0.35, phi: 1.05, r: 1.7 }, 'sample-holder': { theta: -0.25, phi: 0.95, r: 2.0 }, igniter: { theta: 0.2, phi: 1.15, r: 1.7 },
  'still-camera': { theta: -0.4, phi: 0.95, r: 2.1 }, 'video-camera': { theta: 0.35, phi: 1.35, r: 2.0 }, radiometer: { theta: 0.7, phi: 0.95, r: 1.9 },
  'exit-plate': { theta: 1.15, phi: 1.2, r: 2.0 }
};
