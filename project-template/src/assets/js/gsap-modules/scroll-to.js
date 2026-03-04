// src/assets/js/gsap-modules/scroll-to.js
import { gsap } from 'gsap';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';

gsap.registerPlugin(ScrollToPlugin);

export function init() {
    // Select all elements that have the [data-sq-scrollto] attribute
    const triggers = document.querySelectorAll('[data-sq-scrollto]');

    triggers.forEach(trigger => {
        // Read configuration from the attribute, fallback to empty string
        const configStr = trigger.getAttribute('data-sq-scrollto') || '';

        // Parse simple config (e.g., target: "#section2", duration: 1, offsetY: 120)
        // If the attribute contains just a string, we assume it's the target selector.
        let config = {};

        if (configStr.startsWith('{')) {
            try {
                // To allow unquoted keys like {target: "#id", offsetY: 50} we use a small regex replacer or Function constructor
                // A safe enough approach for typical declarative attributes:
                const sanitizedStr = configStr
                    .replace(/([{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":') // Quote keys
                    .replace(/:\s*'([^']*)'/g, ':"$1"'); // Convert single quotes to double quotes for values

                config = JSON.parse(sanitizedStr);
            } catch (e) {
                console.error('GSAP ScrollTo: Invalid JSON config in attribute', configStr, e);
            }
        } else if (configStr) {
            config.target = configStr;
        }

        // If target exists in config OR the trigger is an anchor tag, find the destination
        const destination = config.target || trigger.getAttribute('href');

        if (!destination || destination === '#') return;

        trigger.addEventListener('click', (e) => {
            e.preventDefault();

            gsap.to(window, {
                duration: config.duration || 1,
                scrollTo: {
                    y: destination,
                    offsetY: config.offsetY !== undefined ? config.offsetY : 0,
                    autoKill: true
                },
                ease: config.ease || "power2.out"
            });
        });
    });
}
