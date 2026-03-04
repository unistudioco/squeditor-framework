// src/assets/js/gsap-modules/loop-panels.js
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function init() {
    const wrappers = document.querySelectorAll('[data-sq-loop-panels]');
    if (!wrappers.length) return;

    wrappers.forEach(wrapper => {
        // Reveal if it was hidden
        wrapper.removeAttribute('hidden');

        let panels = gsap.utils.toArray(wrapper.children);
        if (!panels.length) return;

        // Scope physics to wrapper rather than window to avoid hijacking whole page
        gsap.set(wrapper, {
            height: '80vh',
            minHeight: '600px',
            overflowY: 'scroll',
            overflowX: 'hidden',
            position: 'relative',
            overscrollBehavior: 'none' // Prevent bounding
        });

        gsap.set(panels, { width: '100%', height: '100%', position: 'relative' });

        // Clone the first panel to the end for seamless looping
        let copy = panels[0].cloneNode(true);
        wrapper.appendChild(copy);
        panels.push(copy);

        panels.forEach((panel) => {
            ScrollTrigger.create({
                scroller: wrapper,
                trigger: panel,
                start: "top top",
                pin: true,
                pinSpacing: false
            });
        });

        let maxScroll;
        let pageScrollTrigger = ScrollTrigger.create({
            scroller: wrapper,
            snap(value) {
                let snappedValue = gsap.utils.snap(1 / panels.length, value);
                if (snappedValue <= 0) {
                    return 1.05 / maxScroll;
                } else if (snappedValue >= 1) {
                    return maxScroll / (maxScroll + 1.05);
                }
                return snappedValue;
            }
        });

        function onResize() {
            maxScroll = ScrollTrigger.maxScroll(wrapper) - 1;
        }

        onResize();
        window.addEventListener("resize", onResize);

        wrapper.addEventListener("scroll", e => {
            let scroll = pageScrollTrigger.scroll();
            if (scroll > maxScroll) {
                pageScrollTrigger.scroll(1);
                e.preventDefault();
            } else if (scroll < 1) {
                pageScrollTrigger.scroll(maxScroll - 1);
                e.preventDefault();
            }
        }, { passive: false });
    });
}

