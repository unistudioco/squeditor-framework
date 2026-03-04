// src/assets/js/gsap-init.js
// Squeditor declarative GSAP engine - Next Gen
// Reads data-gsap, data-gsap-split, data-gsap-draw, data-gsap-scroll, data-gsap-smooth, data-gsap-trigger
// Full support for ScrollTrigger, timelines, SplitText, ScrollSmoother, DrawSVG 

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { ScrollSmoother } from 'gsap/ScrollSmoother';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { Observer } from 'gsap/observer';
import { TextPlugin } from 'gsap/TextPlugin';
import { MorphSVGPlugin } from 'gsap/MorphSVGPlugin';

gsap.registerPlugin(ScrollTrigger, SplitText, ScrollSmoother, DrawSVGPlugin, Observer, TextPlugin, MorphSVGPlugin);

// ------------------------------------------------------------------------------
// PARSER — converts attribute string to config object
// Handles nested objects: {y: -16, opacity: 0}, arrays/strings: "0% 100%"
// ------------------------------------------------------------------------------

function parseGsapAttr(attrString) {
    if (!attrString) return {};

    attrString = attrString.trim().replace(/;$/, '');

    function parseValue(val) {
        val = val.trim();
        if (val.startsWith('{') && val.endsWith('}')) {
            return parseObjectString(val);
        } else if (val.startsWith('[') && val.endsWith(']')) {
            return parseArrayString(val);
        } else if (val === 'true') {
            return true;
        } else if (val === 'false') {
            return false;
        } else {
            const numVal = parseFloat(val);
            const strippedVal = val.replace(/^['"]|['"]$/g, '');
            if (!isNaN(numVal) && !val.includes('%') && !val.includes(' ') && !val.includes('px') && strippedVal == numVal) {
                return numVal;
            } else {
                return strippedVal;
            }
        }
    }

    function parseArrayString(str) {
        const inner = str.slice(1, -1);
        let depth = 0;
        let inString = false;
        let stringChar = null;
        let currentItem = '';
        const items = [];
        for (let j = 0; j < inner.length; j++) {
            const c = inner[j];
            if (c === "'" || c === '"') {
                if (!inString) {
                    inString = true;
                    stringChar = c;
                } else if (stringChar === c) {
                    inString = false;
                    stringChar = null;
                }
            }
            if (!inString && (c === '{' || c === '[')) depth++;
            if (!inString && (c === '}' || c === ']')) depth--;

            if (!inString && c === ',' && depth === 0) {
                if (currentItem.trim()) items.push(parseValue(currentItem));
                currentItem = '';
            } else {
                currentItem += c;
            }
        }
        if (currentItem.trim()) items.push(parseValue(currentItem));
        return items;
    }

    function parseObjectString(str) {
        if (!str.startsWith('{') || !str.endsWith('}')) {
            str = `{${str}}`;
        }
        const obj = {};
        const inner = str.slice(1, -1);
        let depth = 0;
        let inString = false;
        let stringChar = null;
        let currentPair = '';
        const pairs = [];
        for (let j = 0; j < inner.length; j++) {
            const c = inner[j];

            if (c === "'" || c === '"') {
                if (!inString) {
                    inString = true;
                    stringChar = c;
                } else if (stringChar === c) {
                    inString = false;
                    stringChar = null;
                }
            }

            if (!inString && (c === '{' || c === '[')) depth++;
            if (!inString && (c === '}' || c === ']')) depth--;

            if (!inString && c === ',' && depth === 0) {
                pairs.push(currentPair);
                currentPair = '';
            } else {
                currentPair += c;
            }
        }
        if (currentPair) pairs.push(currentPair);

        pairs.forEach(pair => {
            const subColonIdx = pair.indexOf(':');
            if (subColonIdx === -1) return;
            const pKey = pair.slice(0, subColonIdx).trim();
            const pVal = pair.slice(subColonIdx + 1).trim();
            obj[pKey] = parseValue(pVal);
        });
        return obj;
    }

    if (attrString.startsWith('{') && attrString.endsWith('}')) {
        return parseObjectString(attrString);
    }

    if (attrString.startsWith('[') && attrString.endsWith(']')) {
        return parseArrayString(attrString);
    }

    const config = {};
    const parts = [];
    let current = '';
    let depth = 0;
    let inStringOuter = false;
    let stringCharOuter = null;

    for (let i = 0; i < attrString.length; i++) {
        const char = attrString[i];

        if (char === "'" || char === '"') {
            if (!inStringOuter) {
                inStringOuter = true;
                stringCharOuter = char;
            } else if (stringCharOuter === char) {
                inStringOuter = false;
                stringCharOuter = null;
            }
        }

        if (!inStringOuter && (char === '{' || char === '[')) depth++;
        if (!inStringOuter && (char === '}' || char === ']')) depth--;

        if (!inStringOuter && char === ';' && depth === 0) {
            parts.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    if (current) parts.push(current);

    parts.forEach(part => {
        const colonIdx = part.indexOf(':');
        if (colonIdx === -1) return;

        const key = part.slice(0, colonIdx).trim();
        const value = part.slice(colonIdx + 1).trim();

        config[key] = parseValue(value);
    });

    return config;
}

// ------------------------------------------------------------------------------
// HELPER — Create Tweens (handles from, to, and fromTo correctly)
// ------------------------------------------------------------------------------

function buildTweenArgs(config, childElement) {
    const baseVars = {
        duration: config.duration ?? 0.75,
        ease: config.ease ?? 'power2.out',
    };
    if (config.stagger !== undefined) {
        baseVars.stagger = config.stagger;
    }
    if (config.delay) baseVars.delay = config.delay;
    if (config.scroll) baseVars.scrollTrigger = config.scrollTrigger;

    // Resolve horizontal magic
    const resolveX = (varsObj) => {
        if (varsObj.x === 'horizontal' || varsObj.x === 'horizontal-reverse') {
            const dir = varsObj.x === 'horizontal' ? -1 : 1;
            varsObj.x = () => (childElement.scrollWidth - window.innerWidth) * dir;
            varsObj.ease = config.ease ?? 'none';
        }
    };

    if (config.from && config.to) {
        const fromVars = { ...config.from };
        const toVars = { ...baseVars, ...config.to };
        resolveX(fromVars);
        resolveX(toVars);
        return { method: 'fromTo', args: [fromVars, toVars] };
    } else if (config.from) {
        const vars = { ...baseVars, ...config.from };
        resolveX(vars);
        return { method: 'from', args: [vars] };
    } else {
        const vars = { ...baseVars, ...config.to };
        resolveX(vars);
        return { method: 'to', args: [vars] };
    }
}

// ------------------------------------------------------------------------------
// HELPER — Setup Triggers & Targets
// ------------------------------------------------------------------------------

function resolveTarget(el, config, isSplit) {
    if (config.selector) {
        let sel = config.selector;
        if (sel.startsWith('>')) {
            sel = `:scope ${sel}`;
        }
        const found = el.querySelectorAll(sel);
        return found.length > 0 ? Array.from(found) : el;
    }
    if (config.closest) {
        const parent = el.closest(config.closest);
        return parent ? parent : el;
    }
    // Text and Morph plugins should always target the parent element itself
    if (el.hasAttribute('data-gsap-text') || el.hasAttribute('data-gsap-morph')) {
        return el;
    }
    // DrawSVG applies to child vectors when placed on the SVG container
    if (el.hasAttribute('data-gsap-draw') && el.tagName.toLowerCase() === 'svg') {
        const found = el.querySelectorAll('path, line, polyline, polygon, rect, circle, ellipse');
        return found.length > 0 ? Array.from(found) : el;
    }

    // Auto-target children if stagger is implicitly declared anywhere in the payload
    const hasStagger = config.stagger !== undefined || config.to?.stagger !== undefined || config.from?.stagger !== undefined;
    if (hasStagger && !isSplit) {
        return Array.from(el.children);
    }

    return el;
}

function processSplitText(el, config) {
    // In trigger arrays, config.type will be 'split'. In that case, use splitType instead to determine the actual split method.
    let type = config.splitType || config.type;
    if (type === 'split' || !type) type = 'words,lines';

    const split = new SplitText(el, {
        type,
        linesClass: 'sq-split-line',
        wordsClass: 'sq-split-word',
        charsClass: 'sq-split-char',
    });
    if (type.includes('chars')) return split.chars;
    if (type.includes('words')) return split.words;
    return split.lines;
}

// ------------------------------------------------------------------------------
// INIT BOOT SEQUENCE
// ------------------------------------------------------------------------------

export function initGsapFeatures() {
    initScrollSmoother();
    initTimelines();           // Handles [data-gsap-timeline]
    initTimelineControls();    // Handles external [data-gsap-play/pause/reverse/toggle] buttons
    initScrollScenes();        // Handles [data-gsap-scroll]
    initStandaloneElements();  // Handles isolated [data-gsap], [data-gsap-split], [data-gsap-draw], [data-gsap-text], [data-gsap-morph]
    initInteractionTriggers(); // Handles hover, click
}

// 1. SCROLL SMOOTHER
function initScrollSmoother() {
    const smoothEl = document.querySelector('[data-gsap-smooth]');
    if (!smoothEl) return;

    const config = parseGsapAttr(smoothEl.getAttribute('data-gsap-smooth') || "");

    let wrapper = config.wrapper || '#smooth-wrapper';
    let content = config.content || '#smooth-content';

    if (smoothEl.tagName === 'BODY' && !document.querySelector(wrapper)) {
        const wrapperEl = document.createElement('div');
        wrapperEl.id = 'smooth-wrapper';
        const contentEl = document.createElement('div');
        contentEl.id = 'smooth-content';

        // Only wrap main content and footer to protect fixed headers
        const main = document.querySelector('#main-content');
        const footer = document.querySelector('footer');

        if (main) contentEl.appendChild(main);
        if (footer) contentEl.appendChild(footer);

        wrapperEl.appendChild(contentEl);
        document.body.appendChild(wrapperEl);

        wrapperEl.style.overflow = 'hidden';
        wrapperEl.style.position = 'fixed';
        wrapperEl.style.zIndex = '1';
        wrapperEl.style.top = '0';
        wrapperEl.style.left = '0';
        wrapperEl.style.right = '0';
        wrapperEl.style.bottom = '0';
        contentEl.style.width = '100%';

        wrapper = '#smooth-wrapper';
        content = '#smooth-content';
    }

    ScrollSmoother.create({
        wrapper: wrapper,
        content: content,
        smooth: config.smooth ?? 1.5,
        effects: config.effects ?? true,
        smoothTouch: config.smoothTouch ?? 0.1,
    });
}

// 2. SCROLL SCENES & MASTER TIMELINES
function initScrollScenes() {
    const scenes = document.querySelectorAll('[data-gsap-scroll]');

    scenes.forEach(sceneEl => {
        const sceneConfig = parseGsapAttr(sceneEl.getAttribute('data-gsap-scroll'));
        const isPinned = sceneConfig.pin === true;

        const children = Array.from(sceneEl.querySelectorAll('[data-gsap], [data-gsap-split], [data-gsap-draw], [data-gsap-text], [data-gsap-morph]'))
            .filter(child => child.closest('[data-gsap-scroll]') === sceneEl);

        let horizontalTarget = null;
        children.forEach(child => {
            const attr = child.getAttribute('data-gsap') || child.getAttribute('data-gsap-split') || child.getAttribute('data-gsap-draw') || child.getAttribute('data-gsap-text') || child.getAttribute('data-gsap-morph') || '';
            const cfg = parseGsapAttr(attr);
            if (cfg.to?.x === 'horizontal' || cfg.from?.x === 'horizontal' || cfg.to?.x === 'horizontal-reverse' || cfg.from?.x === 'horizontal-reverse') {
                horizontalTarget = child;
            }
        });

        const startPos = isPinned ? (sceneConfig.start ?? 'top top') : (sceneConfig.start ?? 'top center');

        let calculatedEnd = sceneConfig.end ?? 'bottom center';
        if (horizontalTarget) {
            // Match the codepen timing: pin for the total width of the element.
            calculatedEnd = sceneConfig.end ? sceneConfig.end : () => `+=${horizontalTarget.scrollWidth}`;
        }

        const tl = gsap.timeline({
            scrollTrigger: {
                trigger: sceneConfig.trigger ? document.querySelector(sceneConfig.trigger) : sceneEl,
                start: startPos,
                end: calculatedEnd,
                pin: isPinned,
                scrub: sceneConfig.scrub ?? false,
                pinSpacing: sceneConfig.pinSpacing ?? true,
                invalidateOnRefresh: true,
                markers: sceneConfig.markers ?? false,
                toggleActions: sceneConfig.toggleActions ?? 'play none none none'
            },
            defaults: {
                ease: sceneConfig.ease ?? 'none'
            }
        });

        children.forEach(child => {
            let attr = '';
            let isSplit = false;

            if (child.hasAttribute('data-gsap-split')) { attr = 'data-gsap-split'; isSplit = true; }
            else if (child.hasAttribute('data-gsap-draw')) { attr = 'data-gsap-draw'; }
            else if (child.hasAttribute('data-gsap-text')) { attr = 'data-gsap-text'; }
            else if (child.hasAttribute('data-gsap-morph')) { attr = 'data-gsap-morph'; }
            else attr = 'data-gsap';

            const config = parseGsapAttr(child.getAttribute(attr));
            let target = isSplit ? processSplitText(child, config) : resolveTarget(child, config, false);

            if (Array.isArray(target) && target[0] instanceof HTMLElement) {
                target.forEach(c => c.style.transition = 'none');
            } else if (target instanceof HTMLElement) {
                target.style.transition = 'none';
            }

            const { method, args } = buildTweenArgs(config, child);

            const position = String(config.position ?? (config.delay ? `<${config.delay}` : '<'));

            // Remove delay from toVars/fromVars if scrub avoids gap
            if (sceneConfig.scrub && position.startsWith('<')) {
                const varsObj = args.length === 2 ? args[1] : args[0]; // delay is always in the last argument
                delete varsObj.delay;
            }

            tl[method](target, ...args, position);
        });
    });
}

// 3. STANDALONE ELEMENTS & SIMPLE SCROLL TRIGGERS
function initStandaloneElements() {
    const standalone = document.querySelectorAll('[data-gsap], [data-gsap-split], [data-gsap-draw], [data-gsap-text], [data-gsap-morph]');

    standalone.forEach(child => {
        if (child.closest('[data-gsap-scroll]') || child.closest('[data-gsap-timeline]')) return;

        let attr = '';
        let isSplit = false;

        if (child.hasAttribute('data-gsap-split')) { attr = 'data-gsap-split'; isSplit = true; }
        else if (child.hasAttribute('data-gsap-draw')) { attr = 'data-gsap-draw'; }
        else if (child.hasAttribute('data-gsap-text')) { attr = 'data-gsap-text'; }
        else if (child.hasAttribute('data-gsap-morph')) { attr = 'data-gsap-morph'; }
        else attr = 'data-gsap';

        const config = parseGsapAttr(child.getAttribute(attr));

        if (config.scroll) {
            config.scrollTrigger = {
                trigger: config.trigger ? document.querySelector(config.trigger) : child,
                start: config.start ?? 'top 85%',
                toggleActions: config.toggleActions ?? 'play none none none',
                markers: config.markers ?? false
            };
        }

        const target = isSplit ? processSplitText(child, config) : resolveTarget(child, config, false);
        if (Array.isArray(target) && target[0] instanceof HTMLElement) {
            target.forEach(c => c.style.transition = 'none');
        } else if (target instanceof HTMLElement) {
            target.style.transition = 'none';
        }

        const { method, args } = buildTweenArgs(config, child);
        if (attr === 'data-gsap-text') {
            console.log("🔥 GSAP TEXT PLUGIN DEBUG:", {
                element: target,
                method: method,
                arguments: args,
                originalConfig: config
            });
        }
        gsap[method](target, ...args);
    });
}

// 3.5. AUTOPLAY TIMELINES
function initTimelines() {
    const timelines = document.querySelectorAll('[data-gsap-timeline]');

    timelines.forEach(timelineEl => {
        const tlConfig = parseGsapAttr(timelineEl.getAttribute('data-gsap-timeline'));
        const triggerType = timelineEl.getAttribute('data-gsap-trigger');

        if (triggerType === 'hover' || triggerType === 'click') {
            tlConfig.paused = true;
        }

        if (tlConfig.scroll) {
            tlConfig.scrollTrigger = {
                trigger: tlConfig.trigger ? document.querySelector(tlConfig.trigger) : timelineEl,
                start: tlConfig.start ?? 'top 85%',
                toggleActions: tlConfig.toggleActions ?? 'play none none none',
                markers: tlConfig.markers ?? false
            };
        }

        // Initialize timeline with data-gsap-timeline parameters (e.g. {delay: 1, repeat: -1, yoyo: true})
        const tl = gsap.timeline(tlConfig);
        timelineEl._sqTimeline = tl; // Bind to DOM node so external buttons can trigger it.

        // Find all GSAP-enabled children belonging to this specific timeline
        const children = Array.from(timelineEl.querySelectorAll('[data-gsap], [data-gsap-split], [data-gsap-draw], [data-gsap-text], [data-gsap-morph]'))
            .filter(child => child.closest('[data-gsap-timeline]') === timelineEl);

        children.forEach(child => {
            let attr = '';
            let isSplit = false;

            if (child.hasAttribute('data-gsap-split')) { attr = 'data-gsap-split'; isSplit = true; }
            else if (child.hasAttribute('data-gsap-draw')) { attr = 'data-gsap-draw'; }
            else if (child.hasAttribute('data-gsap-text')) { attr = 'data-gsap-text'; }
            else if (child.hasAttribute('data-gsap-morph')) { attr = 'data-gsap-morph'; }
            else attr = 'data-gsap';

            const config = parseGsapAttr(child.getAttribute(attr));
            let target = isSplit ? processSplitText(child, config) : resolveTarget(child, config, false);

            if (Array.isArray(target) && target[0] instanceof HTMLElement) {
                target.forEach(c => c.style.transition = 'none');
            } else if (target instanceof HTMLElement) {
                target.style.transition = 'none';
            }

            const { method, args } = buildTweenArgs(config, child);

            // By default GSAP timelines append ('>'). We allow users to explicitly declare `<` via position, 
            // or we use JS defaults if nothing is provided so that elements cascade sequentially.
            const position = config.position !== undefined ? String(config.position) : (config.delay ? `>${config.delay}` : '>');

            tl[method](target, ...args, position);
        });

        if (triggerType === 'hover') {
            timelineEl.addEventListener('mouseenter', () => tl.play());
            timelineEl.addEventListener('mouseleave', () => tl.reverse());
        } else if (triggerType === 'click') {
            let played = false;
            timelineEl.addEventListener('click', () => {
                if (played && tl.reversed() === false) {
                    tl.reverse();
                    played = false;
                } else {
                    tl.play();
                    played = true;
                }
            });
        }
    });
}

// 3.6. TIMELINE CONTROLS (External Play/Pause/Reverse/Toggle)
function initTimelineControls() {
    ['play', 'pause', 'reverse', 'toggle'].forEach(action => {
        const buttons = document.querySelectorAll(`[data-gsap-${action}]`);

        buttons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                if (btn.tagName === 'A') e.preventDefault();

                const selector = btn.getAttribute(`data-gsap-${action}`);
                if (!selector) return;

                const targets = document.querySelectorAll(selector);
                targets.forEach(t => {
                    const tl = t._sqTimeline;
                    if (tl) {
                        if (action === 'toggle') {
                            tl.reversed() ? tl.play() : tl.reverse();
                        } else {
                            tl[action]();
                        }
                    } else {
                        console.warn(`[GSAP initTimelineControls] Could not find initialized timeline on timeline wrapper: ${selector}`);
                    }
                });
            });
        });
    });
}

// 4. INTERACTIVE TRIGGERS
function initInteractionTriggers() {
    const triggers = document.querySelectorAll('[data-gsap-trigger]');

    triggers.forEach(el => {
        const triggerType = el.getAttribute('data-gsap-trigger');
        const rawAttr = el.getAttribute('data-gsap-trigger-anim');
        if (!rawAttr) return;

        let parsedConfigs = parseGsapAttr(rawAttr);
        // Force array structure for consistent iteration
        if (!Array.isArray(parsedConfigs)) {
            parsedConfigs = [parsedConfigs];
        }

        const applyTimeline = (tl) => {
            parsedConfigs.forEach((config) => {
                let target;
                if (config.type === 'split') {
                    const splitEls = resolveTarget(el, config, false);
                    if (Array.isArray(splitEls)) {
                        // Concatenate the split arrays from all matching elements
                        target = [];
                        splitEls.forEach(node => {
                            target = target.concat(processSplitText(node, config));
                        });
                    } else {
                        target = processSplitText(splitEls, config);
                    }
                } else {
                    target = resolveTarget(el, config, false);
                }

                const { method, args } = buildTweenArgs(config, el);
                const position = String(config.position ?? (config.delay ? `<${config.delay}` : '<'));

                // Allow fromTo, from, or to
                tl[method](target, ...args, position);
            });
            return tl;
        };

        if (triggerType === 'hover') {
            const hoverTl = applyTimeline(gsap.timeline({ paused: true }));

            el.addEventListener('mouseenter', () => hoverTl.play());
            el.addEventListener('mouseleave', () => hoverTl.reverse());
        }

        if (triggerType === 'click') {
            const clickTl = applyTimeline(gsap.timeline({ paused: true }));

            let played = false;
            el.addEventListener('click', () => {
                if (played && clickTl.reversed() === false) {
                    clickTl.reverse();
                    played = false;
                } else {
                    clickTl.play();
                    played = true;
                }
            });
        }
    });
}

// 5. CUSTOM CODEPEN LOGIC FOR HORIZONTAL
function initCodepenHorizontal() {
    if (document.getElementById("portfolio")) {
        const horizontalSections = gsap.utils.toArray(".horiz-gallery-wrapper");

        horizontalSections.forEach(function (sec, i) {
            const pinWrap = sec.querySelector(".horiz-gallery-strip");

            if (!pinWrap) return;

            let pinWrapWidth;
            let horizontalScrollLength;

            function refresh() {
                pinWrapWidth = pinWrap.scrollWidth;
                horizontalScrollLength = pinWrapWidth - window.innerWidth;
            }

            refresh();

            // Pinning and horizontal scrolling
            gsap.to(pinWrap, {
                scrollTrigger: {
                    scrub: true,
                    trigger: sec,
                    pin: sec,
                    start: "center center",
                    end: () => `+=${pinWrapWidth}`,
                    invalidateOnRefresh: true
                },
                x: () => -horizontalScrollLength,
                ease: "none"
            });

            ScrollTrigger.addEventListener("refreshInit", refresh);
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initGsapFeatures();
    initCodepenHorizontal();
});
