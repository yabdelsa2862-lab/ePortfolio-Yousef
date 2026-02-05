// nav-contrast.js
// Robustly toggles a class on the navbar when the content underneath is light,
// and sets dark text for better contrast. Safe-guards prevent runtime errors.
(function () {
  'use strict';

  // Inject minimal CSS for the contrast state
  function injectCSS() {
    const css = `
      .nav-contrast .nav-link, .nav-contrast .font-semibold { color: rgba(0,0,0,0.92) !important; }
      .nav-contrast a i { color: rgba(0,0,0,0.92) !important; }
      .nav-contrast { background-color: rgba(255,255,255,0.86) !important; }
    `;
    const s = document.createElement('style');
    s.setAttribute('data-generated','nav-contrast');
    s.appendChild(document.createTextNode(css));
    document.head.appendChild(s);
  }

  // Parse rgb/rgba/hex into r,g,b (0-255)
  function parseRGB(color) {
    if (!color) return null;
    const m = color.match(/rgba?\(([^)]+)\)/);
    if (m) {
      const parts = m[1].split(',').map(p => parseFloat(p.trim()));
      return { r: parts[0], g: parts[1], b: parts[2], a: parts[3] ?? 1 };
    }
    // hex
    const hex = color.replace('#','').trim();
    if (hex.length === 3) {
      return { r: parseInt(hex[0]+hex[0],16), g: parseInt(hex[1]+hex[1],16), b: parseInt(hex[2]+hex[2],16), a:1 };
    }
    if (hex.length === 6) {
      return { r: parseInt(hex.slice(0,2),16), g: parseInt(hex.slice(2,4),16), b: parseInt(hex.slice(4,6),16), a:1 };
    }
    return null;
  }

  function rgbToLuminance(c) {
    if (!c) return 0;
    const srgb = [c.r/255, c.g/255, c.b/255].map(v => v <= 0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4));
    return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
  }

  // Find the first ancestor with a non-transparent background color
  function findEffectiveBackground(el) {
    while (el && el !== document.documentElement) {
      const cs = getComputedStyle(el);
      const bg = cs.backgroundColor;
      if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') return bg;
      el = el.parentElement;
    }
    // fallback to body/background
    return getComputedStyle(document.body).backgroundColor || 'rgb(255,255,255)';
  }

  // Sample points horizontally across the navbar (or per-link center) to detect light backgrounds.
  function isUnderLightBackground(navRoot, samples = 5, threshold = 0.75) {
    try {
      const rect = navRoot.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return false;

      // Temporarily disable pointer events so elementFromPoint returns underlying elements
      const navEl = navRoot.closest('nav') || navRoot;
      const prevPointer = navEl.style.pointerEvents || '';
      navEl.style.pointerEvents = 'none';

      const y = Math.round(rect.top + rect.height / 2);
      const results = [];
      for (let i = 0; i < samples; i++) {
        const x = Math.round(rect.left + (i + 0.5) * rect.width / samples);
        const under = document.elementFromPoint(x, y);
        const bg = findEffectiveBackground(under);
        const rgb = parseRGB(bg);
        const lum = rgbToLuminance(rgb);
        results.push(lum);
      }

      navEl.style.pointerEvents = prevPointer;

      const avg = results.reduce((s,v) => s+v,0)/results.length;
      return avg >= threshold;
    } catch (e) {
      return false;
    }
  }

  function update(navRoot) {
    try {
      if (!navRoot) return;
      const isLight = isUnderLightBackground(navRoot);
      navRoot.classList.toggle('nav-contrast', !!isLight);
    } catch (e) {
      // swallow errors to avoid blocking the page
      console.error('nav-contrast update error', e);
    }
  }

  function init() {
    try {
      injectCSS();
      const navRoot = document.querySelector('nav > div');
      if (!navRoot) return;

      // Initial check
      update(navRoot);

      // Recompute on scroll/resize
      let rAF;
      const handler = () => { if (rAF) cancelAnimationFrame(rAF); rAF = requestAnimationFrame(() => update(navRoot)); };
      window.addEventListener('scroll', handler, { passive: true });
      window.addEventListener('resize', handler);

      // Watch for DOM changes that affect backgrounds
      const mo = new MutationObserver(handler);
      mo.observe(document.body, { attributes: true, childList: true, subtree: true });
    } catch (e) {
      console.error('nav-contrast init error', e);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
