import * as THREE from 'three';
import { GLTFLoader } from './vendor/loaders/GLTFLoader.js';
import { FISH_SVG, paintScreen } from './screens.js?v=23';
import { season, newYear } from './holiday.js?v=20';
import { openWish } from './wish.js?v=21';

// Bumped with each release so browsers fetch fresh files.
const VERSION = '26';

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const CELL_DESKTOP = 278;
const CELL_MOBILE = 224;

// Each cell is SPAN world units wide, so devices stand with room around them.
const SPAN = 1.2;

// Every project in the page's list gets a device. Adding a project to the
// list in index.html adds a device here; nothing else needs editing.
const MODEL_FACE = {
  handheld: 'lcd', macintosh: 'paper', phone: 'gloss', term: 'phos', flip: 'tft', pda: 'mono',
  imac: 'aqua', crt: 'tube', laptop: 'paper', candy: 'lcd',
  pet: 'lcd', digicam: 'gloss', pager: 'mono', learner: 'amber', widehandheld: 'tft', tv: 'tube',
  arcade: 'phos', typewriter: 'paper', scope: 'phos', ereader: 'mono', musicplayer: 'tft',
  calculator: 'lcd', clockradio: 'amber', dualscreen: 'lcd', watch: 'mono', camcorder: 'gloss'
};
const MODEL_ORDER = Object.keys(MODEL_FACE);

// Every project has a device of its own, shared with the flat view.
const PROJECT_DEVICE = window.PROJECT_DEVICE || {};
// A project added later without an entry above still gets a steady device.
function deviceFor(name) {
  if (PROJECT_DEVICE[name]) return PROJECT_DEVICE[name];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return MODEL_ORDER[h % MODEL_ORDER.length];
}

function model(name) { return 'assets/3d/models/' + name + '.glb?v=' + VERSION; }

// The holiday the room is dressed for today, if any (see holiday.js).
const SEASON = season();

// The cassette keeps playing while it's off screen, so its state lives here.
// At Christmas it's turned over to Side B.
const TAPE = SEASON === 'christmas'
  ? { playing: false, elapsed: 0, side: 'B', title: 'songs for the snow', song: 'side-b' }
  : { playing: false, elapsed: 0, side: 'A', title: 'songs for wandering', song: 'friendly-loop' };

// The home cells. Everything else is worked out from the cell's position, so
// the floor goes on forever and the same cell always shows the same thing.
const HOME = {
  '0,0': { file: model('camera'), face: 'note' },
  '1,0': { file: model('radio'), face: 'fish', name: 'Archer', toy: 'archer' },
  '-1,1': { file: model('cassette'), face: 'tape', name: 'Side ' + TAPE.side, toy: 'cassette', state: TAPE },
  '1,1': { file: model('lamp'), toy: 'lamp' }
};

// ------------------------------------------------------------- the holidays
// Thanksgiving puts a printer in the front row, Christmas a present (and more
// hidden across the floor), New Year a crystal ball.
const PRINT = { printing: false, progress: 0, done: false };
const BALL = { year: newYear(), burst: 0 };
if (SEASON === 'thanksgiving') HOME['0,1'] = { file: model('printer'), face: 'printer', toy: 'printer', state: PRINT };
if (SEASON === 'christmas') HOME['0,1'] = { file: model('present'), toy: 'present' };
if (SEASON === 'newyear') HOME['0,1'] = { file: model('crystalball'), toy: 'ball' };

// What can come out of a present. Each opened present gives one you haven't
// found yet, until you've found them all.
const GIFTS = {
  cdplayer: { name: 'CD player', desc: 'Anti-skip, mostly. Hover to spin the disc.' },
  console: { name: 'Game console', desc: 'One controller. Sharing is caring.' },
  robotdog: { name: 'Robot dog', desc: 'Very good boy. Doesn’t need walks.' },
  vinyl: { name: 'Record player', desc: 'Tap it to play the holiday B-side.' },
  gingerbread: { name: 'Gingerbread man', desc: 'Run, run, as fast as you can.' },
  foldphone: { name: 'Foldable phone', desc: 'Two screens, one pocket. Open it like a book.' },
  headset: { name: 'Spatial headset', desc: 'For seeing the room in even more dimensions.' },
  rangefinder: { name: 'Rangefinder camera', desc: 'For slow walks and quiet streets.' },
  teddy: { name: 'Teddy bear', desc: 'Soft, patient, and holding on to a heart for you.' },
  snowman: { name: 'Snowman', desc: 'Knitted hat, warm scarf, cold hands.' },
  tablet: { name: 'Tablet and pencil', desc: 'A fresh page for sketching. Hover to doodle.' }
};
const GIFT_ORDER = Object.keys(GIFTS);
const GIFTS_KEY = 'saber-3d-gifts';
const opened = new Map();   // "c,r" -> gift, for presents opened this visit
let found = [];
try { found = JSON.parse(localStorage.getItem(GIFTS_KEY) || '[]').filter(function (g) { return GIFTS[g]; }); } catch (err) {}

function presentAt(c, r) {
  return SEASON === 'christmas' && mod(c * 7 + r * 13, 11) === 3;
}

function giftSpec(gift, c, r) {
  const spec = { file: model(gift), toy: 'gift', gift: gift, name: GIFTS[gift].name, desc: GIFTS[gift].desc, cell: [c, r] };
  if (gift === 'robotdog') spec.face = 'dog';
  if (gift === 'foldphone') spec.face = 'fold';
  if (gift === 'tablet') spec.face = 'sketch';
  if (gift === 'vinyl') spec.state = TAPE;
  return spec;
}

function nextGift() {
  const left = GIFT_ORDER.filter(function (g) { return found.indexOf(g) === -1; });
  const pool = left.length ? left : GIFT_ORDER;
  const gift = pool[Math.floor(Math.random() * pool.length)];
  if (found.indexOf(gift) === -1) {
    found.push(gift);
    try { localStorage.setItem(GIFTS_KEY, JSON.stringify(found)); } catch (err) {}
  }
  return gift;
}

const SEASON_MODELS = {
  thanksgiving: ['printer'],
  christmas: ['present'].concat(GIFT_ORDER),
  newyear: ['crystalball']
}[SEASON] || [];

function readProjects() {
  return Array.prototype.slice.call(document.querySelectorAll('#projects a[href]')).map(function (a) {
    return {
      name: (a.querySelector('strong') || a).textContent.trim(),
      desc: (a.querySelector('span') || { textContent: '' }).textContent.trim(),
      icon: a.getAttribute('data-icon') || '',
      href: a.getAttribute('href'),
      external: a.getAttribute('target') === '_blank',
      kind: /apps\.apple\.com/.test(a.getAttribute('href')) ? 'iOS app' : 'Web'
    };
  });
}

const PROJECTS = readProjects();
function mod(n, m) { return ((n % m) + m) % m; }

// Neighbours never repeat a project or a device: stepping one cell moves the
// project by 5 or 3 places and the device by 3 or 2.
function specFor(c, r) {
  const home = HOME[c + ',' + r];
  if (opened.has(c + ',' + r)) return giftSpec(opened.get(c + ',' + r), c, r);
  if (home) return Object.assign({ cell: [c, r] }, home);
  // Archer turns up now and then, like in the flat field.
  if (mod(c + r * 3, 13) === 0) return { file: model('radio'), face: 'fish', name: 'Archer', toy: 'archer', cell: [c, r] };
  if (presentAt(c, r)) return { file: model('present'), toy: 'present', cell: [c, r] };
  const p = PROJECTS[mod(c * 5 + r * 3, PROJECTS.length)];
  const name = deviceFor(p.name);
  return { file: model(name), cell: [c, r], face: MODEL_FACE[name], name: p.name, desc: p.desc, icon: p.icon, href: p.href, external: p.external, kind: p.kind };
}

const MODEL_FILES = Object.keys(MODEL_FACE).concat(['camera', 'radio', 'cassette', 'lamp'], SEASON_MODELS).map(model);

// Halo colors for screens when the lamp is on and the room goes dark.
const GLOW = {
  lcd: '#cfe27a', phos: '#74f59c', amber: '#f6c66a', tube: '#fff1d6', aqua: '#cfeaff',
  tft: '#dfe8f5', gloss: '#b9c4ff', mono: '#e0e4cc', paper: '#fff3dc', fish: '#ff8a3d',
  printer: '#f6c66a', dog: '#9fe6ff', ball: '#ffd98a', fold: '#dfe8f5', sketch: '#fff3dc'
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
scene.background = new THREE.Color('#ced0d6');

const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, 80);
const iso = new THREE.Vector3(1, 1, 1).normalize();
const DIST = 14;
const target = new THREE.Vector3(0, 0.18, 0);
const panMove = new THREE.Vector3();
const panForward = new THREE.Vector3();
const panRight = new THREE.Vector3();
const panUp = new THREE.Vector3();

function frameCamera() {
  camera.position.copy(target).addScaledVector(iso, DIST);
  camera.lookAt(target);
  camera.updateMatrixWorld();
  const forward = new THREE.Vector3();
  camera.getWorldDirection(forward);
  // Screen-right and screen-up on the camera plane. Dragging moves the floor
  // with the finger in both directions.
  panRight.crossVectors(forward, camera.up).normalize();
  panUp.crossVectors(panRight, forward).normalize();
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

const paper = new THREE.Color('#ced0d6');
const ink = new THREE.Color('#1c1712');
// The day floor is the soft gray from the first 3D build; the background
// matches it exactly, so the floor never shows an edge.
const DAY = { paper: new THREE.Color('#ced0d6'), ink: new THREE.Color('#1c1712'), hemi: 0.85, key: 1.85, fill: 0.45, shadow: 0.32, grid: 0.16 };
const NIGHT = { paper: new THREE.Color('#2a2c33'), ink: new THREE.Color('#efe6d2'), hemi: 0.3, key: 0.45, fill: 0.1, shadow: 0.45, grid: 0.045 };
const KEY_DAY = new THREE.Color('#fff8f0');
const KEY_NIGHT = new THREE.Color('#9db0ff');
const groundMat = new THREE.ShaderMaterial({
  uniforms: {
    paper: { value: paper },
    ink: { value: ink },
    strength: { value: 0.16 },
    px: { value: 0.004 },
    span: { value: SPAN }
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
    uniform float span;
    varying vec3 vWorld;
    void main() {
      // Lines fall on half cells, so a device at an integer cell sits in a square.
      float fx = fract(vWorld.x / span + 0.5);
      float fz = fract(vWorld.z / span + 0.5);
      float dx = min(fx, 1.0 - fx);
      float dz = min(fz, 1.0 - fz);
      float d = min(dx, dz);
      float w = max(px / span, fwidth(d));
      float a = (1.0 - smoothstep(px / span * 0.15, px / span * 0.15 + w, d)) * strength;
      gl_FragColor = vec4(mix(paper, ink, a), 1.0);
      // Same color space as the background, so floor and sky never show a seam.
      #include <colorspace_fragment>
    }
  `
});
const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), groundMat);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = false;
scene.add(ground);
const shadowCatcher = new THREE.Mesh(
  new THREE.PlaneGeometry(400, 400),
  new THREE.ShadowMaterial({ opacity: 0.32 })
);
shadowCatcher.rotation.x = -Math.PI / 2;
shadowCatcher.position.y = 0.002;
shadowCatcher.receiveShadow = true;
scene.add(shadowCatcher);

function cellPx() {
  return window.matchMedia('(max-width: 640px)').matches ? CELL_MOBILE : CELL_DESKTOP;
}

// Pinch (or ctrl-scroll) zooms the room, never the page.
let zoom = 1;
const ZOOM_MIN = 0.55, ZOOM_MAX = 1.8;
let lastW = 0, lastH = 0;

function resize() {
  const w = stage.clientWidth || window.innerWidth;
  const h = stage.clientHeight || window.innerHeight;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(dpr);
  renderer.setSize(w, h, false);
  lastW = w;
  lastH = h;
  const fh = h / (cellPx() * zoom);
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
if (window.visualViewport) window.visualViewport.addEventListener('resize', resize);
// Safari can change the canvas size without telling us (toolbars, rotation).
function checkSize() {
  if (stage.clientWidth !== lastW || stage.clientHeight !== lastH) resize();
}

function setZoom(next) {
  zoom = THREE.MathUtils.clamp(next, ZOOM_MIN, ZOOM_MAX);
  resize();
}

function springAmount(seconds) {
  const zeta = 0.55;
  const wn = 4.2;
  const w = wn * Math.sqrt(1 - zeta * zeta);
  return 1 - Math.exp(-zeta * wn * seconds) * Math.cos(w * seconds);
}

const images = new Map();
function loadImage(src) {
  if (!images.has(src)) images.set(src, loadImageOnce(src));
  return images.get(src);
}

function loadImageOnce(src) {
  return new Promise(function (resolve) {
    const img = new Image();
    img.onload = function () { resolve(img); };
    img.onerror = function () { resolve(null); };
    img.src = src;
  });
}

// The screens draw in the site's fonts, so load them before the first paint.
let fontsReady = null;
function screenFonts() {
  if (!fontsReady) {
    fontsReady = Promise.all([
      '400 20px "Screen Pixel"', '560 20px "Timeless Sans"', '700 20px "Timeless Sans"',
      '360 20px "Timeless Serif"', 'italic 360 20px "Timeless Serif Italic"'
    ].map(function (f) { return document.fonts.load(f).catch(function () {}); })).then(function () { return document.fonts.ready; });
  }
  return fontsReady;
}

async function makeScreen(spec, aspect) {
  const canvas = document.createElement('canvas');
  // 640px wide is plenty for a screen this size, and keeps 26 of them light.
  canvas.width = 640;
  canvas.height = Math.round(640 / (aspect || 1.33));
  if (spec.face === 'note') { canvas.width = 1024; canvas.height = 1280; }
  const ctx = canvas.getContext('2d');
  await screenFonts();
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

const sources = new Map();

// Every model was built at its own size. Each is scaled so it looks about as
// big as it is in real life, squeezed (see DEVICE_REAL_CM in
// project-devices.js): a TV is clearly bigger than a pager, but not 10x.
// Size is measured the way the room's camera sees it.
const SIZE_TARGET = 0.44;      // a 20 cm thing, in world units on screen
const KEEP_SIZE = { camera: 0.9 };   // the Polaroid stays big enough to read
const sizeScale = new Map();
const SCREEN_R = new THREE.Vector3(1, 0, -1).normalize();
const SCREEN_U = new THREE.Vector3(-1, 2, -1).normalize();

function seenSize(root) {
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  const v = new THREE.Vector3();
  root.updateMatrixWorld(true);
  root.traverse(function (obj) {
    if (!obj.isMesh) return;
    const p = obj.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i).applyMatrix4(obj.matrixWorld);
      const a = v.dot(SCREEN_R), b = v.dot(SCREEN_U);
      if (a < x0) x0 = a; if (a > x1) x1 = a;
      if (b < y0) y0 = b; if (b > y1) y1 = b;
    }
  });
  // Half area, half longest side: tall, thin things shouldn't grow too tall.
  const w = x1 - x0, h = y1 - y0;
  return Math.max(1e-3, 0.5 * Math.sqrt(w * h) + 0.5 * Math.max(w, h));
}

async function loadModels() {
  await document.fonts.ready;
  let done = 0;
  const report = function () { if (window.roomLoader) window.roomLoader.progress(done, MODEL_FILES.length); };
  report();
  const loaded = await Promise.all(MODEL_FILES.map(function (f) {
    return loader.loadAsync(f).then(function (g) { done++; report(); return g; });
  }));
  MODEL_FILES.forEach(function (f, i) {
    const scene = loaded[i].scene;
    scene.traverse(function (obj) {
      if (!obj.isMesh) return;
      obj.castShadow = true;
      obj.receiveShadow = true;
      if (obj.material && obj.material.isMeshStandardMaterial) {
        obj.material.roughness = Math.max(obj.material.roughness, 0.48);
        obj.material.envMapIntensity = 0.4;
      }
    });
    sources.set(f, scene);
    const id = (f.match(/models\/([a-z]+)\.glb/) || [])[1];
    const factor = window.deviceSizeFactor ? window.deviceSizeFactor(id) : 1;
    sizeScale.set(f, KEEP_SIZE[id] || THREE.MathUtils.clamp(SIZE_TARGET * factor / seenSize(scene), 0.5, 2.2));
  });
}

const live = new Map();      // "c,r" -> device, or a pending promise while it builds
let firstWave = true;

async function spawn(c, r, born) {
  const id = c + ',' + r;
  const spec = specFor(c, r);
  const model = sources.get(spec.file).clone(true);
  model.scale.setScalar(sizeScale.get(spec.file) || 1);
  model.updateMatrixWorld(true);
  // The device's own outline, before any glow is added, for placing the card.
  const outline = new THREE.Box3().setFromObject(model);
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
  if (live.get(id) !== 'pending') { disposeScreen(screen); return; } // scrolled away while building
  const screenMesh = hasScreen ? attachScreen(model, screen) : null;
  const halo = screenMesh && GLOW[spec.face] ? makeHalo(screenMesh, GLOW[spec.face]) : null;
  if (halo) model.add(halo);
  const parts = {};
  model.traverse(function (obj) { if (obj.name) parts[obj.name] = parts[obj.name] || obj; });
  if (spec.toy === 'lamp') setupLamp(model, parts);
  if (spec.toy === 'cassette') setupCassette(parts);
  setupSeasonal(model, parts, spec, screenMesh);
  const group = new THREE.Group();
  group.position.set(c * SPAN, 0, r * SPAN);
  group.add(model);
  scene.add(group);
  const d = {
    id: id,
    spec: spec,
    group: group,
    screen: screenMesh,
    screenData: screen,
    paint: screen.paint,
    playT: 0,
    playing: false,
    base: 1,
    tilt: new THREE.Vector2(),
    delay: 0,
    born: born,
    links: screen.links,
    halo: halo,
    parts: parts,
    outline: outline
  };
  updatePop(d, performance.now());
  devices.push(d);
  live.set(id, d);
}

function disposeScreen(screen) {
  if (screen && screen.mat) {
    if (screen.mat.map) screen.mat.map.dispose();
    screen.mat.dispose();
  }
}

function despawn(d) {
  scene.remove(d.group);
  disposeScreen(d.screenData);
  if (d.halo) d.halo.material.dispose();
  if (d.spec.toy === 'lamp') forgetLamp();
  if (hovered === d) hovered = null;
  if (pinned === d) pinned = null;
  devices.splice(devices.indexOf(d), 1);
  live.delete(d.id);
}

// Which cells the camera can see: cast the four screen corners onto the floor.
const corner = new THREE.Vector3();
const floorHit = new THREE.Vector3();
const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const cornerRay = new THREE.Ray();
function visibleCells(margin) {
  let minC = Infinity, maxC = -Infinity, minR = Infinity, maxR = -Infinity;
  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (xy) {
    corner.set(xy[0], xy[1], -1).unproject(camera);
    cornerRay.set(corner, dir);
    if (!cornerRay.intersectPlane(floorPlane, floorHit)) return;
    minC = Math.min(minC, floorHit.x / SPAN); maxC = Math.max(maxC, floorHit.x / SPAN);
    minR = Math.min(minR, floorHit.z / SPAN); maxR = Math.max(maxR, floorHit.z / SPAN);
  });
  // Tall devices standing just below the bottom edge still poke into view.
  return {
    c0: Math.floor(minC) - margin, c1: Math.ceil(maxC) + margin,
    r0: Math.floor(minR) - margin, r1: Math.ceil(maxR) + margin + 1
  };
}

function inView(c, r, v) { return c >= v.c0 && c <= v.c1 && r >= v.r0 && r <= v.r1; }

function stream(now) {
  const want = visibleCells(0);
  const keep = visibleCells(2);
  const centerC = target.x / SPAN, centerR = target.z / SPAN;
  const fresh = [];
  for (let c = want.c0; c <= want.c1; c++) {
    for (let r = want.r0; r <= want.r1; r++) {
      if (!live.has(c + ',' + r)) fresh.push([c, r]);
    }
  }
  // Pop in from the middle of the view outward.
  fresh.sort(function (a, b) {
    return Math.hypot(a[0] - centerC, a[1] - centerR) - Math.hypot(b[0] - centerC, b[1] - centerR);
  });
  fresh.forEach(function (cr, i) {
    live.set(cr[0] + ',' + cr[1], 'pending');
    const stagger = firstWave ? Math.hypot(cr[0] - centerC, cr[1] - centerR) * 90 + introDelay : Math.min(i, 6) * 45;
    spawn(cr[0], cr[1], now + stagger);
  });
  firstWave = false;
  devices.slice().forEach(function (d) {
    if (!inView(d.spec.cell[0], d.spec.cell[1], keep)) despawn(d);
  });
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
  if (spec.toy === 'printer') { printLetter(info.device); return; }
  if (spec.toy === 'present') { unwrap(info.device); return; }
  if (spec.toy === 'ball') { shakeBall(info.device); return; }
  if (spec.toy === 'gift') {
    if (spec.gift === 'vinyl') toggleMusic(info.device);
    else { info.device.hop = performance.now(); click(spec.gift === 'robotdog' ? 1800 : 900); }
    return;
  }
  if (spec.toy === 'archer') {
    const open = document.getElementById('archer-chat-open');
    if (open) open.click(); else window.location.href = 'field.html';
    return;
  }
  if (spec.face === 'note') {
    const uv = info.uv;
    if (!uv || uv.y > 0.28) return;
    const url = uv.x < 0.5 ? 'https://github.com/saberzou' : 'mailto:saberzou@gmail.com';
    window.open(url, uv.x < 0.5 ? '_blank' : '_self', 'noopener');
    return;
  }
  if (!spec.href) return;
  if (spec.external) window.open(spec.href, '_blank', 'noopener');
  else window.location.href = spec.href;
}

const touches = new Map();
let pinch = null;

stage.addEventListener('pointerdown', function (e) {
  if (e.button != null && e.button !== 0) return;
  lastPointer = e.pointerType || 'mouse';
  touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (touches.size === 2) {
    const p = Array.from(touches.values());
    pinch = { dist: Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y), zoom: zoom };
    drag = null;
    stage.classList.remove('dragging');
    return;
  }
  if (touches.size > 2) return;
  drag = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: false };
  flight = null;
  stage.classList.add('dragging');
  try { stage.setPointerCapture(e.pointerId); } catch (err) {}
});
stage.addEventListener('pointermove', function (e) {
  lastPointer = e.pointerType || 'mouse';
  if (touches.has(e.pointerId)) touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pinch && touches.size >= 2) {
    const p = Array.from(touches.values());
    const dist = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
    setZoom(pinch.zoom * dist / Math.max(pinch.dist, 1));
    suppressClick = true;
    return;
  }
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
  // Slide along the floor: take the screen-space move and drop it onto the
  // ground plane along the view direction, so the camera's height never
  // drifts and the floor never leaves the clipping range.
  panMove.copy(panRight).multiplyScalar(-dx * worldPerPx).addScaledVector(panUp, dy * worldPerPx);
  camera.getWorldDirection(panForward);
  panMove.addScaledVector(panForward, -panMove.y / panForward.y);
  target.x += panMove.x;
  target.z += panMove.z;
  if (hint) hint.classList.add('gone');
});
// ----------------------------------------------------------- back to the lamp
// Wander far enough that the home cells (the Polaroid, Archer, the deck and
// the lamp) leave the screen and a button appears to fly back to them.
const homeBtn = document.getElementById('home-btn');
const HOME_TARGET = new THREE.Vector3(0, 0.18, 0);
const homeV = new THREE.Vector3();
let flight = null;

function homeOffscreen() {
  // The middle of the home block, between the four home cells.
  homeV.set(0.5 * SPAN, 0.2, 0.5 * SPAN).project(camera);
  return Math.abs(homeV.x) > 1.1 || Math.abs(homeV.y) > 1.1;
}

function flyHome() {
  const from = target.clone();
  const dist = Math.hypot(from.x - HOME_TARGET.x, from.z - HOME_TARGET.z) / SPAN;
  // A long way out: skip most of the trip so the flight stays short.
  if (dist > 10) from.lerp(HOME_TARGET, 1 - 10 / dist);
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  flight = { from, start: performance.now(), dur: reduced ? 1 : 500 + Math.min(dist, 10) * 80 };
  pinned = null;
  click(1200);
}

function updateFlight(now) {
  if (flight) {
    const p = Math.min(1, (now - flight.start) / flight.dur);
    const e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
    target.lerpVectors(flight.from, HOME_TARGET, e);
    if (p >= 1) flight = null;
  }
  if (homeBtn) homeBtn.classList.toggle('show', !flight && homeOffscreen());
}

if (homeBtn) homeBtn.addEventListener('click', flyHome);

// ------------------------------------------------------------- the peek card
// Over a device: its live screen and a one-line note. Mouse: on hover, and a
// click opens. Touch: the first tap shows it, a second tap (on the device or
// the card) opens.

const peekEl = document.getElementById('peek');
const peekCanvas = peekEl ? peekEl.querySelector('.peek-screen') : null;
const peekCtx = peekCanvas ? peekCanvas.getContext('2d') : null;
const peekFace = peekEl ? peekEl.querySelector('.peek-face') : null;
const peekKind = peekEl ? peekEl.querySelector('.peek-kind') : null;
const TIPS = {
  cassette: ['Side A', 'Press play for a little ambient music.'],
  lamp: ['The lamp', 'Pull the chain to turn the lights down.'],
  archer: ['Archer', 'A little guide who hangs out here. Say hi.'],
  printer: ['A thank-you note', 'Press the button. It prints a letter from me.'],
  present: ['A present', 'There are a few hidden around the room. Open one.'],
  ball: ['Make a wish', 'Tap the crystal ball, tell it your wish for ' + BALL.year + ', and see what it says.']
};
if (SEASON === 'christmas') TIPS.cassette = ['Side B', 'Turned over for the holidays. Press play.'];
let pinned = null;
let peekFor = null;
let lastPointer = 'mouse';
const peekBox = new THREE.Box3();
const peekV = new THREE.Vector3();

// The Polaroid's card: a hello rather than a link.
const INTRO = {
  title: 'I’m <em>Saber.</em>',
  desc: 'Designer and builder in Beijing. I love making things: apps, toys, little worlds.',
  face: 'images/icons/me.png'
};

function peekContent(d) {
  const spec = d.spec;
  if (spec.face === 'note') return { intro: true, desc: INTRO.desc, face: INTRO.face, screen: null };
  if (spec.toy === 'gift') return { name: spec.name, desc: spec.desc, kind: 'Gift ' + (found.indexOf(spec.gift) + 1) + ' of ' + GIFT_ORDER.length, kindId: 'gift', screen: null };
  if (spec.toy && TIPS[spec.toy]) return { name: TIPS[spec.toy][0], desc: TIPS[spec.toy][1], screen: spec.toy === 'lamp' ? null : d.screenData.canvas };
  if (spec.href) return { name: spec.name, desc: spec.desc || '', kind: spec.kind, screen: d.screenData.canvas, href: spec.href, external: spec.external };
  return null;
}

function hidePeek() {
  if (!peekEl) return;
  peekEl.classList.remove('on', 'pinned');
  peekFor = null;
}

function updatePeek() {
  if (!peekEl) return;
  const d = pinned || (lastPointer === 'mouse' && !(drag && drag.moved) ? hovered : null);
  const info = d && peekContent(d);
  if (!info) { hidePeek(); return; }
  if (peekFor !== d) {
    peekFor = d;
    peekEl.classList.toggle('intro', !!info.intro);
    if (info.intro) peekEl.querySelector('strong').innerHTML = INTRO.title;
    else peekEl.querySelector('strong').textContent = info.name;
    peekEl.querySelector('.peek-text span').textContent = info.desc;
    if (peekKind) {
      peekKind.hidden = !info.kind;
      peekKind.textContent = info.kind || '';
      peekKind.dataset.kind = info.kindId || (info.kind === 'iOS app' ? 'ios' : 'web');
    }
    if (peekFace) {
      peekFace.hidden = !info.face;
      if (info.face) peekFace.src = info.face;
    }
    peekCanvas.hidden = !info.screen;
    if (info.screen) {
      peekCanvas.width = 240;
      peekCanvas.height = Math.round(240 * info.screen.height / info.screen.width);
    }
    if (info.href) {
      peekEl.href = info.href;
      if (info.external) { peekEl.target = '_blank'; peekEl.rel = 'noopener'; } else { peekEl.removeAttribute('target'); }
    } else {
      peekEl.removeAttribute('href');
    }
  }
  // The live screen, animation and all.
  if (info.screen) peekCtx.drawImage(info.screen, 0, 0, peekCanvas.width, peekCanvas.height);
  peekEl.classList.toggle('pinned', pinned === d);

  // Where the device sits on screen.
  d.group.updateMatrixWorld();
  peekBox.copy(d.outline).applyMatrix4(d.group.matrixWorld);
  const rect = stage.getBoundingClientRect();
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let i = 0; i < 8; i++) {
    peekV.set(i & 1 ? peekBox.max.x : peekBox.min.x, i & 2 ? peekBox.max.y : peekBox.min.y, i & 4 ? peekBox.max.z : peekBox.min.z).project(camera);
    const sx = rect.left + (peekV.x + 1) / 2 * rect.width;
    const sy = rect.top + (1 - peekV.y) / 2 * rect.height;
    x0 = Math.min(x0, sx); x1 = Math.max(x1, sx); y0 = Math.min(y0, sy); y1 = Math.max(y1, sy);
  }
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  const w = peekEl.offsetWidth, h = peekEl.offsetHeight;
  const vw = window.innerWidth, vh = window.innerHeight;
  const m = 10, gap = 12;
  // Above if it fits, then below, then beside, whichever side has room.
  const options = [
    { side: 'above', x: cx - w / 2, y: y0 - gap - h, ok: y0 - gap - h >= m },
    { side: 'below', x: cx - w / 2, y: y1 + gap, ok: y1 + gap + h <= vh - m },
    { side: 'right', x: x1 + gap, y: cy - h / 2, ok: x1 + gap + w <= vw - m },
    { side: 'left', x: x0 - gap - w, y: cy - h / 2, ok: x0 - gap - w >= m }
  ];
  const pick1 = options.find(function (o) { return o.ok; }) || options[0];
  const x = THREE.MathUtils.clamp(pick1.x, m, Math.max(m, vw - w - m));
  const y = THREE.MathUtils.clamp(pick1.y, m, Math.max(m, vh - h - m));
  peekEl.dataset.side = pick1.side;
  peekEl.style.setProperty('--x', Math.round(x) + 'px');
  peekEl.style.setProperty('--y', Math.round(y) + 'px');
  peekEl.style.setProperty('--ax', THREE.MathUtils.clamp(cx - x, 18, w - 18) + 'px');
  peekEl.style.setProperty('--ay', THREE.MathUtils.clamp(cy - y, 18, h - 18) + 'px');
  peekEl.style.setProperty('--ox', THREE.MathUtils.clamp(cx - x, 0, w) + 'px');
  peekEl.style.setProperty('--oy', pick1.side === 'below' ? '0%' : pick1.side === 'above' ? '100%' : '50%');
  peekEl.classList.add('on');
}

function tap(info, pointerType) {
  if (pointerType !== 'touch') { openHit(info); return; }
  const d = info && info.device;
  if (!d) { pinned = null; return; }
  // Toys and the intro card act on the first tap.
  if (d.spec.toy || d.spec.face === 'note') { openHit(info); pinned = peekContent(d) ? d : null; return; }
  if (pinned === d) { openHit(info); return; }
  pinned = d;
}

if (peekEl) {
  peekEl.addEventListener('click', function (e) {
    // Toy cards are notes, not links.
    if (!peekEl.getAttribute('href')) e.preventDefault();
  });
}

function endDrag(e) {
  if (e) touches.delete(e.pointerId);
  if (pinch) {
    if (touches.size < 2) pinch = null;
    drag = null;
    stage.classList.remove('dragging');
    return;
  }
  if (!drag || (e && e.pointerId !== drag.id)) return;
  const moved = drag.moved;
  const x = e ? e.clientX : drag.x;
  const y = e ? e.clientY : drag.y;
  drag = null;
  stage.classList.remove('dragging');
  if (moved) { suppressClick = true; return; }
  tap(pick(x, y), e && e.pointerType);
}
stage.addEventListener('pointerup', endDrag);
stage.addEventListener('pointerleave', function (e) {
  if (e.pointerType === 'mouse' && !drag) hovered = null;
});
stage.addEventListener('wheel', function (e) {
  if (!e.ctrlKey) return; // trackpad pinch arrives as ctrl + wheel
  e.preventDefault();
  setZoom(zoom * Math.exp(-e.deltaY * 0.01));
}, { passive: false });
// iOS Safari's own page pinch: keep it off the room.
['gesturestart', 'gesturechange'].forEach(function (type) {
  document.addEventListener(type, function (e) { e.preventDefault(); }, { passive: false });
});
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
  lampMats = [];
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

// The lamp scrolled out of view: its light goes with it.
function forgetLamp() {
  lampLight = null;
  lampGlow = null;
  lampPool = null;
  lampMats = [];
  chain = null;
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
  // Opaque: black adds nothing under additive blending. Soft alpha in a
  // canvas texture comes out as coloured speckles on iPad Safari.
  g.fillStyle = '#000';
  g.fillRect(0, 0, 128, 128);
  const grad = g.createRadialGradient(64, 64, 2, 64, 64, 62);
  grad.addColorStop(0, '#e6e6e6');
  grad.addColorStop(0.35, '#5c5c5c');
  grad.addColorStop(0.7, '#141414');
  grad.addColorStop(1, '#000');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  glowTex = new THREE.CanvasTexture(c);
  glowTex.colorSpace = THREE.SRGBColorSpace;
  glowTex.generateMipmaps = false;
  glowTex.minFilter = THREE.LinearFilter;
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
  sprite.scale.set(span * 1.7, span * 1.7, 1);
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
// Pressing the deck plays "Friendly Loop" (audio/friendly-loop.mp3) on
// repeat, or at Christmas the B-side (audio/side-b.mp3). The play key latches down, the reels turn and
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

// iPhone and iPad ignore audio.volume (it is always 1), so fades run through
// a Web Audio gain node. If that isn't available, the element is paused.
let musicGain = null;
let level = 0;
let stopTimer = 0;

function ensureAudio() {
  if (audio) return;
  audio = new Audio('assets/3d/audio/' + TAPE.song + '.mp3?v=' + VERSION);
  audio.loop = true;
  audio.preload = 'auto';
  const ctx = audioContext();
  if (ctx) {
    try {
      const source = ctx.createMediaElementSource(audio);
      musicGain = ctx.createGain();
      musicGain.gain.value = 0;
      source.connect(musicGain).connect(ctx.destination);
    } catch (err) {
      musicGain = null;
    }
  }
  if (!musicGain) audio.volume = 0;
}

function toggleMusic(device) {
  const state = device.spec.state;
  ensureAudio();
  const ctx = audioContext();
  if (ctx && ctx.state === 'suspended') ctx.resume();
  state.playing = !state.playing;
  click(state.playing ? 700 : 520);
  clearTimeout(stopTimer);
  if (state.playing) {
    fadeTo = 0.55;
    const p = audio.play();
    if (p && p.catch) p.catch(function () { state.playing = false; fadeTo = 0; });
  } else {
    fadeTo = 0;
    // Whatever the fade does, the tape stops shortly after the press.
    stopTimer = setTimeout(function () { if (!state.playing) audio.pause(); }, 900);
  }
  device.paint(device.playT, device.base);
}

function updateMusic(dt) {
  if (!audio) return;
  const step = dt * 0.8;
  level += Math.sign(fadeTo - level) * Math.min(step, Math.abs(fadeTo - level));
  if (musicGain) musicGain.gain.value = level;
  else { try { audio.volume = level; } catch (err) {} }
  if (fadeTo === 0 && level === 0 && !audio.paused) audio.pause();
}

function updateCassette(dt) {
  updateMusic(dt);
  if (!deck) return;
  const device = devices.find(function (d) { return d.spec.toy === 'cassette'; });
  const state = TAPE;
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
    if (device && !device.playing && Math.floor(state.elapsed * 2) !== Math.floor((state.elapsed - dt) * 2)) device.paint(0, 0);
  }
}

// ------------------------------------------------------------ the holidays

const PRESENT_PAPER = ['#b8432f', '#3f6b4f', '#2f4a6d', '#e9e0cd', '#c98a3a'];
const PRESENT_RIBBON = ['#f1e3c2', '#c7a16a', '#d8642c', '#f1e3c2', '#3f6b4f'];

function setupSeasonal(model, parts, spec, screenMesh) {
  if (spec.toy === 'present') {
    // Each present gets its own wrapping paper.
    const i = mod(spec.cell[0] * 3 + spec.cell[1] * 5, PRESENT_PAPER.length);
    model.traverse(function (obj) {
      if (!obj.isMesh || !obj.material) return;
      if (obj.material.name === 'Wrap') { obj.material = obj.material.clone(); obj.material.color.set(PRESENT_PAPER[i]).convertSRGBToLinear(); }
      if (obj.material.name === 'Ribbon') { obj.material = obj.material.clone(); obj.material.color.set(PRESENT_RIBBON[i]).convertSRGBToLinear(); }
    });
  }
  if (spec.toy === 'ball') {
    model.traverse(function (obj) {
      if (!obj.isMesh || !obj.material || obj.material.name !== 'Glass') return;
      obj.material = glassMaterial();
      obj.castShadow = false;
      obj.renderOrder = 3;
    });
    // The cottage window and the gold year catch the light at night.
    model.traverse(function (obj) {
      if (!obj.isMesh || !obj.material) return;
      const name = obj.material.name;
      if (name !== 'Window' && name !== 'Gold') return;
      obj.material = obj.material.clone();
      obj.material.emissive = new THREE.Color(name === 'Window' ? '#ffb347' : '#c98a2e');
      obj.material.userData.glow = name === 'Window' ? 2.2 : 0.55;
      obj.material.emissiveIntensity = 0;
      (model.userData.glowMats = model.userData.glowMats || []).push(obj.material);
    });
    // Snow inside the globe: little flakes that drift down and swirl when shaken.
    const flakes = 70;
    const pos = new Float32Array(flakes * 3);
    const seed = [];
    for (let i = 0; i < flakes; i++) {
      seed.push({ a: Math.random() * Math.PI * 2, r: Math.sqrt(Math.random()) * 0.13, y: Math.random(), s: 0.05 + Math.random() * 0.05 });
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const flakesPts = new THREE.Points(geo, new THREE.PointsMaterial({
      size: 2.6, sizeAttenuation: false, color: '#ffffff', map: dotTexture(), transparent: true, opacity: 0.95, depthWrite: false
    }));
    flakesPts.raycast = function () {};
    flakesPts.frustumCulled = false;
    flakesPts.renderOrder = 2;
    model.add(flakesPts);
    model.userData.globeSnow = { pts: flakesPts, seed: seed };
    // A warm glow from inside, for when the lamp is on.
    const sprite = glowSprite('#ffc98a');
    sprite.position.set(0, 0.25, 0).add(TOWARD_CAMERA);
    sprite.scale.set(0.9, 0.9, 1);
    sprite.raycast = function () {};
    const light = new THREE.PointLight('#ffc98a', 0, 1.6, 1.6);
    light.position.set(0, 0.25, 0.05);
    model.add(sprite, light);
    model.userData.ballGlow = { sprite: sprite, light: light };
  }
  if (spec.toy === 'printer') {
    if (parts.Paper) parts.Paper.userData.p0 = parts.Paper.position.clone();
    if (parts.Button) parts.Button.userData.z0 = parts.Button.position.z;
  }
  if (parts.Lid) parts.Lid.userData.y0 = parts.Lid.position.y;
  if (parts.Led) {
    parts.Led.traverse(function (obj) {
      if (!obj.isMesh) return;
      obj.material = obj.material.clone();
      obj.material.emissive = new THREE.Color('#5cff7a');
      obj.material.emissiveIntensity = 0.8;
    });
  }
}

// Thanksgiving: the printer feeds out its paper, then the letter opens.
const PAPER_RUN = 0.17;
const PAPER_DIR = new THREE.Vector3(0, Math.cos(0.32), -Math.sin(0.32));
const letter = document.getElementById('thanks-letter');
let printStart = 0;

function printLetter(device) {
  if (PRINT.printing) return;
  if (PRINT.done) { openLetter(); return; }
  PRINT.printing = true;
  PRINT.progress = 0;
  printStart = performance.now();
  click(1600);
  const ctx = audioContext();
  if (ctx && ctx.state === 'suspended') ctx.resume();
}

function openLetter() {
  if (!letter) return;
  if (typeof letter.showModal === 'function') { if (!letter.open) letter.showModal(); } else letter.setAttribute('open', '');
}
if (letter) {
  letter.addEventListener('click', function (e) {
    if (e.target === letter || e.target.closest('[data-close]')) letter.close();
  });
}

// Christmas: a present pops its lid, and something new springs up in its place.
function unwrap(device) {
  if (device.unwrap) return;
  device.unwrap = performance.now();
  chime([784, 988, 1319]);
  burst(device.group.position, ['#d8642c', '#f1e3c2', '#c7a16a', '#5f9e5a', '#b8432f']);
}

// New Year: tap the ball, the snow whirls up, and it asks for a wish.
function shakeBall(device) {
  BALL.burst = 1;
  chime([1047, 1319, 1568]);
  hovered = null;
  openWish({
    year: BALL.year,
    // While it thinks, and again when it answers, the globe lights up.
    onWish: function () { BALL.burst = 1; chime([784, 1047]); },
    onAnswer: function () { BALL.burst = 1; chime([1047, 1319, 1568, 2093]); }
  });
}

// Glass that's clear in the middle and bright at the rim, with one highlight,
// so the scene inside reads as sitting in a sphere.
function glassMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { night: { value: 0 } },
    vertexShader: `
      varying vec3 vN;
      void main() {
        vN = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float night;
      varying vec3 vN;
      void main() {
        vec3 n = normalize(vN);
        float rim = pow(1.0 - abs(n.z), 2.2);
        vec3 l = normalize(vec3(-0.45, 0.6, 0.66));
        float spec = pow(max(dot(reflect(-l, n), vec3(0.0, 0.0, 1.0)), 0.0), 48.0);
        vec3 tint = mix(vec3(0.93, 0.95, 1.0), vec3(1.0, 0.86, 0.7), night);
        float a = 0.04 + rim * 0.62 + spec * 0.9;
        gl_FragColor = vec4(tint + spec, clamp(a, 0.0, 0.95));
        #include <colorspace_fragment>
      }
    `
  });
}

// A soft bell for the happy moments.
function chime(notes) {
  const ctx = audioContext();
  if (!ctx) return;
  try {
    if (ctx.state === 'suspended') ctx.resume();
    notes.forEach(function (f, i) {
      const t = ctx.currentTime + i * 0.09;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = f;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.12, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
      osc.connect(g).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 1.2);
    });
  } catch (err) {}
}

// Little round sprites for snow and confetti. Hard edges, so iPad Safari
// draws them clean.
let dotTex = null;
function dotTexture() {
  if (dotTex) return dotTex;
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const g = c.getContext('2d');
  g.fillStyle = '#fff';
  g.beginPath();
  g.arc(16, 16, 14, 0, Math.PI * 2);
  g.fill();
  dotTex = new THREE.CanvasTexture(c);
  return dotTex;
}

// Confetti from an opened present.
const bursts = [];
function burst(at, colors) {
  if (REDUCED) return;
  const n = 36;
  const pos = new Float32Array(n * 3);
  const col = new Float32Array(n * 3);
  const vel = [];
  const c = new THREE.Color();
  for (let i = 0; i < n; i++) {
    pos.set([at.x, 0.3, at.z], i * 3);
    c.set(colors[i % colors.length]);
    col.set([c.r, c.g, c.b], i * 3);
    const a = Math.random() * Math.PI * 2;
    const sp = 0.4 + Math.random() * 0.7;
    vel.push(new THREE.Vector3(Math.cos(a) * sp, 1.4 + Math.random() * 1.1, Math.sin(a) * sp));
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({
    size: 7, sizeAttenuation: false, vertexColors: true, map: dotTexture(), alphaTest: 0.5, transparent: false
  }));
  pts.raycast = function () {};
  scene.add(pts);
  bursts.push({ pts: pts, vel: vel, life: 0 });
}

function updateBursts(dt) {
  for (let b = bursts.length - 1; b >= 0; b--) {
    const it = bursts[b];
    it.life += dt;
    const p = it.pts.geometry.attributes.position;
    for (let i = 0; i < it.vel.length; i++) {
      it.vel[i].y -= 4.2 * dt;
      p.array[i * 3] += it.vel[i].x * dt;
      p.array[i * 3 + 1] = Math.max(0.01, p.array[i * 3 + 1] + it.vel[i].y * dt);
      p.array[i * 3 + 2] += it.vel[i].z * dt;
      if (p.array[i * 3 + 1] <= 0.01) it.vel[i].multiplyScalar(0.6);
    }
    p.needsUpdate = true;
    if (it.life > 1.6) {
      scene.remove(it.pts);
      it.pts.geometry.dispose();
      it.pts.material.dispose();
      bursts.splice(b, 1);
    }
  }
}

// Snow, all December. Flakes are tied to the world, not the camera, and wrap
// round a box that follows the view, so it snows wherever you wander.
let snow = null;
const SNOW_BOX = 7;
const SNOW_TOP = 4.2;
function makeSnow() {
  const layers = [{ n: 560, size: 4, speed: 0.32 }, { n: 200, size: 6.5, speed: 0.48 }];
  snow = layers.map(function (l) {
    const pos = new Float32Array(l.n * 3);
    const seed = [];
    for (let i = 0; i < l.n; i++) {
      pos.set([(Math.random() - 0.5) * 2 * SNOW_BOX, Math.random() * SNOW_TOP, (Math.random() - 0.5) * 2 * SNOW_BOX], i * 3);
      seed.push(Math.random() * Math.PI * 2);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      size: l.size, sizeAttenuation: false, color: '#ffffff', map: dotTexture(),
      transparent: true, opacity: 0.85, depthWrite: false
    });
    const pts = new THREE.Points(geo, mat);
    pts.raycast = function () {};
    pts.frustumCulled = false;
    pts.renderOrder = 4;
    scene.add(pts);
    return { pts: pts, seed: seed, speed: l.speed, base: pos.slice() };
  });
}

function wrapAround(v, centre, half) {
  return centre + mod(v - centre + half, half * 2) - half;
}

function updateSnow(dt, now) {
  if (!snow) return;
  const t = now / 1000;
  snow.forEach(function (layer) {
    const p = layer.pts.geometry.attributes.position.array;
    for (let i = 0; i < layer.seed.length; i++) {
      const k = i * 3;
      p[k + 1] -= layer.speed * dt * (REDUCED ? 0.4 : 1);
      if (p[k + 1] < 0) p[k + 1] += SNOW_TOP;
      p[k] = wrapAround(p[k] + Math.sin(t * 0.6 + layer.seed[i]) * 0.08 * dt, target.x, SNOW_BOX);
      p[k + 2] = wrapAround(p[k + 2] + Math.cos(t * 0.5 + layer.seed[i]) * 0.06 * dt, target.z, SNOW_BOX);
    }
    layer.pts.geometry.attributes.position.needsUpdate = true;
    // A touch brighter against the dark room.
    layer.pts.material.opacity = 0.92 - 0.1 * night;
  });
}
if (SEASON === 'christmas') makeSnow();

function updateSeason(dt, now) {
  updateBursts(dt);
  updateSnow(dt, now);
  const t = now / 1000;
  if (BALL.burst > 0) BALL.burst = Math.max(0, BALL.burst - dt * 0.45);
  BALL.night = night;
  if (PRINT.printing) {
    PRINT.progress = Math.min(1, (now - printStart) / 1900);
    // The motor ticks as the paper feeds.
    if (Math.floor(PRINT.progress * 26) !== Math.floor((PRINT.progress - dt / 1.9) * 26)) click(2400 + Math.random() * 600);
    if (PRINT.progress >= 1) {
      PRINT.printing = false;
      PRINT.done = true;
      chime([659, 784, 1047]);
      setTimeout(openLetter, 380);
    }
  }
  devices.slice().forEach(function (d) {
    const spec = d.spec;
    const parts = d.parts;
    if (spec.toy === 'printer') {
      const paper = parts.Paper;
      if (paper && paper.userData.p0) {
        // A stub shows at rest; printing feeds it out in little steps.
        const p = PRINT.done ? 1 : PRINT.printing ? Math.floor(PRINT.progress * 26) / 26 : 0;
        paper.position.copy(paper.userData.p0).addScaledVector(PAPER_DIR, -PAPER_RUN * (1 - p));
      }
      if (parts.Button) {
        const goal = parts.Button.userData.z0 - (PRINT.printing ? 0.008 : 0);
        parts.Button.position.z += (goal - parts.Button.position.z) * Math.min(1, dt * 18);
      }
      if (PRINT.printing || d.printShown !== PRINT.done) { d.printShown = PRINT.done; d.paint(d.playT, d.base); }
    }
    if (spec.toy === 'ball') {
      // The dust never quite settles.
      const root = d.group.children[0];
      const g = root && root.userData.ballGlow;
      // The year floats and turns a little; a tap sets it spinning once.
      if (parts.Year && !REDUCED) {
        if (parts.Year.userData.y0 == null) parts.Year.userData.y0 = parts.Year.position.y;
        parts.Year.position.y = parts.Year.userData.y0 + Math.sin(t * 1.4) * 0.008;
        parts.Year.rotation.y = Math.sin(t * 0.7) * 0.12 * (1 + d.base) + BALL.burst * BALL.burst * Math.PI * 2;
      }
      const snowIn = root && root.userData.globeSnow;
      if (snowIn) {
        const p = snowIn.pts.geometry.attributes.position.array;
        const whirl = BALL.burst;
        snowIn.seed.forEach(function (f, i) {
          if (!REDUCED) {
            f.y -= dt * f.s * (1 - whirl * 1.8);
            f.a += dt * (0.2 + whirl * 4);
            if (f.y < 0) f.y += 1;
            if (f.y > 1) f.y -= 1;
          }
          // Keep each flake inside the glass: the sphere is 0.17 across from y 0.245.
          const y = 0.16 + f.y * 0.22;
          const room = Math.sqrt(Math.max(0, 0.15 * 0.15 - (y - 0.245) * (y - 0.245)));
          const r = Math.min(f.r, room);
          p[i * 3] = Math.cos(f.a) * r;
          p[i * 3 + 1] = y;
          p[i * 3 + 2] = Math.sin(f.a) * r;
        });
        snowIn.pts.geometry.attributes.position.needsUpdate = true;
      }
      if (root && root.userData.glowMats) root.userData.glowMats.forEach(function (m) { m.emissiveIntensity = (night * 0.85 + 0.15 + BALL.burst * 0.4) * m.userData.glow; });
      if (g) {
        g.sprite.material.opacity = night * (0.16 + 0.25 * BALL.burst) + BALL.burst * 0.15;
        g.sprite.visible = g.sprite.material.opacity > 0.01;
        g.light.intensity = night * (0.25 + BALL.burst * 0.5);
      }
      d.group.traverse(function (o) { if (o.material && o.material.uniforms && o.material.uniforms.night) o.material.uniforms.night.value = night; });
    }
    if (spec.toy === 'present') {
      if (parts.Lid && !REDUCED && !d.unwrap) parts.Lid.rotation.z = Math.sin(t * 9) * 0.04 * d.base;
      if (d.unwrap) {
        const p = Math.min(1, (now - d.unwrap) / 420);
        if (parts.Lid) {
          parts.Lid.position.y = parts.Lid.userData.y0 + p * 0.35;
          parts.Lid.rotation.z = p * 0.9;
        }
        d.group.scale.multiplyScalar(1 - p * 0.85);
        if (p >= 1) {
          const c = spec.cell[0], r = spec.cell[1];
          opened.set(d.id, nextGift());
          despawn(d);
          live.set(c + ',' + r, 'pending');
          spawn(c, r, performance.now());
        }
      }
    }
    if (spec.toy === 'gift') {
      const on = d.base;
      if (d.hop) {
        const s = (now - d.hop) / 1000;
        if (s > 0.6) d.hop = 0;
        else d.group.position.y += Math.sin(s / 0.6 * Math.PI) * 0.12;
      }
      if (REDUCED) return;
      if (parts.Platter) parts.Platter.rotation.y -= dt * (TAPE.playing ? 3.5 : on * 2.2);
      if (parts.Disc) parts.Disc.rotation.y -= dt * on * 9;
      if (parts.Tail) parts.Tail.rotation.z = Math.sin(t * 16) * 0.5 * Math.max(on, d.hop ? 1 : 0);
      if (parts.EarL) parts.EarL.rotation.z = Math.sin(t * 7) * 0.18 * on;
      if (parts.EarR) parts.EarR.rotation.z = -Math.sin(t * 7) * 0.18 * on;
      if (parts.ArmR) parts.ArmR.rotation.z = Math.sin(t * 8) * 0.45 * on;
      if (parts.ArmL) parts.ArmL.rotation.z = -Math.sin(t * 8 + 1) * 0.12 * on;
      if (parts.Heart) parts.Heart.scale.setScalar(1 + on * 0.08 * Math.max(0, Math.sin(t * 7)));
      if (parts.Hat) parts.Hat.rotation.z = Math.sin(t * 5) * 0.08 * on;
      if (parts.Led) parts.Led.traverse(function (o) { if (o.isMesh) o.material.emissiveIntensity = 0.6 + on * (0.8 + 0.6 * Math.sin(t * 6)); });
    }
  });
}

// A soft mechanical click for the switch and the keys.
let clickCtx = null;
function audioContext() {
  if (clickCtx) return clickCtx;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) clickCtx = new AC();
  } catch (err) {}
  return clickCtx;
}

function click(freq) {
  try {
    if (!audioContext()) return;
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

let lastStream = -1;
function animate() {
  requestAnimationFrame(animate);
  const now = performance.now();
  checkSize();
  if (now - lastStream > 120) { frameCamera(); stream(now); lastStream = now; }
  const dt = Math.min(clock.getDelta(), 0.05);
  devices.forEach(function (d) { updatePop(d, now); });
  updateHover(dt);
  updateRoom(dt);
  updateCassette(dt);
  updateSeason(dt, now);
  updatePeek();
  updateFlight(now);
  const snapX = Math.round(target.x / SPAN) * SPAN;
  const snapZ = Math.round(target.z / SPAN) * SPAN;
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
// Let the loader fade before the first devices spring up.
const introDelay = params.has('demo') ? 1200 : (window.roomLoader ? 420 : 40);

loadModels().then(function () {
  if (window.roomLoader) window.roomLoader.done();
  if (focusName) {
    // Look for the nearest cell showing that model and centre on it.
    let best = null;
    for (let c = -6; c <= 6; c++) for (let r = -6; r <= 6; r++) {
      const sp = specFor(c, r);
      if (sp.file.indexOf(focusName) === -1) continue;
      if (!best || Math.hypot(c, r) < Math.hypot(best[0], best[1])) best = [c, r];
    }
    if (best) target.set(best[0] * SPAN, 0.2, best[1] * SPAN);
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
