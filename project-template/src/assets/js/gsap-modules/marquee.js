// src/assets/js/gsap-modules/marquee.js
import { gsap }          from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function init() {
  const marquees = document.querySelectorAll('[data-sq-marquee]');
  if (!marquees.length) return;

  marquees.forEach(wrapper => {
    const attr      = wrapper.getAttribute('data-sq-marquee') || '';
    const config    = parseModuleAttr(attr);
    const speed     = config.speed     ?? 50;   // px per second
    const gap       = config.gap       ?? 40;
    const direction = config.direction === 'right' ? 1 : -1;

    // Clone items to fill width for seamless loop
    const items       = Array.from(wrapper.children);
    const cloneGroup  = document.createElement('div');
    cloneGroup.className = 'sq-marquee__inner';
    const origGroup   = document.createElement('div');
    origGroup.className  = 'sq-marquee__inner';

    items.forEach(item => {
      origGroup.appendChild(item.cloneNode(true));
      cloneGroup.appendChild(item.cloneNode(true));
    });

    wrapper.innerHTML = '';
    wrapper.style.overflow = 'hidden';
    wrapper.style.display  = 'flex';

    injectStyles(`
      .sq-marquee__inner {
        display: flex;
        align-items: center;
        gap: ${gap}px;
        white-space: nowrap;
        flex-shrink: 0;
        padding-right: ${gap}px;
      }
    `);

    wrapper.appendChild(origGroup);
    wrapper.appendChild(cloneGroup);

    // Calculate total width for one group
    const totalWidth = origGroup.scrollWidth;

    let currentSpeed = speed * direction * -1;

    // Infinite scroll animation
    const tween = gsap.to([origGroup, cloneGroup], {
      x:        `+=${totalWidth * (direction < 0 ? -1 : 1)}`,
      modifiers: {
        x: gsap.utils.unitize(x => parseFloat(x) % totalWidth),
      },
      duration:  totalWidth / speed,
      ease:      'none',
      repeat:    -1,
    });

    // Reverse / slow on scroll direction change
    ScrollTrigger.create({
      onUpdate: (self) => {
        const velocity = self.getVelocity();
        if (Math.abs(velocity) > 10) {
          const factor = velocity < 0 ? -1 : 1;
          gsap.to(tween, {
            timeScale: factor * Math.min(Math.abs(velocity) / 500, 3),
            duration:  0.5,
            ease:      'power2.out',
            overwrite:  true,
          });
        } else {
          gsap.to(tween, {
            timeScale: direction < 0 ? -1 : 1,
            duration:  0.8,
            ease:      'power2.out',
            overwrite:  true,
          });
        }
      },
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

function injectStyles(css) {
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);
}
