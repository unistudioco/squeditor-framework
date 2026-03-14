<?php
// src/template-parts/header.php
// $site is available from site-config.php (already included by base.php)
$layout  = $layout ?? 'default';
$isDark  = $isDark  ?? false;
$isFloat = $isFloat ?? false;

$headerClasses = 'sq-header w-full z-[1000]';
if ($isFloat) {
    $headerClasses .= ' absolute top-0 left-0';
}
if ($isDark) {
    $headerClasses .= ' sq-theme-dark text-white';
}
?>
<!-- Site Header -->
<header id="sq_header" class="<?= htmlspecialchars($headerClasses) ?>" data-gsap="from: {y: -80, opacity: 0, filter: 'blur(20px)'}; duration: 0.75; ease: power4.out;">
  <div class="sq-header-inner max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">

    <!-- Logo -->
    <a href="index.html" class="sq--logo flex items-center gap-2 group">
      <div class="w-8 h-8 sq-bg-primary rounded-lg flex items-center justify-center transition-transform group-hover:scale-110">
        <i class="sq-icon-waves"></i>
      </div>
      <h1 class="font-bold text-xl m-0 tracking-tight"><?= htmlspecialchars($site['name']) ?></h1>
    </a>

    <!-- Desktop Nav (Centered) -->
    <div class="sq-header-nav items-center absolute left-1/2 -translate-x-1/2 hidden lg:flex">
      <?php get_template_part('nav'); ?>
    </div>

    <!-- Right Side / CTA -->
    <div class="sq-header-cta flex items-center gap-6">
       <a href="#" class="sq-nav-link p-0 hover:opacity-70 transition-opacity hidden md:inline-block">Log in</a>
       <a href="#" class="btn btn-primary rounded-full px-6 !hidden md:!inline-flex">
         <span>Get Started</span>
         <i class="sq-icon-arrow-right ml-2 opacity-50"></i>
       </a>
      
      <!-- Mobile Toggle -->
      <button class="sq-header-mobile-toggle inline-flex items-center justify-center w-8 h-8 lg:hidden" data-uk-toggle="target: #sq_mobile_offcanvas" type="button" aria-label="Menu">
        <span data-uk-icon="icon: menu; ratio: 1.2"></span>
      </button>
    </div>
  </div>
</header>