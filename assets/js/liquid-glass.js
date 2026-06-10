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
 * Wallpaper is painted with `background-attachment: fixed`, so the bit of
 * wallpaper shown in the overlay automatically lines up with the bit of
 * wallpaper directly behind the widget. No JS positioning needed.
 *
 * Cross-browser quirks handled:
 *   - Fresh filter ID on every regenerate (Safari caches feImage by ID).
 *   - Map computed at lens dimensions, not the source-graphic ceiling.
 *   - ResizeObserver re-renders the displacement map on size changes.
 *   - `attachment: fixed` falls back gracefully on iOS (paints once).
 *
 * Public API:
 *   applyGlass(el, opts) -> { destroy(), update(opts), regenerate() }
 *
 * Tunable defaults (matching Axel's screenshot of the Aave playground):
 *   borderRadius   24  (CSS px)
 *   scale          0.10
 *   depth          10  (CSS px push at lens edge)
 *   curvature      2.0 (edge-to-center falloff power)
 *   splay          1.0
 *   chroma         0.20 (R/B aberration spread, 0 = no fringe)
 *   blur           0
 *   glow           0.10
 *   edgeHighlight  0.25
 *   specAngle      45
 *   tint           rgba(255,248,240,0.18)
 *   rim            rgba(255,255,255,0.45)
 */

(function (global) {
  'use strict';

  let _idCounter = 0;
  const _registry = new WeakMap();
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
    /* Aave's `scale` attribute is in userSpaceOnUse pixels — equal to the
       max push at the lens edge. We scale our authored `depth` by `scale`
       so the playground UI feels intuitive (depth = px, scale = strength). */
    const baseScale = opts.scale * opts.depth * 10;
    const chroma = Math.max(0, Math.min(1, opts.chroma));
    const scaleR = baseScale * (1 + chroma * 0.4);
    const scaleG = baseScale;
    const scaleB = baseScale * (1 - chroma * 0.4);
    const blur = opts.blur;

    const blurStr = blur > 0
      ? '<feGaussianBlur in="SourceGraphic" stdDeviation="' + blur + '" result="blurred"/>'
      : '<feOffset in="SourceGraphic" dx="0" dy="0" result="blurred"/>';

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
      depth: 10,
      curvature: 2.0,
      splay: 1.0,
      chroma: 0.20,
      blur: 0,
      glow: 0.10,
      edgeHighlight: 0.25,
      specAngle: 45,
      tint: 'rgba(255,248,240,0.20)',
      rim: 'rgba(255,255,255,0.45)',
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

    /* Refraction layer: painted wallpaper, displacement filtered. */
    const refract = document.createElement('div');
    refract.setAttribute('data-glass-layer', 'refract');
    refract.style.cssText = ''
      + 'position:absolute;inset:0;'
      + 'border-radius:inherit;'
      + 'background-image:var(' + WALLPAPER_VAR + ');'
      + 'background-attachment:fixed;'
      + 'background-size:cover;'
      + 'background-position:center;'
      + 'background-repeat:no-repeat;'
      + 'pointer-events:none;'
      + 'z-index:0;'
      + 'overflow:hidden;'
      + 'transform:translateZ(0);'
      + 'will-change:filter;';

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
       the refraction layer carries the wallpaper paint now. */
    const priorBackdrop = el.style.backdropFilter || '';
    const priorWebkitBackdrop = el.style.webkitBackdropFilter || '';
    el.style.backdropFilter = 'none';
    el.style.webkitBackdropFilter = 'none';

    let currentId = null;

    function render() {
      const rect = el.getBoundingClientRect();
      const w = Math.max(8, Math.round(rect.width));
      const h = Math.max(8, Math.round(rect.height));

      const id = 'glass-' + (++_idCounter) + '-' + Date.now().toString(36);
      const mapUrl = buildDisplacementMap(w, h, opts);
      svgHolder.innerHTML = buildFilterSvg(id, mapUrl, opts, w, h);
      refract.style.filter = 'url(#' + id + ')';
      currentId = id;
    }

    render();

    const ro = new ResizeObserver(function () { render(); });
    ro.observe(el);

    /* If the wallpaper variable changes, the refract layer will auto-update
       (CSS variable cascade), but Safari needs a filter ID swap to refresh
       its cached feImage. Listen on document for a custom event. */
    function onWallpaperChange() { render(); }
    document.addEventListener('liquidglass:wallpaper', onWallpaperChange);

    const api = {
      destroy: function () {
        ro.disconnect();
        document.removeEventListener('liquidglass:wallpaper', onWallpaperChange);
        svgHolder.remove();
        refract.remove();
        gloss.remove();
        el.style.backdropFilter = priorBackdrop;
        el.style.webkitBackdropFilter = priorWebkitBackdrop;
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
