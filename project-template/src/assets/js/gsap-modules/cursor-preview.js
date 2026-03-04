// src/assets/js/gsap-modules/cursor-preview.js
import { gsap } from 'gsap';

export function init() {
  const lists = document.querySelectorAll('[data-sq-preview]');
  if (!lists.length) return;

  // Create shared preview image element
  const preview = document.createElement('div');
  preview.className = 'sq-preview-image';
  preview.innerHTML = '<img src="" alt="" />';
  document.body.appendChild(preview);

  injectStyles(`
    .sq-preview-image {
      position: fixed;
      top: 0; left: 0;
      width: 320px;
      pointer-events: none;
      z-index: 9998;
      opacity: 0;
      overflow: hidden;
      border-radius: 12px;
      transform: translate(-50%, -60%);
      transform-origin: center center;
    }
    .sq-preview-image img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
      will-change: transform;
    }
  `);

  const img = preview.querySelector('img');
  let currentHover = null;

  lists.forEach(list => {
    const attr = list.getAttribute('data-sq-preview') || '';
    const config = parseModuleAttr(attr);
    const ratio = config.ratio || '4:5';
    const trans = config.transition || 'fade';
    const rotate = config.rotate !== undefined ? parseFloat(config.rotate) : -5;

    const items = list.querySelectorAll('[data-preview-src]');

    items.forEach(item => {
      item.addEventListener('mouseenter', () => {
        img.src = item.dataset.previewSrc;
        img.alt = item.dataset.previewAlt || '';
        currentHover = item;

        // Reset
        gsap.killTweensOf(preview);
        gsap.killTweensOf(img);
        gsap.set(preview, { opacity: 1, scale: 1, rotation: rotate, clipPath: 'none', xPercent: 0, yPercent: 0 });
        gsap.set(img, { scale: 1, xPercent: 0, yPercent: 0, clipPath: 'none' });

        img.style.aspectRatio = ratio === 'auto' ? 'auto' : ratio.replace(':', '/');
        img.style.height = ratio === 'auto' ? 'auto' : '100%';

        const tl = gsap.timeline();

        switch (trans) {
          case 'slide-y':
            tl.fromTo(preview, { yPercent: 20, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.4, ease: 'power3.out' });
            break;
          case 'slide-x':
            tl.fromTo(preview, { xPercent: 20, opacity: 0 }, { xPercent: 0, opacity: 1, duration: 0.4, ease: 'power3.out' });
            break;
          case 'reveal-y':
            tl.fromTo(preview, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1, ease: 'expo.inOut' })
              .fromTo(img, { scale: 1.2 }, { scale: 1, duration: 1, ease: 'expo.inOut' }, 0);
            break;
          case 'reveal-x':
            tl.fromTo(preview, { clipPath: 'inset(0% 100% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1, ease: 'expo.inOut' })
              .fromTo(img, { scale: 1.2 }, { scale: 1, duration: 1, ease: 'expo.inOut' }, 0);
            break;
          case 'scale-up':
            tl.fromTo(preview, { scale: 0.8, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.4, ease: 'back.out(1.5)' });
            break;
          case 'scale-down':
            tl.fromTo(preview, { scale: 1.2, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.4, ease: 'power3.out' });
            break;
          case 'none':
            gsap.set(preview, { opacity: 1 });
            break;
          case 'fade':
          default:
            tl.fromTo(preview, { opacity: 0, scale: 0.95 }, { opacity: 1, scale: 1, duration: 0.4, ease: 'power3.out' });
            break;
        }
      });

      item.addEventListener('mouseleave', () => {
        if (currentHover === item) {
          gsap.to(preview, { opacity: 0, scale: 0.9, duration: 0.3, ease: 'power2.in' });
          currentHover = null;
        }
      });

      item.addEventListener('mousemove', (e) => {
        gsap.to(preview, {
          x: e.clientX,
          y: e.clientY,
          duration: 0.6,
          ease: 'power3.out',
        });
      });
    });
  });
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
    config[key] = isNaN(val) && val !== 'auto' && !val.includes(':') && !val.includes('-') ? val : val;
  });
  return config;
}
