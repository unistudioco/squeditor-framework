// src/assets/js/gsap-modules/pinned-panels.js
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function init() {
    const wrappers = document.querySelectorAll('[data-sq-panels]');
    if (!wrappers.length) return;

    wrappers.forEach(wrapper => {
        const attr = wrapper.getAttribute('data-sq-panels') || '';
        const config = parseModuleAttr(attr);
        const rounded = config.rounded ?? true;
        const panels = Array.from(wrapper.children);

        injectStyles(`
      [data-sq-panels] {
        position: relative;
        z-index: 1;
      }
      .sq-panel {
        width: 100%;
        height: 100vh;
        overflow: hidden;
        position: relative;
        box-sizing: border-box;
        ${rounded ? 'border-radius: 0 0 24px 24px;' : ''}
        will-change: transform;
      }
      .sq-panel-inner {
        width: 100%;
        height: auto;
        min-height: 100vh;
      }
    `);

        // All panels except the last one pin and scale away
        const pinningPanels = panels.slice(0, -1);

        pinningPanels.forEach((panel) => {
            let innerpanel = panel.querySelector(".sq-panel-inner") || panel;

            // Calculate how much inner content exceeds the viewport height
            let panelHeight = innerpanel.offsetHeight;
            let windowHeight = window.innerHeight;
            let difference = panelHeight - windowHeight;

            // Calculate the ratio of the scroll distance that applies to fake-scrolling
            let fakeScrollRatio = difference > 0 ? (difference / (difference + windowHeight)) : 0;

            // Add margin to push the start of the next panel down, giving us scroll distance
            if (fakeScrollRatio) {
                panel.style.marginBottom = panelHeight * fakeScrollRatio + "px";
            }

            let tl = gsap.timeline({
                scrollTrigger: {
                    trigger: panel,
                    start: "top top",
                    end: () => fakeScrollRatio ? `+=${innerpanel.offsetHeight}` : "bottom top",
                    pinSpacing: false,
                    pin: true,
                    scrub: true
                }
            });

            // If there's overflow, translate the inner content up to simulate scrolling
            if (fakeScrollRatio) {
                tl.to(innerpanel, {
                    yPercent: -100,
                    y: windowHeight,
                    duration: 1 / (1 - fakeScrollRatio) - 1,
                    ease: "none"
                });
            }

            // Standard scale and fade away transition for the panel itself
            tl.fromTo(panel,
                { scale: 1, opacity: 1 },
                { scale: 0.85, opacity: 0.5, duration: 0.9, ease: "none" }
            )
                .to(panel, { opacity: 0, duration: 0.1, ease: "none" });
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
        config[key] = isNaN(val) ? (val === 'true' ? true : (val === 'false' ? false : val)) : parseFloat(val);
    });
    return config;
}

function injectStyles(css) {
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
}
