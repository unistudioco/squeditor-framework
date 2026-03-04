// src/assets/js/gsap-modules/cursor.js
import { gsap } from 'gsap';

export function init() {
  const trigger = document.querySelector('[data-sq-cursor]');
  if (!trigger) return;

  const attr = trigger.getAttribute('data-sq-cursor') || '';
  const config = parseModuleAttr(attr);

  const size = config.size ?? 32;
  let color = config.color ?? '#000000';
  const blend = config.blend ?? 'normal';
  const scaleOnHover = config['scale-on-hover'] ?? 1.4;
  const backdropBlur = config['backdrop-blur'] ?? '';
  const fillAlpha = config['fill-opacity'] ?? 0; // 0 means traditional outline
  const outlineAlpha = config['outline-opacity'] ?? 0.25; // default 0.25 outline
  const delay = config.delay ?? 0.5;
  const stick = typeof config.stick === 'string' ? `${config.stick}, [data-sq-cursor-stick]` : '[data-sq-cursor-stick]';
  let contrast = config.contrast ?? true;
  const hideNative = config['hide-native'] ?? false;

  // Auto-correct 'difference' blend mode. Difference requires white to invert colors. Black is invisible.
  if (blend === 'difference') {
    contrast = false; // Difference mode handles contrast mathematically on its own
    if (color === '#000' || color === '#000000') color = '#ffffff';
  }

  // Create cursor elements
  const dot = createEl('sq-cursor__dot');
  const circle = createEl('sq-cursor__circle');
  const textSpan = createEl('sq-cursor__text');
  const iconSpan = createEl('sq-cursor__icon');

  dot.appendChild(textSpan);
  dot.appendChild(iconSpan);
  document.body.appendChild(dot);
  document.body.appendChild(circle);

  const defaultRgb = hexToRgb(color);
  const darkRgb = '0, 0, 0';
  const lightRgb = '255, 255, 255';

  // Inject base styles
  injectStyles(`
    :root {
      --sq-cursor-rgb: ${defaultRgb};
    }
    body.sq-cursor-is-dark {
      --sq-cursor-rgb: ${lightRgb};
    }
    body.sq-cursor-is-light {
      --sq-cursor-rgb: ${darkRgb};
    }

    .sq-cursor__dot,
    .sq-cursor__circle {
      position: fixed;
      top: 0; left: 0;
      pointer-events: none;
      z-index: 9999;
      border-radius: 50%;
      mix-blend-mode: ${blend};
      opacity: 0; 
    }
    .sq-cursor__dot {
      display: flex; align-items: center; justify-content: center;
      width: 6px; height: 6px;
      background: rgb(var(--sq-cursor-rgb));
      margin: -3px 0 0 -3px; 
      transition: background-color 0.2s ease;
      overflow: hidden;
    }
    
    .sq-cursor__text {
      color: var(--sq-color-on-primary, #fff); /* Fallback hardcoded white */
      font-size: 14px;
      font-weight: 500;
      white-space: pre-wrap;
      text-align: center;
      line-height: 1.1;
      opacity: 0;
      transition: opacity 0.2s ease;
      padding: 0 12px;
      width: 80px;
      flex-shrink: 0;
      position: absolute;
      top: 50%; left: 50%;
      transform: translate(-50%, -50%);
    }
    
    .sq-cursor__icon {
      color: var(--sq-color-on-primary, #fff);
      display: flex; align-items: center; justify-content: center;
      font-size: 20px;
      opacity: 0;
      transition: opacity 0.2s ease;
      position: absolute;
      top: 50%; left: 50%;
      transform: translate(-50%, -50%);
    }
    .sq-cursor__icon i { font-size: inherit; }

    body.sq-cursor-has-content .sq-cursor__dot {
      background: rgb(var(--sq-cursor-rgb));
    }
    body.sq-cursor-has-text .sq-cursor__text,
    body.sq-cursor-has-icon .sq-cursor__icon {
      opacity: 1; transition-delay: 0.1s;
    }
    .sq-cursor__circle {
      width: ${size}px; height: ${size}px;
      border: ${fillAlpha > 0 ? 'none' : `2px solid rgba(var(--sq-cursor-rgb), ${outlineAlpha})`};
      background: ${fillAlpha > 0 ? `rgba(var(--sq-cursor-rgb), ${fillAlpha})` : 'transparent'};
      margin: -${size / 2}px 0 0 -${size / 2}px; 
      transition: border-color 0.2s ease, background-color 0.2s ease;
      ${backdropBlur ? `backdrop-filter: blur(${backdropBlur}); -webkit-backdrop-filter: blur(${backdropBlur});` : ''}
    }
    .sq-cursor-zoom .sq-cursor__circle {
      background: ${fillAlpha > 0 ? `rgba(var(--sq-cursor-rgb), ${fillAlpha})` : 'transparent'};
      border-color: rgb(var(--sq-cursor-rgb));
    }
    .sq-cursor-zoom .sq-cursor__circle::before,
    .sq-cursor-zoom .sq-cursor__circle::after {
      content: ''; position: absolute; top: 50%; left: 50%;
      background: rgb(var(--sq-cursor-rgb)); transform: translate(-50%, -50%);
      opacity: 0; transition: opacity 0.2s ease, background-color 0.2s ease;
    }
    .sq-cursor-zoom .sq-cursor__circle::before { width: 12px; height: 2px; opacity: 1; }
    .sq-cursor-zoom .sq-cursor__circle::after { width: 2px; height: 12px; opacity: 1; }
    
    .sq-cursor-loading .sq-cursor__circle {
      border: 2px solid rgba(var(--sq-cursor-rgb), ${outlineAlpha}) !important;
      border-top-color: transparent !important;
      border-right-color: transparent !important;
      background: transparent !important;
    }

    ${hideNative ? `
    body[data-sq-cursor],
    body[data-sq-cursor] a,
    body[data-sq-cursor] button { cursor: none !important; }
    ` : ''}
  `);

  // Track mouse position
  let mouseX = 0, mouseY = 0;
  let isHovering = false;
  let isZooming = false;
  let spinTween = null;
  let initialized = false;
  let lastContrastCheck = 0;

  // Custom Color State tracking
  let currentColorStr = null;
  let customRgbState = null;

  // Initial GSAP setup (x/y with opacity 0)
  gsap.set([dot, circle], { xPercent: 0, yPercent: 0, transformOrigin: 'center center' });

  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;

    if (!initialized) {
      // Reveal instantly on first movement at exact coordinates
      gsap.set([dot, circle], { x: mouseX, y: mouseY, opacity: 1 });
      initialized = true;
    } else {
      // Dot follows instantly
      gsap.set(dot, { x: mouseX, y: mouseY });

      let targetX = mouseX;
      let targetY = mouseY;

      try {
        const stickEl = e.target.closest(stick);
        if (stickEl) {
          const rect = stickEl.getBoundingClientRect();
          const centerX = rect.left + rect.width / 2;
          const centerY = rect.top + rect.height / 2;
          // 15% magnetic elasticity around the element's center
          targetX = centerX + (mouseX - centerX) * 0.15;
          targetY = centerY + (mouseY - centerY) * 0.15;
          document.body.classList.add('sq-cursor-stick');
        } else {
          document.body.classList.remove('sq-cursor-stick');
        }
      } catch (err) { }

      // Circle follows with lag
      gsap.to(circle, {
        x: targetX, y: targetY,
        duration: delay,
        ease: 'power3.out',
      });
    }

    if (contrast) {
      const now = Date.now();
      if (now - lastContrastCheck > 100) { // Check every 100ms
        lastContrastCheck = now;
        dot.style.display = 'none'; // Temporarily hide to get accurate elementFromPoint
        circle.style.display = 'none';

        let el = document.elementFromPoint(mouseX, mouseY);
        // Occasionally, fast movement catches the HTML root. We want whatever is structurally under the mouse.
        if (!el || el === document.documentElement) {
          el = document.body;
        }

        dot.style.display = '';
        circle.style.display = '';

        // Check for custom color overrides (data-sq-cursor-color="hex")
        const customColorEl = el.closest('[data-sq-cursor-color]');
        if (customColorEl) {
          const customHex = customColorEl.getAttribute('data-sq-cursor-color');
          if (customHex && customHex !== currentColorStr) {
            customRgbState = hexToRgb(customHex);
            currentColorStr = customHex;
            // Inject variable DIRECTLY onto the dot/circle to bypass CSS class specificity (body.sq-cursor-is-dark)
            dot.style.setProperty('--sq-cursor-rgb', customRgbState);
            circle.style.setProperty('--sq-cursor-rgb', customRgbState);
          }
          // Temporarily suspend contrast switching if a hardcoded color is overriden.
          return;
        } else if (customRgbState) {
          // Remove the explicit inline override so it can fallback to body CSS scopes
          dot.style.removeProperty('--sq-cursor-rgb');
          circle.style.removeProperty('--sq-cursor-rgb');
          customRgbState = null;
          currentColorStr = null;
        }

        const contrastType = getBgContrast(el);
        if (contrastType === 'dark') {
          document.body.classList.add('sq-cursor-is-dark');
          document.body.classList.remove('sq-cursor-is-light');
        } else if (contrastType === 'light') {
          document.body.classList.add('sq-cursor-is-light');
          document.body.classList.remove('sq-cursor-is-dark');
        } else {
          document.body.classList.remove('sq-cursor-is-light', 'sq-cursor-is-dark');
        }
      }
    }
  });

  // Custom text/icon parsing trackers
  let activeText = null;
  let activeIcon = null;

  // Scale and Content injection on interactives
  const interactives = 'a, button, [data-sq-cursor-hover], input, label, [data-sq-cursor-text], [data-sq-cursor-icon]';
  const zoomables = '.uk-lightbox, [data-uk-lightbox], .sq-zoom';

  document.querySelectorAll(interactives).forEach(el => {
    el.addEventListener('mouseenter', (e) => {
      isHovering = true;

      const customText = el.getAttribute('data-sq-cursor-text');
      const customIcon = el.getAttribute('data-sq-cursor-icon');

      if (customText) {
        activeText = customText;
        textSpan.textContent = customText;
        document.body.classList.add('sq-cursor-has-content', 'sq-cursor-has-text');

        // Expand the dot to fit a perfect wrap circle
        gsap.to(dot, { width: 80, height: 80, margin: '-40px 0 0 -40px', borderRadius: '50%', duration: 0.3, ease: 'power2.out' });
        gsap.to(circle, { opacity: 0, duration: 0.2 }); // Hide outer circle to reduce clutter
      } else if (customIcon) {
        activeIcon = customIcon;
        iconSpan.innerHTML = `<i class="${customIcon}"></i>`;
        document.body.classList.add('sq-cursor-has-content', 'sq-cursor-has-icon');

        // Expand the dot to fit a uniform icon circle
        gsap.to(dot, { width: 48, height: 48, margin: '-24px 0 0 -24px', borderRadius: '50%', duration: 0.3, ease: 'power2.out' });
        gsap.to(circle, { opacity: 0, duration: 0.2 });
      } else {
        gsap.to(circle, { scale: scaleOnHover, duration: 0.3, ease: 'power2.out' });
      }

      // Check if it's a zoomable element
      if (el.matches(zoomables) || el.closest(zoomables)) {
        isZooming = true;
        document.body.classList.add('sq-cursor-zoom');
        gsap.to(dot, { opacity: 0, duration: 0.1 });
      }
    });

    el.addEventListener('mouseleave', () => {
      isHovering = false;
      isZooming = false;
      document.body.classList.remove('sq-cursor-zoom', 'sq-cursor-has-content', 'sq-cursor-has-text', 'sq-cursor-has-icon');

      if (activeText || activeIcon) {
        activeText = null;
        activeIcon = null;
        textSpan.textContent = '';
        iconSpan.innerHTML = '';
        // Restore standard dot size
        gsap.to(dot, { width: 6, height: 6, margin: '-3px 0 0 -3px', borderRadius: '50%', duration: 0.3, ease: 'power2.out', clearProps: 'width,height,margin,borderRadius' });
        gsap.to(circle, { opacity: 1, duration: 0.2 });
      } else {
        gsap.to(circle, { scale: 1, duration: 0.3, ease: 'power2.out' });
      }

      gsap.to(dot, { opacity: 1, duration: 0.1 });
    });
  });

  // Click physics (scale down slightly to feel the click)
  document.addEventListener('mousedown', () => {
    const targetScale = isHovering ? scaleOnHover * 0.8 : 0.8;
    gsap.to(circle, { scale: targetScale, duration: 0.1, ease: 'power1.out' });
  });

  document.addEventListener('mouseup', () => {
    const targetScale = isHovering ? scaleOnHover : 1;
    gsap.to(circle, { scale: targetScale, duration: 0.3, ease: 'power2.out', overwrite: 'auto' });
  });

  // Loading State (Event Delegation on Document Body)
  document.body.addEventListener('click', (e) => {
    const link = e.target.closest('a:not([target="_blank"]):not([href^="#"]):not([href^="mailto:"]):not([href^="tel:"])');
    if (!link) return;

    if (e.defaultPrevented) return;
    if (link.matches(zoomables) || link.closest(zoomables)) return;
    if (link.closest('.uk-slideshow-nav, .uk-slider-nav, .uk-dotnav, .uk-tab')) return; // ignore UIkit navigation

    const href = link.getAttribute('href') || '';
    if (href.match(/\.(jpg|jpeg|png|gif|svg|webp|mp4)$/i)) return;

    document.body.classList.add('sq-cursor-loading');
    document.body.classList.remove('sq-cursor-zoom');
    gsap.to(dot, { opacity: 0, duration: 0.1 });
    gsap.to(circle, { scale: 1.5, duration: 0.3, ease: 'power2.out' });

    if (spinTween) spinTween.kill();
    spinTween = gsap.to(circle, {
      rotation: "+=360",
      repeat: -1,
      ease: "none",
      duration: 0.6
    });
  });

  // Explicit Before Unload mapping to guarantee loader triggers on browser navigation
  window.addEventListener('beforeunload', () => {
    document.body.classList.add('sq-cursor-loading');
    document.body.classList.remove('sq-cursor-zoom');
    gsap.to(dot, { opacity: 0, duration: 0.1 });
    gsap.to(circle, { scale: 1.5, duration: 0.3, ease: 'power2.out' });
    if (spinTween) spinTween.kill();
    spinTween = gsap.to(circle, { rotation: "+=360", repeat: -1, ease: "none", duration: 0.6 });
  });

  // Reset loading state on back/forward navigation
  window.addEventListener('pageshow', (e) => {
    if (e.persisted) {
      document.body.classList.remove('sq-cursor-loading');
      if (spinTween) spinTween.kill();
      gsap.set(circle, { rotation: 0, scale: 1 });
      gsap.to(dot, { opacity: 1, duration: 0.2 });
    }
  });

  // Hide on window leave, show on enter
  document.addEventListener('mouseleave', () => {
    gsap.to([dot, circle], { opacity: 0, duration: 0.3 });
  });
  document.addEventListener('mouseenter', () => {
    // Only show if we already initialized internal position
    if (initialized) gsap.to([dot, circle], { opacity: 1, duration: 0.3 });
  });
}

function getBgContrast(el) {
  if (!el || el === document) return 'none';

  // Explicitly check for UIkit dark mode theme wrappers first
  if (el.matches('.sq-theme-dark') || el.closest('.sq-theme-dark')) return 'dark';
  if (el.matches('.sq-theme-light') || el.closest('.sq-theme-light')) return 'light';

  // Recursively search for the closest non-transparent background
  let currentEl = el;
  while (currentEl && currentEl !== document.documentElement) {
    const bg = window.getComputedStyle(currentEl).backgroundColor;
    if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
      const rgb = bg.match(/[\d.]+/g);
      if (rgb && rgb.length >= 3) {
        // If it's a very light opacity background, it doesn't count as the true background
        const a = rgb.length === 4 ? parseFloat(rgb[3]) : 1;
        if (a > 0.5) {
          const r = parseInt(rgb[0]), g = parseInt(rgb[1]), b = parseInt(rgb[2]);
          // Calculate YIQ to get relative brightness
          const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
          return yiq >= 128 ? 'light' : 'dark';
        }
      }
    }

    // Safely fallback for images, videos, and canvas (assume dark for cursor visibility)
    if (['IMG', 'VIDEO', 'CANVAS'].includes(currentEl.tagName)) {
      return 'dark';
    }

    currentEl = currentEl.parentElement;
  }

  // Fallback: Check if the main HTML root itself is dark mode
  if (document.documentElement.classList.contains('sq-theme-dark') || document.body.classList.contains('sq-theme-dark')) {
    return 'dark';
  }

  // If we reach the top and found no background, assume light mode default natively
  return 'light';
}

function hexToRgb(hex) {
  if (!hex.startsWith('#')) return '0, 0, 0'; // Default to black if not a hex
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(x => x + x).join(''); // Handle shorthand hex
  const r = parseInt(hex.substring(0, 2), 16) || 0;
  const g = parseInt(hex.substring(2, 4), 16) || 0;
  const b = parseInt(hex.substring(4, 6), 16) || 0;
  return `${r}, ${g}, ${b}`;
}

function createEl(className) {
  const el = document.createElement('div');
  el.className = className;
  return el;
}

function injectStyles(css) {
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);
}

function parseModuleAttr(str) {
  const config = {};
  if (!str) return config;
  str.split(';').forEach(part => {
    const idx = part.indexOf(':');
    if (idx === -1) return;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim().replace(/['"]/g, '');
    config[key] = isNaN(val) ? (val === 'true' ? true : (val === 'false' ? false : val)) : parseFloat(val);
  });
  return config;
}
