// Screen faces for the 3D study: the resting picture and the hover animation
// for every device style. Pure canvas 2D, so it can be tested on its own.
// t is seconds since the hover began; k is how far the hover has eased in (0–1).

export const FACES = {
  lcd: { bg: ['#d5e28a', '#c3d36e'], ink: '#1c2410', pixel: true },
  tft: { bg: ['#eef2f6', '#cfd8e2'], ink: '#1d2633', pixel: true },
  amber: { bg: ['#f6d995', '#e2b25a'], ink: '#3a2408', pixel: true },
  gloss: { bg: ['#2e3138', '#0b0c0f'], ink: '#f4f4f4' },
  mono: { bg: ['#dfe2d2', '#c4c8b3'], ink: '#22261c', pixel: true },
  paper: { bg: ['#f6f3ec', '#f6f3ec'], ink: '#1a1a1a' },
  tube: { bg: ['#26262a', '#060606'], ink: '#f4efe6' },
  aqua: { bg: ['#f7fafb', '#e4eef1'], ink: '#14323a' },
  phos: { bg: ['#06180d', '#020805'], ink: '#74f59c', pixel: true, glow: true },
  fish: { bg: ['#1a2014', '#0b0e08'], ink: '#ffd966' }
};

export const FISH_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">' +
  '<path d="M25 48 C 17 49, 10 54, 8 62 C 15 64, 23 59, 28 55 Z" fill="#FF6A00"/>' +
  '<path d="M75 48 C 83 49, 90 54, 92 62 C 85 64, 77 59, 72 55 Z" fill="#FF6A00"/>' +
  '<rect x="20" y="28" width="60" height="46" rx="23" fill="#FF6A00"/>' +
  '<path d="M25 62 Q 50 76 75 62 Q 50 81 25 62 Z" fill="#D94B0F" opacity="0.45"/>' +
  '<rect x="28" y="38" width="44" height="17" rx="8.5" fill="#141414"/>' +
  '<rect x="38" y="42.5" width="5" height="8" rx="2.5" fill="#FFD966"/>' +
  '<rect x="57" y="42.5" width="5" height="8" rx="2.5" fill="#FFD966"/>' +
  '</svg>';

function wrap(ctx, text, x, y, max, line) {
  const words = text.split(' ');
  let row = '';
  let yy = y;
  words.forEach(function (word) {
    const next = row ? row + ' ' + word : word;
    if (ctx.measureText(next).width > max && row) {
      ctx.fillText(row, x, yy);
      row = word;
      yy += line;
    } else {
      row = next;
    }
  });
  if (row) ctx.fillText(row, x, yy);
  return yy;
}

// Each screen is a canvas the page repaints. At rest it is drawn once. While a
// device is hovered, its screen runs a small animation that fits the device,
// then settles back to the resting frame when the pointer leaves.

export function paintScreen(ctx, w, h, spec, icon, t, k) {
  if (spec.face === 'note') return drawNote(ctx, w, h, t, k);
  if (spec.face === 'fish') return drawFish(ctx, w, h, icon, t, k);
  if (spec.face === 'tape') return drawTape(ctx, w, h, spec.state || {}, t, k);
  if (spec.face === 'printer') return drawPrinter(ctx, w, h, spec.state || {}, t, k);
  if (spec.face === 'dog') return drawDog(ctx, w, h, t, k);
  if (spec.face === 'fold') return drawFold(ctx, w, h, t, k);
  if (spec.face === 'sketch') return drawSketch(ctx, w, h, t, k);
  drawProject(ctx, w, h, spec, icon, t, k);
  glassOver(ctx, w, h, spec.face);
}

// The last coat on every glass screen: a soft reflection across the top
// corner, and on tubes a little darkening toward the edges where the glass
// curves away.
const CURVED = { tube: 0.34, phos: 0.4, amber: 0.26, lcd: 0.14, mono: 0.12 };
function glassOver(ctx, w, h, face) {
  ctx.save();
  ctx.globalAlpha = 1;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const edge = CURVED[face];
  if (edge) {
    const v = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.hypot(w, h) * 0.6);
    v.addColorStop(0, 'rgba(0, 0, 0, 0)');
    v.addColorStop(1, 'rgba(0, 0, 0, ' + edge + ')');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, w, h);
  }
  // The reflection: a pale band from the top-left corner, cut on a slant.
  const shine = face === 'paper' || face === 'sketch' ? 0.05 : 0.13;
  const g = ctx.createLinearGradient(0, 0, w * 0.55, h * 0.9);
  g.addColorStop(0, 'rgba(255, 255, 255, ' + shine + ')');
  g.addColorStop(0.42, 'rgba(255, 255, 255, ' + shine * 0.35 + ')');
  g.addColorStop(0.43, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

function fillFace(ctx, w, h, face) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, face.bg[0]);
  g.addColorStop(1, face.bg[1]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

// 0 → 1 → 0 bump that repeats every `period` seconds.
function hop(t, period) {
  const p = (t % period) / period;
  return p < 0.5 ? Math.sin(p * 2 * Math.PI) : 0;
}

// Archer: bobs, blinks, and lets off bubbles.
function drawFish(ctx, w, h, img, t, k) {
  fillFace(ctx, w, h, FACES.fish);
  const size = Math.min(w, h) * 0.78;
  const bob = Math.sin(t * 3.2) * h * 0.035 * k;
  const sway = Math.sin(t * 1.6) * 0.06 * k;
  if (k > 0) {
    for (let i = 0; i < 6; i++) {
      const life = (t * 0.55 + i / 6) % 1;
      const x = w * (0.62 + 0.12 * Math.sin(i * 2.1 + t * 2));
      const y = h * (0.62 - life * 0.62);
      ctx.globalAlpha = k * (1 - life) * 0.75;
      ctx.strokeStyle = '#9fd4ff';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(x, y, 10 + i * 3 + life * 10, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  if (!img) return;
  ctx.save();
  ctx.translate(w / 2, h / 2 + bob);
  ctx.rotate(sway);
  ctx.drawImage(img, -size / 2, -size / 2, size, size);
  // A blink: paint the dark visor over the eyes for a beat.
  const blink = k > 0 && (t % 2.6) > 2.45;
  if (blink) {
    ctx.fillStyle = '#141414';
    ctx.fillRect(-size * 0.14, -size * 0.085, size * 0.3, size * 0.11);
    ctx.fillStyle = '#FFD966';
    ctx.fillRect(-size * 0.12, -size * 0.04, size * 0.05, size * 0.015);
    ctx.fillRect(size * 0.07, -size * 0.04, size * 0.05, size * 0.015);
  }
  ctx.restore();
}

// The intro print: hovering fires the flash, and the print develops again.
function drawNote(ctx, w, h, t, k) {
  ctx.fillStyle = '#f4f1ea';
  ctx.fillRect(0, 0, w, h);
  const develop = k > 0 ? Math.min(1, 0.25 + t * 1.1) : 1;
  ctx.globalAlpha = develop;
  ctx.fillStyle = '#161616';
  ctx.textBaseline = 'top';
  // Big enough to read from across the room.
  ctx.font = '360 190px "Timeless Serif", Georgia, serif';
  const im = "I\u2019m ";
  ctx.fillText(im, 84, 120);
  ctx.font = 'italic 360 190px "Timeless Serif Italic", Georgia, serif';
  ctx.fillText('Saber.', 84, 320);
  ctx.fillStyle = '#3a3c40';
  ctx.font = '460 62px "Timeless Sans", sans-serif';
  wrap(ctx, 'Designer and builder in Beijing.', 88, 600, w - 176, 84);
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#161616';
  ctx.font = '560 60px "Timeless Sans", sans-serif';
  const y = h - 230;
  // GitHub on the left half, Email on the right: proto.js opens whichever
  // half of the bottom strip is pressed.
  drawLink(ctx, 'GitHub', 88, y);
  drawLink(ctx, 'Email', w / 2 + 40, y);
  if (k > 0) {
    // Warm sepia haze while it develops, then a white flash on top.
    ctx.globalAlpha = (1 - develop) * 0.55;
    ctx.fillStyle = '#c9a477';
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = Math.exp(-t * 7) * k;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 1;
  }
}

// The cassette's paper label: a big A, a handwritten title, and a counter
// that runs while the tape plays.
function drawTape(ctx, w, h, state, t, k) {
  ctx.fillStyle = '#f3ead8';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#d8642c';
  ctx.fillRect(0, h * 0.72, w, h * 0.16);
  ctx.fillStyle = '#c7b89c';
  for (let y = h * 0.2; y < h * 0.7; y += h * 0.17) ctx.fillRect(w * 0.2, y, w * 0.6, 2);
  // Side letter in a circle.
  const r = h * 0.3;
  ctx.fillStyle = '#d8642c';
  ctx.beginPath();
  ctx.arc(w * 0.09, h * 0.42, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f3ead8';
  ctx.font = '700 ' + Math.round(h * 0.42) + 'px "Timeless Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(state.side || 'A', w * 0.09, h * 0.44);
  // The counter always has its own corner, so the title never runs into it.
  const counterFont = '400 ' + Math.round(h * 0.22) + 'px "Screen Pixel", ui-monospace, monospace';
  ctx.font = counterFont;
  const room = w * 0.95 - ctx.measureText('\u25B6 00:00').width - w * 0.04 - w * 0.2;
  // Title, as if written in pen, shrunk to fit if it has to.
  ctx.fillStyle = '#2a2622';
  let size = Math.round(h * 0.32);
  ctx.font = 'italic 360 ' + size + 'px "Timeless Serif Italic", Georgia, serif';
  const tw = ctx.measureText(state.title || 'songs for wandering').width;
  if (tw > room) { size = Math.floor(size * room / tw); ctx.font = 'italic 360 ' + size + 'px "Timeless Serif Italic", Georgia, serif'; }
  ctx.textAlign = 'left';
  ctx.fillText(state.title || 'songs for wandering', w * 0.2, h * 0.4);
  // Counter, or a nudge to press play.
  ctx.font = counterFont;
  ctx.textAlign = 'right';
  if (state.playing) {
    const sec = Math.floor(state.elapsed || 0);
    const mm = String(Math.floor(sec / 60)).padStart(2, '0');
    const ss = String(sec % 60).padStart(2, '0');
    ctx.fillStyle = '#d8642c';
    ctx.fillText('\u25B6 ' + mm + ':' + ss, w * 0.95, h * 0.41);
  } else if (k > 0 && Math.floor(t * 2) % 2 === 0) {
    ctx.fillStyle = '#8a7f6c';
    ctx.fillText('PRESS', w * 0.95, h * 0.41);
  }
  ctx.textAlign = 'left';
}

// ------------------------------------------------------------- holidays

// The printer's little amber display: a hello, then a progress bar.
function drawPrinter(ctx, w, h, state, t, k) {
  ctx.fillStyle = '#1b1712';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#f6c66a';
  ctx.font = '400 ' + Math.round(h * 0.3) + 'px "Screen Pixel", ui-monospace, monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (state.printing) {
    const p = Math.min(1, state.progress || 0);
    ctx.fillText('PRINTING', w / 2, h * 0.36);
    ctx.globalAlpha = 0.3;
    ctx.fillRect(w * 0.14, h * 0.66, w * 0.72, h * 0.1);
    ctx.globalAlpha = 1;
    ctx.fillRect(w * 0.14, h * 0.66, w * 0.72 * p, h * 0.1);
  } else if (state.done) {
    ctx.fillText('THANK YOU', w / 2, h * 0.5);
  } else if (k > 0 && Math.floor(t * 2.2) % 2 === 1) {
    ctx.fillText('PRESS \u25B6', w / 2, h * 0.5);
  } else {
    ctx.fillText('\u2665 HELLO', w / 2, h * 0.5);
  }
  ctx.textAlign = 'left';
}

// The robot dog's visor: two soft eyes that blink, and smile when you're near.
function drawDog(ctx, w, h, t, k) {
  ctx.fillStyle = '#0f1114';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#9fe6ff';
  ctx.strokeStyle = '#9fe6ff';
  ctx.lineCap = 'round';
  const ew = w * 0.17, eh = h * 0.42;
  for (const x of [w * 0.32, w * 0.68]) {
    if (k > 0.5) {
      // Happy: upturned arcs.
      ctx.lineWidth = h * 0.12;
      ctx.beginPath();
      ctx.arc(x, h * 0.6, ew * 0.55, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    } else {
      const blink = (t % 3.4) > 3.25;
      const hh = blink ? eh * 0.12 : eh;
      ctx.beginPath();
      ctx.roundRect(x - ew / 2, h / 2 - hh / 2, ew, hh, Math.min(ew, hh) / 2);
      ctx.fill();
    }
  }
}

// The foldable phone: two panes either side of the crease. A photo on the
// left, a little list on the right; hovering scrolls the list.
function drawFold(ctx, w, h, t, k) {
  const g = ctx.createLinearGradient(0, 0, w / 2, h);
  g.addColorStop(0, '#f2b880');
  g.addColorStop(0.55, '#b77a8c');
  g.addColorStop(1, '#4a3f78');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w / 2, h);
  // A sun and a hill, so the photo reads as one.
  ctx.fillStyle = '#fff1d6';
  ctx.beginPath();
  ctx.arc(w * 0.3, h * 0.42, w * 0.07, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2f4a3f';
  ctx.beginPath();
  ctx.moveTo(0, h * 0.8);
  ctx.quadraticCurveTo(w * 0.2, h * 0.58, w * 0.5, h * 0.78);
  ctx.lineTo(w * 0.5, h); ctx.lineTo(0, h);
  ctx.fill();
  ctx.fillStyle = '#f6f3ec';
  ctx.fillRect(w / 2, 0, w / 2, h);
  const scroll = k > 0 ? (t * 40) % (h * 0.2) : 0;
  for (let i = -1; i < 7; i++) {
    const y = h * 0.08 + i * h * 0.2 - scroll;
    ctx.fillStyle = ['#d8642c', '#5f9e5a', '#5b7fb8', '#c7a16a'][(i + 4) % 4];
    ctx.beginPath();
    ctx.arc(w * 0.58, y + h * 0.06, h * 0.05, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2a2622';
    ctx.fillRect(w * 0.65, y + h * 0.03, w * 0.22, h * 0.03);
    ctx.fillStyle = '#b9b2a4';
    ctx.fillRect(w * 0.65, y + h * 0.08, w * 0.15, h * 0.025);
  }
  // The crease.
  ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
  ctx.fillRect(w / 2 - 2, 0, 4, h);
}

// The tablet: a sketch page. Hovering draws a little tree, stroke by stroke.
function drawSketch(ctx, w, h, t, k) {
  ctx.fillStyle = '#fbf8f1';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#ece6da';
  ctx.fillRect(0, 0, w * 0.08, h);
  ['#2a2622', '#d8642c', '#5f9e5a', '#5b7fb8'].forEach(function (c, i) {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(w * 0.04, h * (0.2 + i * 0.16), w * 0.018, 0, Math.PI * 2);
    ctx.fill();
  });
  const p = k > 0 ? Math.min(1, t / 2.4) : 1;
  const cx = w * 0.55, base = h * 0.82;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = h * 0.025;
  const strokes = [
    ['#5f9e5a', [[cx - w * 0.2, base - h * 0.08], [cx, base - h * 0.62], [cx + w * 0.2, base - h * 0.08], [cx - w * 0.2, base - h * 0.08]]],
    ['#6d4a33', [[cx, base - h * 0.08], [cx, base]]],
    ['#d8642c', [[cx - w * 0.06, base - h * 0.3], [cx - w * 0.06, base - h * 0.3]]],
    ['#5b7fb8', [[cx + w * 0.07, base - h * 0.22], [cx + w * 0.07, base - h * 0.22]]],
    ['#c7a16a', [[cx, base - h * 0.7], [cx, base - h * 0.7]]]
  ];
  strokes.forEach(function (st, i) {
    const local = Math.min(1, Math.max(0, p * strokes.length - i));
    if (local <= 0) return;
    const pts = st[1];
    ctx.strokeStyle = st[0];
    ctx.lineWidth = i >= 2 ? h * 0.06 : h * 0.025;
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    const segs = pts.length - 1;
    for (let j = 1; j <= segs; j++) {
      const f = Math.min(1, Math.max(0, local * segs - (j - 1)));
      if (f <= 0) break;
      ctx.lineTo(pts[j - 1][0] + (pts[j][0] - pts[j - 1][0]) * f + 0.01, pts[j - 1][1] + (pts[j][1] - pts[j - 1][1]) * f);
    }
    ctx.stroke();
  });
}

function drawLink(ctx, label, x, y) {
  ctx.fillText(label, x, y);
  const width = ctx.measureText(label).width;
  ctx.fillRect(x, y + 72, width, 5);
}

// Screens at least this much wider than tall put the icon beside the name.
const WIDE = 1.9;

function drawProject(ctx, w, h, spec, icon, t, k) {
  const face = FACES[spec.face] || FACES.paper;
  const m = Math.min(w, h);
  fillFace(ctx, w, h, face);
  const label = face.pixel ? spec.name.toUpperCase() : spec.name;
  const lay = layout(ctx, w, h, face, label);
  const size = lay.size;

  // Where the icon goes this frame. Each style moves it its own way.
  let ix = lay.ix;
  let iy = lay.iy;
  let scale = 1;
  let angle = 0;
  if (k > 0) {
    switch (spec.face) {
      case 'paper':
      case 'aqua': {
        // Dock bounce.
        const b = hop(t, 0.9);
        iy -= b * m * 0.12 * k;
        scale = 1 + 0.06 * b * k;
        break;
      }
      case 'lcd':
      case 'mono':
      case 'tft':
        // Handheld hop, snapped to whole pixels.
        iy -= Math.round(hop(t, 0.7) * 4) * m * 0.02 * k;
        break;
      case 'amber':
        // The bell rings.
        angle = Math.sin(t * 38) * 0.16 * k * (t % 1.4 < 0.7 ? 1 : 0.15);
        break;
      case 'gloss':
        scale = 1 + 0.05 * Math.sin(t * 3) * k;
        break;
      case 'tube':
        ix += (Math.random() - 0.5) * m * 0.012 * k;
        break;
    }
  }

  // Layers behind the icon.
  if (k > 0) behindIcon(ctx, w, h, spec.face, t, k, ix + size / 2, iy + size / 2, size, lay);

  if (icon) {
    ctx.save();
    ctx.translate(ix + size / 2, iy + size / 2);
    ctx.rotate(angle);
    ctx.scale(scale, scale);
    roundClip(ctx, -size / 2, -size / 2, size, size, size * 0.18);
    ctx.drawImage(icon, -size / 2, -size / 2, size, size);
    ctx.restore();
  }

  // The label, one line (or two on a wide screen), starting at lay.lx.
  ctx.font = lay.font;
  ctx.fillStyle = face.ink;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const px = lay.px;
  if (face.glow) { ctx.shadowColor = face.ink; ctx.shadowBlur = px * 0.5; }
  let left = label.length;
  if (k > 0 && spec.face === 'phos') left = Math.min(label.length, Math.floor(t * 14));
  let cx = 0, cy = 0;
  lay.lines.forEach(function (line, i) {
    const shown = line.slice(0, Math.max(0, left));
    left -= line.length + 1;
    const x = lay.lineX(i);
    const y = lay.ly + (i - (lay.lines.length - 1) / 2) * lay.lead;
    ctx.fillText(shown, x, y);
    if (shown.length || i === 0) { cx = x + ctx.measureText(shown).width; cy = y; }
  });
  if (k > 0 && spec.face === 'phos' && (Math.floor(t * 2.5) % 2 === 0 || left < 0)) {
    // The terminal types the name out, then leaves a blinking block.
    ctx.fillRect(cx + px * 0.1, cy - px * 0.45, px * 0.55, px * 0.9);
  }
  ctx.shadowBlur = 0;

  if (k > 0) overScreen(ctx, w, h, spec.face, t, k, px, lay);
}

// Places the icon and the name. Squarish screens stack them; wide ones sit
// them side by side so the icon can be much bigger.
function layout(ctx, w, h, face, label) {
  const m = Math.min(w, h);
  function fontAt(px) {
    return face.pixel
      ? '400 ' + px + 'px "Screen Pixel", ui-monospace, monospace'
      : '560 ' + px + 'px "Timeless Sans", sans-serif';
  }
  function widthAt(text, px) { ctx.font = fontAt(px); return ctx.measureText(text).width; }

  if (w / h < WIDE) {
    const size = Math.round(m * 0.34);
    let px = Math.round(m * (face.pixel ? 0.085 : 0.09));
    while (widthAt(label, px) > w * 0.88 && px > 12) px -= 4;
    const tw = widthAt(label, px);
    return {
      wide: false, size, ix: (w - size) / 2, iy: h * 0.42 - size * 0.62,
      px, font: fontAt(px), lines: [label], lead: px, ly: h * 0.76, tw,
      lx: (w - tw) / 2, lineX: function () { return (w - tw) / 2; }
    };
  }

  const size = Math.round(h * 0.62);
  const gap = Math.round(h * 0.14);
  const room = w * 0.9 - size - gap;
  const big = Math.round(h * (face.pixel ? 0.2 : 0.22));
  const small = Math.round(h * 0.17);
  let lines = [label];
  let px = big;
  while (widthAt(label, px) > room && px > small) px -= 2;
  if (widthAt(label, px) > room && label.indexOf(' ') > 0) {
    // Too long for one line: break at the space nearest the middle.
    const words = label.split(' ');
    let best = null;
    for (let i = 1; i < words.length; i++) {
      const a = words.slice(0, i).join(' '), b = words.slice(i).join(' ');
      const wid = Math.max(widthAt(a, 10), widthAt(b, 10));
      if (!best || wid < best.wid) best = { lines: [a, b], wid };
    }
    lines = best.lines;
    px = big;
  }
  while (Math.max.apply(null, lines.map(function (l) { return widthAt(l, px); })) > room && px > 12) px -= 2;
  const tw = Math.max.apply(null, lines.map(function (l) { return widthAt(l, px); }));
  const total = size + gap + tw;
  const ix = (w - total) / 2;
  const lx = ix + size + gap;
  return {
    wide: true, size, ix, iy: (h - size) / 2,
    px, font: fontAt(px), lines, lead: px * 1.25, ly: h / 2, tw,
    lx, lineX: function () { return lx; }
  };
}

function behindIcon(ctx, w, h, faceName, t, k, cx, cy, size, lay) {
  const m = Math.min(w, h);
  if (faceName === 'amber') {
    // Rings spreading out from the ringing icon.
    for (let i = 0; i < 3; i++) {
      const life = (t * 0.9 + i / 3) % 1;
      ctx.globalAlpha = (1 - life) * 0.6 * k;
      ctx.strokeStyle = '#7a4a10';
      ctx.lineWidth = m * 0.012;
      ctx.beginPath();
      ctx.arc(cx, cy, size * (0.55 + life * 0.9), 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  } else if (faceName === 'aqua' || faceName === 'paper') {
    // A soft shadow that shrinks as the icon jumps.
    ctx.globalAlpha = 0.18 * k;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(cx, lay.iy + size * 1.06, size * 0.36, size * 0.06, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  } else if (faceName === 'tft') {
    // Signal bars filling and a battery, like a phone that just woke up.
    const bars = Math.min(4, Math.floor(t * 6));
    ctx.fillStyle = FACES.tft.ink;
    for (let i = 0; i < 4; i++) {
      ctx.globalAlpha = (i < bars ? 1 : 0.18) * k;
      const bh = m * (0.035 + i * 0.02);
      ctx.fillRect(w * 0.06 + i * m * 0.04, h * 0.14 - bh, m * 0.026, bh);
    }
    ctx.globalAlpha = k;
    ctx.strokeStyle = FACES.tft.ink;
    ctx.lineWidth = m * 0.008;
    ctx.strokeRect(w * 0.82, h * 0.07, m * 0.11, m * 0.055);
    ctx.fillRect(w * 0.82 + m * 0.11, h * 0.07 + m * 0.017, m * 0.012, m * 0.022);
    ctx.fillRect(w * 0.82 + m * 0.012, h * 0.07 + m * 0.012, m * 0.086 * Math.min(1, t * 1.5), m * 0.031);
    ctx.globalAlpha = 1;
  }
}

function overScreen(ctx, w, h, faceName, t, k, px, lay) {
  const m = Math.min(w, h);
  switch (faceName) {
    case 'gloss': {
      // A slide-to-unlock shine sweeping across.
      const x = ((t * 0.7) % 1.4 - 0.2) * w;
      const g = ctx.createLinearGradient(x - w * 0.18, 0, x + w * 0.18, 0);
      g.addColorStop(0, 'rgba(255,255,255,0)');
      g.addColorStop(0.5, 'rgba(255,255,255,' + (0.32 * k) + ')');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      break;
    }
    case 'lcd': {
      // A faint dot-matrix fades in, and a pixel snake runs just inside the edge.
      ctx.globalAlpha = 0.07 * k;
      ctx.fillStyle = '#1c2410';
      const step = Math.max(8, Math.round(m / 64));
      for (let x = 0; x < w; x += step) ctx.fillRect(x, 0, 1, h);
      for (let y = 0; y < h; y += step) ctx.fillRect(0, y, w, 1);
      const s = Math.round(m * 0.045);
      const inset = Math.round(m * 0.06);
      const iw = w - inset * 2 - s, ih = h - inset * 2 - s;
      const per = 2 * (iw + ih);
      for (let i = 0; i < 7; i++) {
        // Move in whole snake steps so it feels like an LCD.
        let d = (Math.floor(t * 18) - i) * s;
        d = ((d % per) + per) % per;
        let x, y;
        if (d < iw) { x = d; y = 0; }
        else if ((d -= iw) < ih) { x = iw; y = d; }
        else if ((d -= ih) < iw) { x = iw - d; y = ih; }
        else { x = 0; y = ih - (d - iw); }
        ctx.globalAlpha = k * (i === 0 ? 1 : 0.85 - i * 0.1);
        ctx.fillRect(inset + x, inset + y, s - 3, s - 3);
      }
      ctx.globalAlpha = 1;
      break;
    }
    case 'mono': {
      // A stylus signs a little scribble under the name.
      const p = Math.min(1, (t % 2.4) / 1.2);
      ctx.strokeStyle = FACES.mono.ink;
      ctx.lineWidth = m * 0.012;
      ctx.lineCap = 'round';
      ctx.globalAlpha = k;
      ctx.beginPath();
      const steps = Math.floor(p * 60);
      for (let i = 0; i <= steps; i++) {
        const u = i / 60;
        const x = lay.wide ? lay.lx + u * lay.tw : w * (0.22 + u * 0.56);
        const base = lay.wide ? Math.min(h * 0.9, lay.ly + lay.lead * (lay.lines.length - 1) / 2 + px * 0.95) : h * 0.88;
        const y = base + Math.sin(u * 18) * m * 0.03 * (1 - u * 0.4);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
      break;
    }
    case 'tube':
    case 'phos': {
      // Scanlines, plus one bright band rolling down the glass.
      ctx.globalAlpha = 0.22 * k;
      ctx.fillStyle = '#000';
      for (let y = 0; y < h; y += 8) ctx.fillRect(0, y, w, 3);
      const band = ((t * 0.45) % 1) * (h + 200) - 100;
      const g = ctx.createLinearGradient(0, band - 70, 0, band + 70);
      const tint = faceName === 'phos' ? '116,245,156' : '255,250,240';
      g.addColorStop(0, 'rgba(' + tint + ',0)');
      g.addColorStop(0.5, 'rgba(' + tint + ',' + (0.16 * k) + ')');
      g.addColorStop(1, 'rgba(' + tint + ',0)');
      ctx.globalAlpha = 1;
      ctx.fillStyle = g;
      ctx.fillRect(0, band - 70, w, 140);
      if (faceName === 'tube') {
        // Corner vignette like a curved tube.
        const v = ctx.createRadialGradient(w / 2, h / 2, m * 0.3, w / 2, h / 2, Math.hypot(w, h) * 0.6);
        v.addColorStop(0, 'rgba(0,0,0,0)');
        v.addColorStop(1, 'rgba(0,0,0,' + (0.55 * k) + ')');
        ctx.fillStyle = v;
        ctx.fillRect(0, 0, w, h);
      }
      break;
    }
    case 'paper': {
      // The arrow cursor glides in and taps the icon.
      const p = Math.min(1, t * 1.3);
      const e = 1 - Math.pow(1 - p, 3);
      // It ends just past the icon's middle, wherever the icon sits.
      const tx = lay.ix + lay.size * 0.62, ty = lay.iy + lay.size * 0.62;
      const x = w * 0.86 + (tx - w * 0.86) * e;
      const y = h * 0.86 + (ty - h * 0.86) * e;
      ctx.globalAlpha = k;
      drawArrow(ctx, x, y, m * 0.09);
      ctx.globalAlpha = 1;
      break;
    }
    case 'aqua': {
      // An Aqua candy-stripe progress bar loading under the name.
      const bw = lay.wide ? lay.tw : w * 0.5, bh = m * 0.055;
      const bx = lay.wide ? lay.lx : (w - bw) / 2;
      const by = lay.wide ? Math.min(h * 0.86, lay.ly + lay.lead * (lay.lines.length - 1) / 2 + px * 0.8) : h * 0.86;
      const fill = Math.min(1, (t % 2.2) / 1.6);
      ctx.globalAlpha = k;
      ctx.save();
      roundClip(ctx, bx, by, bw, bh, bh / 2);
      ctx.fillStyle = '#d7e3e8';
      ctx.fillRect(bx, by, bw, bh);
      ctx.beginPath();
      ctx.rect(bx, by, bw * fill, bh);
      ctx.clip();
      ctx.fillStyle = '#2d86d9';
      ctx.fillRect(bx, by, bw, bh);
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      const stripe = bh * 1.1;
      const shift = (t * stripe * 2) % (stripe * 2);
      for (let x = bx - stripe * 2 + shift; x < bx + bw; x += stripe * 2) {
        ctx.beginPath();
        ctx.moveTo(x, by + bh);
        ctx.lineTo(x + stripe, by);
        ctx.lineTo(x + stripe * 2, by);
        ctx.lineTo(x + stripe, by + bh);
        ctx.closePath();
        ctx.fill();
      }
      const gloss = ctx.createLinearGradient(0, by, 0, by + bh);
      gloss.addColorStop(0, 'rgba(255,255,255,0.75)');
      gloss.addColorStop(0.5, 'rgba(255,255,255,0.1)');
      gloss.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = gloss;
      ctx.fillRect(bx, by, bw, bh);
      ctx.restore();
      ctx.globalAlpha = 1;
      break;
    }
  }
}

function drawArrow(ctx, x, y, s) {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, s);
  ctx.lineTo(s * 0.27, s * 0.76);
  ctx.lineTo(s * 0.46, s * 1.12);
  ctx.lineTo(s * 0.6, s * 1.05);
  ctx.lineTo(s * 0.42, s * 0.7);
  ctx.lineTo(s * 0.74, s * 0.7);
  ctx.closePath();
  ctx.fillStyle = '#111';
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = s * 0.07;
  ctx.stroke();
  ctx.fill();
  ctx.restore();
}

function roundClip(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  ctx.clip();
}
