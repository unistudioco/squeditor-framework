// src/assets/js/main.js
import './gsap-init.js';
import './gsap-advanced.js';
import './_slider_dynamic.js';
// SCSS is imported directly in base.php for development (to prevent FOUC) and loaded via <link> in production.

// Remove the dev server FOUC shield
if (document.documentElement.classList.contains('js-fouc')) {
    setTimeout(() => { document.documentElement.classList.remove('js-fouc'); }, 50);
}

// Add custom JavaScript here

import { gsap } from 'gsap';

function initMathPathTransition(pathSelector) {
    const overlay = document.querySelector('.sq-page-transition');
    const paths = document.querySelectorAll(pathSelector);
    if (!overlay || !paths.length) return null;

    let numPoints = 10;
    let numPaths = paths.length; // curve=2, wave=1
    let delayPointsMax = 0.3;
    let delayPerPath = 0.25;
    let isRevealing = true;
    let pointsDelay = [];
    let allPoints = [];

    for (let i = 0; i < numPaths; i++) {
        let points = [];
        allPoints.push(points);
        for (let j = 0; j < numPoints; j++) {
            points.push(100);
        }
    }

    function render() {
        for (let i = 0; i < numPaths; i++) {
            let path = paths[i];
            let points = allPoints[i];
            let d = "";

            d += isRevealing ? `M 0 0 V ${points[0]} C` : `M 0 100 V ${points[0]} C`;

            for (let j = 0; j < numPoints - 1; j++) {
                let p = (j + 1) / (numPoints - 1) * 100;
                let cp = p - (1 / (numPoints - 1) * 100) / 2;
                d += ` ${cp} ${points[j]} ${cp} ${points[j + 1]} ${p} ${points[j + 1]}`;
            }

            d += isRevealing ? ` V 0 H 0` : ` V 100 H 0`;
            path.setAttribute("d", d);
        }
    }

    // 1. ENTER ANIMATION
    isRevealing = true;
    for (let i = 0; i < numPaths; i++) {
        for (let j = 0; j < numPoints; j++) { allPoints[i][j] = 100; }
    }
    render();
    overlay.classList.add('is-active');
    ariaHidden(overlay, false);

    setTimeout(() => {
        const entryTl = gsap.timeline({
            onUpdate: render,
            onComplete: () => {
                overlay.classList.remove('is-active');
                ariaHidden(overlay, true);
            },
            defaults: { ease: "expo.inOut", duration: 1.2 }
        });

        for (let i = 0; i < numPoints; i++) pointsDelay[i] = Math.random() * delayPointsMax;

        for (let i = 0; i < numPaths; i++) {
            let points = allPoints[i];
            let pathDelay = delayPerPath * (numPaths - i - 1);
            for (let j = 0; j < numPoints; j++) {
                entryTl.to(points, { [j]: 0, ease: "expo.out" }, pointsDelay[j] + pathDelay);
            }
        }
    }, 100);

    // 2. RETURN EXIT FUNCTION
    return function playExit(href) {
        isRevealing = false;
        for (let i = 0; i < numPaths; i++) {
            for (let j = 0; j < numPoints; j++) { allPoints[i][j] = 100; }
        }
        render();

        overlay.classList.add('is-active');
        ariaHidden(overlay, false);

        const exitTl = gsap.timeline({
            onUpdate: render,
            onComplete: () => { window.location.href = href; },
            defaults: { ease: "expo.inOut", duration: 1.2 }
        });

        for (let i = 0; i < numPoints; i++) pointsDelay[i] = Math.random() * delayPointsMax;

        for (let i = 0; i < numPaths; i++) {
            let points = allPoints[i];
            let pathDelay = delayPerPath * i;
            for (let j = 0; j < numPoints; j++) {
                exitTl.to(points, { [j]: 0, ease: "expo.inOut" }, pointsDelay[j] + pathDelay);
            }
        }
    };
}

function initSlideTransition() {
    const overlay = document.querySelector('.sq-page-transition');
    const slide = document.querySelector('.sq-transition-slide');
    if (!overlay || !slide) return null;

    overlay.classList.add('is-active');
    ariaHidden(overlay, false);
    gsap.set(slide, { yPercent: 0 }); // Covering screen

    setTimeout(() => {
        gsap.to(slide, {
            yPercent: -100, // Pull up off screen
            duration: 1.2,
            ease: "expo.inOut",
            onComplete: () => {
                overlay.classList.remove('is-active');
                ariaHidden(overlay, true);
            }
        });
    }, 100);

    return function playExit(href) {
        gsap.set(slide, { yPercent: 100 }); // Stage at bottom
        overlay.classList.add('is-active');
        ariaHidden(overlay, false);

        gsap.to(slide, {
            yPercent: 0, // Push up to cover screen
            duration: 1.2,
            ease: "expo.inOut",
            onComplete: () => { window.location.href = href; }
        });
    };
}

function initBlindsTransition() {
    const overlay = document.querySelector('.sq-page-transition');
    const blinds = document.querySelectorAll('.blind-strip');
    if (!overlay || !blinds.length) return null;

    overlay.classList.add('is-active');
    ariaHidden(overlay, false);
    gsap.set(blinds, { yPercent: 0 });

    setTimeout(() => {
        gsap.to(blinds, {
            yPercent: -100,
            duration: 1.0,
            stagger: 0.1,
            ease: "expo.inOut",
            onComplete: () => {
                overlay.classList.remove('is-active');
                ariaHidden(overlay, true);
            }
        });
    }, 100);

    return function playExit(href) {
        gsap.set(blinds, { yPercent: 100 });
        overlay.classList.add('is-active');
        ariaHidden(overlay, false);

        gsap.to(blinds, {
            yPercent: 0,
            duration: 1.0,
            stagger: 0.1,
            ease: "expo.inOut",
            onComplete: () => { window.location.href = href; }
        });
    };
}

function initWaveTransition() {
    const overlay = document.querySelector('.sq-page-transition');
    const path = document.querySelector('.sq-transition-path');
    if (!overlay || !path) return null;

    // Based on codepen.md logic, but strictly animating properties via GSAP generic object tweening
    // because morphSVG requires both paths to have identical anchor point counts reliably.

    // We animate a 'progress' value and interpolate the path strings.
    // The curve handles 3 main points: [Left Y, Center Control Y, Right Y]
    // M 0 {L} V {C} Q 50 {CC} 100 {C} V {R} z (approx logic)

    // Easier approach matching the CodePen but doing the 3 anchor interpolation natively.
    // Mid point pulls up: M 0 100 V 50 Q 50 0 100 50 V 100 z
    let isRevealing = true;

    // Anchor object to tween
    let wavePoints = {
        sideY: 100,
        curveY: 100
    };

    function renderWave() {
        // Build the cubic/quad curve natively to avoid MorphSVG shape matching errors
        const d = `M 0 100 V ${wavePoints.sideY} Q 50 ${wavePoints.curveY} 100 ${wavePoints.sideY} V 100 z`;

        // If we are revealing the page upward, we actually want the shape to pull *off* the top.
        // The above path anchors to the bottom. So to pull off the top, we need to flip the anchor.
        const dReveal = `M 0 0 V ${wavePoints.sideY} Q 50 ${wavePoints.curveY} 100 ${wavePoints.sideY} V 0 z`;

        path.setAttribute("d", isRevealing ? dReveal : d);
    }

    // 1. ENTER ANIMATION (Page Load - Reversing the upward sweep)
    isRevealing = true;
    wavePoints.sideY = 100;
    wavePoints.curveY = 100;
    renderWave(); // Fully covered

    overlay.classList.add('is-active');
    ariaHidden(overlay, false);

    setTimeout(() => {
        let entryTl = gsap.timeline({
            onUpdate: renderWave,
            onComplete: () => {
                overlay.classList.remove('is-active');
                ariaHidden(overlay, true);
            }
        });

        // Pull up to -2 over two stages, ensuring it fully clears the screen
        entryTl.to(wavePoints, { sideY: 50, curveY: 100, ease: "power2.in", duration: 0.45 })
            .to(wavePoints, { sideY: -2, curveY: -2, ease: "power2.out", duration: 0.45 });
    }, 100);

    // 2. RETURN EXIT FUNCTION
    return function playExit(href) {
        isRevealing = false;
        wavePoints.sideY = 100;
        wavePoints.curveY = 100;
        renderWave(); // Start empty at bottom

        overlay.classList.add('is-active');
        ariaHidden(overlay, false);

        let exitTl = gsap.timeline({
            onUpdate: renderWave,
            onComplete: () => { window.location.href = href; }
        });

        // Push up to -2 over two stages to fully clear internal rendering boundaries
        exitTl.to(wavePoints, { sideY: 50, curveY: -2, ease: "power2.in", duration: 0.45 })
            .to(wavePoints, { sideY: -2, curveY: -2, ease: "power2.out", duration: 0.45 });
    };
}

function initPageTransitions() {
    const transitionType = document.body.dataset.sqTransition || 'disabled';
    if (transitionType === 'disabled') return;

    let triggerExit = null;

    if (transitionType === 'curve') triggerExit = initMathPathTransition('.shape-overlays__path');
    else if (transitionType === 'wave') triggerExit = initWaveTransition();
    else if (transitionType === 'slide') triggerExit = initSlideTransition();
    else if (transitionType === 'blinds') triggerExit = initBlindsTransition();

    if (!triggerExit) return;

    // --- SHARED LINK INTERCEPTION ---
    document.addEventListener('click', (e) => {
        const link = e.target.closest('a');
        if (!link) return;

        const href = link.getAttribute('href');
        if (!href || href.startsWith('#') || href.startsWith('javascript:') || link.getAttribute('target') === '_blank') return;

        try {
            const url = new URL(link.href, window.location.origin);
            if (url.origin !== window.location.origin) return;
            if (url.pathname === window.location.pathname && url.hash) return;
        } catch (err) { return; }

        e.preventDefault();
        triggerExit(href);
    });
}

function ariaHidden(el, bool) {
    if (bool) el.setAttribute('aria-hidden', 'true');
    else el.removeAttribute('aria-hidden');
}

document.addEventListener('DOMContentLoaded', () => {
    initPageTransitions();
});
