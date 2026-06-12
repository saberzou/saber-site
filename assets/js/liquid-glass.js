/**
 * liquid-glass.js v4 — background-agnostic refractive liquid glass.
 *
 * Filter pipeline after Aave's "Building Glass for the Web"
 * (https://aave.com/design/building-glass-for-the-web):
 *   - A displacement map PNG is generated on the fly from the glass's
 *     shape and size. R encodes horizontal bend, G vertical bend;
 *     everything outside the lens region stays neutral so only pixels
 *     under the glass move.
 *   - feDisplacementMap runs once per RGB channel at Aave's production
 *     ratios (R 1.04x / G 1.0x / B 0.926x) for the chromatic fringe.
 *   - A light pre-displacement blur ("wet edge") smooths the bend; a
 *     larger body blur frosts the glass.
 *   - The specular glint is thresholded from the map's B channel, which
 *     encodes bend strength x incidence toward a top-left light, so the
 *     highlight hugs the lens geometry itself.
 *   - Fresh filter ID on every regenerate (engines cache by ID).
 *
 * Unlike Aave — whose page background is a fixed hero graphic they can
 * copy into the glass — this site's background is fully dynamic (user-
 * switchable wallpapers, windows and icons drifting behind the glass).
 * So nothing here reads or copies the background. The filter is applied
 * to the live backdrop via `backdrop-filter: url(#filter)`: whatever is
 * behind the glass refracts, pixel-aligned, with zero coupling to the
 * page's background state.
 *
 * `backdrop-filter: url()` renders correctly in Chromium. Browsers
 * without it (Safari, Firefox) get `backdrop-filter: blur() saturate()`
 * under the same CSS gloss/rim layers — clean frosted glass, equally
 * background-agnostic. Debug override: ?glassmode=backdrop|frost.
 *
 * Public API:
 *   applyGlass(el, opts) -> { destroy(), update(opts), regenerate() }
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

  /* ------------------------------------------------------------------ */
  /* Mode detection                                                      */
  /* ------------------------------------------------------------------ */

  const MODE = (function () {
    try {
      const qs = (global.location && global.location.search) || '';
      const forced = /[?&]glassmode=(backdrop|frost)/.exec(qs);
      if (forced) return forced[1];
    } catch (e) { /* non-fatal */ }
    try {
      if (typeof CSS === 'undefined' || !CSS.supports) return 'frost';
      const ua = navigator.userAgent;
      const isChromium = /Chrom(e|ium)|Edg\/|OPR\//.test(ua);
      /* Only Chromium renders `backdrop-filter: url()` correctly. Safari
         and Firefox parse it (CSS.supports lies) but draw nothing or an
         unfiltered backdrop. */
      const parses = CSS.supports('backdrop-filter', 'url(#lg)') ||
                     CSS.supports('-webkit-backdrop-filter', 'url(#lg)');
      if (isChromium && parses) return 'backdrop';
    } catch (e) { /* fall through */ }
    return 'frost';
  })();

  /* ------------------------------------------------------------------ */
  /* Displacement-map generator                                          */
  /* ------------------------------------------------------------------ */

  function buildDisplacementMap(w, h, opts) {
    const radius = Math.max(1, Math.min(opts.borderRadius, w / 2, h / 2));
    const minDim = Math.min(w, h);
    /* Keep an optically-flat center even on short elements. */
    const bezel = Math.max(2, Math.min(opts.bezelWidth, minDim / 3));
    const curvature = Math.max(0.2, opts.curvature);

    /* Light direction for the specular band (from top, slightly left). */
    const lightX = -0.35, lightY = -0.94;

    /* Half-res for perf — feImage stretches it back up, and the map is
       smooth so the upscale is invisible. */
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

    const cx = w / 2, cy = h / 2;
    const coreX = w / 2 - radius, coreY = h / 2 - radius;

    for (let py = 0; py < mapH; py++) {
      const y = (py + 0.5) / sy;
      for (let px = 0; px < mapW; px++) {
        const x = (px + 0.5) / sx;
        const i = (py * mapW + px) * 4;

        /* Signed distance to the rounded-rect border (negative inside). */
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

          /* B: specular potential. Squash the profile (m^2.8) so the
             glint hugs the outermost sliver of the bezel instead of
             washing across the whole band. */
          const lambert = Math.max(0, nx * lightX + ny * lightY);
          b8 = Math.round(255 * Math.pow(m, 2.8) * (0.15 + 0.85 * lambert));
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

  function buildFilterSvg(id, mapDataUrl, opts, w, h) {
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
      +       'result="rawMap" x="0" y="0" width="' + w + '" height="' + h + '"/>'
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
      /* White rim glint: steep threshold on the map's B channel so only
         the thin, strong-bend, light-facing sliver survives. */
      f += ''
        + '<feColorMatrix in="map" type="matrix" '
        +   'values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 ' + (3.0 * ss)
        +   ' 0 ' + (-1.5 * ss) + '" result="specMask"/>'
        + '<feGaussianBlur in="specMask" stdDeviation="0.4" result="specSoft"/>'
        + '<feComposite in="specSoft" in2="vibrant" operator="arithmetic" '
        +   'k1="0" k2="1" k3="1" k4="0" result="lensResult"/>';
    } else {
      f += '<feOffset in="vibrant" dx="0" dy="0" result="lensResult"/>';
    }

    f += '</filter></svg>';
    return f;
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

    const cs = getComputedStyle(el);
    if (cs.position === 'static') el.style.position = 'relative';
    el.classList.add('liquid-glass-host');

    /* SVG <filter> lives in a body-attached holder. */
    const svgHolder = document.createElement('div');
    svgHolder.setAttribute('data-glass-svg-holder', '');
    svgHolder.style.cssText =
      'position:absolute;width:0;height:0;overflow:hidden;pointer-events:none;';
    document.body.appendChild(svgHolder);

    /* Lens layer: live backdrop, refracted (or just frosted on fallback). */
    const lens = document.createElement('div');
    lens.setAttribute('data-glass-layer', 'lens');
    lens.style.cssText = ''
      + 'position:absolute;inset:0;'
      + 'border-radius:inherit;'
      + 'pointer-events:none;'
      + 'z-index:0;'
      + 'overflow:hidden;'
      + 'transform:translateZ(0);';

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
        +   'linear-gradient(180deg, rgba(255,255,255,' + (ha * 0.7) + ') 0%, '
        +     'rgba(255,255,255,' + (ha * 0.15) + ') 8%, rgba(255,255,255,0) 30%, '
        +     'rgba(255,255,255,0) 78%, rgba(255,255,255,' + (ha * 0.25) + ') 100%),'
        +   opts.tint + ';'
        + 'box-shadow:'
        +   'inset 0 1px 0 rgba(255,255,255,' + (ha * 0.8) + '),'
        +   'inset 0 -1px 0 rgba(255,255,255,' + (ha * 0.25) + '),'
        +   opts.shadow + ';';
    }

    function styleRim() {
      rim.style.cssText = ''
        + 'position:absolute;inset:0;'
        + 'border-radius:inherit;'
        + 'pointer-events:none;'
        + 'z-index:1;'
        + 'padding:1px;'
        + 'background:linear-gradient(150deg, ' + opts.rim + ' 0%, '
        +   'rgba(255,255,255,0.30) 35%, rgba(255,255,255,0.18) 60%, '
        +   'rgba(255,255,255,0.42) 100%);'
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

    /* The lens carries the backdrop filter and the gloss carries tint +
       rim, so neutralize the host's own treatment (stashed for destroy). */
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

    function render() {
      /* offsetWidth/Height ignore transforms (hover scale etc.). */
      const w = Math.max(8, Math.round(el.offsetWidth) || 8);
      const h = Math.max(8, Math.round(el.offsetHeight) || 8);

      if (MODE === 'backdrop') {
        /* Fresh ID on every regenerate — engines cache feImage by ID. */
        const id = 'glass-' + (++_idCounter) + '-' + Date.now().toString(36);
        const mapUrl = buildDisplacementMap(w, h, opts);
        svgHolder.innerHTML = buildFilterSvg(id, mapUrl, opts, w, h);
        lens.style.backdropFilter = 'url(#' + id + ')';
        lens.style.webkitBackdropFilter = 'url(#' + id + ')';
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

    const api = {
      destroy: function () {
        ro.disconnect();
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
  };
})(typeof window !== 'undefined' ? window : globalThis);
