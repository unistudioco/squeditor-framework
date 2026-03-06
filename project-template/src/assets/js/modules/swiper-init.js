import Swiper from 'swiper';
import { Navigation, Pagination, Autoplay, Parallax, Thumbs, EffectFade, FreeMode } from 'swiper/modules';

// Swiper CSS is handled separately by build-components.js → slider.min.css

function splitTopLevel(str, delimiters = [';', ',']) {
    const result = [];
    let current = '';
    let braceDepth = 0;
    
    for (let i = 0; i < str.length; i++) {
        const char = str[i];
        if (char === '{') braceDepth++;
        if (char === '}') braceDepth--;
        
        if (braceDepth === 0 && delimiters.includes(char)) {
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    if (current) result.push(current);
    return result;
}

/**
 * Parses a string like "slidesPerView: 1; md: {slidesPerView: 3}; loop: true"
 * into a valid JavaScript object.
 */
function parseSwiperOptions(optionString) {
    if (!optionString) return {};
    
    const options = {};
    const statements = splitTopLevel(optionString, [';', ',']);
    
    statements.forEach(statement => {
        statement = statement.trim();
        if (!statement) return;
        
        const firstColon = statement.indexOf(':');
        if (firstColon > -1) {
            const key = statement.slice(0, firstColon).trim();
            let rawValue = statement.slice(firstColon + 1).trim();
            
            // Handle nested objects
            if (rawValue.startsWith('{') && rawValue.endsWith('}')) {
                const innerString = rawValue.slice(1, -1);
                options[key] = parseSwiperOptions(innerString);
            } else {
                options[key] = parsePrimitive(rawValue);
            }
        }
    });
    
    return options;
}

function parsePrimitive(val) {
    if (val === 'true') return true;
    if (val === 'false') return false;
    if (val === 'null') return null;
    
    // Check if it's a number
    if (!isNaN(vanillaParseFloat(val))) {
        return vanillaParseFloat(val);
    }
    
    // Remove wrapping quotes if they exist
    if ((val.startsWith("'") && val.endsWith("'")) || (val.startsWith('"') && val.endsWith('"'))) {
        return val.slice(1, -1);
    }
    
    return val;
}

function vanillaParseFloat(val) {
    if(typeof val === 'string' && val.trim() === '') return NaN;
    return Number(val);
}

/**
 * Maps Tailwind breakpoints to Swiper breakpoints
 */
function mapBreakpoints(options) {
    const swiperBreakpoints = {};
    const tailwindScreens = {
        'sm': 640,
        'md': 768,
        'lg': 1024,
        'xl': 1280,
        '2xl': 1536
    };
    
    let hasBreakpoints = false;
    
    // 1. Move root-level 'sm', 'md' directly into swiperBreakpoints
    Object.keys(tailwindScreens).forEach(screen => {
        if (options[screen]) {
            hasBreakpoints = true;
            swiperBreakpoints[tailwindScreens[screen]] = options[screen];
            delete options[screen]; // Remove from root options
        }
    });

    // 2. Process nested options.breakpoints if it exists
    if (options.breakpoints) {
        hasBreakpoints = true;
        Object.keys(options.breakpoints).forEach(key => {
            if (tailwindScreens[key]) {
                swiperBreakpoints[tailwindScreens[key]] = options.breakpoints[key];
            } else {
                swiperBreakpoints[key] = options.breakpoints[key];
            }
        });
    }
    
    if (hasBreakpoints && Object.keys(swiperBreakpoints).length > 0) {
        options.breakpoints = swiperBreakpoints;
    }
    
    return options;
}

/**
 * Initializes Swiper instance for a single element
 */
function initSwiperElement(el) {
    // Prevent double initialization
    if (el.swiper) return;

    const rawOptions = el.getAttribute('data-sq-swiper') || '';
    let parsedOptions = parseSwiperOptions(rawOptions);
    parsedOptions = mapBreakpoints(parsedOptions);

    // Default Configuration
    const config = {
        modules: [Navigation, Pagination, Autoplay, Parallax, Thumbs, EffectFade, FreeMode],
        speed: 600,
        // Optional navigation
        navigation: {},
        // Optional pagination
        pagination: {
            clickable: true
        },
        ...parsedOptions
    };

    // Apply custom detached navigation if specified
    if (parsedOptions.navNext || parsedOptions.navPrev) {
        config.navigation = {
            nextEl: parsedOptions.navNext || null,
            prevEl: parsedOptions.navPrev || null
        };
        // Clean up root
        delete config.navNext;
        delete config.navPrev;
    }

    // Apply custom detached pagination if specified
    if (parsedOptions.paginationEl) {
        config.pagination = {
            el: parsedOptions.paginationEl,
            clickable: true,
            type: parsedOptions.paginationType || 'bullets'
        };
        delete config.paginationEl;
        delete config.paginationType;
    }

    // Handle Thumbs Gallery synchronization
    if (parsedOptions.thumbs) {
        const thumbTarget = document.querySelector(parsedOptions.thumbs);
        if (thumbTarget) {
            // First, ensure the thumb target is initialized
            if (!thumbTarget.swiper) {
                initSwiperElement(thumbTarget);
            }
            config.thumbs = {
                swiper: thumbTarget.swiper
            };
        }
    }

    // Ensure slider has basic class structure required by CSS
    if (!el.classList.contains('swiper')) {
        el.classList.add('swiper');
    }

    const wrapper = el.querySelector(':scope > div');
    if (wrapper && !wrapper.classList.contains('swiper-wrapper')) {
        wrapper.classList.add('swiper-wrapper');
    }

    const slides = wrapper ? wrapper.children : el.children;
    Array.from(slides).forEach(slide => {
        if (!slide.classList.contains('swiper-slide')) {
            slide.classList.add('swiper-slide');
        }
    });

    // Initialize!
    new Swiper(el, config);
}

/**
 * Global Initialization
 */
export function initSwiper() {
    const swipers = document.querySelectorAll('[data-sq-swiper]');
    swipers.forEach(initSwiperElement);
}

document.addEventListener('DOMContentLoaded', () => {
    initSwiper();
});
