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
let groups;     // named parts the page moves: [{ name, pivot, parts }]
let screen;     // the one named screen plane
let stack;      // transform stack

function reset() {
  parts = new Map();
  groups = [];
  screen = null;
  stack = [new THREE.Matrix4()];
}

// Parts built inside fn become one named node whose origin is `pivot`, so the
// page can spin, press or light it on its own.
function named(name, pivot, fn) {
  const outer = parts;
  const group = { name, pivot, parts: new Map() };
  parts = group.parts;
  stack.push(top().clone().premultiply(new THREE.Matrix4().makeTranslation(-pivot[0], -pivot[1], -pivot[2])));
  fn();
  stack.pop();
  parts = outer;
  groups.push(group);
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

  const madeMats = new Map();
  function material(mat) {
    if (madeMats.has(mat.name)) return madeMats.get(mat.name);
    const c = mat.color.clone(); // three keeps colors linear; glTF wants linear factors.
    json.materials.push({
      name: mat.name,
      pbrMetallicRoughness: {
        baseColorFactor: [c.r, c.g, c.b, 1],
        metallicFactor: mat.metal,
        roughnessFactor: mat.roughness
      }
    });
    madeMats.set(mat.name, json.materials.length - 1);
    return json.materials.length - 1;
  }

  function primitive(geos, mat) {
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
    return prim;
  }

  function node(nodeName, prims, translation) {
    json.meshes.push({ name: nodeName, primitives: prims });
    const n = { name: nodeName, mesh: json.meshes.length - 1 };
    if (translation) n.translation = translation;
    json.nodes.push(n);
    json.scenes[0].nodes.push(json.nodes.length - 1);
  }

  function mesh(nodeName, geos, mat) {
    node(nodeName, [primitive(geos, mat)]);
  }

  for (const [matName, { mat, geos }] of parts) mesh(matName, geos, mat);
  for (const g of groups) {
    node(g.name, [...g.parts.values()].map(({ mat, geos }) => primitive(geos, mat)), g.pivot);
  }
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
  for (let i = 0; i < 7; i++) box(key, [0.006, 0.004, 0.14], [-0.12 + i * 0.04, 0.38 + 0.0005, -0.14], { bevel: 0 });
  box(clay('Badge', '#c8b98f', 0.35, 0.5), [0.07, 0.016, 0.004], [-0.19, 0.135, 0.002], { corner: 0.004, bevel: 0.001 });
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
  cyl(clay('Hinge', '#3a3f46', 0.35, 0.3), 0.012, w * 0.7, [0, t + 0.004, -dep / 2 + 0.02], { axis: 'x', segs: 16 });
  cyl(clay('Status', '#7ed957', 0.3), 0.004, 0.004, [w / 2 - 0.04, t + 0.001, 0.17], { axis: 'y', segs: 10 });
  // Lid hinged at the back, opened a little past upright.
  within({ pos: [0, t, -dep / 2 + 0.02], rot: [-0.22, 0, 0] }, () => {
    slab(lid, [w, 0.34, 0.02], [0, 0, -0.01], { corner: 0.02, bevel: 0.007 });
    box(bezel, [w - 0.02, 0.32, 0.004], [0, 0.17, 0.001], { corner: 0.012, bevel: 0.001 });
    glass(0.48, 0.27, [0, 0.175, 0.0036]);
    cyl(clay('Cam', '#16181b', 0.3), 0.004, 0.003, [0, 0.326, 0.003], { segs: 10 });
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
buildPhone();
buildPda();
buildCrt();
buildImac();
buildTerm();
buildLaptop();
buildRadio();

function buildCassette() {
  reset();
  const cream = clay('Cream', '#e9e0cd', 0.5);
  const stripe = clay('Stripe', '#d8642c', 0.45);
  const well = clay('Well', '#1c1c1f', 0.45);
  const shell = clay('Shell', '#2e2e33', 0.38);
  const hub = clay('Hub', '#f1ede4', 0.4);
  const tape = clay('Tape', '#4a3326', 0.55);
  const grille = clay('Grille', '#4b4740', 0.65);
  const rim = clay('Rim', '#cdc3ae', 0.38, 0.35);
  const key = clay('Key', '#b9b2a4', 0.45);
  const handle = clay('Handle', '#3a3833', 0.4);
  const w = 0.46, h = 0.25, d = 0.15;
  slab(cream, [w, h, d], [0, 0, 0], { corner: 0.035, bevel: 0.016 });
  box(stripe, [w * 0.96, 0.034, 0.006], [0, 0.03, d / 2], { corner: 0.01, bevel: 0.002 });

  // Cassette door on the left: a dark well with the tape inside.
  const cx = -0.095, cy = 0.145, fz = d / 2;
  box(well, [0.23, 0.15, 0.008], [cx, cy, fz + 0.001], { corner: 0.012, bevel: 0.003 });
  box(shell, [0.2, 0.124, 0.008], [cx, cy, fz + 0.006], { corner: 0.008, bevel: 0.002 });
  glass(0.17, 0.042, [cx, cy + 0.036, fz + 0.0105]);
  box(well, [0.13, 0.044, 0.004], [cx, cy - 0.018, fz + 0.0095], { corner: 0.02, bevel: 0.001 });
  for (const [side, x] of [['ReelL', cx - 0.042], ['ReelR', cx + 0.042]]) {
    named(side, [x, cy - 0.018, fz + 0.012], () => {
      const r = side === 'ReelL' ? 0.024 : 0.017; // more tape on the left at the start
      cyl(tape, r, 0.004, [x, cy - 0.018, fz + 0.011], { segs: 24 });
      cyl(hub, 0.011, 0.006, [x, cy - 0.018, fz + 0.013], { segs: 18 });
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        box(well, [0.0035, 0.007, 0.004], [x + Math.cos(a) * 0.0065, cy - 0.018 + Math.sin(a) * 0.0065, fz + 0.0165], { bevel: 0, rot: [0, 0, a + Math.PI / 2] });
      }
    });
  }

  // Speaker on the right.
  cyl(rim, 0.07, 0.01, [0.125, 0.14, fz + 0.002], { segs: 40 });
  cyl(grille, 0.06, 0.012, [0.125, 0.14, fz + 0.004], { segs: 40 });
  cyl(rim, 0.016, 0.014, [0.125, 0.14, fz + 0.006], { segs: 20 });
  named('PlayLed', [0.19, 0.225, fz + 0.002], () => {
    cyl(clay('PlayLed', '#5a1a14', 0.3), 0.0065, 0.008, [0.19, 0.225, fz + 0.002], { segs: 14 });
  });

  // Piano keys on top; play is the orange one.
  const keyX = [-0.17, -0.115, -0.06, -0.005];
  keyX.forEach((x, i) => {
    const isPlay = i === 1;
    const k = isPlay ? stripe : key;
    const build = () => box(k, [0.046, 0.05, 0.022], [x, h + 0.006, 0.03], { corner: 0.006, bevel: 0.003, rot: [-Math.PI / 2, 0, 0] });
    if (isPlay) named('KeyPlay', [x, h, 0.03], build);
    else build();
  });

  // Carry handle.
  cyl(handle, 0.012, 0.03, [-0.15, h + 0.012, -0.035], { axis: 'y', segs: 14 });
  cyl(handle, 0.012, 0.03, [0.15, h + 0.012, -0.035], { axis: 'y', segs: 14 });
  ring(handle, 0.15, 0.011, [0, h + 0.027, -0.035], { arc: Math.PI, segs: 30 });
  writeGlb('cassette');
}

function buildLamp() {
  reset();
  const cream = clay('Cream', '#e4dac8', 0.5);
  const brass = clay('Brass', '#c7a16a', 0.3, 0.6);
  const cord = clay('Cord', '#3a3631', 0.5);
  // Weighted base and a short brass stem.
  cyl(cream, 0.1, 0.032, [0, 0.016, 0], { axis: 'y', segs: 40, r2: 0.088 });
  cyl(brass, 0.03, 0.012, [0, 0.038, 0], { axis: 'y', segs: 24 });
  cyl(brass, 0.014, 0.21, [0, 0.145, 0], { axis: 'y', segs: 18 });
  // Mushroom shade, its own node so the page can light it.
  named('Shade', [0, 0.25, 0], () => {
    const dome = new THREE.SphereGeometry(0.17, 40, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    dome.scale(1, 0.78, 1);
    add(dome, clay('Shade', '#f4ead6', 0.62), [0, 0.25, 0]);
    add(new THREE.CylinderGeometry(0.17, 0.17, 0.012, 40, 1, true), clay('Shade', '#f4ead6', 0.62), [0, 0.244, 0]);
    // The warm underside you see when it glows.
    add(new THREE.CircleGeometry(0.165, 40).rotateX(Math.PI / 2), clay('Bulb', '#fff4dc', 0.4), [0, 0.24, 0]);
  });
  // Pull chain, so the switch is visible.
  named('Chain', [0.11, 0.24, 0.07], () => {
    cyl(brass, 0.0025, 0.07, [0.11, 0.205, 0.07], { axis: 'y', segs: 8 });
    ball(brass, 0.009, [0.11, 0.168, 0.07]);
  });
  // A little cord trailing off the back.
  cyl(cord, 0.006, 0.12, [0, 0.01, -0.14], { axis: 'z', segs: 10 });
  writeGlb('lamp');
}

buildCassette();
buildLamp();

// ------------------------------------------------------------ more devices
// Sixteen more, so every project has a device of its own.

function buildPet() {
  reset();
  const shell = clay('Shell', '#f2a7b8', 0.4);
  const plate = clay('Plate', '#fbf3ea', 0.5);
  const bezel = clay('Bezel', '#3b3236', 0.45);
  const btn = clay('Btn', '#f7d36a', 0.4);
  const stand = clay('Stand', '#e7e1d8', 0.35);
  cyl(stand, 0.07, 0.02, [0, 0.01, 0], { axis: 'y', segs: 30, r2: 0.06 });
  ball(shell, 0.14, [0, 0.165, 0], [0.9, 1.08, 0.42]);
  ring(shell, 0.025, 0.006, [0, 0.33, 0], { segs: 18 });
  cyl(plate, 0.075, 0.01, [0, 0.18, 0.054], { segs: 36 });
  box(bezel, [0.085, 0.07, 0.006], [0, 0.19, 0.06], { corner: 0.01, bevel: 0.0015 });
  glass(0.072, 0.058, [0, 0.19, 0.0635]);
  [-0.035, 0, 0.035].forEach((x) => cyl(btn, 0.011, 0.01, [x, 0.125, 0.056], { segs: 16 }));
  writeGlb('pet');
}

function buildDigicam() {
  reset();
  const body = clay('Body', '#c9ccd2', 0.32, 0.4);
  const grip = clay('Grip', '#2c2e33', 0.6);
  const bezel = clay('Bezel', '#0b0c0e', 0.35);
  const lens = clay('Lens', '#1a1c20', 0.3, 0.3);
  const red = clay('Shutter', '#c8402f', 0.4);
  const w = 0.36, h = 0.22, d = 0.07;
  slab(body, [w, h, d], [0, 0, 0], { corner: 0.03, bevel: 0.012 });
  box(grip, [0.05, h * 0.8, 0.01], [w / 2 - 0.035, h * 0.5, d / 2 + 0.002], { corner: 0.012, bevel: 0.003 });
  box(bezel, [0.23, 0.16, 0.006], [-0.03, h * 0.52, d / 2 + 0.002], { corner: 0.01, bevel: 0.002 });
  glass(0.21, 0.14, [-0.03, h * 0.52, d / 2 + 0.0055]);
  // The lens points away from us, out the back.
  cyl(lens, 0.06, 0.05, [-0.02, h * 0.52, -d / 2 - 0.02], { segs: 32 });
  cyl(body, 0.068, 0.02, [-0.02, h * 0.52, -d / 2 - 0.004], { segs: 32 });
  cyl(red, 0.016, 0.012, [0.11, h + 0.005, 0], { axis: 'y', segs: 18 });
  cyl(grip, 0.022, 0.014, [-0.1, h + 0.006, 0], { axis: 'y', segs: 18 });
  writeGlb('digicam');
}

function buildPager() {
  reset();
  const body = clay('Body', '#2f6f78', 0.32);
  const bezel = clay('Bezel', '#132326', 0.4);
  const btn = clay('Btn', '#d9e4e2', 0.4);
  const clip = clay('Clip', '#1d2c2f', 0.5);
  const w = 0.28, h = 0.17, d = 0.07;
  slab(body, [w, h, d], [0, 0, 0], { corner: 0.04, bevel: 0.016 });
  box(bezel, [0.22, 0.075, 0.006], [0, h * 0.64, d / 2 + 0.002], { corner: 0.01, bevel: 0.002 });
  glass(0.2, 0.06, [0, h * 0.64, d / 2 + 0.0055]);
  [-0.07, -0.023, 0.023, 0.07].forEach((x) => box(btn, [0.035, 0.018, 0.008], [x, h * 0.22, d / 2 + 0.003], { corner: 0.008, bevel: 0.002 }));
  slab(clip, [0.1, h * 0.8, 0.012], [0, h * 0.1, -d / 2 - 0.006], { corner: 0.01, bevel: 0.003 });
  writeGlb('pager');
}

function buildLearner() {
  reset();
  const shell = clay('Shell', '#e2622a', 0.42);
  const key = clay('Key', '#f2d36b', 0.45);
  const bezel = clay('Bezel', '#2a120a', 0.4);
  const grille = clay('Grille', '#a8451c', 0.6);
  const foot = clay('Foot', '#b44a1c', 0.5);
  // Propped up on its back foot like a book on a desk.
  slab(foot, [0.34, 0.03, 0.18], [0, 0, -0.04], { corner: 0.02, bevel: 0.01 });
  within({ pos: [0, 0.02, 0.05], rot: [-0.55, 0, 0] }, () => {
    slab(shell, [0.44, 0.36, 0.05], [0, 0, 0], { corner: 0.05, bevel: 0.016 });
    ring(shell, 0.08, 0.014, [0, 0.36, 0], { arc: Math.PI, segs: 24 });
    box(bezel, [0.3, 0.07, 0.006], [-0.03, 0.29, 0.027], { corner: 0.01, bevel: 0.002 });
    glass(0.28, 0.054, [-0.03, 0.29, 0.0305]);
    cyl(grille, 0.032, 0.008, [0.165, 0.29, 0.027], { segs: 24 });
    keys(key, { cols: 7, rows: 4, w: 0.04, h: 0.032, gx: 0.012, gy: 0.012, x: 0, y: 0.205, z: 0.029, corner: 0.006 });
  });
  writeGlb('learner');
}

function buildWideHandheld() {
  reset();
  const body = clay('Body', '#6b5aa8', 0.36);
  const bezel = clay('Bezel', '#1b1a24', 0.4);
  const pad = clay('Pad', '#24222c', 0.45);
  const btn = clay('Btn', '#e9e4f5', 0.4);
  const w = 0.44, h = 0.2, d = 0.06;
  slab(body, [w, h, d], [0, 0, 0], { corner: 0.08, bevel: 0.016 });
  box(bezel, [0.2, 0.15, 0.006], [0, h * 0.52, d / 2 + 0.002], { corner: 0.012, bevel: 0.002 });
  glass(0.17, 0.12, [0, h * 0.52, d / 2 + 0.0055]);
  box(pad, [0.06, 0.02, 0.008], [-0.155, h * 0.55, d / 2 + 0.003], { corner: 0.004, bevel: 0.002 });
  box(pad, [0.02, 0.06, 0.008], [-0.155, h * 0.55, d / 2 + 0.003], { corner: 0.004, bevel: 0.002 });
  cyl(btn, 0.014, 0.01, [0.14, h * 0.48, d / 2 + 0.003], { segs: 18 });
  cyl(btn, 0.014, 0.01, [0.175, h * 0.6, d / 2 + 0.003], { segs: 18 });
  slab(pad, [0.08, 0.012, 0.03], [-0.15, h - 0.004, 0], { corner: 0.006, bevel: 0.003 });
  slab(pad, [0.08, 0.012, 0.03], [0.15, h - 0.004, 0], { corner: 0.006, bevel: 0.003 });
  writeGlb('widehandheld');
}

function buildTv() {
  reset();
  const wood = clay('Wood', '#8a5a34', 0.55);
  const trim = clay('Trim', '#d8c7a6', 0.45);
  const bezel = clay('Bezel', '#171513', 0.35);
  const knob = clay('Knob', '#2b2420', 0.4);
  const chrome = clay('Chrome', '#c8c9cc', 0.25, 0.8);
  const w = 0.44, h = 0.32, d = 0.3;
  slab(wood, [w, h, d], [0, 0.04, 0], { corner: 0.03, bevel: 0.016 });
  box(trim, [0.32, 0.25, 0.008], [-0.045, 0.04 + h * 0.5, d / 2 + 0.001], { corner: 0.03, bevel: 0.003 });
  box(bezel, [0.29, 0.22, 0.006], [-0.045, 0.04 + h * 0.5, d / 2 + 0.006], { corner: 0.04, bevel: 0.002 });
  glass(0.26, 0.195, [-0.045, 0.04 + h * 0.5, d / 2 + 0.0095]);
  cyl(knob, 0.022, 0.018, [0.165, 0.04 + h * 0.7, d / 2 + 0.006], { segs: 20 });
  cyl(knob, 0.018, 0.018, [0.165, 0.04 + h * 0.42, d / 2 + 0.006], { segs: 20 });
  for (let i = 0; i < 4; i++) box(knob, [0.04, 0.004, 0.004], [0.165, 0.04 + h * 0.2 - i * 0.012, d / 2 + 0.002], { bevel: 0 });
  [-0.16, 0.16].forEach((x) => slab(knob, [0.025, 0.045, 0.025], [x, 0, 0], { bevel: 0.006 }));
  // Rabbit ears.
  cyl(knob, 0.03, 0.02, [0, 0.04 + h + 0.01, -0.03], { axis: 'y', segs: 20 });
  within({ pos: [0, 0.04 + h + 0.02, -0.03], rot: [0, 0, 0.45] }, () => cyl(chrome, 0.004, 0.24, [0, 0.12, 0], { axis: 'y', segs: 8 }));
  within({ pos: [0, 0.04 + h + 0.02, -0.03], rot: [0, 0, -0.45] }, () => cyl(chrome, 0.004, 0.24, [0, 0.12, 0], { axis: 'y', segs: 8 }));
  writeGlb('tv');
}

function buildArcade() {
  reset();
  const side = clay('Side', '#2b3a8c', 0.45);
  const front = clay('Front', '#1a1d26', 0.5);
  const bezel = clay('Bezel', '#06070a', 0.35);
  const marquee = clay('Marquee', '#f3c94c', 0.4);
  const red = clay('Red', '#d63b30', 0.35);
  const btn = clay('Btn', '#f2efe6', 0.4);
  const w = 0.3, d = 0.3;
  slab(side, [w, 0.3, d], [0, 0, 0], { corner: 0.01, bevel: 0.01 });
  // Control deck, tipped toward the player.
  box(front, [w, 0.04, 0.12], [0, 0.31, 0.11], { corner: 0.01, bevel: 0.008, rot: [0.25, 0, 0] });
  cyl(front, 0.006, 0.04, [-0.06, 0.35, 0.12], { axis: 'y', segs: 10 });
  ball(red, 0.018, [-0.06, 0.375, 0.12]);
  [0.03, 0.07, 0.11].forEach((x) => cyl(btn, 0.012, 0.012, [x, 0.335, 0.12], { axis: 'y', segs: 14 }));
  // Upper cabinet and the screen, leaning back.
  slab(side, [w, 0.3, 0.2], [0, 0.32, -0.05], { corner: 0.01, bevel: 0.01 });
  within({ pos: [0, 0.47, 0.05], rot: [-0.18, 0, 0] }, () => {
    box(bezel, [0.25, 0.2, 0.01], [0, 0, 0], { corner: 0.01, bevel: 0.003 });
    glass(0.22, 0.17, [0, 0, 0.0055]);
  });
  slab(side, [w, 0.07, 0.22], [0, 0.6, -0.06], { corner: 0.01, bevel: 0.008 });
  box(marquee, [w * 0.86, 0.05, 0.008], [0, 0.635, 0.052], { corner: 0.008, bevel: 0.002 });
  writeGlb('arcade');
}

function buildTypewriter() {
  reset();
  const body = clay('Body', '#9cc9b8', 0.4);
  const key = clay('Key', '#f4f1ea', 0.45);
  const keyRim = clay('KeyRim', '#2c2f2e', 0.4);
  const roller = clay('Roller', '#26292a', 0.45);
  const chrome = clay('Chrome', '#cfd2d4', 0.25, 0.8);
  slab(body, [0.44, 0.1, 0.3], [0, 0, 0], { corner: 0.03, bevel: 0.02 });
  // Keys on a sloped front deck.
  within({ pos: [0, 0.1, 0.07], rot: [0.32, 0, 0] }, () => {
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 9; c++) {
        const x = -0.16 + c * 0.04 + (r % 2) * 0.015;
        cyl(keyRim, 0.015, 0.006, [x, 0.008, -0.05 + r * 0.04], { axis: 'y', segs: 14 });
        cyl(key, 0.012, 0.004, [x, 0.012, -0.05 + r * 0.04], { axis: 'y', segs: 14 });
      }
    }
  });
  // Carriage and platen with the sheet rising out of it.
  slab(body, [0.4, 0.06, 0.1], [0, 0.09, -0.09], { corner: 0.02, bevel: 0.012 });
  cyl(roller, 0.032, 0.42, [0, 0.17, -0.09], { axis: 'x', segs: 24 });
  cyl(chrome, 0.012, 0.05, [-0.24, 0.17, -0.09], { axis: 'x', segs: 14 });
  box(clay('Paper', '#fbf8f1', 0.7), [0.27, 0.23, 0.003], [0, 0.29, -0.075], { bevel: 0, rot: [-0.12, 0, 0] });
  glass(0.24, 0.17, [0, 0.31, -0.071], [-0.12, 0, 0]);
  writeGlb('typewriter');
}

function buildScope() {
  reset();
  const body = clay('Body', '#c9cfd6', 0.42);
  const panel = clay('Panel', '#3a4250', 0.5);
  const bezel = clay('Bezel', '#0b100d', 0.35);
  const knob = clay('Knob', '#e9e4da', 0.4);
  const red = clay('Red', '#c8402f', 0.4);
  const w = 0.44, h = 0.3, d = 0.32;
  slab(body, [w, h, d], [0, 0.02, 0], { corner: 0.02, bevel: 0.014 });
  box(panel, [w * 0.94, h * 0.88, 0.008], [0, 0.02 + h / 2, d / 2 + 0.001], { corner: 0.012, bevel: 0.002 });
  cyl(bezel, 0.1, 0.012, [-0.09, 0.02 + h * 0.52, d / 2 + 0.004], { segs: 40 });
  glass(0.15, 0.15, [-0.09, 0.02 + h * 0.52, d / 2 + 0.0105]);
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) cyl(c === 2 && r === 0 ? red : knob, 0.014, 0.016, [0.07 + c * 0.045, 0.02 + h * 0.75 - r * 0.07, d / 2 + 0.008], { segs: 16 });
  [-0.17, 0.17].forEach((x) => slab(panel, [0.04, 0.02, 0.28], [x, 0, 0], { bevel: 0.006 }));
  cyl(panel, 0.012, 0.36, [0, 0.02 + h + 0.03, 0.02], { axis: 'x', segs: 12 });
  [-0.18, 0.18].forEach((x) => slab(panel, [0.014, 0.04, 0.014], [x, 0.02 + h - 0.01, 0.02], { bevel: 0.003 }));
  writeGlb('scope');
}

function buildEreader() {
  reset();
  const body = clay('Body', '#3a3a3c', 0.45);
  const btn = clay('Btn', '#5a5a5e', 0.45);
  const stand = clay('Stand', '#d8d2c6', 0.45);
  slab(stand, [0.22, 0.03, 0.14], [0, 0, -0.02], { corner: 0.02, bevel: 0.01 });
  within({ pos: [0, 0.02, 0.0], rot: [-0.2, 0, 0] }, () => {
    slab(body, [0.3, 0.42, 0.025], [0, 0, 0], { corner: 0.02, bevel: 0.008 });
    glass(0.25, 0.33, [0, 0.235, 0.0135]);
    box(btn, [0.01, 0.06, 0.006], [0.14, 0.24, 0.012], { corner: 0.004, bevel: 0.001 });
    box(btn, [0.01, 0.06, 0.006], [-0.14, 0.24, 0.012], { corner: 0.004, bevel: 0.001 });
    box(btn, [0.06, 0.012, 0.004], [0, 0.04, 0.0135], { corner: 0.005, bevel: 0.001 });
  });
  writeGlb('ereader');
}

function buildMusicPlayer() {
  reset();
  const face = clay('Face', '#f4f3ef', 0.3);
  const back = clay('Back', '#c4c7cc', 0.22, 0.85);
  const bezel = clay('Bezel', '#111214', 0.35);
  const wheel = clay('Wheel', '#e2e2e0', 0.35);
  const centre = clay('Centre', '#fbfbfa', 0.3);
  const dock = clay('Dock', '#e9e8e4', 0.4);
  slab(dock, [0.24, 0.05, 0.12], [0, 0, 0], { corner: 0.04, bevel: 0.016 });
  within({ pos: [0, 0.04, 0], rot: [-0.12, 0, 0] }, () => {
    slab(back, [0.2, 0.34, 0.04], [0, 0, -0.004], { corner: 0.025, bevel: 0.01 });
    slab(face, [0.196, 0.336, 0.012], [0, 0.002, 0.016], { corner: 0.024, bevel: 0.004 });
    box(bezel, [0.16, 0.12, 0.004], [0, 0.255, 0.023], { corner: 0.006, bevel: 0.001 });
    glass(0.15, 0.11, [0, 0.255, 0.0255]);
    cyl(wheel, 0.06, 0.004, [0, 0.105, 0.023], { segs: 40 });
    cyl(centre, 0.022, 0.006, [0, 0.105, 0.025], { segs: 28 });
  });
  writeGlb('musicplayer');
}

function buildCalculator() {
  reset();
  const body = clay('Body', '#3b3632', 0.45);
  const plate = clay('Plate', '#bfa77a', 0.35, 0.5);
  const bezel = clay('Bezel', '#1a1714', 0.4);
  const key = clay('Key', '#5d5650', 0.45);
  const op = clay('Op', '#d86a3a', 0.4);
  const solar = clay('Solar', '#2a2018', 0.3, 0.3);
  slab(body, [0.24, 0.05, 0.12], [0, 0, -0.04], { corner: 0.02, bevel: 0.01 });
  within({ pos: [0, 0.02, 0.02], rot: [-0.32, 0, 0] }, () => {
    slab(body, [0.24, 0.38, 0.03], [0, 0, 0], { corner: 0.02, bevel: 0.01 });
    box(plate, [0.22, 0.12, 0.004], [0, 0.31, 0.016], { corner: 0.012, bevel: 0.001 });
    box(solar, [0.1, 0.022, 0.004], [0.04, 0.355, 0.0185], { corner: 0.003, bevel: 0.001 });
    box(bezel, [0.19, 0.06, 0.004], [0, 0.3, 0.0185], { corner: 0.005, bevel: 0.001 });
    glass(0.17, 0.045, [0, 0.3, 0.021]);
    keys(key, { cols: 4, rows: 5, w: 0.04, h: 0.03, gx: 0.012, gy: 0.012, x: -0.006, y: 0.22, z: 0.018, corner: 0.006 });
    for (let r = 0; r < 4; r++) box(op, [0.03, 0.03, 0.008], [0.098, 0.22 - r * 0.042, 0.018], { corner: 0.006, bevel: 0.002 });
  });
  writeGlb('calculator');
}

function buildClockRadio() {
  reset();
  const shell = clay('Shell', '#e8dccb', 0.45);
  const wood = clay('Wood', '#7a4e2e', 0.55);
  const grille = clay('Grille', '#5b4b3c', 0.6);
  const bezel = clay('Bezel', '#140b08', 0.35);
  const bar = clay('Bar', '#c9b79a', 0.4);
  const w = 0.42, h = 0.18, d = 0.2;
  slab(wood, [w, h, d], [0, 0, 0], { corner: 0.03, bevel: 0.016 });
  box(shell, [w * 0.94, h * 0.84, 0.008], [0, h * 0.5, d / 2 + 0.001], { corner: 0.02, bevel: 0.003 });
  box(bezel, [0.2, 0.1, 0.006], [0.085, h * 0.5, d / 2 + 0.006], { corner: 0.01, bevel: 0.002 });
  glass(0.18, 0.08, [0.085, h * 0.5, d / 2 + 0.0095]);
  cyl(grille, 0.055, 0.008, [-0.12, h * 0.5, d / 2 + 0.005], { segs: 32 });
  for (let i = 0; i < 4; i++) cyl(shell, 0.04 - i * 0.01, 0.009, [-0.12, h * 0.5, d / 2 + 0.006], { segs: 30 });
  slab(bar, [0.24, 0.016, 0.06], [0, h - 0.004, 0], { corner: 0.01, bevel: 0.005 });
  writeGlb('clockradio');
}

function buildDualScreen() {
  reset();
  const shell = clay('Shell', '#d23c3c', 0.36);
  const inner = clay('Inner', '#2a2b30', 0.45);
  const bezel = clay('Bezel', '#0c0d10', 0.35);
  const btn = clay('Btn', '#f0ede6', 0.4);
  const w = 0.32, dep = 0.2, t = 0.024;
  box(shell, [w, dep, t], [0, t / 2, 0.04], { corner: 0.03, bevel: 0.008, rot: [-Math.PI / 2, 0, 0] });
  box(bezel, [0.15, 0.11, 0.004], [0, t + 0.001, 0.04], { corner: 0.006, bevel: 0.001, rot: [-Math.PI / 2, 0, 0] });
  box(inner, [0.13, 0.095, 0.002], [0, t + 0.003, 0.04], { bevel: 0, rot: [-Math.PI / 2, 0, 0] });
  box(btn, [0.04, 0.012, 0.008], [-0.115, t + 0.003, 0.04], { corner: 0.003, bevel: 0.001, rot: [-Math.PI / 2, 0, 0] });
  box(btn, [0.012, 0.04, 0.008], [-0.115, t + 0.003, 0.04], { corner: 0.003, bevel: 0.001, rot: [-Math.PI / 2, 0, 0] });
  [[0.11, 0.025], [0.13, 0.05], [0.09, 0.05], [0.11, 0.075]].forEach(([x, z]) => cyl(btn, 0.009, 0.008, [x, t + 0.003, z], { axis: 'y', segs: 14 }));
  cyl(inner, 0.012, w * 0.9, [0, t + 0.008, -dep / 2 + 0.05], { axis: 'x', segs: 16 });
  within({ pos: [0, t + 0.008, -dep / 2 + 0.05], rot: [-0.3, 0, 0] }, () => {
    slab(shell, [w, 0.2, 0.02], [0, 0, -0.01], { corner: 0.03, bevel: 0.007 });
    box(bezel, [0.2, 0.15, 0.004], [0, 0.105, 0.001], { corner: 0.006, bevel: 0.001 });
    glass(0.18, 0.135, [0, 0.105, 0.0035]);
  });
  writeGlb('dualscreen');
}

function buildWatch() {
  reset();
  const pillow = clay('Pillow', '#e9e2d6', 0.7);
  const plinth = clay('Plinth', '#3b3a38', 0.5);
  const steel = clay('Steel', '#c4c6ca', 0.22, 0.85);
  const strap = clay('Strap', '#1f2023', 0.55);
  const bezel = clay('Bezel', '#0c0d0f', 0.35);
  const btn = clay('Btn', '#9fa3aa', 0.3, 0.7);
  slab(plinth, [0.28, 0.05, 0.2], [0, 0, 0], { corner: 0.02, bevel: 0.01 });
  ball(pillow, 0.1, [0, 0.12, 0], [1.1, 0.75, 0.75]);
  // The strap wraps round the pillow; the case faces us.
  ring(strap, 0.085, 0.018, [0, 0.12, 0], { segs: 36, rot: [0, Math.PI / 2, 0] });
  slab(steel, [0.15, 0.17, 0.04], [0, 0.04, 0.115], { corner: 0.03, bevel: 0.012 });
  box(bezel, [0.13, 0.14, 0.004], [0, 0.125, 0.1365], { corner: 0.022, bevel: 0.001 });
  glass(0.11, 0.115, [0, 0.125, 0.139]);
  box(btn, [0.008, 0.03, 0.02], [0.079, 0.15, 0.115], { corner: 0.003, bevel: 0.002 });
  box(btn, [0.008, 0.03, 0.02], [0.079, 0.1, 0.115], { corner: 0.003, bevel: 0.002 });
  writeGlb('watch');
}

function buildCamcorder() {
  reset();
  const body = clay('Body', '#2e3036', 0.42);
  const accent = clay('Accent', '#8d929c', 0.3, 0.6);
  const lens = clay('Lens', '#0f1013', 0.25, 0.3);
  const glassMat = clay('Glass', '#2a3e5a', 0.15, 0.4);
  const bezel = clay('Bezel', '#08090b', 0.35);
  const red = clay('Rec', '#d33a2c', 0.35);
  slab(body, [0.34, 0.17, 0.15], [0.02, 0, 0], { corner: 0.04, bevel: 0.018 });
  // Lens barrel out to the left.
  cyl(accent, 0.062, 0.05, [-0.17, 0.09, 0], { axis: 'x', segs: 30 });
  cyl(lens, 0.055, 0.04, [-0.21, 0.09, 0], { axis: 'x', segs: 30 });
  cyl(glassMat, 0.04, 0.004, [-0.231, 0.09, 0], { axis: 'x', segs: 30 });
  // Viewfinder on top at the back.
  cyl(body, 0.022, 0.12, [0.1, 0.19, -0.03], { axis: 'x', segs: 18 });
  cyl(red, 0.012, 0.012, [0.12, 0.17, 0.05], { axis: 'y', segs: 14 });
  // The flip-out screen, swung open to face us.
  within({ pos: [-0.05, 0.03, 0.078], rot: [0, -0.35, 0] }, () => {
    slab(body, [0.17, 0.12, 0.016], [0.085, 0, 0.008], { corner: 0.012, bevel: 0.005 });
    box(bezel, [0.15, 0.1, 0.004], [0.085, 0.06, 0.0165], { corner: 0.005, bevel: 0.001 });
    glass(0.14, 0.09, [0.085, 0.06, 0.019]);
  });
  // Hand strap on the right.
  box(clay('Strap', '#171719', 0.6), [0.16, 0.03, 0.02], [0.05, 0.11, -0.085], { corner: 0.01, bevel: 0.006 });
  writeGlb('camcorder');
}

buildPet();
buildDigicam();
buildPager();
buildLearner();
buildWideHandheld();
buildTv();
buildArcade();
buildTypewriter();
buildScope();
buildEreader();
buildMusicPlayer();
buildCalculator();
buildClockRadio();
buildDualScreen();
buildWatch();
buildCamcorder();

// ------------------------------------------------------- rebuilt originals
// The first three devices came from Blender with plainer detail. These
// versions replace them so every device in the room shares one finish.

function buildMacintosh() {
  reset();
  const beige = clay('Beige', '#e9e0cf', 0.5);
  const face = clay('Face', '#f1eadc', 0.48);
  const shade = clay('Shade', '#cdbfa6', 0.55);
  const well = clay('Well', '#2b2824', 0.45);
  const bezel = clay('Bezel', '#0d0d0e', 0.35);
  const slot = clay('Slot', '#1d1b18', 0.6);
  const w = 0.34, h = 0.46, d = 0.36;
  // Main case, with a slightly narrower back that tapers away.
  slab(beige, [w, h, d * 0.62], [0, 0.02, d * 0.19], { corner: 0.035, bevel: 0.022 });
  slab(shade, [w * 0.9, h * 0.9, d * 0.42], [0, 0.04, -d * 0.24], { corner: 0.04, bevel: 0.02 });
  // Front face plate, the deep screen well, and the glass.
  box(face, [w * 0.92, h * 0.92, 0.01], [0, 0.02 + h * 0.5, d * 0.5 + 0.001], { corner: 0.03, bevel: 0.004 });
  box(well, [0.25, 0.2, 0.012], [0, 0.02 + h * 0.64, d * 0.5 + 0.003], { corner: 0.02, bevel: 0.004 });
  box(bezel, [0.226, 0.176, 0.006], [0, 0.02 + h * 0.64, d * 0.5 + 0.008], { corner: 0.012, bevel: 0.002 });
  glass(0.21, 0.16, [0, 0.02 + h * 0.64, d * 0.5 + 0.0115]);
  // Floppy slot with its eject button, and the chin groove.
  box(slot, [0.12, 0.012, 0.008], [0.06, 0.02 + h * 0.3, d * 0.5 + 0.004], { corner: 0.004, bevel: 0.001 });
  box(shade, [0.012, 0.012, 0.008], [0.135, 0.02 + h * 0.3, d * 0.5 + 0.004], { corner: 0.003, bevel: 0.001 });
  box(shade, [w * 0.86, 0.004, 0.006], [0, 0.02 + h * 0.18, d * 0.5 + 0.004], { bevel: 0 });
  // Carry-handle recess on top, vents down the side.
  box(well, [0.18, 0.008, 0.04], [0, 0.02 + h + 0.0005, -d * 0.05], { corner: 0.006, bevel: 0.002 });
  for (let i = 0; i < 6; i++) box(shade, [0.004, 0.012, 0.11], [w / 2 + 0.0005, 0.02 + h * 0.75 - i * 0.03, -d * 0.02], { bevel: 0 });
  [-0.12, 0.12].forEach((x) => slab(shade, [0.06, 0.02, 0.08], [x, 0, d * 0.32], { corner: 0.008, bevel: 0.004 }));
  writeGlb('macintosh');
}

function buildCamera() {
  reset();
  const cream = clay('Cream', '#f1ebe0', 0.45);
  const front = clay('Front', '#24252a', 0.42);
  const silver = clay('Silver', '#cdd0d5', 0.25, 0.8);
  const lens = clay('Lens', '#0d0f13', 0.18, 0.4);
  const lensGlass = clay('LensGlass', '#25374d', 0.12, 0.5);
  const flash = clay('Flash', '#f6f3ec', 0.3);
  const ribs = clay('Ribs', '#d9d4c9', 0.4);
  const red = clay('Shutter', '#d2452f', 0.35);
  const print = clay('Print', '#faf7f0', 0.72);
  const mouth = clay('Mouth', '#0c0c0e', 0.6);
  const bw = 0.5, bh = 0.24, bd = 0.17, z0 = 0.34;
  // A cream body with a dark front panel.
  slab(cream, [bw, bh, bd], [0, z0, 0], { corner: 0.05, bevel: 0.02 });
  box(front, [bw * 0.94, bh * 0.82, 0.012], [0, z0 + bh * 0.5, bd / 2 + 0.002], { corner: 0.04, bevel: 0.004 });
  // The lens: silver rings stepping in to dark glass.
  const lx = -0.08, ly = z0 + bh * 0.5, lz = bd / 2;
  cyl(silver, 0.068, 0.014, [lx, ly, lz + 0.008], { segs: 40 });
  cyl(front, 0.058, 0.02, [lx, ly, lz + 0.014], { segs: 40 });
  cyl(silver, 0.046, 0.012, [lx, ly, lz + 0.024], { segs: 36 });
  cyl(lens, 0.038, 0.012, [lx, ly, lz + 0.028], { segs: 36 });
  cyl(lensGlass, 0.026, 0.004, [lx, ly, lz + 0.034], { segs: 30 });
  ball(flash, 0.007, [lx - 0.012, ly + 0.012, lz + 0.035]);
  // Ribbed flash window and the viewfinder.
  box(flash, [0.12, 0.06, 0.01], [0.13, z0 + bh * 0.66, lz + 0.006], { corner: 0.008, bevel: 0.003 });
  for (let i = 0; i < 5; i++) box(ribs, [0.11, 0.0025, 0.002], [0.13, z0 + bh * 0.66 - 0.022 + i * 0.011, lz + 0.0115], { bevel: 0 });
  box(lens, [0.05, 0.034, 0.01], [0.13, z0 + bh * 0.3, lz + 0.006], { corner: 0.008, bevel: 0.003 });
  cyl(red, 0.018, 0.012, [0.17, z0 + bh + 0.004, 0.02], { axis: 'y', segs: 22 });
  [-bw / 2, bw / 2].forEach((x) => box(silver, [0.012, 0.03, 0.02], [x + Math.sign(x) * 0.004, z0 + bh * 0.8, 0], { corner: 0.004, bevel: 0.002 }));
  // The print sliding out of the slot, nearly to the floor.
  box(mouth, [0.36, 0.01, 0.02], [0, z0 + 0.01, bd / 2 - 0.004], { corner: 0.004, bevel: 0.001 });
  const py = bd / 2 + 0.004;
  slab(print, [0.3, 0.33, 0.008], [0, 0.012, py], { corner: 0.004, bevel: 0.002 });
  glass(0.256, 0.3, [0, 0.012 + 0.33 * 0.52, py + 0.0045]);
  writeGlb('camera');
}

function buildHandheld() {
  reset();
  const shell = clay('Shell', '#cbcbbf', 0.52);
  const lower = clay('Lower', '#bdbdb0', 0.55);
  const plate = clay('Plate', '#5f6372', 0.45);
  const pad = clay('Pad', '#1f2124', 0.45);
  const btn = clay('Btn', '#a8325a', 0.4);
  const pill = clay('Pill', '#8b8d90', 0.45);
  const led = clay('Led', '#d8402f', 0.3);
  const w = 0.3, h = 0.5, d = 0.07;
  slab(shell, [w, h, d], [0, 0, 0], { corner: 0.028, bevel: 0.014 });
  box(lower, [w * 0.96, h * 0.42, 0.006], [0, h * 0.22, d / 2], { corner: 0.03, bevel: 0.002 });
  // The dark plate round the glass, with its power light.
  box(plate, [0.25, 0.2, 0.008], [0, h * 0.72, d / 2 + 0.002], { corner: 0.016, bevel: 0.002 });
  glass(0.17, 0.135, [0.004, h * 0.71, d / 2 + 0.0065]);
  cyl(led, 0.006, 0.006, [-0.105, h * 0.75, d / 2 + 0.006], { segs: 14 });
  // D-pad, the two buttons on a slant, start and select.
  box(pad, [0.075, 0.025, 0.012], [-0.075, h * 0.36, d / 2 + 0.004], { corner: 0.004, bevel: 0.002 });
  box(pad, [0.025, 0.075, 0.012], [-0.075, h * 0.36, d / 2 + 0.004], { corner: 0.004, bevel: 0.002 });
  cyl(btn, 0.019, 0.012, [0.065, h * 0.34, d / 2 + 0.004], { segs: 24 });
  cyl(btn, 0.019, 0.012, [0.11, h * 0.38, d / 2 + 0.004], { segs: 24 });
  box(pill, [0.036, 0.011, 0.006], [-0.02, h * 0.17, d / 2 + 0.003], { corner: 0.0055, bevel: 0.0015, rot: [0, 0, 0.45] });
  box(pill, [0.036, 0.011, 0.006], [0.025, h * 0.17, d / 2 + 0.003], { corner: 0.0055, bevel: 0.0015, rot: [0, 0, 0.45] });
  // Speaker slots, angled in the bottom corner.
  for (let i = 0; i < 6; i++) box(plate, [0.005, 0.05, 0.004], [0.075 + i * 0.012, h * 0.1 + i * 0.006, d / 2 + 0.002], { bevel: 0, rot: [0, 0, 0.5] });
  // Power switch on top.
  box(pill, [0.03, 0.012, 0.016], [-0.08, h + 0.004, 0], { corner: 0.004, bevel: 0.002 });
  writeGlb('handheld');
}

buildMacintosh();
buildCamera();
buildHandheld();
