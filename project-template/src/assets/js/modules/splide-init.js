import Splide, { EventInterface } from '@splidejs/splide';

// Splide CSS is handled separately by build-components.js → slider.min.css

/**
 * Creates a generic Slide Effect Transition component for Splide,
 * layering slides while preserving the physical list dimensions for native drag support,
 * and transitioning specific CSS properties (scale, blur, clip-path).
 */
function createEffectTransition(duration, easing, applyStylesFn) {
    return function CustomTransition(SplideInstance, Components) {
        const { bind } = EventInterface(SplideInstance);
        const { list } = Components.Elements;
        let endCallback;
        let activeIndex = SplideInstance.index;

        function getBaseTransform(slideEl) {
            const slides = Components.Elements.slides;
            const idx = slides.indexOf(slideEl);
            // Overlaps the slide dynamically without destroying the container's physical width flow math
            const isVertical = SplideInstance.options.direction === 'ttb';
            return isVertical ? `translateY(-${100 * idx}%)` : `translateX(-${100 * idx}%)`;
        }

        function mount() {
            bind(list, 'transitionend', e => {
                const slides = Components.Elements.slides;
                if (endCallback && slides.includes(e.target)) {
                    endCallback();
                    endCallback = null;
                }
            });

            const setupSlides = () => {
                const slides = Components.Elements.slides;
                activeIndex = SplideInstance.index; // Reset on setup/refresh
                
                slides.forEach((slide, index) => {
                    slide.style.transition = 'none';
                    // We must NOT use absolute/grid because it destroys Splide's drag threshold math!
                    // Instead we shift the visual representation only, keeping the phantom DOM bounds intact:
                    const baseTransform = getBaseTransform(slide);
                    
                    slide.style.width = '100%';
                    slide.style.margin = '0'; // override any Splide inline margins
                    slide.style.transformOrigin = 'center';

                    if (index === activeIndex) {
                        slide.style.opacity = '1';
                        slide.style.zIndex = '1';
                        slide.style.pointerEvents = 'auto'; // Active slide gets clicks
                        applyStylesFn(slide, 'in', baseTransform);
                    } else {
                        slide.style.opacity = '0';
                        slide.style.zIndex = '0';
                        slide.style.pointerEvents = 'none'; // Prevent invisible slides from absorbing clicks
                        applyStylesFn(slide, 'out', baseTransform);
                    }
                });
            };

            // Run immediately upon component mount and on every refresh
            setupSlides();
            SplideInstance.on('refresh', setupSlides);
        }

        function start(index, done) {
            const slides = Components.Elements.slides;
            const prevSlide = slides[activeIndex];
            const nextSlide = slides[index];

            // Update local tracker to the new index immediately
            activeIndex = index;

            if (!nextSlide || prevSlide === nextSlide) {
                done();
                return;
            }

            // Clean up unneeded slides right away to avoid visual glitches
            slides.forEach(slide => {
                if (slide !== prevSlide && slide !== nextSlide) {
                    const base = getBaseTransform(slide);
                    slide.style.transition = 'none';
                    slide.style.opacity = '0';
                    slide.style.zIndex = '0';
                    slide.style.pointerEvents = 'none';
                    applyStylesFn(slide, 'out', base);
                }
            });

            // Outgoing slide animation
            if (prevSlide) {
                const prevBase = getBaseTransform(prevSlide);
                prevSlide.style.transition = `all ${duration}ms ${easing}`;
                prevSlide.style.zIndex = '1';
                prevSlide.style.opacity = '0';
                prevSlide.style.pointerEvents = 'none';
                applyStylesFn(prevSlide, 'out', prevBase);
            }

            // Reset incoming slide to 'out' state before animating 'in'
            const nextBase = getBaseTransform(nextSlide);
            nextSlide.style.transition = 'none';
            nextSlide.style.zIndex = '2';
            nextSlide.style.opacity = '0';
            nextSlide.style.pointerEvents = 'none';
            applyStylesFn(nextSlide, 'out', nextBase);
            
            // Force browser flow flush so the 'out' state is registered visually
            void nextSlide.offsetWidth;

            // Incoming slide animation
            nextSlide.style.transition = `all ${duration}ms ${easing}`;
            nextSlide.style.opacity = '1';
            nextSlide.style.pointerEvents = 'auto'; // allow interaction
            applyStylesFn(nextSlide, 'in', nextBase);

            endCallback = done;

            // Failsafe timeout in case transitionend event gets skipped/missed
            setTimeout(() => {
                if (endCallback) {
                    endCallback();
                    endCallback = null;
                }
            }, duration + 50);
        }

        function cancel() {
            endCallback = null;
        }

        return { mount, start, cancel };
    };
}

/**
 * Pre-defined custom transitions
 * Developers can extend these following the Splide Docs.
 * Transition properties manipulate opacity automatically; use `applyStylesFn` for transforms.
 */
const CustomTransitions = {
    'scaleup': createEffectTransition(800, 'cubic-bezier(0.16, 1, 0.3, 1)', (slide, state, base) => {
        const trans = state === 'in' ? 'scale(1)' : 'scale(0.85)';
        slide.style.transform = `${base} ${trans}`;
    }),
    'scaledown': createEffectTransition(800, 'cubic-bezier(0.16, 1, 0.3, 1)', (slide, state, base) => {
        const trans = state === 'in' ? 'scale(1)' : 'scale(1.15)';
        slide.style.transform = `${base} ${trans}`;
    }),
    'blurfade': createEffectTransition(800, 'ease-in-out', (slide, state, base) => {
        slide.style.filter = state === 'in' ? 'blur(0px)' : 'blur(10px)';
        slide.style.transform = `${base} scale(1)`; // scale(1) required to prevent blur rendering bugs
    }),
    'reveal': createEffectTransition(1000, 'cubic-bezier(0.85, 0, 0.15, 1)', (slide, state, base) => {
        slide.style.clipPath = state === 'in' ? 'inset(0 0 0 0)' : 'inset(100% 0 0 0)';
        const trans = state === 'in' ? 'translateY(0%)' : 'translateY(15%)';
        slide.style.transform = `${base} ${trans}`;
    }),
};

/**
 * Initializes all Splide sliders on the page
 * Configuration is inherently read by Splide directly from the valid JSON `data-splide` attribute
 */
export function initSplide() {
    const splides = document.querySelectorAll('.splide');
    splides.forEach(el => {
        try {
            let optionsStr = el.getAttribute('data-splide');
            let requestedType = null;
            let overrideOptions = {};

            if (optionsStr) {
                const options = JSON.parse(optionsStr);
                
                if (options.type && CustomTransitions[options.type]) {
                    requestedType = options.type;
                    
                    // Force the slider into 'fade' mode so the core engine expects stacked slides natively,
                    // apply 'rewind' to emulate the infinite looping of our custom transitions.
                    overrideOptions = { type: 'fade', rewind: true };

                    // CRITICAL: Splide natively parses the DOM attribute directly inside its constructor!
                    // We must alter the original DOM data string before init so it doesn't overwrite 'fade' back
                    options.type = 'fade';
                    el.setAttribute('data-splide', JSON.stringify(options));
                }
            }

            const splide = new Splide(el, overrideOptions);

            if (requestedType && CustomTransitions[requestedType]) {
                splide.mount({}, CustomTransitions[requestedType]);
            } else {
                splide.mount();
            }
        } catch (e) {
            console.error('[Squeditor] Error initializing Splide slider', el, e);
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    initSplide();
});
