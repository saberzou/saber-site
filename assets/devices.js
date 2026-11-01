/* Hand-tuned device illustrations. Screen rects are the glass the HTML label sits on. */
(function () {
  'use strict';

  function keys(o) {
    var out = '';
    var r, c, x, y, w, cols, rowW, x0;
    for (r = 0; r < o.rows; r++) {
      cols = o.cols;
      if (o.shortLast && r === o.rows - 1) cols -= 1;
      y = o.y + r * (o.h + o.gy);
      rowW = cols * o.w + (cols - 1) * o.gx;
      x0 = o.x + ((o.cols * o.w + (o.cols - 1) * o.gx) - rowW) / 2;
      for (c = 0; c < cols; c++) {
        x = x0 + c * (o.w + o.gx);
        w = o.w;
        if (o.bar && r === o.rows - 1 && c === cols - 1) w = o.w * 1.7;
        out += '<rect x="' + x.toFixed(2) + '" y="' + y.toFixed(2) + '" width="' + w.toFixed(2) + '" height="' + o.h + '" rx="' + (o.rx || 1.6) + '" fill="' + o.fill + '"/>';
        out += '<rect x="' + (x + 0.6).toFixed(2) + '" y="' + (y + 0.55).toFixed(2) + '" width="' + (w - 1.2).toFixed(2) + '" height="1.3" rx="0.6" fill="#fff" opacity="' + (o.shine || 0.2) + '"/>';
      }
    }
    return out;
  }

  function lip(s, pad, fill, rx) {
    return '<rect x="' + (s.x - pad) + '" y="' + (s.y - pad) + '" width="' + (s.w + pad * 2) + '" height="' + (s.h + pad * 2) + '" rx="' + (rx || s.r + pad) + '" fill="' + fill + '"/>';
  }

  var DEFS = '' +
    '<svg class="device-defs" aria-hidden="true" width="0" height="0">' +
    '<defs>' +
    '<pattern id="grain" width="4" height="4" patternUnits="userSpaceOnUse">' +
      '<rect width="4" height="4" fill="transparent"/>' +
      '<circle cx="0.6" cy="0.8" r="0.35" fill="#fff" opacity="0.45"/>' +
      '<circle cx="2.6" cy="2.4" r="0.3" fill="#000" opacity="0.35"/>' +
      '<circle cx="3.2" cy="0.5" r="0.22" fill="#fff" opacity="0.3"/>' +
    '</pattern>' +
    '<linearGradient id="sheen" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0.42"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>' +
    '<linearGradient id="candyBody" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#465672"/><stop offset="0.42" stop-color="#2c3a50"/><stop offset="1" stop-color="#1a2433"/></linearGradient>' +
    '<linearGradient id="candyFace" x1="0.2" y1="0" x2="0.8" y2="1"><stop offset="0" stop-color="#51627e"/><stop offset="0.18" stop-color="#3a4a62"/><stop offset="1" stop-color="#243044"/></linearGradient>' +
    '<linearGradient id="candyKey" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#61718a"/><stop offset="0.45" stop-color="#3d4c63"/><stop offset="1" stop-color="#2a3648"/></linearGradient>' +
    '<linearGradient id="razr" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f7f8fa"/><stop offset="0.35" stop-color="#d5dae1"/><stop offset="1" stop-color="#8f99a6"/></linearGradient>' +
    '<linearGradient id="razrFace" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#eceff3"/><stop offset="1" stop-color="#b7bec8"/></linearGradient>' +
    '<linearGradient id="hinge" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f4f6f8"/><stop offset="0.5" stop-color="#9aa3ae"/><stop offset="1" stop-color="#6d7682"/></linearGradient>' +
    '<linearGradient id="rotBody" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a3834"/><stop offset="0.4" stop-color="#262421"/><stop offset="1" stop-color="#141311"/></linearGradient>' +
    '<linearGradient id="rotHand" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a4742"/><stop offset="0.5" stop-color="#2c2a27"/><stop offset="1" stop-color="#161513"/></linearGradient>' +
    '<radialGradient id="dialFace" cx="0.4" cy="0.35" r="0.7"><stop offset="0" stop-color="#fbf7f0"/><stop offset="0.7" stop-color="#e6dfd2"/><stop offset="1" stop-color="#cfc5b4"/></radialGradient>' +
    '<linearGradient id="brass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f0e2c4"/><stop offset="0.5" stop-color="#c6a36a"/><stop offset="1" stop-color="#8c6a38"/></linearGradient>' +
    '<linearGradient id="steel" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f4f5f7"/><stop offset="0.35" stop-color="#c5c8ce"/><stop offset="0.7" stop-color="#8d929b"/><stop offset="1" stop-color="#d5d8de"/></linearGradient>' +
    '<linearGradient id="phoneFace" x1="0" y1="0" x2="0.4" y2="1"><stop offset="0" stop-color="#2a2c31"/><stop offset="0.2" stop-color="#141518"/><stop offset="1" stop-color="#07080a"/></linearGradient>' +
    '<radialGradient id="homeBtn" cx="0.4" cy="0.35" r="0.75"><stop offset="0" stop-color="#3a3d44"/><stop offset="1" stop-color="#0e0f12"/></radialGradient>' +
    '<linearGradient id="gbBody" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e3e4d6"/><stop offset="0.45" stop-color="#c9cbb8"/><stop offset="1" stop-color="#a8aa96"/></linearGradient>' +
    '<linearGradient id="gbLower" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b7b9a4"/><stop offset="1" stop-color="#8e907c"/></linearGradient>' +
    '<linearGradient id="dpad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a4038"/><stop offset="1" stop-color="#1c211c"/></linearGradient>' +
    '<radialGradient id="ab" cx="0.35" cy="0.3" r="0.8"><stop offset="0" stop-color="#c46a78"/><stop offset="0.45" stop-color="#8d3d4c"/><stop offset="1" stop-color="#5c2430"/></radialGradient>' +
    '<linearGradient id="pdaBody" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f2f3f5"/><stop offset="0.4" stop-color="#d5d8de"/><stop offset="1" stop-color="#aeb4be"/></linearGradient>' +
    '<linearGradient id="macBeige" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f3eadc"/><stop offset="0.45" stop-color="#e2d3bd"/><stop offset="1" stop-color="#c9b79c"/></linearGradient>' +
    '<linearGradient id="crtBeige" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f6ecdc"/><stop offset="0.5" stop-color="#e4d3ba"/><stop offset="1" stop-color="#cbb892"/></linearGradient>' +
    '<linearGradient id="bondi" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8fd0dc"/><stop offset="0.28" stop-color="#3aa6bc"/><stop offset="0.72" stop-color="#1f7f96"/><stop offset="1" stop-color="#17687c"/></linearGradient>' +
    '<linearGradient id="bondiChin" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e7f6f8" stop-opacity="0.92"/><stop offset="1" stop-color="#b7dbe3" stop-opacity="0.95"/></linearGradient>' +
    '<linearGradient id="imacStand" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f7f5f1"/><stop offset="1" stop-color="#d9d4cc"/></linearGradient>' +
    '<linearGradient id="termBody" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3d463c"/><stop offset="0.4" stop-color="#2a3128"/><stop offset="1" stop-color="#161b16"/></linearGradient>' +
    '<linearGradient id="termKey" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4e5a4c"/><stop offset="1" stop-color="#2c342b"/></linearGradient>' +
    '<linearGradient id="pbLid" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6a6e76"/><stop offset="0.35" stop-color="#3e434b"/><stop offset="1" stop-color="#2a2e34"/></linearGradient>' +
    '<linearGradient id="pbBase" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5c6168"/><stop offset="1" stop-color="#3a3f46"/></linearGradient>' +
    '<linearGradient id="pbKey" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a4f57"/><stop offset="1" stop-color="#2e333a"/></linearGradient>' +
    '<linearGradient id="camBody" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4a4e56"/><stop offset="0.4" stop-color="#2c3038"/><stop offset="1" stop-color="#1a1d22"/></linearGradient>' +
    '<radialGradient id="lens" cx="0.4" cy="0.35" r="0.7"><stop offset="0" stop-color="#3a4554"/><stop offset="0.55" stop-color="#15181e"/><stop offset="1" stop-color="#07080b"/></radialGradient>' +
    '<linearGradient id="print" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fffcf7"/><stop offset="1" stop-color="#f3eee6"/></linearGradient>' +
    '<linearGradient id="radioBody" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8d9160"/><stop offset="0.45" stop-color="#6a6e45"/><stop offset="1" stop-color="#4a4e30"/></linearGradient>' +
    '<linearGradient id="radioFace" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7c8054"/><stop offset="1" stop-color="#5c603c"/></linearGradient>' +
    '<radialGradient id="talk" cx="0.38" cy="0.32" r="0.75"><stop offset="0" stop-color="#5a5e42"/><stop offset="1" stop-color="#2e321c"/></radialGradient>' +
    '</defs></svg>';

  var candyScreen = { x: 16, y: 30, w: 68, h: 48, r: 3 };
  var flipScreen = { x: 20, y: 16, w: 78, h: 54, r: 3 };
  var rotaryScreen = { x: 24, y: 68, w: 76, h: 52, r: 3 };
  var phoneScreen = { x: 13, y: 28, w: 78, h: 128, r: 5 };
  var gameScreen = { x: 22, y: 22, w: 88, h: 64, r: 3 };
  var pdaScreen = { x: 13, y: 16, w: 84, h: 76, r: 2 };
  var macScreen = { x: 28, y: 24, w: 98, h: 68, r: 2 };
  var crtScreen = { x: 28, y: 20, w: 140, h: 100, r: 8 };
  var imacScreen = { x: 36, y: 40, w: 106, h: 78, r: 4 };
  var termScreen = { x: 18, y: 16, w: 164, h: 84, r: 4 };
  var laptopScreen = { x: 18, y: 12, w: 174, h: 76, r: 2 };

  var candy = '' +
    '<svg viewBox="0 0 100 180" aria-hidden="true">' +
      '<rect x="5" y="3" width="90" height="172" rx="24" fill="url(#candyBody)"/>' +
      '<rect x="9" y="7" width="82" height="164" rx="21" fill="url(#candyFace)"/>' +
      '<rect x="12" y="8" width="76" height="36" rx="16" fill="url(#sheen)"/>' +
      '<rect x="9" y="7" width="82" height="164" rx="21" fill="url(#grain)" opacity="0.28"/>' +
      '<rect x="34" y="13" width="32" height="7" rx="3.5" fill="#10151d"/>' +
      '<g stroke="#6d7d96" stroke-width="1.1" stroke-linecap="round">' +
        '<path d="M40 15.2v2.6M44.5 15.2v2.6M49 15.2v2.6M53.5 15.2v2.6M58 15.2v2.6"/>' +
      '</g>' +
      lip(candyScreen, 3.5, '#0c1210', 5) +
      '<rect x="20" y="80" width="10" height="2" rx="1" fill="#9aa6b8" opacity="0.7"/>' +
      '<rect x="70" y="80" width="10" height="2" rx="1" fill="#9aa6b8" opacity="0.7"/>' +
      '<rect x="18" y="90" width="12" height="16" rx="3.5" fill="#1e6b3a"/>' +
      '<rect x="19" y="91" width="10" height="4" rx="2" fill="#fff" opacity="0.18"/>' +
      '<rect x="70" y="90" width="12" height="16" rx="3.5" fill="#8d3030"/>' +
      '<rect x="71" y="91" width="10" height="4" rx="2" fill="#fff" opacity="0.16"/>' +
      '<rect x="32" y="88" width="36" height="20" rx="10" fill="#141a24"/>' +
      '<rect x="34" y="90" width="32" height="16" rx="8" fill="url(#candyKey)"/>' +
      '<circle cx="50" cy="98" r="6.2" fill="#1c2533"/>' +
      '<circle cx="50" cy="97.4" r="5" fill="url(#candyFace)"/>' +
      '<circle cx="48.4" cy="95.8" r="1.3" fill="#fff" opacity="0.45"/>' +
      keys({ x: 22, y: 112, cols: 3, rows: 4, w: 16, h: 9, gx: 4, gy: 2.5, rx: 2.2, fill: 'url(#candyKey)', shine: 0.22 }) +
      '<circle cx="50" cy="169" r="2.3" fill="#10151d"/>' +
      '<circle cx="50" cy="169" r="1.15" fill="#5c6c82"/>' +
    '</svg>';

  var flip = '' +
    '<svg viewBox="0 0 118 172" aria-hidden="true">' +
      '<path d="M16 6h86a10 10 0 0 1 10 10v62H6V16A10 10 0 0 1 16 6z" fill="url(#razr)"/>' +
      '<path d="M20 8h78a8 8 0 0 1 8 8v54H12V16a8 8 0 0 1 8-8z" fill="url(#razrFace)"/>' +
      '<path d="M20 8h78a8 8 0 0 1 8 8v20H12V16a8 8 0 0 1 8-8z" fill="url(#sheen)" opacity="0.85"/>' +
      '<rect x="46" y="10" width="26" height="3.5" rx="1.6" fill="#2c3138"/>' +
      lip(flipScreen, 3, '#1a1e24', 5) +
      '<rect x="14" y="78" width="38" height="8" rx="3" fill="url(#hinge)"/>' +
      '<rect x="66" y="78" width="38" height="8" rx="3" fill="url(#hinge)"/>' +
      '<rect x="52" y="79.2" width="14" height="5.6" rx="2" fill="#5e6772"/>' +
      '<path d="M20 90H98Q108 90 110 102L114 146Q116 164 100 166H18Q2 164 4 146L8 102Q10 90 20 90Z" fill="url(#razr)"/>' +
      '<path d="M26 94H92Q100 94 102 104L105 144Q107 158 94 160H24Q11 158 13 144L16 104Q18 94 26 94Z" fill="url(#razrFace)"/>' +
      '<path d="M26 94H92Q100 94 100 104V110H20V104Q20 94 26 94Z" fill="#fff" opacity="0.28"/>' +
      '<circle cx="59" cy="114" r="10" fill="#b7bec8"/>' +
      '<circle cx="59" cy="114" r="7.6" fill="url(#razr)"/>' +
      '<circle cx="59" cy="114" r="2.8" fill="#2e343c"/>' +
      '<path d="M59 106.6v2.8M59 118.6v2.8M51.2 114h2.8M64 114h2.8" stroke="#2e343c" stroke-width="1.2" stroke-linecap="round"/>' +
      keys({ x: 24, y: 128, cols: 3, rows: 3, w: 18, h: 7, gx: 8, gy: 3, rx: 1.8, fill: '#6e7784', shine: 0.35 }) +
      '<path d="M14 160h90" stroke="#fff" stroke-opacity="0.35" stroke-width="1.2"/>' +
    '</svg>';

  var rotary = '' +
    '<svg viewBox="0 0 214 150" aria-hidden="true">' +
      '<ellipse cx="46" cy="34" rx="18" ry="13" fill="url(#rotHand)"/>' +
      '<ellipse cx="168" cy="34" rx="18" ry="13" fill="url(#rotHand)"/>' +
      '<path d="M58 26c28-16 70-16 98 0v12c-28-14-70-14-98 0z" fill="url(#rotHand)"/>' +
      '<path d="M66 28c24-10 58-10 82 0" stroke="#fff" stroke-opacity="0.28" stroke-width="2" fill="none" stroke-linecap="round"/>' +
      '<ellipse cx="46" cy="32" rx="8" ry="5.5" fill="#1a1816"/>' +
      '<ellipse cx="168" cy="32" rx="8" ry="5.5" fill="#1a1816"/>' +
      '<ellipse cx="46" cy="31" rx="5" ry="3" fill="#3a3834"/>' +
      '<ellipse cx="168" cy="31" rx="5" ry="3" fill="#3a3834"/>' +
      '<path d="M22 72c-6 2-10 10-10 18l-2 28c0 10 10 16 22 16h150c12 0 22-6 22-16l-2-28c0-8-4-16-10-18-10 8-30 12-84 12s-74-4-84-12z" fill="url(#rotBody)"/>' +
      '<path d="M36 78c18 8 46 12 71 12s53-4 71-12" stroke="#fff" stroke-opacity="0.12" stroke-width="3" fill="none"/>' +
      '<rect x="48" y="58" width="8" height="18" rx="2" fill="#121110"/>' +
      '<rect x="158" y="58" width="8" height="18" rx="2" fill="#121110"/>' +
      lip(rotaryScreen, 3, 'url(#brass)', 5) +
      '<circle cx="158" cy="98" r="34" fill="#1a1816"/>' +
      '<circle cx="158" cy="98" r="31" fill="url(#brass)"/>' +
      '<circle cx="158" cy="98" r="28" fill="url(#dialFace)"/>' +
      '<circle cx="162" cy="120.7" r="3.4" fill="#1a1816"/>' +
      '<circle cx="149.4" cy="119.3" r="3.4" fill="#1a1816"/>' +
      '<circle cx="139.4" cy="111.5" r="3.4" fill="#1a1816"/>' +
      '<circle cx="135.1" cy="99.6" r="3.4" fill="#1a1816"/>' +
      '<circle cx="137.7" cy="87.2" r="3.4" fill="#1a1816"/>' +
      '<circle cx="146.5" cy="78.1" r="3.4" fill="#1a1816"/>' +
      '<circle cx="158.8" cy="75" r="3.4" fill="#1a1816"/>' +
      '<circle cx="170.9" cy="78.9" r="3.4" fill="#1a1816"/>' +
      '<circle cx="179" cy="88.6" r="3.4" fill="#1a1816"/>' +
      '<circle cx="180.8" cy="101.2" r="3.4" fill="#1a1816"/>' +
      '<circle cx="158" cy="98" r="8" fill="url(#rotHand)"/>' +
      '<circle cx="156.5" cy="96.4" r="2" fill="#fff" opacity="0.25"/>' +
      '<path d="M176 112l10 6-2 8-12-2z" fill="url(#brass)"/>' +
      '<path d="M178 114l6 3" stroke="#fff" stroke-opacity="0.4" stroke-width="1"/>' +
      '<rect x="40" y="132" width="22" height="5" rx="2" fill="#0e0d0c"/>' +
      '<rect x="152" y="132" width="22" height="5" rx="2" fill="#0e0d0c"/>' +
    '</svg>';

  var phone = '' +
    '<svg viewBox="0 0 104 196" aria-hidden="true">' +
      '<rect x="1" y="36" width="4" height="16" rx="1" fill="#b7bcc4"/>' +
      '<rect x="1" y="56" width="4" height="22" rx="1" fill="#d5d8de"/>' +
      '<rect x="3" y="2" width="98" height="192" rx="20" fill="url(#steel)"/>' +
      '<rect x="6" y="5" width="92" height="186" rx="17" fill="url(#phoneFace)"/>' +
      '<rect x="10" y="8" width="40" height="50" rx="12" fill="#fff" opacity="0.05"/>' +
      '<rect x="38" y="14" width="28" height="5" rx="2.5" fill="#050607"/>' +
      '<rect x="39" y="15" width="26" height="1.4" rx="0.7" fill="#8d929c" opacity="0.7"/>' +
      lip(phoneScreen, 2, '#000', 7) +
      '<circle cx="52" cy="174" r="12" fill="#050607"/>' +
      '<circle cx="52" cy="174" r="10.5" fill="url(#homeBtn)"/>' +
      '<rect x="47.2" y="169.2" width="9.6" height="9.6" rx="2.4" fill="none" stroke="#c8ccd4" stroke-width="1.3"/>' +
    '</svg>';

  var game = '' +
    '<svg viewBox="0 0 152 190" aria-hidden="true">' +
      '<rect x="6" y="4" width="140" height="180" rx="12" fill="url(#gbBody)"/>' +
      '<path d="M6 96h140v76a12 12 0 0 1-12 12H18a12 12 0 0 1-12-12z" fill="url(#gbLower)"/>' +
      '<rect x="6" y="4" width="140" height="180" rx="12" fill="url(#grain)" opacity="0.22"/>' +
      '<rect x="10" y="8" width="70" height="18" rx="8" fill="url(#sheen)" opacity="0.7"/>' +
      '<circle cx="18" cy="16" r="2" fill="#c4473c"/>' +
      '<circle cx="18" cy="16" r="1" fill="#ffd0c8" opacity="0.8"/>' +
      '<rect x="16" y="16" width="102" height="76" rx="6" fill="#2a3124"/>' +
      '<rect x="18" y="18" width="98" height="72" rx="4" fill="#1c2218"/>' +
      lip(gameScreen, 2.5, '#0e140e', 4) +
      '<g stroke="#5a6052" stroke-width="1.7" stroke-linecap="round">' +
        '<path d="M126 34v9M131 34v9M136 34v9M126 46v9M131 46v9M136 46v9M126 58v9M131 58v9M136 58v9"/>' +
      '</g>' +
      '<circle cx="46" cy="128" r="20" fill="#2a2e26"/>' +
      '<circle cx="46" cy="128" r="17" fill="#1e221c"/>' +
      '<rect x="39" y="114" width="14" height="28" rx="3" fill="url(#dpad)"/>' +
      '<rect x="32" y="121" width="28" height="14" rx="3" fill="url(#dpad)"/>' +
      '<circle cx="46" cy="128" r="3" fill="#121510"/>' +
      '<circle cx="112" cy="118" r="10" fill="url(#ab)"/>' +
      '<circle cx="128" cy="132" r="10" fill="url(#ab)"/>' +
      '<circle cx="109" cy="115" r="3" fill="#fff" opacity="0.28"/>' +
      '<circle cx="125" cy="129" r="3" fill="#fff" opacity="0.28"/>' +
      '<text x="112" y="122" text-anchor="middle" font-family="Georgia, serif" font-size="9" font-weight="700" fill="#f8ecec">A</text>' +
      '<text x="128" y="136" text-anchor="middle" font-family="Georgia, serif" font-size="9" font-weight="700" fill="#f8ecec">B</text>' +
      '<rect x="62" y="156" width="16" height="6" rx="3" fill="#3a4036" transform="rotate(-12 70 159)"/>' +
      '<rect x="82" y="154" width="16" height="6" rx="3" fill="#3a4036" transform="rotate(-12 90 157)"/>' +
    '</svg>';

  var pda = '' +
    '<svg viewBox="0 0 110 178" aria-hidden="true">' +
      '<rect x="4" y="4" width="102" height="168" rx="10" fill="url(#pdaBody)"/>' +
      '<rect x="4" y="4" width="102" height="40" rx="10" fill="url(#sheen)" opacity="0.55"/>' +
      '<rect x="4" y="4" width="102" height="168" rx="10" fill="url(#grain)" opacity="0.2"/>' +
      '<rect x="96" y="36" width="3" height="46" rx="1" fill="#8b919b"/>' +
      '<circle cx="92" cy="12" r="2.2" fill="#2f8a4e"/>' +
      '<circle cx="92" cy="12" r="1" fill="#b6f0c4"/>' +
      lip(pdaScreen, 3, '#2c3328', 4) +
      '<rect x="14" y="100" width="82" height="26" rx="2" fill="#cfc8bb"/>' +
      '<rect x="16" y="102" width="78" height="22" rx="1" fill="#e7e1d6"/>' +
      '<path d="M55 102v22" stroke="#b7b0a4" stroke-width="1"/>' +
      '<path d="M26 112h8M28 109l-3 3 3 3" stroke="#8a847a" stroke-width="1" fill="none" stroke-linecap="round"/>' +
      '<path d="M70 108h10M70 112h10M70 116h6" stroke="#8a847a" stroke-width="1" stroke-linecap="round"/>' +
      '<circle cx="24" cy="146" r="7" fill="#2e333a"/>' +
      '<circle cx="46" cy="146" r="7" fill="#2e333a"/>' +
      '<circle cx="64" cy="146" r="7" fill="#2e333a"/>' +
      '<circle cx="86" cy="146" r="7" fill="#2e333a"/>' +
      '<rect x="20.5" y="143.5" width="7" height="5" rx="0.8" fill="none" stroke="#e6e8ec" stroke-width="0.9"/>' +
      '<circle cx="46" cy="144.2" r="1.5" fill="#e6e8ec"/>' +
      '<path d="M43.2 148.2c1-2 4.6-2 5.6 0" stroke="#e6e8ec" stroke-width="0.9" fill="none"/>' +
      '<path d="M61.4 144.2h5.2M61.4 146.4h5.2M61.4 148.6h3.4" stroke="#e6e8ec" stroke-width="0.9" stroke-linecap="round"/>' +
      '<path d="M83.2 143.6h5.6v5h-5.6zM84.4 145.2h3.2M84.4 147h3.2" stroke="#e6e8ec" stroke-width="0.8" fill="none"/>' +
      '<rect x="48" y="158" width="14" height="8" rx="3" fill="#2e333a"/>' +
      '<path d="M52 162h6" stroke="#d5d8de" stroke-width="1.2" stroke-linecap="round"/>' +
    '</svg>';

  var mac = '' +
    '<svg viewBox="0 0 154 190" aria-hidden="true">' +
      '<rect x="10" y="8" width="128" height="164" rx="8" fill="url(#macBeige)"/>' +
      '<rect x="128" y="16" width="10" height="148" rx="3" fill="#c9b79c"/>' +
      '<rect x="14" y="10" width="70" height="22" rx="6" fill="url(#sheen)" opacity="0.8"/>' +
      '<rect x="10" y="8" width="128" height="164" rx="8" fill="url(#grain)" opacity="0.25"/>' +
      '<rect x="20" y="16" width="114" height="84" rx="4" fill="#1a1a1a"/>' +
      '<rect x="22" y="18" width="110" height="80" rx="3" fill="#0c0c0c"/>' +
      lip(macScreen, 2, '#000', 3) +
      '<rect x="36" y="112" width="82" height="5" rx="1" fill="#2a261f"/>' +
      '<rect x="36" y="116" width="82" height="1.4" fill="#f4ecdf" opacity="0.85"/>' +
      '<rect x="48" y="128" width="58" height="18" rx="2" fill="#d9cbb6"/>' +
      '<rect x="50" y="130" width="54" height="14" rx="1" fill="#cbbda6"/>' +
      '<path d="M58 137h38" stroke="#b7a890" stroke-width="1"/>' +
      '<rect x="28" y="174" width="24" height="6" rx="2" fill="#b7a88f"/>' +
      '<rect x="102" y="174" width="24" height="6" rx="2" fill="#b7a88f"/>' +
    '</svg>';

  var crt = '' +
    '<svg viewBox="0 0 200 172" aria-hidden="true">' +
      '<rect x="8" y="6" width="176" height="128" rx="16" fill="url(#crtBeige)"/>' +
      '<path d="M168 18h14a6 6 0 0 1 6 6v96a6 6 0 0 1-6 6h-14z" fill="#c9b48e"/>' +
      '<rect x="14" y="8" width="80" height="24" rx="10" fill="url(#sheen)" opacity="0.75"/>' +
      '<rect x="8" y="6" width="176" height="128" rx="16" fill="url(#grain)" opacity="0.22"/>' +
      '<g stroke="#b7a484" stroke-width="1.4" stroke-linecap="round">' +
        '<path d="M24 16h8M36 16h8M48 16h8"/>' +
      '</g>' +
      '<rect x="20" y="14" width="156" height="112" rx="12" fill="#3a342c"/>' +
      lip(crtScreen, 4, '#1a1816', 12) +
      '<circle cx="160" cy="118" r="3" fill="#2a2622"/>' +
      '<circle cx="160" cy="118" r="1.4" fill="#d4554a"/>' +
      '<path d="M78 134h44l10 16H68z" fill="#cbb892"/>' +
      '<ellipse cx="100" cy="154" rx="40" ry="9" fill="url(#crtBeige)"/>' +
      '<ellipse cx="100" cy="152" rx="28" ry="4" fill="#fff" opacity="0.25"/>' +
    '</svg>';

  var imac = '' +
    '<svg viewBox="0 0 178 190" aria-hidden="true">' +
      '<rect x="16" y="8" width="146" height="132" rx="36" fill="url(#bondi)"/>' +
      '<ellipse cx="58" cy="70" rx="36" ry="48" fill="#fff" opacity="0.1"/>' +
      '<rect x="22" y="12" width="90" height="28" rx="14" fill="url(#sheen)" opacity="0.55"/>' +
      '<rect x="16" y="8" width="146" height="132" rx="36" fill="url(#grain)" opacity="0.18"/>' +
      '<rect x="58" y="16" width="62" height="8" rx="4" fill="#0e5968"/>' +
      '<rect x="60" y="17.4" width="58" height="2.6" rx="1.3" fill="#c6eef4" opacity="0.55"/>' +
      '<rect x="30" y="32" width="118" height="92" rx="8" fill="#16323a"/>' +
      lip(imacScreen, 3, '#0c1c22', 6) +
      '<rect x="30" y="122" width="118" height="28" rx="12" fill="url(#bondiChin)"/>' +
      '<rect x="58" y="132" width="62" height="3" rx="1.5" fill="#6ea8b4"/>' +
      '<rect x="60" y="134.2" width="58" height="1" fill="#fff" opacity="0.55"/>' +
      '<path d="M70 150h38l8 16H62z" fill="url(#imacStand)"/>' +
      '<ellipse cx="89" cy="170" rx="34" ry="10" fill="url(#imacStand)"/>' +
      '<ellipse cx="89" cy="167" rx="20" ry="3.5" fill="#fff" opacity="0.55"/>' +
    '</svg>';

  var term = '' +
    '<svg viewBox="0 0 200 162" aria-hidden="true">' +
      '<rect x="6" y="6" width="188" height="108" rx="8" fill="url(#termBody)"/>' +
      '<rect x="10" y="8" width="90" height="16" rx="6" fill="url(#sheen)" opacity="0.35"/>' +
      '<rect x="6" y="6" width="188" height="108" rx="8" fill="url(#grain)" opacity="0.2"/>' +
      '<rect x="12" y="12" width="176" height="92" rx="5" fill="#0c120e"/>' +
      lip(termScreen, 3, '#06110c', 6) +
      '<circle cx="182" cy="18" r="2" fill="#9cff7a"/>' +
      '<circle cx="182" cy="18" r="3.2" fill="#9cff7a" opacity="0.35"/>' +
      '<path d="M18 114h164l10 10H8z" fill="#222822"/>' +
      '<rect x="4" y="122" width="192" height="34" rx="4" fill="url(#termBody)"/>' +
      keys({ x: 12, y: 128, cols: 13, rows: 2, w: 11, h: 7, gx: 2.2, gy: 3, rx: 1.2, fill: 'url(#termKey)', shine: 0.16 }) +
    '</svg>';

  var laptop = '' +
    '<svg viewBox="0 0 210 150" aria-hidden="true">' +
      '<path d="M14 8h182a6 6 0 0 1 6 6v78H8V14a6 6 0 0 1 6-6z" fill="url(#pbLid)"/>' +
      '<path d="M18 10h174a4 4 0 0 1 4 4v70H14V14a4 4 0 0 1 4-4z" fill="#1a1d22"/>' +
      '<rect x="20" y="10" width="80" height="14" rx="4" fill="#fff" opacity="0.06"/>' +
      lip(laptopScreen, 2, '#050607', 3) +
      '<rect x="6" y="92" width="198" height="6" rx="1" fill="url(#hinge)"/>' +
      '<path d="M2 100h206l-8 36a6 6 0 0 1-6 4H16a6 6 0 0 1-6-4z" fill="url(#pbBase)"/>' +
      '<path d="M18 102h174v6H18z" fill="#23282e"/>' +
      keys({ x: 22, y: 103, cols: 14, rows: 2, w: 10, h: 4.6, gx: 1.5, gy: 1.6, rx: 1, fill: '#1c2128', shine: 0.22 }) +
      '<rect x="88" y="116" width="34" height="12" rx="3" fill="#1a1e24"/>' +
      '<rect x="90" y="118" width="30" height="7" rx="2" fill="#3a4048"/>' +
      '<rect x="96" y="128" width="18" height="2.6" rx="1" fill="#12151a"/>' +
    '</svg>';

  var introScreen = { x: 32, y: 84, w: 112, h: 100, r: 1 };
  var radioScreen = { x: 24, y: 44, w: 64, h: 58, r: 4 };

  var intro = '' +
    '<svg viewBox="0 0 176 208" aria-hidden="true">' +
      '<rect x="22" y="66" width="132" height="132" rx="3" fill="url(#print)"/>' +
      '<rect x="22" y="66" width="132" height="132" rx="3" fill="url(#grain)" opacity="0.18"/>' +
      '<rect x="34" y="186" width="108" height="2" rx="1" fill="#e4ddd2"/>' +
      '<rect x="12" y="8" width="152" height="74" rx="18" fill="url(#camBody)"/>' +
      '<rect x="12" y="8" width="152" height="30" rx="16" fill="url(#sheen)" opacity="0.55"/>' +
      '<rect x="12" y="8" width="152" height="74" rx="18" fill="url(#grain)" opacity="0.16"/>' +
      '<circle cx="72" cy="46" r="22" fill="#12141a"/>' +
      '<circle cx="72" cy="46" r="16.5" fill="url(#lens)"/>' +
      '<circle cx="72" cy="46" r="7" fill="#0c0e12"/>' +
      '<circle cx="66" cy="40" r="3.2" fill="#fff" opacity="0.4"/>' +
      '<rect x="108" y="20" width="28" height="16" rx="3" fill="#14171c"/>' +
      '<rect x="111" y="23" width="22" height="10" rx="1.5" fill="#31404a"/>' +
      '<rect x="110" y="42" width="24" height="16" rx="2" fill="#f4f0e8"/>' +
      '<rect x="112" y="44" width="20" height="6" rx="1" fill="#fff" opacity="0.7"/>' +
      '<circle cx="146" cy="24" r="7" fill="#c4473c"/>' +
      '<circle cx="144" cy="22" r="2.2" fill="#fff" opacity="0.45"/>' +
      '<rect x="40" y="74" width="96" height="5" rx="1.2" fill="#0e1014"/>' +
    '</svg>';

  var radio = '' +
    '<svg viewBox="0 0 112 196" aria-hidden="true">' +
      '<rect x="52" y="2" width="8" height="20" rx="3" fill="#3a3e28"/>' +
      '<circle cx="56" cy="4" r="5" fill="#2a2e1c"/>' +
      '<rect x="14" y="18" width="84" height="168" rx="18" fill="url(#radioBody)"/>' +
      '<rect x="18" y="22" width="76" height="160" rx="15" fill="url(#radioFace)"/>' +
      '<rect x="18" y="22" width="76" height="36" rx="14" fill="url(#sheen)" opacity="0.35"/>' +
      '<rect x="18" y="22" width="76" height="160" rx="15" fill="url(#grain)" opacity="0.16"/>' +
      '<g stroke="#2e321c" stroke-width="2" stroke-linecap="round">' +
        '<path d="M30 32h36M30 37h36"/>' +
      '</g>' +
      lip(radioScreen, 3, '#14180e', 6) +
      '<circle class="lamp" cx="84" cy="34" r="3.3" fill="#ffb020"/>' +
      '<circle cx="56" cy="132" r="18" fill="#2a2e1c"/>' +
      '<circle cx="56" cy="132" r="15" fill="url(#talk)"/>' +
      '<circle cx="51" cy="126" r="4" fill="#fff" opacity="0.16"/>' +
      '<rect x="46" y="158" width="20" height="8" rx="3" fill="#3e422c"/>' +
      '<rect x="96" y="70" width="5" height="28" rx="1.5" fill="#3e422c"/>' +
    '</svg>';

  window.INTRO_DEVICE = { id: 'intro', face: 'note', screen: introScreen, svg: intro };
  window.ARCHER_DEVICE = { id: 'radio', face: 'fish', screen: radioScreen, svg: radio };
  window.RETRO_DEFS = DEFS;
  window.RETRO_DEVICES = [
    { id: 'candy', face: 'lcd', screen: candyScreen, svg: candy },
    { id: 'flip', face: 'tft', screen: flipScreen, svg: flip },
    { id: 'rotary', face: 'amber', screen: rotaryScreen, svg: rotary },
    { id: 'phone', face: 'gloss', screen: phoneScreen, svg: phone },
    { id: 'game', face: 'matrix', screen: gameScreen, svg: game },
    { id: 'pda', face: 'mono', screen: pdaScreen, svg: pda },
    { id: 'mac', face: 'paper', screen: macScreen, svg: mac },
    { id: 'crt', face: 'tube', screen: crtScreen, svg: crt },
    { id: 'imac', face: 'aqua', screen: imacScreen, svg: imac },
    { id: 'term', face: 'phos', screen: termScreen, svg: term },
    { id: 'laptop', face: 'paper', screen: laptopScreen, svg: laptop }
  ];
})();
