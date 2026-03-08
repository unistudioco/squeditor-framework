<?php
// src/template-parts/page-title-bar.php
$title = $title ?? 'Page Title';
$subtitle = $subtitle ?? '';
$class = $class ?? 'py-20 text-center bg-muted dark:bg-opacity-40';
?>
<div class="<?= htmlspecialchars($class) ?>">
  <div class="max-w-7xl mx-auto px-6">
    <h1 class="text-4xl font-bold m-0"><?= htmlspecialchars($title) ?></h1>
    <?php if ($subtitle): ?>
      <p class="mt-4 text-base opacity-60"><?= htmlspecialchars($subtitle) ?></p>
    <?php endif; ?>
  </div>
</div>
