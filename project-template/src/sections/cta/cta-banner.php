<?php
// src/sections/cta/cta-banner.php
$heading = $heading ?? 'Ready to start?';
$subheading = $subheading ?? '';
$button_text = $button_text ?? 'Get Started';
$button_url = $button_url ?? '#';
$secondary_button_text = $secondary_button_text ?? '';
$hint_text = $hint_text ?? '';
?>
<section class="py-32 text-center border-t border-zinc-300 border-opacity-30 dark:border-opacity-5">
  <div class="max-w-4xl mx-auto px-6">
    <h2 class="text-4xl md:text-5xl font-bold mb-4 tracking-tighter">
        <?= $heading ?>
    </h2>
    <p class="text-lg mb-10 leading-relaxed max-w-2xl mx-auto text-muted">
        <?= htmlspecialchars($subheading) ?>
    </p>
    <div class="flex flex-col sm:flex-row items-center justify-center gap-4">
      <a href="<?= htmlspecialchars($button_url) ?>" class="btn btn-secondary btn-lg w-full sm:w-auto hover:shadow-xl transition-all hover:-translate-y-1">
        <?= htmlspecialchars($button_text) ?>
      </a>
      <?php if ($secondary_button_text): ?>
        <a href="#" class="btn btn-ghost btn-lg w-full sm:w-auto transition-all">
          <?= htmlspecialchars($secondary_button_text) ?>
        </a>
      <?php endif; ?>
    </div>
    <?php if ($hint_text): ?>
      <div class="mt-3">
        <span class="text-sm text-muted"><?= htmlspecialchars($hint_text) ?></span>
      </div>
    <?php endif; ?>
  </div>
</section>
