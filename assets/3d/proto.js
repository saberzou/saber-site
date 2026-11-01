import * as THREE from 'three';
import { GLTFLoader } from './vendor/loaders/GLTFLoader.js';
import { FISH_SVG, paintScreen } from './screens.js';

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const CELL_DESKTOP = 278;
const CELL_MOBILE = 224;

// Cells sit on integer coordinates, and each device stands in the middle of
// its own square. The layout follows the SVG field around the intro camera.
function work(file, cell, face, name, icon, href) {
  return { file: 'assets/3d/models/' + file + '.glb', cell: cell, face: face, name: name, icon: icon, href: href };
}
const DEVICES = [
  work('phone', [-2, -1], 'gloss', 'Axiom Thoughts', 'images/icons/axiom-thoughts.png', 'https://saberzou.github.io/axiom-thoughts/'),
  work('macintosh', [-1, -1], 'paper', 'SaberOS', 'images/icons/thiings/finder.png', 'os.html'),
  work('term', [0, -1], 'phos', 'Artuzzle', 'images/icons/artuzzle.png', 'https://saberzou.github.io/artuzzle/'),
  work('flip', [1, -1], 'tft', 'Sequence', 'images/icons/ios/sequence.jpg', 'https://apps.apple.com/app/id6789496773'),
  work('handheld', [2, -1], 'lcd', 'Daypond', 'daypond/assets/app-icon.png', 'daypond/'),
  work('pda', [-2, 0], 'mono', 'Between Floors', 'images/icons/between-floors.png', 'https://saberzou.github.io/between-floors/'),
  work('imac', [-1, 0], 'aqua', 'Movie Oracle', 'images/icons/movie-oracle.png', 'https://saberzou.github.io/movie-oracle/'),
  { file: 'assets/3d/models/camera.glb', cell: [0, 0], face: 'note' },
  { file: 'assets/3d/models/radio.glb', cell: [1, 0], face: 'fish', name: 'Archer', href: './' },
  work('crt', [2, 0], 'tube', 'Axel Art', 'images/icons/axel.png', 'https://saberzou.github.io/axel-art/'),
  work('laptop', [-1, 1], 'paper', 'Pixel Dailies', 'images/icons/pixel-dailies.png', 'https://saberzou.github.io/pixel-dailies/'),
  work('rotary', [0, 1], 'amber', 'Finwords', 'finwords/assets/app-icon.png', 'finwords/'),
  work('candy', [1, 1], 'lcd', 'Movy', 'images/icons/ios/movy.jpg', 'https://apps.apple.com/app/id1093345142'),
  // Two toys in the empty corners: music, and the light switch for the room.
  { file: 'assets/3d/models/cassette.glb', cell: [-2, 1], face: 'tape', name: 'Side A', toy: 'cassette', state: { playing: false, elapsed: 0 } },
  { file: 'assets/3d/models/lamp.glb', cell: [2, 1], toy: 'lamp' }
];

// Halo colors for screens when the lamp is on and the room goes dark.
const GLOW = {
  lcd: '#cfe27a', phos: '#74f59c', amber: '#f6c66a', tube: '#fff1d6', aqua: '#cfeaff',
  tft: '#dfe8f5', gloss: '#b9c4ff', mono: '#e0e4cc', paper: '#fff3dc', fish: '#ff8a3d'
};


const stage = document.getElementById('stage');
const hint = document.getElementById('drag-hint');
const renderer = new THREE.WebGLRenderer({ canvas: stage, antialias: true, alpha: false });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color('#e8e9ec');

const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, 80);
const iso = new THREE.Vector3(1, 1, 1).normalize();
const DIST = 14;
const target = new THREE.Vector3(0, 0.18, 0);
const panRight = new THREE.Vector3();
const panUp = new THREE.Vector3();

function frameCamera() {
  camera.position.copy(target).addScaledVector(iso, DIST);
  camera.lookAt(target);
  camera.updateMatrixWorld();
  const forward = new THREE.Vector3();
  camera.getWorldDirection(forward);
  panRight.crossVectors(camera.up, forward).normalize();
  panUp.crossVectors(forward, panRight).normalize();
}

const hemi = new THREE.HemisphereLight('#f7f4ee', '#c9c3b8', 0.85);
scene.add(hemi);
const key = new THREE.DirectionalLight('#fff8f0', 1.85);
key.position.set(4.5, 7.5, 2.5);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
key.shadow.camera.near = 0.5;
key.shadow.camera.far = 24;
key.shadow.camera.left = -5;
key.shadow.camera.right = 5;
key.shadow.camera.top = 5;
key.shadow.camera.bottom = -5;
key.shadow.bias = -0.0004;
key.shadow.normalBias = 0.02;
key.shadow.radius = 2.5;
scene.add(key);
scene.add(key.target);
const fill = new THREE.DirectionalLight('#e7eef8', 0.45);
fill.position.set(-4, 3.5, -2);
scene.add(fill);

const paper = new THREE.Color('#e8e9ec');
const ink = new THREE.Color('#30281c');
const DAY = { paper: new THREE.Color('#e8e9ec'), ink: new THREE.Color('#30281c'), hemi: 0.85, key: 1.85, fill: 0.45, shadow: 0.32, grid: 0.075 };
const NIGHT = { paper: new THREE.Color('#2a2c33'), ink: new THREE.Color('#efe6d2'), hemi: 0.3, key: 0.45, fill: 0.1, shadow: 0.45, grid: 0.11 };
const KEY_DAY = new THREE.Color('#fff8f0');
const KEY_NIGHT = new THREE.Color('#9db0ff');
const groundMat = new THREE.ShaderMaterial({
  uniforms: {
    paper: { value: paper },
    ink: { value: ink },
    strength: { value: 0.075 },
    px: { value: 0.004 }
  },
  vertexShader: `
    varying vec3 vWorld;
    void main() {
      vec4 w = modelMatrix * vec4(position, 1.0);
      vWorld = w.xyz;
      gl_Position = projectionMatrix * viewMatrix * w;
    }
  `,
  fragmentShader: `
    uniform vec3 paper;
    uniform vec3 ink;
    uniform float strength;
    uniform float px;
    varying vec3 vWorld;
    void main() {
      // Lines fall on half cells, so a device at an integer cell sits in a square.
      float fx = fract(vWorld.x + 0.5);
      float fz = fract(vWorld.z + 0.5);
      float dx = min(fx, 1.0 - fx);
      float dz = min(fz, 1.0 - fz);
      float d = min(dx, dz);
      float w = max(px, fwidth(d));
      float a = (1.0 - smoothstep(px * 0.15, px * 0.15 + w, d)) * strength;
      gl_FragColor = vec4(mix(paper, ink, a), 1.0);
    }
  `
});
const ground = new THREE.Mesh(new THREE.PlaneGeometry(36, 36), groundMat);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = false;
scene.add(ground);
const shadowCatcher = new THREE.Mesh(
  new THREE.PlaneGeometry(36, 36),
  new THREE.ShadowMaterial({ opacity: 0.32 })
);
shadowCatcher.rotation.x = -Math.PI / 2;
shadowCatcher.position.y = 0.002;
shadowCatcher.receiveShadow = true;
scene.add(shadowCatcher);

function cellPx() {
  return window.matchMedia('(max-width: 640px)').matches ? CELL_MOBILE : CELL_DESKTOP;
}

function resize() {
  const w = stage.clientWidth || window.innerWidth;
  const h = stage.clientHeight || window.innerHeight;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(dpr);
  renderer.setSize(w, h, false);
  const fh = h / cellPx();
  const aspect = w / h;
  camera.left = -fh * aspect / 2;
  camera.right = fh * aspect / 2;
  camera.top = fh / 2;
  camera.bottom = -fh / 2;
  camera.updateProjectionMatrix();
  const cssPx = (window.devicePixelRatio || 1) >= 2 ? 0.5 : 1;
  groundMat.uniforms.px.value = (fh / h) * cssPx;
}
window.addEventListener('resize', resize);

function springAmount(seconds) {
  const zeta = 0.55;
  const wn = 4.2;
  const w = wn * Math.sqrt(1 - zeta * zeta);
  return 1 - Math.exp(-zeta * wn * seconds) * Math.cos(w * seconds);
}

function loadImage(src) {
  return new Promise(function (resolve) {
    const img = new Image();
    img.onload = function () { resolve(img); };
    img.onerror = function () { resolve(null); };
    img.src = src;
  });
}

async function makeScreen(spec, aspect) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = Math.round(1024 / (aspect || 1.33));
  if (spec.face === 'note') { canvas.width = 1024; canvas.height = 1280; }
  const ctx = canvas.getContext('2d');
  await document.fonts.ready;
  const icon = spec.face === 'fish'
    ? await loadImage('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(FISH_SVG))
    : spec.icon ? await loadImage(spec.icon) : null;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const mat = new THREE.MeshBasicMaterial({ map: tex, color: 0xffffff, side: THREE.DoubleSide });
  mat.toneMapped = false;
  const screen = {
    mat: mat,
    canvas: canvas,
    links: spec.face === 'note',
    paint: function (t, k) {
      ctx.save();
      paintScreen(ctx, canvas.width, canvas.height, spec, icon, t, k);
      ctx.restore();
      tex.needsUpdate = true;
    }
  };
  screen.paint(0, 0);
  return screen;
}

const loader = new GLTFLoader();
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const clock = new THREE.Clock();
const devices = [];
let hovered = null;
let drag = null;
let suppressClick = false;

function attachScreen(root, screen) {
  let mesh = null;
  root.traverse(function (obj) {
    if (obj.isMesh && obj.name === 'Screen') mesh = obj;
  });
  if (!mesh) return null;
  mesh.material = screen.mat;
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  return mesh;
}

async function loadDevices() {
  await document.fonts.ready;
  // Fetch every model at once; build them in order so the layout is stable.
  const gltfs = await Promise.all(DEVICES.map(function (spec) { return loader.loadAsync(spec.file); }));
  for (let i = 0; i < DEVICES.length; i++) {
    const spec = DEVICES[i];
    const gltf = gltfs[i];
    const model = gltf.scene;
    model.traverse(function (obj) {
      if (!obj.isMesh) return;
      obj.castShadow = true;
      obj.receiveShadow = true;
      if (obj.material && obj.material.isMeshStandardMaterial) {
        obj.material.roughness = Math.max(obj.material.roughness, 0.48);
        obj.material.envMapIntensity = 0.4;
      }
    });
    let aspect = 1.33;
    let hasScreen = false;
    model.traverse(function (obj) {
      if (!obj.isMesh || obj.name !== 'Screen') return;
      hasScreen = true;
      obj.geometry.computeBoundingBox();
      const size = obj.geometry.boundingBox.getSize(new THREE.Vector3());
      aspect = size.x / Math.max(Math.hypot(size.y, size.z), 1e-4);
    });
    const screen = hasScreen ? await makeScreen(spec, aspect) : { paint: function () {}, links: false };
    const screenMesh = hasScreen ? attachScreen(model, screen) : null;
    const halo = screenMesh && GLOW[spec.face] ? makeHalo(screenMesh, GLOW[spec.face]) : null;
    if (halo) model.add(halo);
    const parts = {};
    model.traverse(function (obj) { if (obj.name) parts[obj.name] = parts[obj.name] || obj; });
    if (spec.toy === 'lamp') setupLamp(model, parts);
    if (spec.toy === 'cassette') setupCassette(parts);
    const group = new THREE.Group();
    group.position.set(spec.cell[0], 0, spec.cell[1]);
    group.add(model);
    scene.add(group);
    const dist = Math.hypot(spec.cell[0], spec.cell[1]);
    devices.push({
      spec: spec,
      group: group,
      screen: screenMesh,
      paint: screen.paint,
      playT: 0,
      playing: false,
      base: 1,
      tilt: new THREE.Vector2(),
      delay: dist * 0.09,
      age: REDUCED ? 2 : -1,
      links: screen.links,
      halo: halo,
      parts: parts
    });
  }
  const start = performance.now();
  devices.forEach(function (d) { d.born = start; });
}

function updatePop(d, now) {
  if (REDUCED) {
    d.group.scale.setScalar(1);
    d.group.position.y = 0;
    return;
  }
  const seconds = (now - d.born) / 1000 - d.delay;
  if (seconds <= 0) {
    d.group.scale.setScalar(0.6);
    d.group.position.y = 0.07;
    d.popY = 0.07;
    return;
  }
  const value = springAmount(seconds);
  d.group.scale.setScalar(0.6 + 0.4 * value);
  d.popY = 0.07 * (1 - value);
  d.group.position.y = d.popY;
}

function updateHover(dt) {
  devices.forEach(function (d) {
    const on = d === hovered;
    const goal = on ? 1 : 0;
    d.base += (goal - d.base) * (REDUCED ? 1 : Math.min(1, dt * 8));
    if (d.screen && d.screen.material) {
      const bright = 1 + d.base * 0.45;
      d.screen.material.color.setScalar(bright);
    }
    if (REDUCED) return;
    // Run the screen's animation while hovered; settle to rest after.
    if (on) {
      if (!d.playing) { d.playing = true; d.playT = 0; }
      d.playT += dt;
      d.paint(d.playT, Math.min(1, d.base * 1.4));
    } else if (d.playing) {
      d.playT += dt;
      if (d.base < 0.04) { d.playing = false; d.paint(0, 0); }
      else d.paint(d.playT, d.base);
    }
    const tx = on ? -d.tilt.y * 0.55 : 0;
    const tz = on ? d.tilt.x * 0.55 : 0;
    d.group.rotation.x += (tx - d.group.rotation.x) * Math.min(1, dt * 8);
    d.group.rotation.z += (tz - d.group.rotation.z) * Math.min(1, dt * 8);
    if (d.popY != null) d.group.position.y = d.popY + d.base * 0.04;
  });
}

function pick(clientX, clientY) {
  const rect = stage.getBoundingClientRect();
  pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(devices.map(function (d) { return d.group; }), true);
  if (!hits.length) return null;
  let obj = hits[0].object;
  while (obj && !devices.some(function (d) { return d.group === obj; })) obj = obj.parent;
  const device = devices.find(function (d) { return d.group === obj; });
  return { device: device, hit: hits[0], uv: hits[0].uv };
}

function openHit(info) {
  if (!info || !info.device) return;
  const spec = info.device.spec;
  if (spec.toy === 'cassette') { toggleMusic(info.device); return; }
  if (spec.toy === 'lamp') { toggleLamp(info.device); return; }
  if (spec.face === 'note') {
    const uv = info.uv;
    if (!uv || uv.y > 0.28) return;
    const url = uv.x < 0.5 ? 'https://github.com/saberzou' : 'mailto:saberzou@gmail.com';
    window.open(url, uv.x < 0.5 ? '_blank' : '_self', 'noopener');
    return;
  }
  if (spec.href) window.location.href = spec.href;
}

stage.addEventListener('pointerdown', function (e) {
  if (e.button != null && e.button !== 0) return;
  drag = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: false };
  stage.classList.add('dragging');
  try { stage.setPointerCapture(e.pointerId); } catch (err) {}
});
stage.addEventListener('pointermove', function (e) {
  const info = pick(e.clientX, e.clientY);
  hovered = info && info.device;
  if (hovered && info.hit && info.hit.point) {
    const local = hovered.group.worldToLocal(info.hit.point.clone());
    hovered.tilt.set(THREE.MathUtils.clamp(local.x, -0.6, 0.6), THREE.MathUtils.clamp(local.z, -0.6, 0.6));
  }
  stage.style.cursor = hovered ? 'pointer' : (drag ? 'grabbing' : 'grab');
  if (!drag || e.pointerId !== drag.id) return;
  const dx = e.clientX - drag.x;
  const dy = e.clientY - drag.y;
  if (!drag.moved && Math.hypot(dx, dy) < 5) return;
  drag.moved = true;
  drag.x = e.clientX;
  drag.y = e.clientY;
  const worldPerPx = (camera.top - camera.bottom) / stage.clientHeight;
  target.addScaledVector(panRight, -dx * worldPerPx);
  target.addScaledVector(panUp, dy * worldPerPx);
  if (hint) hint.classList.add('gone');
});
function endDrag(e) {
  if (!drag || (e && e.pointerId !== drag.id)) return;
  const moved = drag.moved;
  const x = e ? e.clientX : drag.x;
  const y = e ? e.clientY : drag.y;
  drag = null;
  stage.classList.remove('dragging');
  if (moved) { suppressClick = true; return; }
  openHit(pick(x, y));
}
stage.addEventListener('pointerup', endDrag);
stage.addEventListener('pointercancel', endDrag);
stage.addEventListener('click', function (e) {
  if (!suppressClick) return;
  e.preventDefault();
  e.stopPropagation();
  suppressClick = false;
}, true);


// ------------------------------------------------------------------ the lamp
// The lamp is the light switch. On: the room goes dark, the shade glows, a
// warm light falls on the neighbours, and every screen gets a soft halo.

const LAMP_KEY = 'saber-3d-lamp';
let lampOn = false;
let night = 0;          // 0 day … 1 night, eased toward lampOn
let lampLight = null;
let lampMats = [];
let lampGlow = null;
let lampPool = null;
let chain = null;
let chainPull = 0;

try {
  const saved = localStorage.getItem(LAMP_KEY);
  lampOn = saved == null ? window.matchMedia('(prefers-color-scheme: dark)').matches : saved === '1';
} catch (err) {
  lampOn = false;
}
night = lampOn ? 1 : 0;
document.body.classList.toggle('lamp-on', lampOn);

function setupLamp(model, parts) {
  ['Shade', 'Bulb'].forEach(function (name) {
    model.traverse(function (obj) {
      if (!obj.isMesh || !obj.material || obj.material.name !== name) return;
      obj.material = obj.material.clone();
      obj.material.emissive = new THREE.Color(name === 'Bulb' ? '#ffe2a8' : '#ffc77a');
      obj.material.userData.glow = name === 'Bulb' ? 2.6 : 1.5;
      if (name === 'Bulb') obj.castShadow = false;
      lampMats.push(obj.material);
    });
  });
  chain = parts.Chain || null;
  // A glow around the shade and a warm pool on the floor.
  lampGlow = glowSprite('#ffc77a');
  lampGlow.position.set(0, 0.3, 0).add(TOWARD_CAMERA);
  lampGlow.scale.set(1.1, 1.1, 1);
  lampGlow.raycast = function () {};
  model.add(lampGlow);
  lampPool = new THREE.Mesh(
    new THREE.PlaneGeometry(2.6, 2.6),
    new THREE.MeshBasicMaterial({ map: glowTexture(), color: '#ffb35c', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  lampPool.rotation.x = -Math.PI / 2;
  lampPool.position.y = 0.004;
  lampPool.raycast = function () {};
  model.add(lampPool);
  lampLight = new THREE.PointLight('#ffc27a', 0, 3.2, 1.6);
  lampLight.position.set(0, 0.2, 0.05);
  model.add(lampLight);
}

function toggleLamp() {
  lampOn = !lampOn;
  chainPull = 1;
  document.body.classList.toggle('lamp-on', lampOn);
  try { localStorage.setItem(LAMP_KEY, lampOn ? '1' : '0'); } catch (err) {}
  click(lampOn ? 1400 : 1000);
}

let glowTex = null;
function glowTexture() {
  if (glowTex) return glowTex;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 4, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,255,255,0.9)');
  grad.addColorStop(0.4, 'rgba(255,255,255,0.32)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  glowTex = new THREE.CanvasTexture(c);
  return glowTex;
}

// The camera is orthographic, so moving a glow toward it changes nothing on
// screen except that the floor can no longer clip it.
const TOWARD_CAMERA = new THREE.Vector3(1, 1, 1).normalize().multiplyScalar(0.7);

function glowSprite(color) {
  return new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTexture(), color: color, transparent: true, opacity: 0,
    blending: THREE.AdditiveBlending, depthWrite: false
  }));
}

function makeHalo(screenMesh, color) {
  screenMesh.updateMatrix();
  screenMesh.geometry.computeBoundingBox();
  const box = screenMesh.geometry.boundingBox;
  const size = box.getSize(new THREE.Vector3());
  const sprite = glowSprite(color);
  box.getCenter(sprite.position);
  sprite.position.applyMatrix4(screenMesh.matrix).add(TOWARD_CAMERA);
  sprite.raycast = function () {};
  const span = Math.max(size.x, Math.hypot(size.y, size.z));
  sprite.scale.set(span * 2.2, span * 2.2, 1);
  sprite.renderOrder = 2;
  return sprite;
}

function updateRoom(dt) {
  const goal = lampOn ? 1 : 0;
  night += (goal - night) * (REDUCED ? 1 : Math.min(1, dt * 3.2));
  if (Math.abs(goal - night) < 0.001) night = goal;
  paper.copy(DAY.paper).lerp(NIGHT.paper, night);
  ink.copy(DAY.ink).lerp(NIGHT.ink, night);
  scene.background.copy(paper);
  groundMat.uniforms.strength.value = DAY.grid + (NIGHT.grid - DAY.grid) * night;
  hemi.intensity = DAY.hemi + (NIGHT.hemi - DAY.hemi) * night;
  key.intensity = DAY.key + (NIGHT.key - DAY.key) * night;
  fill.intensity = DAY.fill + (NIGHT.fill - DAY.fill) * night;
  shadowCatcher.material.opacity = DAY.shadow + (NIGHT.shadow - DAY.shadow) * night;
  // A tiny flicker as the bulb warms up.
  const warm = night * (night < 0.98 && !REDUCED ? 0.85 + Math.random() * 0.15 : 1);
  key.color.copy(KEY_DAY).lerp(KEY_NIGHT, night);
  if (lampLight) lampLight.intensity = warm * 3.2;
  if (lampGlow) { lampGlow.material.opacity = warm * 0.55; lampGlow.visible = night > 0.01; }
  if (lampPool) { lampPool.material.opacity = warm * 0.32; lampPool.visible = night > 0.01; }
  lampMats.forEach(function (m) { m.emissiveIntensity = warm * m.userData.glow; });
  devices.forEach(function (d) {
    if (d.halo) {
      d.halo.material.opacity = night * (0.38 + d.base * 0.25);
      d.halo.visible = night > 0.01;
    }
  });
  if (chain) {
    chainPull = Math.max(0, chainPull - dt * (REDUCED ? 99 : 3));
    chain.position.y = chain.userData.y0 == null ? (chain.userData.y0 = chain.position.y) : chain.userData.y0;
    chain.position.y -= Math.sin(chainPull * Math.PI) * 0.03;
  }
}

// ------------------------------------------------------------- the cassette
// Pressing the deck plays a little ambient loop (composed for this page by
// scripts/compose_ambient.py). The play key latches down, the reels turn and
// the red light comes on. Press again to stop.

let audio = null;
let deck = null;
let fadeTo = 0;

function setupCassette(parts) {
  deck = { parts: parts, spin: 0, key: parts.KeyPlay, led: null };
  if (parts.PlayLed) {
    parts.PlayLed.traverse(function (obj) {
      if (obj.isMesh) {
        obj.material = obj.material.clone();
        obj.material.emissive = new THREE.Color('#ff3b24');
        obj.material.emissiveIntensity = 0;
        deck.led = obj.material;
      }
    });
  }
  if (deck.key) deck.key.userData.y0 = deck.key.position.y;
}

function toggleMusic(device) {
  const state = device.spec.state;
  if (!audio) {
    audio = new Audio('assets/3d/audio/side-a.mp3');
    audio.loop = true;
    audio.preload = 'auto';
    audio.volume = 0;
  }
  state.playing = !state.playing;
  click(state.playing ? 700 : 520);
  if (state.playing) {
    fadeTo = 0.55;
    const p = audio.play();
    if (p && p.catch) p.catch(function () { state.playing = false; fadeTo = 0; });
  } else {
    fadeTo = 0;
  }
  device.paint(device.playT, device.base);
}

function updateCassette(dt) {
  if (!deck) return;
  const device = devices.find(function (d) { return d.spec.toy === 'cassette'; });
  const state = device.spec.state;
  if (audio) {
    const step = dt * 0.6;
    audio.volume = Math.max(0, Math.min(1, audio.volume + Math.sign(fadeTo - audio.volume) * Math.min(step, Math.abs(fadeTo - audio.volume))));
    if (fadeTo === 0 && audio.volume === 0 && !audio.paused) audio.pause();
  }
  // Reels speed up and slow down like a motor.
  deck.spin += ((state.playing ? 1 : 0) - deck.spin) * Math.min(1, dt * 4);
  if (!REDUCED) {
    if (deck.parts.ReelL) deck.parts.ReelL.rotation.z += dt * deck.spin * 3.2;
    if (deck.parts.ReelR) deck.parts.ReelR.rotation.z += dt * deck.spin * 4.4;
  }
  if (deck.key) {
    const goal = deck.key.userData.y0 - (state.playing ? 0.012 : 0);
    deck.key.position.y += (goal - deck.key.position.y) * Math.min(1, dt * 18);
  }
  if (deck.led) deck.led.emissiveIntensity = state.playing ? 1.6 + 0.4 * Math.sin(performance.now() / 260) : 0;
  if (state.playing) {
    state.elapsed += dt;
    // Repaint the label's counter about twice a second when not hovered.
    if (!device.playing && Math.floor(state.elapsed * 2) !== Math.floor((state.elapsed - dt) * 2)) device.paint(0, 0);
  }
}

// A soft mechanical click for the switch and the keys.
let clickCtx = null;
function click(freq) {
  try {
    clickCtx = clickCtx || new (window.AudioContext || window.webkitAudioContext)();
    const n = Math.floor(clickCtx.sampleRate * 0.05);
    const buf = clickCtx.createBuffer(1, n, clickCtx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (n * 0.12));
    const src = clickCtx.createBufferSource();
    src.buffer = buf;
    const filter = clickCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = freq;
    filter.Q.value = 1.2;
    const gain = clickCtx.createGain();
    gain.gain.value = 0.35;
    src.connect(filter).connect(gain).connect(clickCtx.destination);
    src.start();
  } catch (err) {}
}

let motionStarted = false;
function animate() {
  requestAnimationFrame(animate);
  const now = performance.now();
  if (!motionStarted) {
    devices.forEach(function (d) { d.born = now + introDelay; });
    motionStarted = true;
  }
  const dt = Math.min(clock.getDelta(), 0.05);
  devices.forEach(function (d) { updatePop(d, now); });
  updateHover(dt);
  updateRoom(dt);
  updateCassette(dt);
  const snapX = Math.round(target.x);
  const snapZ = Math.round(target.z);
  ground.position.set(snapX, 0, snapZ);
  shadowCatcher.position.set(snapX, 0.002, snapZ);
  key.position.set(target.x + 4.2, 7.2, target.z + 2.4);
  key.target.position.set(target.x, 0, target.z);
  frameCamera();
  renderer.render(scene, camera);
}

resize();
frameCamera();
const params = new URLSearchParams(location.search);
const focusName = params.get('focus');
const introDelay = params.has('demo') ? 1200 : 40;

loadDevices().then(function () {
  if (focusName) {
    const found = devices.find(function (d) { return d.spec.file.indexOf(focusName) !== -1; });
    if (found) target.copy(found.group.position).y = 0.2;
    const fh = (stage.clientHeight / cellPx()) * 0.42;
    const aspect = stage.clientWidth / stage.clientHeight;
    camera.left = -fh * aspect / 2;
    camera.right = fh * aspect / 2;
    camera.top = fh / 2;
    camera.bottom = -fh / 2;
    camera.updateProjectionMatrix();
  }
  animate();
});
