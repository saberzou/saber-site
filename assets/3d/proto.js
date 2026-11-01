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
  work('candy', [1, 1], 'lcd', 'Movy', 'images/icons/ios/movy.jpg', 'https://apps.apple.com/app/id1093345142')
];


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
    model.traverse(function (obj) {
      if (!obj.isMesh || obj.name !== 'Screen') return;
      obj.geometry.computeBoundingBox();
      const size = obj.geometry.boundingBox.getSize(new THREE.Vector3());
      aspect = size.x / Math.max(Math.hypot(size.y, size.z), 1e-4);
    });
    const screen = await makeScreen(spec, aspect);
    const screenMesh = attachScreen(model, screen);
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
      links: screen.links
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
