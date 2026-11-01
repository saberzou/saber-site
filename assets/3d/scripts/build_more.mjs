// Procedural models for the rest of the field, written straight to GLB.
// The first three devices come from build_devices.py (Blender). These ten use
// the same clay look, units and orientation, built with the vendored three.js.
//
// Units: 1.0 = one homepage cell. Y is up. The front of each device faces +Z
// (the same as the Blender files after glTF's Y-up export).
// Run: node assets/3d/scripts/build_more.mjs

import * as THREE from '../vendor/three.module.js';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'models');

// ---------------------------------------------------------------- materials

function clay(name, hex, roughness = 0.58, metal = 0) {
  return { name, color: new THREE.Color(hex), roughness, metal };
}

// ---------------------------------------------------------------- scene state

let parts;      // material name -> { mat, geos: [] }
let screen;     // the one named screen plane
let stack;      // transform stack

function reset() {
  parts = new Map();
  screen = null;
  stack = [new THREE.Matrix4()];
}

function top() { return stack[stack.length - 1]; }

// Run fn with an extra transform: translate to pivot, rotate, translate back.
function within({ pos = [0, 0, 0], rot = [0, 0, 0] }, fn) {
  const m = new THREE.Matrix4().compose(
    new THREE.Vector3(...pos),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)),
    new THREE.Vector3(1, 1, 1)
  );
  stack.push(top().clone().multiply(m));
  fn();
  stack.pop();
}

function add(geo, mat, pos, rot) {
  const local = new THREE.Matrix4().compose(
    new THREE.Vector3(...pos),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(...(rot || [0, 0, 0]))),
    new THREE.Vector3(1, 1, 1)
  );
  let g = geo.index ? geo.toNonIndexed() : geo;
  // Only the screen needs UVs. Zeroing the rest lets shared corners weld.
  {
    g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
  }
  g.applyMatrix4(top().clone().multiply(local));
  if (!parts.has(mat.name)) parts.set(mat.name, { mat, geos: [] });
  parts.get(mat.name).geos.push(g);
}

// ---------------------------------------------------------------- shapes

function roundedRect(w, h, r) {
  const s = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  r = Math.min(r, w / 2, h / 2);
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

// Smooth shading across soft edges, hard where faces meet at more than 42°,
// the same rule the Blender script uses.
function creased(geo, angle = (42 * Math.PI) / 180) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  const p = g.attributes.position.array;
  const count = p.length / 3;
  const faceN = [];
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  for (let f = 0; f < count / 3; f++) {
    a.fromArray(p, f * 9); b.fromArray(p, f * 9 + 3); c.fromArray(p, f * 9 + 6);
    const n = new THREE.Vector3().subVectors(c, b).cross(new THREE.Vector3().subVectors(a, b));
    faceN.push(n); // area-weighted
  }
  const buckets = new Map();
  const keyOf = (i) => `${Math.round(p[i * 3] * 1e5)},${Math.round(p[i * 3 + 1] * 1e5)},${Math.round(p[i * 3 + 2] * 1e5)}`;
  for (let i = 0; i < count; i++) {
    const k = keyOf(i);
    if (!buckets.has(k)) buckets.set(k, []);
    buckets.get(k).push(i);
  }
  const cos = Math.cos(angle);
  const out = new Float32Array(count * 3);
  const unit = faceN.map((n) => n.clone().normalize());
  for (let i = 0; i < count; i++) {
    const mine = unit[Math.floor(i / 3)];
    const sum = new THREE.Vector3();
    for (const j of buckets.get(keyOf(i))) {
      const f = Math.floor(j / 3);
      if (unit[f].dot(mine) >= cos) sum.add(faceN[f]);
    }
    if (sum.lengthSq() === 0) sum.copy(mine);
    sum.normalize().toArray(out, i * 3);
  }
  g.setAttribute('normal', new THREE.BufferAttribute(out, 3));
  return g;
}

// A soft-edged box. w × h is the front face, d is depth toward the viewer.
// `corner` rounds the front silhouette; `bevel` softens every edge.
function box(mat, [w, h, d], pos, { corner = 0, bevel = 0.006, rot } = {}) {
  const b = Math.min(bevel, w / 4, h / 4, d / 3);
  const inner = Math.max(d - 2 * b, 0.0005);
  const geo = new THREE.ExtrudeGeometry(roundedRect(w - 2 * b, h - 2 * b, Math.max(corner - b, 0)), {
    depth: inner,
    bevelEnabled: b > 0,
    bevelThickness: b,
    bevelSize: b,
    bevelSegments: Math.max(w, h) < 0.08 ? 1 : 3,
    curveSegments: corner <= 0 ? 1 : Math.max(w, h) < 0.08 ? 2 : 6
  });
  geo.translate(0, 0, -inner / 2);
  add(creased(geo), mat, pos, rot);
}

// A box with its long axis vertical, bottom resting at pos[1].
function slab(mat, dims, [x, y, z], opts) {
  box(mat, dims, [x, y + dims[1] / 2, z], opts);
}

// A cylinder facing the viewer (axis Z) unless axis is 'y' or 'x'.
function cyl(mat, r, len, pos, { axis = 'z', segs = 28, r2 } = {}) {
  const geo = new THREE.CylinderGeometry(r2 == null ? r : r2, r, len, segs, 1, false);
  const rot = axis === 'z' ? [Math.PI / 2, 0, 0] : axis === 'x' ? [0, 0, Math.PI / 2] : [0, 0, 0];
  add(geo, mat, pos, rot);
}

function ball(mat, r, pos, scale = [1, 1, 1]) {
  const geo = new THREE.SphereGeometry(r, 20, 12);
  geo.scale(...scale);
  add(geo, mat, pos);
}

function ring(mat, r, tube, pos, { segs = 40, arc = Math.PI * 2, rot = [0, 0, 0] } = {}) {
  add(new THREE.TorusGeometry(r, tube, 10, segs, arc), mat, pos, rot);
}

// The glass the page paints on. Faces +Z. Exactly one per device.
function glass(w, h, pos, rot) {
  const geo = new THREE.PlaneGeometry(w, h);
  const local = new THREE.Matrix4().compose(
    new THREE.Vector3(...pos),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(...(rot || [0, 0, 0]))),
    new THREE.Vector3(1, 1, 1)
  );
  geo.applyMatrix4(top().clone().multiply(local));
  screen = geo.toNonIndexed();
}

// A grid of keys on a face that points +Z.
function keys(mat, { cols, rows, w, h, gx, gy, x, y, z, d = 0.008, corner = 0.003 }) {
  const totalW = cols * w + (cols - 1) * gx;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      box(mat, [w, h, d], [x - totalW / 2 + w / 2 + c * (w + gx), y - r * (h + gy), z], { corner, bevel: 0.002 });
    }
  }
}

// Keys lying flat on a deck (they face +Y).
function deckKeys(mat, { cols, rows, w, dz, gx, gz, x, y, z, h = 0.008 }) {
  const totalW = cols * w + (cols - 1) * gx;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      box(mat, [w, dz, h], [x - totalW / 2 + w / 2 + c * (w + gx), y, z + r * (dz + gz)], { corner: 0.002, bevel: 0.0015, rot: [-Math.PI / 2, 0, 0] });
    }
  }
}

// ---------------------------------------------------------------- GLB writer

function writeGlb(name) {
  const json = {
    asset: { version: '2.0', generator: 'saber-site build_more.mjs' },
    scene: 0,
    scenes: [{ nodes: [] }],
    nodes: [],
    meshes: [],
    materials: [],
    accessors: [],
    bufferViews: [],
    buffers: [{ byteLength: 0 }]
  };
  const chunks = [];
  let offset = 0;
  let faces = 0;

  function view(array, target) {
    const bytes = Buffer.from(array.buffer, array.byteOffset, array.byteLength);
    const pad = (4 - (bytes.length % 4)) % 4;
    json.bufferViews.push({ buffer: 0, byteOffset: offset, byteLength: bytes.length, target });
    chunks.push(bytes, Buffer.alloc(pad));
    offset += bytes.length + pad;
    return json.bufferViews.length - 1;
  }

  function accessor(array, type, extra = {}) {
    const size = { VEC2: 2, VEC3: 3 }[type];
    json.accessors.push({
      bufferView: view(array, 34962),
      componentType: 5126,
      count: array.length / size,
      type,
      ...extra
    });
    return json.accessors.length - 1;
  }

  function indices(array) {
    json.accessors.push({
      bufferView: view(array, 34963),
      componentType: array instanceof Uint32Array ? 5125 : 5123,
      count: array.length,
      type: 'SCALAR'
    });
    return json.accessors.length - 1;
  }

  function material(mat) {
    const c = mat.color.clone(); // three keeps colors linear; glTF wants linear factors.
    json.materials.push({
      name: mat.name,
      pbrMetallicRoughness: {
        baseColorFactor: [c.r, c.g, c.b, 1],
        metallicFactor: mat.metal,
        roughnessFactor: mat.roughness
      }
    });
    return json.materials.length - 1;
  }

  function mesh(nodeName, geos, mat) {
    const pos = [], nor = [], uv = [];
    for (const g of geos) {
      pos.push(...g.attributes.position.array);
      nor.push(...g.attributes.normal.array);
      uv.push(...g.attributes.uv.array);
    }
    // Weld identical vertices so the file carries an index instead of repeats.
    const seen = new Map();
    const wp = [], wn = [], wu = [], idx = [];
    for (let v = 0; v < pos.length / 3; v++) {
      const k = [pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2], nor[v * 3], nor[v * 3 + 1], nor[v * 3 + 2], uv[v * 2], uv[v * 2 + 1]]
        .map((n) => Math.round(n * 1e5)).join(',');
      let i = seen.get(k);
      if (i == null) {
        i = wp.length / 3;
        seen.set(k, i);
        wp.push(pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2]);
        wn.push(nor[v * 3], nor[v * 3 + 1], nor[v * 3 + 2]);
        wu.push(uv[v * 2], uv[v * 2 + 1]);
      }
      idx.push(i);
    }
    faces += idx.length / 3;
    const p = new Float32Array(wp);
    const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < p.length; i += 3) {
      for (let k = 0; k < 3; k++) {
        min[k] = Math.min(min[k], p[i + k]);
        max[k] = Math.max(max[k], p[i + k]);
      }
    }
    const prim = {
      attributes: {
        POSITION: accessor(p, 'VEC3', { min, max }),
        NORMAL: accessor(new Float32Array(wn), 'VEC3'),
        TEXCOORD_0: accessor(new Float32Array(wu), 'VEC2')
      },
      indices: indices(wp.length / 3 > 65535 ? new Uint32Array(idx) : new Uint16Array(idx)),
      material: material(mat)
    };
    json.meshes.push({ name: nodeName, primitives: [prim] });
    json.nodes.push({ name: nodeName, mesh: json.meshes.length - 1 });
    json.scenes[0].nodes.push(json.nodes.length - 1);
  }

  for (const [matName, { mat, geos }] of parts) mesh(matName, geos, mat);
  if (screen) {
    screen.computeVertexNormals();
    mesh('Screen', [screen], clay('Screen', '#ffffff', 0.35));
  }

  const bin = Buffer.concat(chunks);
  json.buffers[0].byteLength = bin.length;
  let text = Buffer.from(JSON.stringify(json), 'utf8');
  text = Buffer.concat([text, Buffer.alloc((4 - (text.length % 4)) % 4, 0x20)]);
  const header = Buffer.alloc(12);
  header.writeUInt32LE(0x46546c67, 0);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(12 + 8 + text.length + 8 + bin.length, 8);
  const jsonHead = Buffer.alloc(8);
  jsonHead.writeUInt32LE(text.length, 0);
  jsonHead.writeUInt32LE(0x4e4f534a, 4);
  const binHead = Buffer.alloc(8);
  binHead.writeUInt32LE(bin.length, 0);
  binHead.writeUInt32LE(0x004e4942, 4);
  const glb = Buffer.concat([header, jsonHead, text, binHead, bin]);
  mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, name + '.glb'), glb);
  console.log('BUILT', name.padEnd(8), 'tris', String(faces).padStart(5), 'bytes', glb.length);
}

// ---------------------------------------------------------------- devices

function buildCandy() {
  reset();
  const body = clay('Body', '#34435c', 0.46);
  const face = clay('Face', '#2a374c', 0.5);
  const key = clay('Key', '#55657e', 0.42);
  const bezel = clay('Bezel', '#0c1210', 0.4);
  const grille = clay('Grille', '#18202c', 0.6);
  const w = 0.20, h = 0.48, d = 0.075;
  slab(body, [w, h, d], [0, 0, 0], { corner: 0.05, bevel: 0.014 });
  box(face, [w * 0.86, h * 0.4, 0.006], [0, h * 0.28, d / 2], { corner: 0.03, bevel: 0.002 });
  box(bezel, [0.15, 0.115, 0.008], [0, h * 0.68, d / 2 + 0.002], { corner: 0.012, bevel: 0.002 });
  glass(0.13, 0.095, [0, h * 0.68, d / 2 + 0.0065]);
  box(grille, [0.05, 0.008, 0.006], [0, h * 0.89, d / 2], { corner: 0.004, bevel: 0.001 });
  box(key, [0.12, 0.022, 0.008], [0, h * 0.53, d / 2 + 0.002], { corner: 0.011, bevel: 0.002 });
  keys(key, { cols: 3, rows: 4, w: 0.036, h: 0.022, gx: 0.012, gy: 0.01, x: 0, y: h * 0.42, z: d / 2 + 0.003, corner: 0.006 });
  writeGlb('candy');
}

function buildFlip() {
  reset();
  const silver = clay('Silver', '#cfd5dd', 0.34, 0.15);
  const face = clay('Face', '#e6e9ee', 0.4);
  const hinge = clay('Hinge', '#9aa3ae', 0.3, 0.3);
  const bezel = clay('Bezel', '#1a1e24', 0.4);
  const key = clay('Key', '#7a8390', 0.4);
  const w = 0.25, d = 0.06;
  // Lower half, keypad.
  slab(silver, [w, 0.20, d], [0, 0, 0], { corner: 0.035, bevel: 0.012 });
  box(face, [w * 0.86, 0.17, 0.006], [0, 0.10, d / 2], { corner: 0.025, bevel: 0.002 });
  cyl(key, 0.024, 0.008, [0, 0.165, d / 2 + 0.004]);
  keys(key, { cols: 3, rows: 3, w: 0.045, h: 0.018, gx: 0.012, gy: 0.01, x: 0, y: 0.12, z: d / 2 + 0.004, corner: 0.007 });
  // Hinge.
  cyl(hinge, 0.026, w * 0.7, [0, 0.215, 0], { axis: 'x' });
  // Upper half, leaning back a little like a phone held open.
  within({ pos: [0, 0.22, 0], rot: [-0.14, 0, 0] }, () => {
    slab(silver, [w * 0.96, 0.24, d * 0.8], [0, 0.012, -0.004], { corner: 0.035, bevel: 0.012 });
    box(bezel, [0.19, 0.15, 0.008], [0, 0.14, d * 0.4 - 0.002], { corner: 0.012, bevel: 0.002 });
    glass(0.17, 0.128, [0, 0.14, d * 0.4 + 0.0035]);
    box(hinge, [0.05, 0.006, 0.006], [0, 0.235, d * 0.4 - 0.002], { corner: 0.003, bevel: 0.001 });
  });
  writeGlb('flip');
}

function buildRotary() {
  reset();
  const body = clay('Body', '#2a2825', 0.36);
  const hand = clay('Handset', '#2e2c29', 0.34);
  const brass = clay('Brass', '#c9a56c', 0.32, 0.55);
  const dial = clay('Dial', '#ece4d6', 0.5);
  const hole = clay('Hole', '#3a3834', 0.5);
  const w = 0.50, h = 0.17, d = 0.30;
  // A wide desk set with a raised crown at the back for the cradle.
  slab(body, [w, h, d], [0, 0, 0], { corner: 0.05, bevel: 0.03 });
  slab(body, [w * 0.7, 0.06, d * 0.5], [0, h - 0.02, -0.05], { corner: 0.04, bevel: 0.022 });
  // Brass display plate on the left of the front.
  box(brass, [0.19, 0.11, 0.01], [-0.125, h * 0.5, d / 2 + 0.002], { corner: 0.012, bevel: 0.003 });
  glass(0.164, 0.086, [-0.125, h * 0.5, d / 2 + 0.0085]);
  // Dial on the right of the front, standing proud of the case.
  const dx = 0.12, dy = h * 0.5, dz = d / 2 + 0.008;
  cyl(dial, 0.074, 0.016, [dx, dy, dz], { segs: 40 });
  for (let i = 0; i < 10; i++) {
    const t = Math.PI * 0.35 + i * 0.5;
    cyl(hole, 0.0105, 0.004, [dx + Math.cos(t) * 0.05, dy + Math.sin(t) * 0.05, dz + 0.007], { segs: 12 });
  }
  cyl(brass, 0.022, 0.012, [dx, dy, dz + 0.01], { segs: 24 });
  box(brass, [0.008, 0.03, 0.008], [dx + 0.06, dy - 0.05, dz + 0.01], { corner: 0.003, bevel: 0.002, rot: [0, 0, 0.6] });
  // Cradle prongs and the handset resting across them.
  cyl(body, 0.02, 0.06, [-0.15, h + 0.06, -0.05], { axis: 'y' });
  cyl(body, 0.02, 0.06, [0.15, h + 0.06, -0.05], { axis: 'y' });
  box(hand, [0.40, 0.03, 0.045], [0, h + 0.1, -0.05], { corner: 0.015, bevel: 0.012 });
  ball(hand, 0.046, [-0.19, h + 0.095, -0.05], [1, 0.72, 1.05]);
  ball(hand, 0.046, [0.19, h + 0.095, -0.05], [1, 0.72, 1.05]);
  writeGlb('rotary');
}

function buildPhone() {
  reset();
  const body = clay('Body', '#16171a', 0.28, 0.1);
  const rim = clay('Rim', '#a7acb4', 0.28, 0.6);
  const btn = clay('Home', '#2a2c31', 0.3);
  const w = 0.24, h = 0.48, d = 0.045;
  slab(rim, [w, h, d], [0, 0, 0], { corner: 0.04, bevel: 0.01 });
  slab(body, [w - 0.008, h - 0.008, 0.006], [0, 0.004, d / 2 - 0.001], { corner: 0.036, bevel: 0.002 });
  glass(0.2, 0.31, [0, h * 0.52, d / 2 + 0.0025]);
  cyl(btn, 0.018, 0.004, [0, h * 0.09, d / 2 + 0.005]);
  box(btn, [0.04, 0.006, 0.003], [0, h * 0.91, d / 2 + 0.005], { corner: 0.003, bevel: 0.001 });
  writeGlb('phone');
}

function buildPda() {
  reset();
  const body = clay('Body', '#d6dae0', 0.36, 0.15);
  const deck = clay('Deck', '#c4c9d1', 0.42);
  const bezel = clay('Bezel', '#2c3328', 0.45);
  const key = clay('Key', '#3a3f46', 0.4);
  const pad = clay('Pad', '#e7e2d2', 0.55);
  const w = 0.27, h = 0.46, d = 0.065;
  slab(body, [w, h, d], [0, 0, 0], { corner: 0.03, bevel: 0.014 });
  box(bezel, [0.23, 0.21, 0.008], [0, h * 0.7, d / 2 + 0.001], { corner: 0.008, bevel: 0.002 });
  glass(0.21, 0.19, [0, h * 0.7, d / 2 + 0.0055]);
  box(pad, [0.21, 0.055, 0.006], [0, h * 0.39, d / 2 + 0.001], { corner: 0.006, bevel: 0.0015 });
  box(deck, [0.002, 0.045, 0.004], [0, h * 0.39, d / 2 + 0.005], { bevel: 0 });
  for (let i = 0; i < 4; i++) cyl(key, 0.016, 0.008, [-0.075 + i * 0.05, h * 0.21, d / 2 + 0.003]);
  box(key, [0.04, 0.012, 0.008], [0, h * 0.1, d / 2 + 0.003], { corner: 0.006, bevel: 0.002 });
  cyl(deck, 0.006, 0.08, [w / 2 - 0.02, h + 0.02, -0.01], { axis: 'y', segs: 12 }); // stylus
  writeGlb('pda');
}

function buildCrt() {
  reset();
  const beige = clay('Beige', '#e6d8c2', 0.55);
  const back = clay('Back', '#cdbd9f', 0.6);
  const bezel = clay('Bezel', '#1a1816', 0.38);
  const vent = clay('Vent', '#9c8e74', 0.7);
  const w = 0.50, d = 0.42;
  // Stand and neck.
  cyl(beige, 0.13, 0.025, [0, 0.0125, 0], { axis: 'y', segs: 36, r2: 0.11 });
  slab(back, [0.1, 0.05, 0.1], [0, 0.02, 0], { corner: 0.02, bevel: 0.01 });
  // The tube: a deep tapered back behind a square front.
  slab(back, [w * 0.7, 0.28, d * 0.55], [0, 0.085, -d * 0.2], { corner: 0.05, bevel: 0.03 });
  slab(beige, [w, 0.36, d * 0.42], [0, 0.06, d * 0.18], { corner: 0.03, bevel: 0.02 });
  box(bezel, [0.40, 0.29, 0.012], [0, 0.245, d * 0.39 + 0.002], { corner: 0.03, bevel: 0.004 });
  glass(0.37, 0.26, [0, 0.245, d * 0.39 + 0.0085]);
  for (let i = 0; i < 5; i++) box(vent, [0.006, 0.004, 0.12], [-0.1 + i * 0.05, 0.37, -0.05], { bevel: 0 });
  writeGlb('crt');
}

function buildImac() {
  reset();
  const bondi = clay('Bondi', '#2a93aa', 0.3);
  const shell = clay('Shell', '#dfeff2', 0.32);
  const bezel = clay('Bezel', '#0c1c22', 0.38);
  const stand = clay('Stand', '#ece8e2', 0.45);
  const w = 0.44, d = 0.40;
  cyl(stand, 0.12, 0.03, [0, 0.015, 0.02], { axis: 'y', segs: 36, r2: 0.1 });
  // Egg-ish back made from a squashed sphere.
  ball(bondi, 0.2, [0, 0.25, -0.08], [1, 0.82, 0.78]);
  slab(bondi, [w, 0.34, d * 0.42], [0, 0.07, d * 0.12], { corner: 0.08, bevel: 0.03 });
  // Pale translucent chin and white face.
  box(shell, [w * 0.94, 0.075, 0.03], [0, 0.11, d * 0.33], { corner: 0.03, bevel: 0.012 });
  box(shell, [w * 0.86, 0.25, 0.012], [0, 0.29, d * 0.33], { corner: 0.03, bevel: 0.005 });
  box(bezel, [0.31, 0.23, 0.008], [0, 0.29, d * 0.33 + 0.007], { corner: 0.012, bevel: 0.002 });
  glass(0.29, 0.21, [0, 0.29, d * 0.33 + 0.0115]);
  box(bondi, [0.1, 0.008, 0.006], [0, 0.11, d * 0.33 + 0.016], { corner: 0.004, bevel: 0.001 });
  writeGlb('imac');
}

function buildTerm() {
  reset();
  const body = clay('Body', '#2f372d', 0.45);
  const key = clay('Key', '#4b5749', 0.45);
  const bezel = clay('Bezel', '#06110c', 0.35);
  const led = clay('Led', '#7ed957', 0.3);
  const w = 0.54;
  // Monitor.
  slab(body, [w, 0.27, 0.26], [0, 0.11, -0.13], { corner: 0.025, bevel: 0.018 });
  slab(body, [w * 0.6, 0.2, 0.12], [0, 0.14, -0.29], { corner: 0.03, bevel: 0.02 });
  box(bezel, [0.46, 0.2, 0.01], [0, 0.245, 0.0], { corner: 0.02, bevel: 0.003 });
  glass(0.43, 0.175, [0, 0.245, 0.0058]);
  cyl(led, 0.006, 0.006, [w / 2 - 0.03, 0.135, 0.002]);
  // Feet raise the monitor over the keyboard.
  slab(body, [0.06, 0.11, 0.18], [-0.18, 0, -0.14], { bevel: 0.01 });
  slab(body, [0.06, 0.11, 0.18], [0.18, 0, -0.14], { bevel: 0.01 });
  // Keyboard in front.
  within({ pos: [0, 0, 0.14], rot: [0.08, 0, 0] }, () => {
    slab(body, [w, 0.03, 0.16], [0, 0, 0], { corner: 0.01, bevel: 0.008 });
    deckKeys(key, { cols: 13, rows: 3, w: 0.033, dz: 0.03, gx: 0.006, gz: 0.008, x: 0, y: 0.033, z: -0.045 });
  });
  writeGlb('term');
}

function buildLaptop() {
  reset();
  const lid = clay('Lid', '#4a4f57', 0.38, 0.2);
  const deck = clay('Deck', '#5a5f67', 0.42, 0.2);
  const key = clay('Key', '#22272e', 0.5);
  const bezel = clay('Bezel', '#050607', 0.36);
  const pad = clay('Pad', '#3d4249', 0.4);
  const w = 0.56, dep = 0.36, t = 0.028;
  // Base, resting flat, its front edge toward the viewer.
  box(deck, [w, dep, t], [0, t / 2, 0.02], { corner: 0.02, bevel: 0.008, rot: [-Math.PI / 2, 0, 0] });
  deckKeys(key, { cols: 14, rows: 4, w: 0.031, dz: 0.03, gx: 0.006, gz: 0.007, x: 0, y: t + 0.002, z: -0.13 });
  box(pad, [0.13, 0.08, 0.004], [0, t + 0.001, 0.14], { corner: 0.008, bevel: 0.001, rot: [-Math.PI / 2, 0, 0] });
  // Lid hinged at the back, opened a little past upright.
  within({ pos: [0, t, -dep / 2 + 0.02], rot: [-0.22, 0, 0] }, () => {
    slab(lid, [w, 0.34, 0.02], [0, 0, -0.01], { corner: 0.02, bevel: 0.007 });
    box(bezel, [w - 0.02, 0.32, 0.004], [0, 0.17, 0.001], { corner: 0.012, bevel: 0.001 });
    glass(0.48, 0.27, [0, 0.175, 0.0036]);
  });
  writeGlb('laptop');
}

function buildRadio() {
  reset();
  const body = clay('Body', '#6d7148', 0.5);
  const face = clay('Face', '#5e623e', 0.55);
  const bezel = clay('Bezel', '#14180e', 0.4);
  const knob = clay('Knob', '#2e321c', 0.4);
  const amber = clay('Amber', '#f0a83a', 0.3);
  const w = 0.2, h = 0.4, d = 0.1;
  slab(body, [w, h, d], [0, 0, 0], { corner: 0.04, bevel: 0.018 });
  box(face, [w * 0.84, h * 0.82, 0.006], [0, h * 0.48, d / 2], { corner: 0.03, bevel: 0.002 });
  box(bezel, [0.14, 0.13, 0.008], [0, h * 0.7, d / 2 + 0.002], { corner: 0.014, bevel: 0.002 });
  glass(0.124, 0.114, [0, h * 0.7, d / 2 + 0.0065]);
  // Talk grille.
  cyl(knob, 0.045, 0.012, [0, h * 0.36, d / 2 + 0.003]);
  ball(face, 0.032, [0, h * 0.36, d / 2 + 0.01], [1, 1, 0.45]);
  box(knob, [0.05, 0.016, 0.008], [0, h * 0.14, d / 2 + 0.003], { corner: 0.008, bevel: 0.002 });
  // Side push-to-talk, antenna, channel knob and lamp.
  box(knob, [0.012, 0.07, 0.04], [w / 2 + 0.003, h * 0.62, 0], { corner: 0.005, bevel: 0.003 });
  cyl(knob, 0.012, 0.13, [-w * 0.18, h + 0.06, -0.01], { axis: 'y', segs: 14, r2: 0.008 });
  ball(knob, 0.014, [-w * 0.18, h + 0.13, -0.01]);
  cyl(knob, 0.018, 0.03, [w * 0.2, h + 0.012, -0.01], { axis: 'y', segs: 18 });
  cyl(amber, 0.007, 0.008, [w * 0.32, h * 0.92, d / 2 + 0.002]);
  writeGlb('radio');
}

buildCandy();
buildFlip();
buildRotary();
buildPhone();
buildPda();
buildCrt();
buildImac();
buildTerm();
buildLaptop();
buildRadio();
