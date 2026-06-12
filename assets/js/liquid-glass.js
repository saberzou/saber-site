/**
 * liquid-glass.js v3 — refractive liquid glass, after Aave's
 * "Building Glass for the Web" (https://aave.com/design/building-glass-for-the-web)
 *
 * Aave's recipe, which this file follows:
 *   - Generate a displacement map PNG on the fly from the glass's shape
 *     and size. R encodes horizontal bend, G vertical bend; everything
 *     outside the lens region stays neutral so only pixels under the
 *     glass move.
 *   - Feed the map to an SVG feDisplacementMap filter over the page
 *     background, run once per RGB channel at staggered scales
 *     (R 1.04x / G 1.0x / B 0.926x) for the chromatic fringe.
 *   - A light pre-displacement blur ("wet edge") smooths the bend.
 *   - The specular highlight is extracted from the map's B channel by
 *     threshold, so the glint hugs the lens geometry itself.
 *   - Safari caches SVG filter output by ID — mint a fresh filter ID on
 *     every regenerate.
 *
 * Where we diverge: Aave filters a *painted copy* of the page background
 * inside the glass (their background is a controlled hero graphic, so a
 * copy is easy to align). SaberOS is a desktop: windows and icons drift
 * behind the glass and the wallpaper is user-switchable, so a painted
 * copy can only ever approximate the backdrop. We therefore pick the
 * richest mode the browser supports:
 *
 *   backdrop — Chromium. `backdrop-filter: url(#filter)` hands the SVG
 *              pipeline the live backdrop: wallpaper, windows, icons,
 *              all refracted, pixel-aligned for free.
 *   painted  — Safari/Firefox (no url() in backdrop-filter). Aave's
 *              architecture: a wallpaper copy painted into the glass
 *              with `filter: url(#filter)`. The copy is painted with a
 *              bleed margin inside a clipping layer so rim displacement
 *              never samples transparent pixels (the v1 edge-smear bug),
 *              and is re-aligned to the viewport cover/center wallpaper
 *              on scroll/resize. Only the wallpaper refracts; windows
 *              passing behind the glass are covered by the copy.
 *   frost    — anything else: backdrop-filter blur+saturate.
 *
 * All modes share the same CSS gloss (tint + sheen) and masked gradient
 * rim ring. Debug override: append ?glassmode=backdrop|painted|frost.
 *
 * Public API:
 *   applyGlass(el, opts) -> { destroy(), update(opts), regenerate() }
 *   ensureRootWallpaperVar()   — seed --wallpaper-url from the body
 *   notifyWallpaperChanged()   — re-render painted-mode lenses
 *
 * Tunables:
 *   borderRadius   24    CSS px, should match the element's radius
 *   bezelWidth     16    px width of the refractive edge band
 *   refraction     22    max px the rim bends the backdrop
 *   curvature      1.5   bezel falloff shaping (higher = tighter rim)
 *   chroma         1.0   chromatic aberration spread (1 = Aave's ratios)
 *   preBlur        0.5   Aave "wet edge" smoothing before displacement
 *   blur           12    frosted body blur, px
 *   saturate       1.5   backdrop saturation boost
 *   specStrength   0.9   white rim-glint intensity (0 = off)
 *   edgeHighlight  0.20  CSS sheen/inset highlight alpha
 *   tint           rgba()  glass body tint
 *   rim            rgba()  brightest color of the rim ring
 *   shadow         outer drop shadow
 */

(function (global) {
  'use strict';

  let _idCounter = 0;
  const _registry = new WeakMap();
  const _imgCache = new Map();
  const WALLPAPER_VAR = '--wallpaper-url';

  /* ------------------------------------------------------------------ */
  /* Mode detection                                                      */
  /* ------------------------------------------------------------------ */

  const MODE = (function () {
    try {
      const qs = (global.location && global.location.search) || '';
      const forced = /[?&]glassmode=(backdrop|painted|frost)/.exec(qs);
      if (forced) return forced[1];
    } catch (e) { /* non-fatal */ }
    try {
      if (typeof CSS === 'undefined' || !CSS.supports) return 'frost';
      const ua = navigator.userAgent;
      const isChromium = /Chrom(e|ium)|Edg\/|OPR\//.test(ua);
      /* `backdrop-filter: url()` renders correctly only in Chromium.
         Safari and Firefox parse it (CSS.supports lies) but draw nothing
         or an unfiltered backdrop. */
      const parses = CSS.supports('backdrop-filter', 'url(#lg)') ||
                     CSS.supports('-webkit-backdrop-filter', 'url(#lg)');
      if (isChromium && parses) return 'backdrop';
      /* Aave's painted-copy path needs `filter: url()` + feDisplacementMap
         + feImage, present in every modern engine. */
      if (typeof SVGFEDisplacementMapElement !== 'undefined' &&
          typeof SVGFEImageElement !== 'undefined' &&
          CSS.supports('filter', 'url(#lg)')) return 'painted';
    } catch (e) { /* fall through */ }
    return 'frost';
  })();

  /* ------------------------------------------------------------------ */
  /* Displacement-map generator                                          */
  /* ------------------------------------------------------------------ */

  /**
   * Map for a W×H input layer whose lens (rounded rect) is inset by
   * `inset` px on every side. R/G encode the outward surface normal
   * scaled by a smooth bezel falloff; B encodes bend strength times
   * incidence toward a top-left light (specular potential). Outside the
   * lens the map is neutral — per Aave, only pixels under the glass move,
   * which is what lets the painted mode bleed safely.
   */
  function buildDisplacementMap(W, H, opts, inset) {
    const w = W - 2 * inset, h = H - 2 * inset;
    const radius = Math.max(1, Math.min(opts.borderRadius, w / 2, h / 2));
    const minDim = Math.min(w, h);
    /* Keep an optically-flat center even on short elements. */
    const bezel = Math.max(2, Math.min(opts.bezelWidth, minDim / 3));
    const curvature = Math.max(0.2, opts.curvature);

    /* Light direction for the specular band (from top, slightly left). */
    const lightX = -0.35, lightY = -0.94;

    /* Half-res for perf — feImage stretches it back up, and the map is
       smooth so the upscale is invisible. */
    const mapW = Math.max(2, Math.round(W / 2));
    const mapH = Math.max(2, Math.round(H / 2));
    const sx = mapW / W;
    const sy = mapH / H;

    const canvas = document.createElement('canvas');
    canvas.width = mapW;
    canvas.height = mapH;
    const ctx = canvas.getContext('2d');
    const img = ctx.createImageData(mapW, mapH);
    const data = img.data;

    const cx = W / 2, cy = H / 2;
    const coreX = w / 2 - radius, coreY = h / 2 - radius;

    for (let py = 0; py < mapH; py++) {
      const y = (py + 0.5) / sy;
      for (let px = 0; px < mapW; px++) {
        const x = (px + 0.5) / sx;
        const i = (py * mapW + px) * 4;

        /* Signed distance to the lens border (negative inside). */
        const qx = Math.abs(x - cx) - coreX;
        const qy = Math.abs(y - cy) - coreY;
        const ax = Math.max(qx, 0), ay = Math.max(qy, 0);
        const outer = Math.hypot(ax, ay);
        const dist = outer + Math.min(Math.max(qx, qy), 0) - radius;

        let r8 = 128, g8 = 128, b8 = 0;

        const edgeDist = -dist;
        if (dist < 0 && edgeDist < bezel) {
          /* Inside the refractive bezel band. */
          const t = edgeDist / bezel;                  /* 0 rim → 1 inner */
          const sm = 0.5 + 0.5 * Math.cos(Math.PI * t); /* C1-smooth 1→0 */
          const m = Math.pow(sm, curvature);

          /* Outward normal = gradient of the SDF. */
          let nx, ny;
          if (qx > 0 && qy > 0) {
            const len = outer || 1;
            nx = ((x < cx ? -1 : 1) * ax) / len;
            ny = ((y < cy ? -1 : 1) * ay) / len;
          } else if (qx > qy) {
            nx = x < cx ? -1 : 1;
            ny = 0;
          } else {
            nx = 0;
            ny = y < cy ? -1 : 1;
          }

          /* R/G: bend sampling outward — the rim shows a compressed band
             of what lies just beyond the glass, like a thick lens edge. */
          r8 = Math.round(128 + nx * m * 127);
          g8 = Math.round(128 + ny * m * 127);

          /* B: specular potential. */
          const lambert = Math.max(0, nx * lightX + ny * lightY);
          b8 = Math.round(255 * m * (0.2 + 0.8 * lambert));
        }

        data[i] = Math.max(0, Math.min(255, r8));
        data[i + 1] = Math.max(0, Math.min(255, g8));
        data[i + 2] = Math.max(0, Math.min(255, b8));
        data[i + 3] = 255;
      }
    }

    ctx.putImageData(img, 0, 0);
    return canvas.toDataURL('image/png');
  }

  /* ------------------------------------------------------------------ */
  /* SVG filter builder                                                  */
  /* ------------------------------------------------------------------ */

  function buildFilterSvg(id, mapDataUrl, opts, W, H) {
    /* The map encodes the outward normal at half amplitude (127/255), so
       feDisplacementMap shifts by ~scale/2 at the rim. Double `refraction`
       to make the option mean "max bend in px". */
    const scaleBase = 2 * Math.max(0, opts.refraction);
    const chroma = Math.max(0, Math.min(2, opts.chroma));
    /* Aave's production ratios: R 1.04x, G 1.0x, B 0.926x at chroma 1. */
    const scaleR = scaleBase * (1 + 0.040 * chroma);
    const scaleG = scaleBase;
    const scaleB = scaleBase * (1 - 0.074 * chroma);

    /* Wet-edge smoothing + frosted body blur, both before displacement. */
    const blur = Math.max(0, opts.preBlur) + Math.max(0, opts.blur);
    const sat = Math.max(0, opts.saturate);
    const ss = Math.max(0, Math.min(1.5, opts.specStrength));

    const blurStr = blur > 0
      ? '<feGaussianBlur in="SourceGraphic" stdDeviation="' + blur + '" result="frosted"/>'
      : '<feOffset in="SourceGraphic" dx="0" dy="0" result="frosted"/>';

    /* Expand the filter region so rim sampling beyond the border box has
       real backdrop pixels to pull from (kills the edge smear). */
    let f = ''
      + '<svg width="0" height="0" style="position:absolute;width:0;height:0;pointer-events:none;overflow:hidden;" aria-hidden="true">'
      +   '<filter id="' + id + '" x="-25%" y="-25%" width="150%" height="150%" '
      +     'color-interpolation-filters="sRGB" '
      +     'filterUnits="objectBoundingBox" '
      +     'primitiveUnits="userSpaceOnUse">'
      /* Neutral backing so anything outside the feImage is "no bend, no
         spec" (B=0) instead of transparent. */
      +     '<feFlood flood-color="rgb(128,128,0)" flood-opacity="1" result="mapBg"/>'
      +     '<feImage href="' + mapDataUrl + '" preserveAspectRatio="none" '
      +       'result="rawMap" x="0" y="0" width="' + W + '" height="' + H + '"/>'
      +     '<feComposite in="rawMap" in2="mapBg" operator="over" result="map"/>'
      +     blurStr;

    if (chroma > 0.001) {
      /* Per-channel displacement at staggered scales = chromatic fringe. */
      f += ''
        + '<feDisplacementMap in="frosted" in2="map" scale="' + scaleR
        +   '" xChannelSelector="R" yChannelSelector="G" result="dispRall"/>'
        + '<feColorMatrix in="dispRall" type="matrix" '
        +   'values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="dispR"/>'
        + '<feDisplacementMap in="frosted" in2="map" scale="' + scaleG
        +   '" xChannelSelector="R" yChannelSelector="G" result="dispGall"/>'
        + '<feColorMatrix in="dispGall" type="matrix" '
        +   'values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="dispG"/>'
        + '<feDisplacementMap in="frosted" in2="map" scale="' + scaleB
        +   '" xChannelSelector="R" yChannelSelector="G" result="dispBall"/>'
        + '<feColorMatrix in="dispBall" type="matrix" '
        +   'values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="dispB"/>'
        + '<feComposite in="dispR" in2="dispG" operator="arithmetic" '
        +   'k1="0" k2="1" k3="1" k4="0" result="dispRG"/>'
        + '<feComposite in="dispRG" in2="dispB" operator="arithmetic" '
        +   'k1="0" k2="1" k3="1" k4="0" result="refracted"/>';
    } else {
      f += ''
        + '<feDisplacementMap in="frosted" in2="map" scale="' + scaleG
        +   '" xChannelSelector="R" yChannelSelector="G" result="refracted"/>';
    }

    f += '<feColorMatrix in="refracted" type="saturate" values="' + sat + '" result="vibrant"/>';

    if (ss > 0.001) {
      /* White rim glint: threshold the map's B channel so only the
         strong-bend, light-facing band survives, soften, then add. */
      f += ''
        + '<feColorMatrix in="map" type="matrix" '
        +   'values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 ' + (2.2 * ss)
        +   ' 0 ' + (-0.9 * ss) + '" result="specMask"/>'
        + '<feGaussianBlur in="specMask" stdDeviation="0.6" result="specSoft"/>'
        + '<feComposite in="specSoft" in2="vibrant" operator="arithmetic" '
        +   'k1="0" k2="1" k3="1" k4="0" result="lensResult"/>';
    } else {
      f += '<feOffset in="vibrant" dx="0" dy="0" result="lensResult"/>';
    }

    f += '</filter></svg>';
    return f;
  }

  /* ------------------------------------------------------------------ */
  /* Wallpaper plumbing (painted mode)                                   */
  /* ------------------------------------------------------------------ */

  function ensureRootWallpaperVar() {
    const root = document.documentElement;
    if (root.style.getPropertyValue(WALLPAPER_VAR)) return;
    const computed = getComputedStyle(document.body).backgroundImage;
    if (computed && computed !== 'none') {
      root.style.setProperty(WALLPAPER_VAR, computed);
    }
  }

  /* Wrap the page's applyWallpaper(idx) so wallpaper switches keep
     --wallpaper-url fresh and painted lenses re-render. Idempotent. */
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
          document.documentElement.style.setProperty(WALLPAPER_VAR, wp.gradient);
        }
        notifyWallpaperChanged();
      } catch (e) { /* non-fatal */ }
      return result;
    };
    global._liquidGlassBound = true;
  }

  function notifyWallpaperChanged() {
    document.dispatchEvent(new CustomEvent('liquidglass:wallpaper'));
  }

  /* ------------------------------------------------------------------ */
  /* Per-element wiring                                                  */
  /* ------------------------------------------------------------------ */

  function applyGlass(el, userOpts) {
    if (!el || el.nodeType !== 1) {
      throw new Error('applyGlass: first argument must be an HTMLElement');
    }
    const prior = _registry.get(el);
    if (prior) prior.destroy();

    const opts = Object.assign({
      borderRadius: 24,
      bezelWidth: 16,
      refraction: 22,
      curvature: 1.5,
      chroma: 1.0,
      preBlur: 0.5,
      blur: 12,
      saturate: 1.5,
      specStrength: 0.9,
      edgeHighlight: 0.20,
      tint: 'rgba(255,255,255,0.12)',
      rim: 'rgba(255,255,255,0.55)',
      shadow: '0 8px 32px rgba(0,0,0,0.18)',
    }, userOpts || {});

    if (MODE === 'painted') {
      ensureRootWallpaperVar();
      bindToWallpaperApp();
    }

    const cs = getComputedStyle(el);
    if (cs.position === 'static') el.style.position = 'relative';
    el.classList.add('liquid-glass-host');

    /* SVG <filter> lives in a body-attached holder. */
    const svgHolder = document.createElement('div');
    svgHolder.setAttribute('data-glass-svg-holder', '');
    svgHolder.style.cssText =
      'position:absolute;width:0;height:0;overflow:hidden;pointer-events:none;';
    document.body.appendChild(svgHolder);

    /* Lens layer. In backdrop/frost modes it carries the backdrop-filter
       itself; in painted mode it clips an oversized paint layer. */
    const lens = document.createElement('div');
    lens.setAttribute('data-glass-layer', 'lens');
    lens.style.cssText = ''
      + 'position:absolute;inset:0;'
      + 'border-radius:inherit;'
      + 'pointer-events:none;'
      + 'z-index:0;'
      + 'overflow:hidden;'
      + 'transform:translateZ(0);';

    /* Painted mode: wallpaper copy with a bleed margin so the rim always
       has real pixels to displace into (Aave paints their hero background
       the same way; the bleed is our fix for the edge smear). */
    let paint = null;
    let bleed = 0;
    if (MODE === 'painted') {
      bleed = Math.ceil(Math.max(24, opts.refraction * 1.5, (opts.blur + opts.preBlur) * 2));
      paint = document.createElement('div');
      paint.setAttribute('data-glass-layer', 'paint');
      paint.style.cssText = ''
        + 'position:absolute;'
        + 'inset:' + (-bleed) + 'px;'
        + 'background-image:var(' + WALLPAPER_VAR + ');'
        + 'background-repeat:no-repeat;'
        + 'pointer-events:none;'
        + 'will-change:filter;';
      lens.appendChild(paint);
    }

    /* Gloss layer: tint + vertical sheen + soft inset highlights. */
    const gloss = document.createElement('div');
    gloss.setAttribute('data-glass-layer', 'gloss');

    /* Rim layer: 1px gradient ring masked to the border. */
    const rim = document.createElement('div');
    rim.setAttribute('data-glass-layer', 'rim');

    function styleGloss() {
      const ha = opts.edgeHighlight;
      gloss.style.cssText = ''
        + 'position:absolute;inset:0;'
        + 'border-radius:inherit;'
        + 'pointer-events:none;'
        + 'z-index:1;'
        + 'background:'
        +   'linear-gradient(180deg, rgba(255,255,255,' + ha + ') 0%, '
        +     'rgba(255,255,255,' + (ha * 0.25) + ') 14%, rgba(255,255,255,0) 40%, '
        +     'rgba(255,255,255,0) 72%, rgba(255,255,255,' + (ha * 0.35) + ') 100%),'
        +   opts.tint + ';'
        + 'box-shadow:'
        +   'inset 0 1px 1px rgba(255,255,255,' + (ha * 0.9) + '),'
        +   'inset 0 -1px 1px rgba(255,255,255,' + (ha * 0.3) + '),'
        +   'inset 0 0 18px rgba(255,255,255,' + (ha * 0.18) + '),'
        +   opts.shadow + ';';
    }

    function styleRim() {
      rim.style.cssText = ''
        + 'position:absolute;inset:0;'
        + 'border-radius:inherit;'
        + 'pointer-events:none;'
        + 'z-index:1;'
        + 'padding:1.2px;'
        + 'background:linear-gradient(150deg, ' + opts.rim + ' 0%, '
        +   'rgba(255,255,255,0.10) 38%, rgba(255,255,255,0.04) 60%, '
        +   'rgba(255,255,255,0.28) 100%);'
        + '-webkit-mask:linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);'
        + '-webkit-mask-composite:xor;'
        + 'mask:linear-gradient(#fff 0 0) content-box exclude, linear-gradient(#fff 0 0);';
    }

    styleGloss();
    styleRim();

    /* Inject below existing children so the original content sits on top. */
    el.insertBefore(rim, el.firstChild);
    el.insertBefore(gloss, rim);
    el.insertBefore(lens, gloss);

    /* Make sure non-layer children sit above the glass layers. */
    Array.prototype.forEach.call(el.children, function (child) {
      if (child === lens || child === gloss || child === rim) return;
      const css = getComputedStyle(child);
      if (css.position === 'static') child.style.position = 'relative';
      if (!child.style.zIndex || parseInt(child.style.zIndex, 10) < 2) {
        child.style.zIndex = '2';
      }
    });

    /* The lens carries the backdrop and the gloss carries tint + rim, so
       neutralize the host's own treatment (stashed for destroy). */
    const priorBackdrop = el.style.backdropFilter || '';
    const priorWebkitBackdrop = el.style.webkitBackdropFilter || '';
    const priorBackground = el.style.background || '';
    const priorBackgroundColor = el.style.backgroundColor || '';
    const priorBorder = el.style.border || '';
    el.style.backdropFilter = 'none';
    el.style.webkitBackdropFilter = 'none';
    el.style.background = 'transparent';
    el.style.backgroundColor = 'transparent';
    if (cs.borderStyle && cs.borderStyle !== 'none' && cs.borderWidth !== '0px') {
      el.style.border = 'none';
    }

    /* Painted mode: align the copy with the real wallpaper, which is
       painted cover/center across the viewport by applyWallpaper(). */
    function syncWallpaperPaint() {
      if (!paint) return;
      const rect = el.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const fallback = function () {
        paint.style.backgroundSize = vw + 'px ' + vh + 'px';
        paint.style.backgroundPosition =
          (bleed - rect.left) + 'px ' + (bleed - rect.top) + 'px';
      };
      let url = getComputedStyle(document.documentElement)
        .getPropertyValue(WALLPAPER_VAR).trim();
      if (!url) url = getComputedStyle(document.body).backgroundImage;
      const match = url.match(/url\(\s*["']?([^"')]+)["']?\s*\)/);
      if (!match) { fallback(); return; } /* gradient — viewport-stretch */
      const src = match[1];
      if (!_imgCache.has(src)) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = function () {
          _imgCache.set(src, { w: img.naturalWidth, h: img.naturalHeight });
          syncWallpaperPaint();
        };
        img.src = src;
        fallback();
        return;
      }
      const dim = _imgCache.get(src);
      /* Reproduce cover/center for this viewport... */
      const scale = Math.max(vw / dim.w, vh / dim.h);
      const drawW = dim.w * scale;
      const drawH = dim.h * scale;
      const offX = (vw - drawW) / 2;
      const offY = (vh - drawH) / 2;
      /* ...then shift so viewport pixel (rect.left, rect.top) lands at
         (bleed, bleed) inside the oversized paint layer. */
      paint.style.backgroundSize = drawW + 'px ' + drawH + 'px';
      paint.style.backgroundPosition =
        (offX - rect.left + bleed) + 'px ' + (offY - rect.top + bleed) + 'px';
    }

    function render() {
      /* offsetWidth/Height ignore transforms (hover scale etc.). */
      const w = Math.max(8, Math.round(el.offsetWidth) || 8);
      const h = Math.max(8, Math.round(el.offsetHeight) || 8);

      if (MODE === 'backdrop') {
        /* Fresh ID on every regenerate — engines cache feImage by ID. */
        const id = 'glass-' + (++_idCounter) + '-' + Date.now().toString(36);
        const mapUrl = buildDisplacementMap(w, h, opts, 0);
        svgHolder.innerHTML = buildFilterSvg(id, mapUrl, opts, w, h);
        lens.style.backdropFilter = 'url(#' + id + ')';
        lens.style.webkitBackdropFilter = 'url(#' + id + ')';
      } else if (MODE === 'painted') {
        const id = 'glass-' + (++_idCounter) + '-' + Date.now().toString(36);
        const W = w + 2 * bleed, H = h + 2 * bleed;
        const mapUrl = buildDisplacementMap(W, H, opts, bleed);
        svgHolder.innerHTML = buildFilterSvg(id, mapUrl, opts, W, H);
        paint.style.filter = 'url(#' + id + ')';
        syncWallpaperPaint();
      } else {
        const fb = 'blur(' + Math.max(0, opts.blur) + 'px) saturate(' +
          Math.max(0, opts.saturate) + ')';
        lens.style.backdropFilter = fb;
        lens.style.webkitBackdropFilter = fb;
      }
    }

    render();

    const ro = new ResizeObserver(function () { render(); });
    ro.observe(el);

    /* Painted mode listeners: keep the copy aligned on viewport changes,
       re-render (fresh Safari filter ID) on wallpaper switches. */
    let rafPending = false;
    function onViewportChange() {
      if (rafPending) return;
      rafPending = true;
      requestAnimationFrame(function () {
        rafPending = false;
        syncWallpaperPaint();
      });
    }
    function onWallpaperChange() { render(); }
    if (MODE === 'painted') {
      window.addEventListener('scroll', onViewportChange, { passive: true });
      window.addEventListener('resize', onViewportChange, { passive: true });
      document.addEventListener('liquidglass:wallpaper', onWallpaperChange);
    }

    const api = {
      destroy: function () {
        ro.disconnect();
        if (MODE === 'painted') {
          window.removeEventListener('scroll', onViewportChange);
          window.removeEventListener('resize', onViewportChange);
          document.removeEventListener('liquidglass:wallpaper', onWallpaperChange);
        }
        svgHolder.remove();
        lens.remove();
        gloss.remove();
        rim.remove();
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
        styleGloss();
        styleRim();
        render();
      },
    };
    _registry.set(el, api);
    return api;
  }

  global.LiquidGlass = {
    applyGlass: applyGlass,
    mode: MODE,
    ensureRootWallpaperVar: ensureRootWallpaperVar,
    notifyWallpaperChanged: notifyWallpaperChanged,
  };
})(typeof window !== 'undefined' ? window : globalThis);
