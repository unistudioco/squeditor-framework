<?php
// src/sections/hero/hero-centered.php
$badge = $badge ?? '';
$heading = $heading ?? 'Welcome to Our Website';
$subheading = $subheading ?? 'We build things that work.';
$cta_primary_text = $cta_primary_text ?? 'Get Started';
$cta_primary_url = $cta_primary_url ?? '#';
$cta_secondary_text = $cta_secondary_text ?? 'View Demo';
$cta_secondary_url = $cta_secondary_url ?? '#';
$mockup_image = $mockup_image ?? '';
?>
<section class="relative pt-24 pb-0 text-center overflow-hidden" data-uk-height-viewport="min-height: 600px; offset-top: true;">
  <div class="absolute top-0 left-0 right-0 bg-gradient-to-t from-black/5 dark:from-white/5 to-transparent -z-10" data-uk-height-viewport="min-height: 600px; offset-top: true;"></div>
  <div class="max-w-4xl mx-auto px-6">
    <?php if ($badge): ?>
      <span class="sq-badge"><?= htmlspecialchars($badge) ?></span>
    <?php endif; ?>
    
    <h1 class="text-4xl md:text-7xl mb-6 leading-tight tracking-tighter">
      <?= $heading ?>
    </h1>
    
    <p class="text-lg md:text-xl mb-10 max-w-2xl mx-auto leading-relaxed text-muted">
      <?= htmlspecialchars($subheading) ?>
    </p>
    
    <div class="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20">
      <a href="<?= htmlspecialchars($cta_primary_url) ?>" class="btn btn-secondary btn-lg w-full sm:w-auto hover:shadow-xl hover:-translate-y-1">
        <?= htmlspecialchars($cta_primary_text) ?>
      </a>
      <a href="<?= htmlspecialchars($cta_secondary_url) ?>" class="btn btn-ghost !border-2 !border-solid hover:!border-black/20 dark:!border-white/10 dark:hover:!border-white/20 !bg-transparent btn-lg w-full sm:w-auto hover:shadow-xl hover:-translate-y-1">
        <?= htmlspecialchars($cta_secondary_text) ?>
      </a>
    </div>

    <?php if ($mockup_image): ?>
      <div class="relative max-w-6xl mx-auto px-4 md:px-10">
        <div class="rounded-t-2xl border-x border-t border-zinc-100 shadow-2xl p-2 pb-0 bg-white/50 backdrop-blur-sm">
           <img src="<?= htmlspecialchars($mockup_image) ?>" class="w-full rounded-t-xl shadow-lg border border-zinc-100" alt="App Mockup">
        </div>
      </div>
    <?php endif; ?>
  </div>
</section>
