/**
 * liquid-glass.js — Aave-style cross-browser refractive glass.
 *
 * Implements the technique described in
 * https://aave.com/design/building-glass-for-the-web
 *
 * Architecture
 * ------------
 * `backdrop-filter: url(#svgFilter)` is Safari-only. For cross-browser
 * support, Aave paints a clipped copy of the page background into an
 * absolutely-positioned overlay inside the glass container, then applies
 * `filter: url(#displacement)` to that overlay. The widget content sits
 * on top, unrefracted.
 *
 * We adapt this for SaberOS:
 *   - The body wallpaper URL is mirrored to `--wallpaper-url` on :root.
 *   - Each glass element gets two ::before-style overlay layers:
 *       refract layer  : painted wallpaper, displacement filtered
 *       gloss layer    : light cream tint + specular gradient + rim border
 *   - Widget content stays in normal flow on top.
 *
 * Wallpaper painting uses a viewport-sized `background-size: 100vw 100vh`
 * with `background-position` re-synced to the host's viewport offset on
 * every render. This emulates `background-attachment: fixed` but works
 * around the iOS Safari bug that silently downgrades `fixed` to `scroll`.
 *
 * Cross-browser quirks handled:
 *   - Fresh filter ID on every regenerate (Safari caches feImage by ID).
 *   - Map computed at lens dimensions, not the source-graphic ceiling.
 *   - ResizeObserver re-renders the displacement map on size changes.
 *   - JS-synced `background-position` instead of `attachment: fixed`
 *     (iOS Safari downgrades `fixed` to `scroll` silently).
 *
 * Public API:
 *   applyGlass(el, opts) -> { destroy(), update(opts), regenerate() }
 *
 * Tunable defaults (matching Axel's screenshot of the Aave playground):
 *   borderRadius   24  (CSS px)
 *   scale          0.10
 *   depth          6   (CSS px push at lens edge)
 *   curvature      2.0 (edge-to-center falloff power)
 *   splay          1.0
 *   chroma         1.0 (R/B aberration spread; 1.0 = Aave's 8%, 0 = none)
 *   preBlur        0.5 ("wet edge" smoothing before displacement)
 *   blur           0   (extra blur for milky-glass variants)
 *   specStrength   1.0 (specular highlight intensity)
 *   glow           0.10
 *   edgeHighlight  0.18 (CSS gloss-layer top highlight)
 *   specAngle      45
 *   tint           rgba(255,248,240,0.14)
 *   rim            rgba(255,255,255,0.40)
 */

(function (global) {
  'use strict';

  let _idCounter = 0;
  const _registry = new WeakMap();
  const _imgCache = new Map();
  const WALLPAPER_VAR = '--wallpaper-url';

  /* ------------------------------------------------------------------ */
  /* Displacement-map generator                                          */
  /* ------------------------------------------------------------------ */

  function buildDisplacementMap(w, h, opts) {
    const r = Math.min(opts.borderRadius, w / 2, h / 2);
    const curvature = Math.max(0.1, opts.curvature);
    const splay = opts.splay;

    /* Half-res for perf — feImage stretches it back up. */
    const mapW = Math.max(2, Math.round(w / 2));
    const mapH = Math.max(2, Math.round(h / 2));
    const sx = mapW / w;
    const sy = mapH / h;

    const canvas = document.createElement('canvas');
    canvas.width = mapW;
    canvas.height = mapH;
    const ctx = canvas.getContext('2d');
    const img = ctx.createImageData(mapW, mapH);
    const data = img.data;

    const halfW = w / 2;
    const halfH = h / 2;

    for (let py = 0; py < mapH; py++) {
      const y = py / sy;
      for (let px = 0; px < mapW; px++) {
        const x = px / sx;
        const i = (py * mapW + px) * 4;

        /* Are we inside the rounded rectangle? */
        let inside = true;
        let radialBendX = 0;
        let radialBendY = 0;
        let isCorner = false;

        if (x < r && y < r) {
          /* top-left corner */
          isCorner = true;
          const dx = r - x;
          const dy = r - y;
          const d = Math.hypot(dx, dy);
          if (d > r) {
            inside = false;
          } else {
            const t = d / r; /* 0 at corner-arc center, 1 at lens edge */
            const fall = Math.pow(t, curvature);
            const len = Math.max(d, 0.0001);
            radialBendX = (dx / len) * fall * splay;
            radialBendY = (dy / len) * fall * splay;
          }
        } else if (x > w - r && y < r) {
          isCorner = true;
          const dx = x - (w - r);
          const dy = r - y;
          const d = Math.hypot(dx, dy);
          if (d > r) {
            inside = false;
          } else {
            const t = d / r;
            const fall = Math.pow(t, curvature);
            const len = Math.max(d, 0.0001);
            radialBendX = -(dx / len) * fall * splay;
            radialBendY = (dy / len) * fall * splay;
          }
        } else if (x < r && y > h - r) {
          isCorner = true;
          const dx = r - x;
          const dy = y - (h - r);
          const d = Math.hypot(dx, dy);
          if (d > r) {
            inside = false;
          } else {
            const t = d / r;
            const fall = Math.pow(t, curvature);
            const len = Math.max(d, 0.0001);
            radialBendX = (dx / len) * fall * splay;
            radialBendY = -(dy / len) * fall * splay;
          }
        } else if (x > w - r && y > h - r) {
          isCorner = true;
          const dx = x - (w - r);
          const dy = y - (h - r);
          const d = Math.hypot(dx, dy);
          if (d > r) {
            inside = false;
          } else {
            const t = d / r;
            const fall = Math.pow(t, curvature);
            const len = Math.max(d, 0.0001);
            radialBendX = -(dx / len) * fall * splay;
            radialBendY = -(dy / len) * fall * splay;
          }
        }

        if (!inside) {
          data[i] = 128;
          data[i + 1] = 128;
          data[i + 2] = 128;
          data[i + 3] = 255;
          continue;
        }

        let bendX, bendY;
        if (isCorner) {
          bendX = radialBendX;
          bendY = radialBendY;
        } else {
          /* Straight-edge region: bend driven by distance to nearest edge. */
          const dl = x, dr = w - x;
          const dt = y, db = h - y;
          const distVert = Math.min(dl, dr);
          const distHoriz = Math.min(dt, db);

          /* 0 at edge, 1 at lens center. */
          const tx = Math.min(1, distVert / halfW);
          const ty = Math.min(1, distHoriz / halfH);

          /* Edge has max bend, center has none. */
          const fallX = Math.pow(1 - tx, curvature);
          const fallY = Math.pow(1 - ty, curvature);

          const signX = (x < halfW) ? 1 : -1;
          const signY = (y < halfH) ? 1 : -1;

          /* When near a horizontal edge, vertical bend should dominate. */
          if (distHoriz < distVert) {
            bendX = 0;
            bendY = signY * fallY * splay;
          } else if (distVert < distHoriz) {
            bendX = signX * fallX * splay;
            bendY = 0;
          } else {
            bendX = signX * fallX * splay * 0.7;
            bendY = signY * fallY * splay * 0.7;
          }
        }

        const r8 = Math.max(0, Math.min(255, Math.round(128 - bendX * 127)));
        const g8 = Math.max(0, Math.min(255, Math.round(128 - bendY * 127)));

        data[i] = r8;
        data[i + 1] = g8;
        data[i + 2] = 128;
        data[i + 3] = 255;
      }
    }

    ctx.putImageData(img, 0, 0);
    return canvas.toDataURL('image/png');
  }

  /* ------------------------------------------------------------------ */
  /* SVG filter builder                                                  */
  /* ------------------------------------------------------------------ */

  function buildFilterSvg(id, mapDataUrl, opts, w, h) {
    /* Aave's `scale` attribute is in userSpaceOnUse pixels. We expose two
       tunables: `depth` (max edge displacement in px) and `chroma`
       (R/B aberration spread). Per Aave: R=1.04x, G=1.0x, B=0.926x of the
       base scale gives the natural-looking ~3.7% per-channel split. */
    const baseScale = opts.scale * opts.depth * 10;
    const chroma = Math.max(0, Math.min(1.5, opts.chroma));
    /* chroma=1.0 = Aave's ratio (8% R/B spread). 0 = no fringe. >1 = exaggerated. */
    const spread = 0.074 * chroma;
    const scaleR = baseScale * (1 + spread);
    const scaleG = baseScale;
    const scaleB = baseScale * (1 - spread);

    /* Pre-blur: "wet edge" smoothing before displacement (Aave default).
       Their 0.00065 0.00136 in objectBoundingBox units becomes ~0.5px on a
       widget-scale lens. opts.blur controls extra blur on top. */
    const preBlur = Math.max(0, opts.preBlur);
    const extraBlur = Math.max(0, opts.blur);
    const totalBlur = preBlur + extraBlur;
    const blurStr = totalBlur > 0
      ? '<feGaussianBlur in="SourceGraphic" stdDeviation="' + totalBlur + '" result="blurred"/>'
      : '<feOffset in="SourceGraphic" dx="0" dy="0" result="blurred"/>';

    /* Specular highlight: extract B channel of displacement map, threshold
       it to surface the brightest band (Aave step 12). The highlight traces
       the lens-bend region itself, not a CSS gradient. */
    const specBias = -0.5019607843137255;
    const specStrength = Math.max(0, Math.min(1, opts.specStrength));

    return ''
      + '<svg width="0" height="0" style="position:absolute;width:0;height:0;pointer-events:none;overflow:hidden;" aria-hidden="true">'
      +   '<filter id="' + id + '" x="0" y="0" width="100%" height="100%" '
      +     'color-interpolation-filters="sRGB" '
      +     'filterUnits="objectBoundingBox" '
      +     'primitiveUnits="userSpaceOnUse">'
      +     '<feFlood flood-color="rgb(128,128,128)" flood-opacity="1" result="mapBg"/>'
      +     '<feImage href="' + mapDataUrl + '" preserveAspectRatio="none" '
      +       'result="rawMap" x="0" y="0" width="' + w + '" height="' + h + '"/>'
      +     '<feComposite in="rawMap" in2="mapBg" operator="over" result="map"/>'
      +     blurStr
      +     '<feDisplacementMap in="blurred" in2="map" scale="' + scaleR
      +       '" xChannelSelector="R" yChannelSelector="G" result="dispRall"/>'
      +     '<feColorMatrix in="dispRall" type="matrix" '
      +       'values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="dispR"/>'
      +     '<feDisplacementMap in="blurred" in2="map" scale="' + scaleG
      +       '" xChannelSelector="R" yChannelSelector="G" result="dispGall"/>'
      +     '<feColorMatrix in="dispGall" type="matrix" '
      +       'values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="dispG"/>'
      +     '<feDisplacementMap in="blurred" in2="map" scale="' + scaleB
      +       '" xChannelSelector="R" yChannelSelector="G" result="dispBall"/>'
      +     '<feColorMatrix in="dispBall" type="matrix" '
      +       'values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="dispB"/>'
      +     '<feComposite in="dispR" in2="dispG" operator="arithmetic" '
      +       'k1="0" k2="1" k3="1" k4="0" result="dispRG"/>'
      +     '<feComposite in="dispRG" in2="dispB" operator="arithmetic" '
      +       'k1="0" k2="1" k3="1" k4="0" result="lensRefract"/>'
      +     '<feColorMatrix in="map" type="matrix" '
      +       'values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 ' + specStrength
      +       ' 0 ' + specBias + '" result="specMask"/>'
      +     '<feComposite in="specMask" in2="lensRefract" operator="arithmetic" '
      +       'k1="0" k2="1" k3="1" k4="0" result="lensResult"/>'
      +   '</filter>'
      + '</svg>';
  }

  /* ------------------------------------------------------------------ */
  /* Per-element wiring                                                   */
  /* ------------------------------------------------------------------ */

  function ensureRootWallpaperVar() {
    /* If the page already exposes --wallpaper-url, do nothing. Otherwise
       extract it from body's computed background-image and mirror it. */
    const root = document.documentElement;
    if (root.style.getPropertyValue(WALLPAPER_VAR)) return;
    const computed = getComputedStyle(document.body).backgroundImage;
    if (computed && computed !== 'none') {
      root.style.setProperty(WALLPAPER_VAR, computed);
    }
  }

  /**
   * Hook the existing `applyWallpaper(idx)` global to keep
   * `--wallpaper-url` in sync. Idempotent.
   */
  function bindToWallpaperApp() {
    if (global._liquidGlassBound) return;
    if (typeof global.applyWallpaper !== 'function') return;
    const original = global.applyWallpaper;
    global.applyWallpaper = function (idx) {
      const result = original.apply(this, arguments);
      try {
        const wp = global.wallpaperList && global.wallpaperList[idx];
        if (wp && wp.url) {
          document.documentElement.style.setProperty(
            WALLPAPER_VAR, 'url("' + wp.url + '")'
          );
        } else if (wp && wp.gradient) {
          document.documentElement.style.setProperty(
            WALLPAPER_VAR, wp.gradient
          );
        }
      } catch (e) {
        /* non-fatal */
      }
      return result;
    };
    global._liquidGlassBound = true;
  }

  function applyGlass(el, userOpts) {
    if (!el || el.nodeType !== 1) {
      throw new Error('applyGlass: first argument must be an HTMLElement');
    }
    const prior = _registry.get(el);
    if (prior) prior.destroy();

    const opts = Object.assign({
      borderRadius: 24,
      scale: 0.10,
      depth: 6,
      curvature: 2.0,
      splay: 1.0,
      chroma: 1.0,           /* Aave default ratio = 1.0 (~8% R/B spread) */
      preBlur: 0.5,          /* Aave "wet edge" pre-displacement smoothing */
      blur: 0,               /* Extra blur (for milky-glass variants) */
      specStrength: 1.0,     /* Specular highlight intensity */
      glow: 0.10,
      edgeHighlight: 0.18,   /* CSS top-edge highlight on gloss layer */
      specAngle: 45,
      tint: 'rgba(255,248,240,0.14)',
      rim: 'rgba(255,255,255,0.40)',
      shadow: '0 6px 24px rgba(45,27,0,0.10)',
    }, userOpts || {});

    ensureRootWallpaperVar();
    bindToWallpaperApp();

    /* Make sure the host element can host absolute children. */
    const cs = getComputedStyle(el);
    if (cs.position === 'static') el.style.position = 'relative';
    el.classList.add('liquid-glass-host');

    /* SVG <filter> lives in a body-attached holder. */
    const svgHolder = document.createElement('div');
    svgHolder.setAttribute('data-glass-svg-holder', '');
    svgHolder.style.cssText =
      'position:absolute;width:0;height:0;overflow:hidden;pointer-events:none;';
    document.body.appendChild(svgHolder);

    /* Refraction layer: painted wallpaper, displacement filtered.
       Wallpaper is sized to the viewport and re-positioned on every
       render so it lines up with the bit of wallpaper directly behind
       the host (emulates `background-attachment: fixed` without the
       iOS Safari bug). */
    const refract = document.createElement('div');
    refract.setAttribute('data-glass-layer', 'refract');
    refract.style.cssText = ''
      + 'position:absolute;inset:0;'
      + 'border-radius:inherit;'
      + 'background-image:var(' + WALLPAPER_VAR + ');'
      + 'background-size:100vw 100vh;'
      + 'background-repeat:no-repeat;'
      + 'background-position:0 0;'
      + 'pointer-events:none;'
      + 'z-index:0;'
      + 'overflow:hidden;'
      + 'transform:translateZ(0);'
      + 'will-change:filter,background-position;';

    /* Gloss layer: light cream tint + top specular highlight + rim border. */
    const gloss = document.createElement('div');
    gloss.setAttribute('data-glass-layer', 'gloss');
    const highlightAlpha = opts.edgeHighlight;
    const glowAlpha = opts.glow;
    gloss.style.cssText = ''
      + 'position:absolute;inset:0;'
      + 'border-radius:inherit;'
      + 'pointer-events:none;'
      + 'z-index:1;'
      + 'background:'
      +   'linear-gradient(180deg, rgba(255,255,255,' + highlightAlpha
      +     ') 0%, rgba(255,255,255,0) 35%, rgba(255,255,255,0) 65%, '
      +     'rgba(255,255,255,' + (highlightAlpha * 0.3) + ') 100%),'
      +   opts.tint + ';'
      + 'box-shadow:'
      +   'inset 0 0.5px 0 0 ' + opts.rim + ','
      +   'inset 0 -0.5px 0 0 rgba(0,0,0,0.08),'
      +   'inset 0.5px 0 0 0 rgba(255,255,255,' + (highlightAlpha * 0.6) + '),'
      +   'inset -0.5px 0 0 0 rgba(0,0,0,0.05),'
      +   opts.shadow + ';'
      + 'mix-blend-mode:normal;';

    /* Inject before existing children so the original content sits on top. */
    if (el.firstChild) {
      el.insertBefore(gloss, el.firstChild);
      el.insertBefore(refract, gloss);
    } else {
      el.appendChild(refract);
      el.appendChild(gloss);
    }

    /* Make sure non-layer children sit above z-index 1. */
    Array.prototype.forEach.call(el.children, function (child) {
      if (child === refract || child === gloss) return;
      const css = getComputedStyle(child);
      if (css.position === 'static') child.style.position = 'relative';
      if (!child.style.zIndex || parseInt(child.style.zIndex, 10) < 2) {
        child.style.zIndex = '2';
      }
    });

    /* Optional: remove the original backdrop-filter blur on the host —
       the refraction layer carries the wallpaper paint now. Also stash
       and clear any opaque/translucent host background that would occlude
       the refract layer. */
    const priorBackdrop = el.style.backdropFilter || '';
    const priorWebkitBackdrop = el.style.webkitBackdropFilter || '';
    const priorBackground = el.style.background || '';
    const priorBackgroundColor = el.style.backgroundColor || '';
    const priorBorder = el.style.border || '';
    el.style.backdropFilter = 'none';
    el.style.webkitBackdropFilter = 'none';
    el.style.background = 'transparent';
    el.style.backgroundColor = 'transparent';
    /* The gloss layer carries the rim; suppress any host border. */
    if (cs.borderStyle && cs.borderStyle !== 'none' && cs.borderWidth !== '0px') {
      el.style.border = 'none';
    }

    let currentId = null;

    /* Match the body's actual background sizing/positioning so the paint
       in the refract layer aligns with the wallpaper behind it. saberzou.ai
       uses `center/cover`; if a host page differs, override via the data-attr. */
    function syncWallpaperPaint() {
      const rect = el.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      /* Reproduce `background-size: cover; background-position: center;`
         on a viewport-sized canvas, then translate so the slice under
         the host's bbox is visible. */
      const wpEl = document.body;
      const bgImg = new Image();
      /* We need the natural wallpaper aspect to compute `cover`. Try the
         CSS variable URL; fall back to body's computed background-image. */
      let url = getComputedStyle(document.documentElement).getPropertyValue(WALLPAPER_VAR).trim();
      if (!url || url === '') {
        url = getComputedStyle(wpEl).backgroundImage;
      }
      const match = url.match(/url\(\s*["']?([^"')]+)["']?\s*\)/);
      if (!match) {
        /* Gradient or unknown — use cover/center on viewport size. */
        refract.style.backgroundSize = vw + 'px ' + vh + 'px';
        refract.style.backgroundPosition = (-rect.left) + 'px ' + (-rect.top) + 'px';
        return;
      }
      const src = match[1];
      if (!_imgCache.has(src)) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = function () {
          _imgCache.set(src, { w: img.naturalWidth, h: img.naturalHeight });
          syncWallpaperPaint();
        };
        img.src = src;
        /* Until loaded, fall back to a safe cover sizing. */
        refract.style.backgroundSize = vw + 'px ' + vh + 'px';
        refract.style.backgroundPosition = (-rect.left) + 'px ' + (-rect.top) + 'px';
        return;
      }
      const dim = _imgCache.get(src);
      /* Compute the `cover` size for this viewport. */
      const scale = Math.max(vw / dim.w, vh / dim.h);
      const drawW = dim.w * scale;
      const drawH = dim.h * scale;
      /* Cover + center: image placed at (vw-drawW)/2, (vh-drawH)/2 on viewport. */
      const offX = (vw - drawW) / 2;
      const offY = (vh - drawH) / 2;
      /* In the refract div, translate so that pixel (rect.left, rect.top) of
         the viewport ends up at (0, 0) of the div. */
      refract.style.backgroundSize = drawW + 'px ' + drawH + 'px';
      refract.style.backgroundPosition = (offX - rect.left) + 'px ' + (offY - rect.top) + 'px';
    }

    function render() {
      const rect = el.getBoundingClientRect();
      const w = Math.max(8, Math.round(rect.width));
      const h = Math.max(8, Math.round(rect.height));

      const id = 'glass-' + (++_idCounter) + '-' + Date.now().toString(36);
      const mapUrl = buildDisplacementMap(w, h, opts);
      svgHolder.innerHTML = buildFilterSvg(id, mapUrl, opts, w, h);
      refract.style.filter = 'url(#' + id + ')';
      currentId = id;
      syncWallpaperPaint();
    }

    render();

    const ro = new ResizeObserver(function () { render(); });
    ro.observe(el);

    /* Window scroll/resize: re-sync background-position so the painted
       wallpaper slice stays aligned. saberzou.ai has no scroll, but this
       makes the rig portable to scrolling pages. Throttled via rAF. */
    let rafPending = false;
    function onViewportChange() {
      if (rafPending) return;
      rafPending = true;
      requestAnimationFrame(function () {
        rafPending = false;
        syncWallpaperPaint();
      });
    }
    window.addEventListener('scroll', onViewportChange, { passive: true });
    window.addEventListener('resize', onViewportChange, { passive: true });

    /* If the wallpaper variable changes, the refract layer will auto-update
       (CSS variable cascade), but Safari needs a filter ID swap to refresh
       its cached feImage. Listen on document for a custom event. */
    function onWallpaperChange() { render(); }
    document.addEventListener('liquidglass:wallpaper', onWallpaperChange);

    const api = {
      destroy: function () {
        ro.disconnect();
        document.removeEventListener('liquidglass:wallpaper', onWallpaperChange);
        window.removeEventListener('scroll', onViewportChange);
        window.removeEventListener('resize', onViewportChange);
        svgHolder.remove();
        refract.remove();
        gloss.remove();
        el.style.backdropFilter = priorBackdrop;
        el.style.webkitBackdropFilter = priorWebkitBackdrop;
        el.style.background = priorBackground;
        el.style.backgroundColor = priorBackgroundColor;
        el.style.border = priorBorder;
        el.classList.remove('liquid-glass-host');
        _registry.delete(el);
      },
      regenerate: render,
      update: function (newOpts) {
        Object.assign(opts, newOpts || {});
        /* Rebuild gloss styles in case tint/rim/shadow changed. */
        const ha = opts.edgeHighlight;
        gloss.style.background = ''
          + 'linear-gradient(180deg, rgba(255,255,255,' + ha
          +   ') 0%, rgba(255,255,255,0) 35%, rgba(255,255,255,0) 65%, '
          +   'rgba(255,255,255,' + (ha * 0.3) + ') 100%),'
          + opts.tint;
        gloss.style.boxShadow = ''
          + 'inset 0 0.5px 0 0 ' + opts.rim + ','
          + 'inset 0 -0.5px 0 0 rgba(0,0,0,0.08),'
          + 'inset 0.5px 0 0 0 rgba(255,255,255,' + (ha * 0.6) + '),'
          + 'inset -0.5px 0 0 0 rgba(0,0,0,0.05),'
          + opts.shadow;
        render();
      },
    };
    _registry.set(el, api);
    return api;
  }

  global.LiquidGlass = {
    applyGlass: applyGlass,
    ensureRootWallpaperVar: ensureRootWallpaperVar,
    notifyWallpaperChanged: function () {
      document.dispatchEvent(new CustomEvent('liquidglass:wallpaper'));
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);
