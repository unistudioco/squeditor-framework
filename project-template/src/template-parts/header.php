<?php
// src/template-parts/header.php
// $site is available from site-config.php (already included by base.php)
$layout  = $layout ?? 'default';
$isDark  = $isDark ?? false;
$isFloat = $isFloat ?? false;

if ($layout !== 'default') {
    get_section('header/' . $layout, get_defined_vars());
    return;
}
?>
<!-- Site Header -->
<header id="sq_header" class="sq--header absolute w-full top-0 z-[1000] bg-white dark:bg-zinc-900" data-gsap="from: {y: -80, opacity: 0}; to: {y: 0, opacity: 1}; duration: 1.2; ease: expo.inOut;">
  <div class="sq--header--inner max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">

    <!-- Logo -->
    <a href="index.html" class="sq--logo flex items-center gap-2 group">
      <div class="w-8 h-8 sq-bg-secondary rounded-lg flex items-center justify-center transition-transform group-hover:scale-110">
        <i class="sq-icon-waves"></i>
      </div>
      <h1 class="font-bold text-xl m-0 tracking-tight"><?= htmlspecialchars($site['name']) ?></h1>
    </a>

    <!-- Desktop Nav (Centered) -->
    <div class="sq--header--nav hidden md:flex items-center absolute left-1/2 -translate-x-1/2">
      <?php get_template_part('nav'); ?>
    </div>

    <!-- Right Side / CTA -->
    <div class="sq--header--cta flex items-center gap-6">
       <a href="#" class="sq-nav-link text-base font-medium text-zinc-900 dark:text-white !text-opacity-70 hover:text-secondary hover:!text-opacity-100 transition-colors hidden md:inline-block">Log in</a>
       <a href="https://squeditor.com/" class="btn btn-secondary !hidden md:!inline-flex">Try Squeditor</a>
      
      <!-- Mobile Toggle -->
      <button class="sq--header--mobile--toggle md:hidden" data-gsap-toggle="#sq_offcanvas_creative" type="button" aria-label="Menu">
        <span data-uk-icon="icon: menu; ratio: 1.5"></span>
      </button>
    </div>
  </div>
</header>

<!-- Mobile Offcanvas Nav -->
<div id="sq_mobile_offcanvas" data-uk-offcanvas="flip: true; overlay: true">
  <div class="uk-offcanvas-bar">
    <?php get_template_part('nav', ['mobile' => true]); ?>
  </div>
</div>

<!-- Creative Offcanvas -->
<div id="sq_offcanvas_creative" class="sq-offcanvas-creative fixed inset-0 z-[9999] pointer-events-none text-zinc-600 shadow-2xl" style="visibility: hidden" data-gsap-timeline="{paused: true}">

    <!-- Backdrop Overlay -->
    <div class="sq-offcanvas-creative--close fixed inset-0 z-10 pointer-events-auto bg-black/50 backdrop-blur-md" data-gsap-reverse="#sq_offcanvas_creative" data-gsap="position: '<'; from: {autoAlpha: 0, duration: 0.25, ease: 'power3.out'}"></div>
    
    <!-- Offcanvas Background Panel -->
    <div class="absolute top-0 left-0 w-full md:w-1/3 h-full bg-white shadow-2xl flex flex-col items-start justify-start z-20 pointer-events-auto" data-gsap="position: '-=0.3'; from: {xPercent: -100, duration: 0.6, ease: 'power4.inOut'}" data-sq-cursor-color="#4f46e5">
        
        <!-- Header -->
        <div class="flex items-center justify-between w-full p-6 lg:p-12" data-gsap="from: {yPercent: -20, opacity: 0, duration: 0.4, ease: 'power3.out'}">
            <a href="#" class="sq-logo text-xl font-bold text-zinc-900" data-sq-cursor-stick>Squeditor</a>
            <button data-gsap-reverse="#sq_offcanvas_creative" class="opacity-50 hover:opacity-100 transition-opacity" data-sq-cursor-stick>
                <span data-uk-icon="icon: close; ratio: 1.5"></span>
            </button>
        </div>
        

        <ul class="flex flex-col items-start justify-start gap-6 w-full p-6 lg:p-12">
            <li class="overflow-hidden">
                <div data-gsap="position: '>-0.2'; from: {yPercent: 100, opacity: 0, duration: 0.4, ease: 'power3.out'}">
                    <a class="text-4xl font-bold text-zinc-900 hover:text-zinc-900 transition-colors duration-300" href="index.html">Home</a>
                </div>
            </li>
            <li class="overflow-hidden">
                <div data-gsap="position: '<0.1'; from: {yPercent: 100, opacity: 0, duration: 0.4, ease: 'power3.out'}">
                    <a class="text-4xl font-bold text-zinc-900 hover:text-zinc-900 transition-colors duration-300" href="work.html">Work</a>
                </div>
            </li>
            <li class="overflow-hidden">
                <div data-gsap="position: '<0.1'; from: {yPercent: 100, opacity: 0, duration: 0.4, ease: 'power3.out'}">
                    <a class="text-4xl font-bold text-zinc-900 hover:text-zinc-900 transition-colors duration-300" href="services.html">Services</a>
                </div>
            </li>
            <li class="overflow-hidden">
                <div data-gsap="position: '<0.1'; from: {yPercent: 100, opacity: 0, duration: 0.4, ease: 'power3.out'}">
                    <a class="text-4xl font-bold text-zinc-900 hover:text-zinc-900 transition-colors duration-300" href="about.html">About</a>
                </div>
            </li>
            <li class="overflow-hidden">
                <div data-gsap="position: '<0.1'; from: {yPercent: 100, opacity: 0, duration: 0.4, ease: 'power3.out'}">
                    <a class="text-4xl font-bold text-zinc-900 hover:text-zinc-900 transition-colors duration-300" href="contact.html">Get in touch</a>
                </div>
            </li>
            <li class="overflow-hidden mt-4">
                <div data-gsap="position: '<0.1'; from: {yPercent: 100, opacity: 0, duration: 0.4, ease: 'power3.out'}">
                    <a class="text-xl font-bold text-zinc-400 hover:text-zinc-900 transition-colors duration-300" href="blog.html">Blog</a>
                </div>
            </li>
            <li class="overflow-hidden">
                <div data-gsap="position: '<0.1'; from: {yPercent: 100, opacity: 0, duration: 0.4, ease: 'power3.out'}">
                    <a class="text-xl font-bold text-zinc-400 hover:text-zinc-900 transition-colors duration-300" href="style-guide.html">Style Guide</a>
                </div>
            </li>
            <li class="overflow-hidden">
                <div data-gsap="position: '<0.1'; from: {yPercent: 100, opacity: 0, duration: 0.4, ease: 'power3.out'}">
                    <a class="text-xl font-bold text-zinc-400 hover:text-zinc-900 transition-colors duration-300" href="gsap-demo.html">Demos</a>
                </div>
            </li>
        </ul>

        <div class="flex items-center gap-4 w-full p-6 lg:p-12" data-gsap="position: '<0.1'; from: {yPercent: 10, opacity: 0, duration: 0.4, ease: 'power3.out'}">
            <a href="#" class="w-12 h-12 flex items-center justify-center rounded-full bg-zinc-100 hover:bg-zinc-200 transition-colors duration-300" data-sq-cursor-stick>
              <span data-uk-icon="icon: facebook; ratio: 1"></span>
            </a>
            <a href="#" class="w-12 h-12 flex items-center justify-center rounded-full bg-zinc-100 hover:bg-zinc-200 transition-colors duration-300" data-sq-cursor-stick>
              <span data-uk-icon="icon: github; ratio: 1"></span>
            </a>
        </div>
    </div>
</div>