// src/assets/js/gsap-modules/swipe-slider.js
import { gsap } from 'gsap';
import { Observer } from 'gsap/observer';
import { SplitText } from 'gsap/SplitText';

gsap.registerPlugin(Observer, SplitText);

export function init() {
    const sliders = document.querySelectorAll('[data-sq-swipe]');
    if (!sliders.length) return;

    sliders.forEach(wrapper => {
        const attr = wrapper.getAttribute('data-sq-swipe') || '';
        const config = parseModuleAttr(attr);
        const duration = config.duration ?? 1.25;
        const ease = config.ease ?? 'power1.inOut';

        injectStyles(`
      .sq-swipe-section { visibility: hidden; }
      .sq-swipe-bg .clip-text { overflow: hidden; }
    `);

        const sections = Array.from(wrapper.querySelectorAll('.sq-swipe-section'));
        const outerWrappers = Array.from(wrapper.querySelectorAll('.sq-swipe-outer'));
        const innerWrappers = Array.from(wrapper.querySelectorAll('.sq-swipe-inner'));
        const images = Array.from(wrapper.querySelectorAll('.sq-swipe-bg'));
        const headings = Array.from(wrapper.querySelectorAll('.section-heading'));

        let currentIndex = -1;
        let animating = false;
        const wrap = gsap.utils.wrap(0, sections.length);

        // Prepare text splits if heading class is present
        let splitHeadings = headings.map(heading => {
            return new SplitText(heading, { type: "chars,words,lines", linesClass: "clip-text" });
        });

        // Reset layout for outer/inner
        gsap.set(outerWrappers, { yPercent: 100 });
        gsap.set(innerWrappers, { yPercent: -100 });

        function goTo(index, direction) {
            if (animating) return;
            index = wrap(index);
            animating = true;
            let fromTop = direction === -1,
                dFactor = fromTop ? -1 : 1,
                tl = gsap.timeline({
                    defaults: { duration: duration, ease: ease },
                    onComplete: () => animating = false
                });

            if (currentIndex >= 0) {
                gsap.set(sections[currentIndex], { zIndex: 0 });
                tl.to(images[currentIndex], { yPercent: -15 * dFactor })
                    .set(sections[currentIndex], { autoAlpha: 0 });
            }

            gsap.set(sections[index], { autoAlpha: 1, zIndex: 1 });

            tl.fromTo([outerWrappers[index], innerWrappers[index]], {
                yPercent: i => i ? -100 * dFactor : 100 * dFactor
            }, {
                yPercent: 0
            }, 0)
                .fromTo(images[index], { yPercent: 15 * dFactor }, { yPercent: 0 }, 0);

            if (splitHeadings[index]) {
                tl.fromTo(splitHeadings[index].chars, {
                    autoAlpha: 0,
                    yPercent: 150 * dFactor
                }, {
                    autoAlpha: 1,
                    yPercent: 0,
                    duration: 1,
                    ease: "power2",
                    stagger: {
                        each: 0.02,
                        from: "random"
                    }
                }, 0.2);
            }

            currentIndex = index;
        }

        Observer.create({
            target: wrapper,
            type: "wheel,touch,pointer",
            wheelSpeed: -1,
            tolerance: 10,
            preventDefault: true,
            onDown: () => !animating && goTo(currentIndex - 1, -1),
            onUp: () => !animating && goTo(currentIndex + 1, 1)
        });

        goTo(0, 1);
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
