// src/assets/js/gsap-modules/text-mask.js
import { gsap } from 'gsap';
import { SplitText } from 'gsap/SplitText';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(SplitText, ScrollTrigger);

export function init() {
    const elements = document.querySelectorAll('[data-sq-mask]');
    if (!elements.length) return;

    injectStyles(`
    .sq-mask-wrapper {
      overflow: hidden;
      display: inline-block; /* Support nested or inline layouts */
      vertical-align: top;
      width: 100%;
    }
  `);

    elements.forEach(el => {
        const attr = el.getAttribute('data-sq-mask') || '';
        const config = parseModuleAttr(attr);
        const type = config.type ?? 'lines';
        const duration = config.duration ?? 1.2;
        const stagger = config.stagger ?? 0.15;
        const ease = config.ease ?? 'expo.out';
        const useScroll = config.scroll ?? true;

        // Ensure opacity is visible before we split (if it was hidden initially via CSS)
        gsap.set(el, { opacity: 1 });

        // In order for masking to work, we need an outer container with overflow:hidden.
        // If we want to mask lines, we split by lines, then wrap each line in a div.
        const splitFormat = type === 'words' ? 'words' : 'lines';

        const split = new SplitText(el, {
            type: `${splitFormat},words,chars`, // Force deep split to prevent reflow bugs
            linesClass: splitFormat === 'lines' ? 'sq-split-target' : '',
            wordsClass: splitFormat === 'words' ? 'sq-split-target' : '',
        });

        const targets = el.querySelectorAll('.sq-split-target');

        // Wrap each target in an overflow:hidden mask
        targets.forEach(target => {
            const wrapper = document.createElement('div');
            wrapper.className = 'sq-mask-wrapper';
            target.parentNode.insertBefore(wrapper, target);
            wrapper.appendChild(target);
        });

        const vars = {
            yPercent: 100,
            opacity: 0,
            duration,
            stagger,
            ease,
        };

        if (useScroll) {
            vars.scrollTrigger = {
                trigger: el,
                start: config.start ?? 'top 85%',
                toggleActions: 'play none none none',
            };
        }

        gsap.from(targets, vars);
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
        if (val === 'true') config[key] = true;
        else if (val === 'false') config[key] = false;
        else if (!isNaN(val)) config[key] = parseFloat(val);
        else config[key] = val;
    });
    return config;
}

function injectStyles(css) {
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
}
