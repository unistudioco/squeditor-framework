<?php
// src/pages/swiper-test.php
require_once __DIR__ . '/init.php';

// Content
ob_start();
?>

<main id="main-content">
    <section class="py-24">
        <div class="max-w-7xl mx-auto px-6">
            <h1 class="text-4xl md:text-5xl font-bold mb-4 text-center">Multi-Slider Architecture</h1>
            <p class="text-lg text-muted text-center max-w-2xl mx-auto mb-16">
                Test the dynamic library injection framework. Switch between <code>swiper</code> and <code>splide</code> in your <code>squeditor.config.js</code> to see Vite dynamically bundle the correct dependencies or set <code>false</code> to disable it!
            </p>

            <!-- Splide Test -->
            <div class="mb-16 border-t pt-16">
                <div class="flex items-center justify-between">
                    <h2 class="text-2xl font-bold mb-6">Splide Slider</h2>
                    <p class="text-xs font-mono uppercase tracking-widest text-muted mb-4">Requires <code class="text-xs">slider: { library: 'splide' }</code> -> squeditor.config.js</p>
                </div>
                <div class="splide" data-splide='{
                  "type"       : "blurfade",
                  "perMove"    : 1,
                  "gap"        : 16,
                  "autoplay"   : true,
                  "interval"   : 3000,
                  "pagination" : true,
                  "breakpoints": {
                    "1024": { "perPage": 1, "gap": "1rem" },
                    "768" : { "perPage": 1, "gap": "0.75rem" },
                    "480" : { "perPage": 1, "arrows": false }
                  }
                }'>
                  <div class="splide__track">
                    <ul class="splide__list">
                    <?php for($i=1; $i<=6; $i++): ?>
                      <li class="splide__slide">
                        <div class="bg-muted text-dark h-full min-h-[24rem] rounded-2xl flex items-center justify-center text-2xl font-bold">Slide <?= $i ?></div>
                      </li>
                    <?php endfor; ?>
                    </ul>
                  </div>
                </div>
            </div>

            <style>
                .splide__pagination__page.is-active {
                    background: var(--sq-color-primary);
                }
            </style>

            <!-- Demo 1: Basic Responsive Grid -->
            <div class="mb-8 border-t pt-16 mt-16">
                <div class="flex items-center justify-between">
                    <h2 class="text-2xl font-bold mb-6">Swiper Slider</h2>
                    <p class="text-xs font-mono uppercase tracking-widest text-muted mb-4">Requires <code class="text-xs">slider: { library: 'swiper' }</code> -> squeditor.config.js</p>
                </div>
                <div class="swiper rounded-2xl overflow-hidden shadow-sm"
                    data-sq-swiper="
                        slidesPerView: 1; 
                        spaceBetween: 20; 
                        breakpoints: { 
                            sm: { slidesPerView: 2 }, 
                            md: { slidesPerView: 3 }, 
                            lg: { slidesPerView: 4 } 
                        }"
                    >
                    <div class="swiper-wrapper">
                        <?php for($i=1; $i<=6; $i++): ?>
                            <div class="swiper-slide">
                                <div class="bg-muted text-dark aspect-square rounded-2xl flex items-center justify-center text-2xl font-bold">Slide <?= $i ?></div>
                            </div>
                        <?php endfor; ?>
                    </div>
                    <div class="swiper-pagination mt-6 relative !bottom-0 pb-4"></div>
                </div>
            </div>

        </div>
    </section>
</main>

<?php
$content = ob_get_clean();
require SRC_PATH . '/page-templates/base.php';