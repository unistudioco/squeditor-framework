// src/assets/js/gsap-advanced.js
// Squeditor Advanced GSAP Module Loader
// Scans DOM for data-sq-* attributes and loads only required modules

const moduleMap = {
  '[data-sq-cursor]': () => import('./gsap-modules/cursor.js'),
  '[data-sq-preview]': () => import('./gsap-modules/cursor-preview.js'),
  '[data-sq-tilt]': () => import('./gsap-modules/tilt.js'),
  '[data-sq-marquee]': () => import('./gsap-modules/marquee.js'),
  '[data-sq-panels]': () => import('./gsap-modules/pinned-panels.js'),
  '[data-sq-loop-panels]': () => import('./gsap-modules/loop-panels.js'),
  '[data-sq-mask]': () => import('./gsap-modules/text-mask.js'),
  '[data-sq-swipe]': () => import('./gsap-modules/swipe-slider.js'),
  '[data-sq-scrollto]': () => import('./gsap-modules/scroll-to.js'),
};

document.addEventListener('DOMContentLoaded', async () => {
  for (const [selector, loader] of Object.entries(moduleMap)) {
    if (document.querySelector(selector)) {
      const module = await loader();
      if (typeof module.init === 'function') {
        module.init();
      }
    }
  }
});
