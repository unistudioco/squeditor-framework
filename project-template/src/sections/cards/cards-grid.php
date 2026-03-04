<?php
// src/sections/cards/cards-grid.php
$items = $items ?? [];
$badge = $badge ?? '';
$heading = $heading ?? '';
$subheading = $subheading ?? '';
?>
<section class="py-32">
  <div class="max-w-7xl mx-auto px-6">
    <?php if ($heading): ?>
      <div class="text-center mb-20 max-w-3xl mx-auto">
        <?php if ($badge): ?>
          <span class="text-xs font-black tracking-widest text-secondary block mb-4"><?= htmlspecialchars($badge) ?></span>
        <?php endif; ?>
        <h2 class="text-3xl md:text-5xl font-bold mb-6"><?= htmlspecialchars($heading) ?></h2>
        <p class="text-lg text-muted leading-relaxed"><?= htmlspecialchars($subheading) ?></p>
      </div>
    <?php endif; ?>

    <div class="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-6">
      <?php foreach ($items as $card): ?>
        <div class="sq-card">
          <?php if (!empty($card['icon'])): ?>
            <div class="sq-icon-wrapper text-secondary mb-6">
              <i class="text-2xl <?= htmlspecialchars($card['icon']) ?>"></i>
            </div>
          <?php endif; ?>
          <h3 class="text-lg font-bold mb-3"><?= htmlspecialchars($card['title'] ?? 'Card Title') ?></h3>
          <p class="text-sm text-muted leading-relaxed"><?= htmlspecialchars($card['excerpt'] ?? 'Card description text.') ?></p>
        </div>
      <?php endforeach; ?>
    </div>
  </div>
</section>
