<?php
// src/sections/cards/cards-horizontal.php
$items = $items ?? [];
?>
<section class="py-20">
  <div class="max-w-5xl mx-auto px-6 space-y-12">
    <?php foreach ($items as $card): ?>
      <div class="relative group flex flex-col md:flex-row sq-card !p-0 overflow-hidden shadow-sm">
        <div class="w-64 h-64">
          <img src="<?= htmlspecialchars($card['image'] ?? 'assets/static/images/placeholder.png') ?>" class="w-full h-full object-cover" alt="">
        </div>
        <div class="p-8 md:w-2/3 flex flex-col justify-center">
          <h3 class="text-2xl font-bold mb-3 tracking-tight"><?= htmlspecialchars($card['title'] ?? 'Title') ?></h3>
          <p class="leading-relaxed opacity-60"><?= htmlspecialchars($card['excerpt'] ?? 'Description') ?></p>
          <ul class="mt-4 leading-relaxed">
            <?php foreach ($card['features'] as $feature): ?>
              <li class="flex items-center gap-2"><i class="sq-icon-chevron-right opacity-30"></i> <?= htmlspecialchars($feature) ?></li>
            <?php endforeach; ?>
          </ul>
          <span class="absolute top-6 end-6 w-10 h-10 p-0 rounded-full flex items-center justify-center border border-zinc-200 dark:border-zinc-800 group-hover:-rotate-45 transition-transform duration-300">
            <i class="sq-icon-arrow-right"></i>
          </span>
        </div>
        <a href="#" class="absolute inset-0"></a>
      </div>
    <?php endforeach; ?>
  </div>
</section>
