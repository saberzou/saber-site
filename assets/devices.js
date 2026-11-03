/* Devices for the flat view, drawn from the same 3D models as the room.
   Each picture is a front view rendered by assets/3d/scripts/render-flat.html
   under the room's lights; the screen rect is where its glass lands, in the
   picture's own pixels. width is the device's share of a cell, in percent. */
(function () {
  'use strict';
  var DEVICES = [
  {
    "id": "handheld",
    "face": "lcd",
    "width": 38.25,
    "screen": {
      "x": 52.9,
      "y": 69.7,
      "w": 103.4,
      "h": 79.6,
      "r": 4.8
    },
    "svg": "<svg viewBox=\"0 0 204 333\" aria-hidden=\"true\"><image href=\"assets/flat/handheld.webp?v=17\" width=\"204\" height=\"333\"/></svg>"
  },
  {
    "id": "macintosh",
    "face": "paper",
    "width": 43.5,
    "screen": {
      "x": 51.4,
      "y": 100.4,
      "w": 127.7,
      "h": 94.4,
      "r": 5.7
    },
    "svg": "<svg viewBox=\"0 0 232 343\" aria-hidden=\"true\"><image href=\"assets/flat/macintosh.webp?v=17\" width=\"232\" height=\"343\"/></svg>"
  },
  {
    "id": "phone",
    "face": "gloss",
    "width": 31.13,
    "screen": {
      "x": 22.2,
      "y": 63.9,
      "w": 121.6,
      "h": 182.9,
      "r": 7.3
    },
    "svg": "<svg viewBox=\"0 0 166 315\" aria-hidden=\"true\"><image href=\"assets/flat/phone.webp?v=17\" width=\"166\" height=\"315\"/></svg>"
  },
  {
    "id": "term",
    "face": "phos",
    "width": 67.12,
    "screen": {
      "x": 48.3,
      "y": 77.0,
      "w": 261.4,
      "h": 103.2,
      "r": 6.2
    },
    "svg": "<svg viewBox=\"0 0 358 323\" aria-hidden=\"true\"><image href=\"assets/flat/term.webp?v=17\" width=\"358\" height=\"323\"/></svg>"
  },
  {
    "id": "flip",
    "face": "tft",
    "width": 32.25,
    "screen": {
      "x": 34.3,
      "y": 41.3,
      "w": 103.4,
      "h": 77.4,
      "r": 4.6
    },
    "svg": "<svg viewBox=\"0 0 172 313\" aria-hidden=\"true\"><image href=\"assets/flat/flip.webp?v=17\" width=\"172\" height=\"313\"/></svg>"
  },
  {
    "id": "pda",
    "face": "mono",
    "width": 34.88,
    "screen": {
      "x": 29.2,
      "y": 81.8,
      "w": 127.7,
      "h": 112.1,
      "r": 6.7
    },
    "svg": "<svg viewBox=\"0 0 186 341\" aria-hidden=\"true\"><image href=\"assets/flat/pda.webp?v=17\" width=\"186\" height=\"341\"/></svg>"
  },
  {
    "id": "imac",
    "face": "aqua",
    "width": 55.12,
    "screen": {
      "x": 58.8,
      "y": 58.6,
      "w": 176.3,
      "h": 123.9,
      "r": 7.4
    },
    "svg": "<svg viewBox=\"0 0 294 306\" aria-hidden=\"true\"><image href=\"assets/flat/imac.webp?v=17\" width=\"294\" height=\"306\"/></svg>"
  },
  {
    "id": "crt",
    "face": "tube",
    "width": 62.25,
    "screen": {
      "x": 53.5,
      "y": 64.4,
      "w": 225.0,
      "h": 153.4,
      "r": 9.2
    },
    "svg": "<svg viewBox=\"0 0 332 293\" aria-hidden=\"true\"><image href=\"assets/flat/crt.webp?v=17\" width=\"332\" height=\"293\"/></svg>"
  },
  {
    "id": "laptop",
    "face": "paper",
    "width": 69.75,
    "screen": {
      "x": 40.1,
      "y": 30.2,
      "w": 291.8,
      "h": 164.1,
      "r": 9.8
    },
    "svg": "<svg viewBox=\"0 0 372 302\" aria-hidden=\"true\"><image href=\"assets/flat/laptop.webp?v=17\" width=\"372\" height=\"302\"/></svg>"
  },
  {
    "id": "candy",
    "face": "lcd",
    "width": 26.25,
    "screen": {
      "x": 30.5,
      "y": 84.6,
      "w": 79.0,
      "h": 56.0,
      "r": 3.4
    },
    "svg": "<svg viewBox=\"0 0 140 319\" aria-hidden=\"true\"><image href=\"assets/flat/candy.webp?v=17\" width=\"140\" height=\"319\"/></svg>"
  },
  {
    "id": "pet",
    "face": "lcd",
    "width": 32.62,
    "screen": {
      "x": 65.1,
      "y": 104.7,
      "w": 43.8,
      "h": 34.2,
      "r": 2.1
    },
    "svg": "<svg viewBox=\"0 0 174 247\" aria-hidden=\"true\"><image href=\"assets/flat/pet.webp?v=17\" width=\"174\" height=\"247\"/></svg>"
  },
  {
    "id": "digicam",
    "face": "gloss",
    "width": 45.75,
    "screen": {
      "x": 39.0,
      "y": 48.2,
      "w": 127.7,
      "h": 82.6,
      "r": 5.0
    },
    "svg": "<svg viewBox=\"0 0 244 164\" aria-hidden=\"true\"><image href=\"assets/flat/digicam.webp?v=17\" width=\"244\" height=\"164\"/></svg>"
  },
  {
    "id": "pager",
    "face": "mono",
    "width": 36.0,
    "screen": {
      "x": 35.2,
      "y": 36.2,
      "w": 121.6,
      "h": 35.4,
      "r": 2.1
    },
    "svg": "<svg viewBox=\"0 0 192 125\" aria-hidden=\"true\"><image href=\"assets/flat/pager.webp?v=17\" width=\"192\" height=\"125\"/></svg>"
  },
  {
    "id": "learner",
    "face": "amber",
    "width": 55.12,
    "screen": {
      "x": 42.7,
      "y": 84.7,
      "w": 170.2,
      "h": 31.3,
      "r": 1.9
    },
    "svg": "<svg viewBox=\"0 0 294 301\" aria-hidden=\"true\"><image href=\"assets/flat/learner.webp?v=17\" width=\"294\" height=\"301\"/></svg>"
  },
  {
    "id": "widehandheld",
    "face": "tft",
    "width": 55.12,
    "screen": {
      "x": 95.3,
      "y": 42.5,
      "w": 103.4,
      "h": 70.8,
      "r": 4.2
    },
    "svg": "<svg viewBox=\"0 0 294 146\" aria-hidden=\"true\"><image href=\"assets/flat/widehandheld.webp?v=17\" width=\"294\" height=\"146\"/></svg>"
  },
  {
    "id": "tv",
    "face": "tube",
    "width": 55.12,
    "screen": {
      "x": 39.2,
      "y": 225.4,
      "w": 158.1,
      "h": 115.0,
      "r": 6.9
    },
    "svg": "<svg viewBox=\"0 0 294 390\" aria-hidden=\"true\"><image href=\"assets/flat/tv.webp?v=17\" width=\"294\" height=\"390\"/></svg>"
  },
  {
    "id": "arcade",
    "face": "phos",
    "width": 39.38,
    "screen": {
      "x": 38.1,
      "y": 112.5,
      "w": 133.8,
      "h": 103.1,
      "r": 6.2
    },
    "svg": "<svg viewBox=\"0 0 210 476\" aria-hidden=\"true\"><image href=\"assets/flat/arcade.webp?v=17\" width=\"210\" height=\"476\"/></svg>"
  },
  {
    "id": "typewriter",
    "face": "paper",
    "width": 60.75,
    "screen": {
      "x": 103.4,
      "y": 16.8,
      "w": 145.9,
      "h": 102.6,
      "r": 6.2
    },
    "svg": "<svg viewBox=\"0 0 324 298\" aria-hidden=\"true\"><image href=\"assets/flat/typewriter.webp?v=17\" width=\"324\" height=\"298\"/></svg>"
  },
  {
    "id": "scope",
    "face": "phos",
    "width": 55.12,
    "screen": {
      "x": 43.8,
      "y": 101.0,
      "w": 91.2,
      "h": 88.5,
      "r": 5.3
    },
    "svg": "<svg viewBox=\"0 0 294 255\" aria-hidden=\"true\"><image href=\"assets/flat/scope.webp?v=17\" width=\"294\" height=\"255\"/></svg>"
  },
  {
    "id": "ereader",
    "face": "mono",
    "width": 38.25,
    "screen": {
      "x": 26,
      "y": 25.2,
      "w": 152,
      "h": 200.4,
      "r": 9.1
    },
    "svg": "<svg viewBox=\"0 0 204 301\" aria-hidden=\"true\"><image href=\"assets/flat/ereader.webp?v=17\" width=\"204\" height=\"301\"/></svg>"
  },
  {
    "id": "musicplayer",
    "face": "tft",
    "width": 31.13,
    "screen": {
      "x": 37.4,
      "y": 30.8,
      "w": 91.2,
      "h": 66.4,
      "r": 4.0
    },
    "svg": "<svg viewBox=\"0 0 166 262\" aria-hidden=\"true\"><image href=\"assets/flat/musicplayer.webp?v=17\" width=\"166\" height=\"262\"/></svg>"
  },
  {
    "id": "calculator",
    "face": "lcd",
    "width": 31.13,
    "screen": {
      "x": 31.3,
      "y": 42.5,
      "w": 103.4,
      "h": 27.3,
      "r": 1.6
    },
    "svg": "<svg viewBox=\"0 0 166 266\" aria-hidden=\"true\"><image href=\"assets/flat/calculator.webp?v=17\" width=\"166\" height=\"266\"/></svg>"
  },
  {
    "id": "clockradio",
    "face": "amber",
    "width": 52.88,
    "screen": {
      "x": 140.7,
      "y": 68.3,
      "w": 109.4,
      "h": 47.2,
      "r": 2.8
    },
    "svg": "<svg viewBox=\"0 0 282 150\" aria-hidden=\"true\"><image href=\"assets/flat/clockradio.webp?v=17\" width=\"282\" height=\"150\"/></svg>"
  },
  {
    "id": "dualscreen",
    "face": "lcd",
    "width": 40.88,
    "screen": {
      "x": 54.3,
      "y": 25.8,
      "w": 109.4,
      "h": 82.0,
      "r": 4.9
    },
    "svg": "<svg viewBox=\"0 0 218 188\" aria-hidden=\"true\"><image href=\"assets/flat/dualscreen.webp?v=17\" width=\"218\" height=\"188\"/></svg>"
  },
  {
    "id": "watch",
    "face": "mono",
    "width": 36.0,
    "screen": {
      "x": 62.6,
      "y": 56.4,
      "w": 66.9,
      "h": 67.8,
      "r": 4.0
    },
    "svg": "<svg viewBox=\"0 0 192 167\" aria-hidden=\"true\"><image href=\"assets/flat/watch.webp?v=17\" width=\"192\" height=\"167\"/></svg>"
  },
  {
    "id": "camcorder",
    "face": "gloss",
    "width": 53.25,
    "screen": {
      "x": 130.7,
      "y": 76.9,
      "w": 80.0,
      "h": 60.2,
      "r": 3.6
    },
    "svg": "<svg viewBox=\"0 0 284 159\" aria-hidden=\"true\"><image href=\"assets/flat/camcorder.webp?v=17\" width=\"284\" height=\"159\"/></svg>"
  }
];
  window.RETRO_DEFS = '';
  window.INTRO_DEVICE = {"id": "intro", "face": "note", "width": 64.88, "screen": {"x": 95.2, "y": 188.6, "w": 155.6, "h": 177.0, "r": 1}, "svg": "<svg viewBox=\"0 0 346 390\" aria-hidden=\"true\"><image href=\"assets/flat/camera.webp?v=17\" width=\"346\" height=\"390\"/></svg>"};
  window.ARCHER_DEVICE = {"id": "archer", "face": "fish", "width": 27.38, "screen": {"x": 32.4, "y": 147.3, "w": 75.4, "h": 67.3, "r": 4.0}, "svg": "<svg viewBox=\"0 0 146 357\" aria-hidden=\"true\"><image href=\"assets/flat/radio.webp?v=17\" width=\"146\" height=\"357\"/></svg>"};
  // Even out sizes the same way the 3D room does: scale each device most of
  // the way toward the middle size (half area, half longest side), so a pager
  // isn't tiny next to a TV. The Polaroid keeps its size.
  (function even() {
    var KEEP = ['camera'];
    var metric = DEVICES.map(function (d) {
      var m = d.svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
      var w = d.width, h = d.width * parseFloat(m[2]) / parseFloat(m[1]);
      return { d: d, w: w, h: h, size: 0.5 * Math.sqrt(w * h) + 0.5 * Math.max(w, h) };
    });
    var sorted = metric.map(function (x) { return x.size; }).sort(function (a, b) { return a - b; });
    var target = sorted[Math.floor(sorted.length / 2)];
    metric.forEach(function (x) {
      if (KEEP.indexOf(x.d.id) !== -1) return;
      var k = Math.min(1.6, Math.max(0.65, Math.pow(target / x.size, 0.7)));
      // Never taller than most of a cell.
      k = Math.min(k, 72 / x.h);
      x.d.width = Math.round(x.w * k * 100) / 100;
    });
  })();
  window.RETRO_DEVICES = DEVICES;
  window.RETRO_BY_ID = {};
  DEVICES.forEach(function (d) { window.RETRO_BY_ID[d.id] = d; });
})();
