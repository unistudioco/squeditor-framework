// src/assets/js/gsap-modules/tilt.js
import { gsap } from 'gsap';

export function init() {
  const elements = document.querySelectorAll('[data-sq-tilt]');
  if (!elements.length) return;

  elements.forEach(el => {
    const attr = el.getAttribute('data-sq-tilt') || '';
    const config = parseModuleAttr(attr);

    const max = config.max ?? 15;
    const scale = config.scale ?? 1.05;
    const speed = (config.speed ?? 400) / 1000; // convert to seconds for quickTo

    // Wrap content for inner tilt layer
    el.style.transformStyle = 'preserve-3d';
    el.style.perspective = '1000px';

    // Setup quickTo mutators for high performance
    const rotateX = gsap.quickTo(el, "rotationX", { ease: "power3", duration: speed });
    const rotateY = gsap.quickTo(el, "rotationY", { ease: "power3", duration: speed });
    const scaleTo = gsap.quickTo(el, "scale", { ease: "power3", duration: speed });

    // Inner parallax tracking
    const innerLayers = el.querySelectorAll('[data-sq-tilt-inner]');
    const innerX = innerLayers.length ? gsap.quickTo(innerLayers, "x", { ease: "power3", duration: speed }) : null;
    const innerY = innerLayers.length ? gsap.quickTo(innerLayers, "y", { ease: "power3", duration: speed }) : null;

    el.addEventListener('pointermove', (e) => {
      const rect = el.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      // Calculate interpolation relative to center
      const pctX = (e.clientX - centerX) / (rect.width / 2);
      const pctY = (e.clientY - centerY) / (rect.height / 2);

      // Map limits
      rotateX(pctY * -max);
      rotateY(pctX * max);
      scaleTo(scale);

      // Inner elements move double the max in opposite parallax relative to rotation
      if (innerX) innerX(pctX * -(max * 2));
      if (innerY) innerY(pctY * -(max * 2));
    });

    el.addEventListener('pointerleave', () => {
      rotateX(0);
      rotateY(0);
      scaleTo(1);
      if (innerX) innerX(0);
      if (innerY) innerY(0);
    });
  });
}

function parseModuleAttr(str) {
  const config = {};
  if (!str) return config;
  str.split(';').forEach(part => {
    const idx = part.indexOf(':');
    if (idx === -1) return;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim().replace(/['"]/g, '');
    config[key] = isNaN(val) ? val : parseFloat(val);
  });
  return config;
}
