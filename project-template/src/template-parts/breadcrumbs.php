<?php
// src/template-parts/breadcrumbs.php
$crumbs = $crumbs ?? [];
?>
<nav aria-label="Breadcrumb">
  <ol class="flex items-center space-x-2 text-sm">
    <li><a href="/" class="hover:text-primary">Home</a></li>
    <?php foreach ($crumbs as $crumb): ?>
      <li><span class="mx-2">/</span></li>
      <?php if (!empty($crumb['url'])): ?>
        <li><a href="<?= htmlspecialchars($crumb['url']) ?>" class="hover:text-primary"><?= htmlspecialchars($crumb['label']) ?></a></li>
      <?php else: ?>
        <li class="text-zinc-900 font-medium" aria-current="page"><?= htmlspecialchars($crumb['label']) ?></li>
      <?php endif; ?>
    <?php endforeach; ?>
  </ol>
</nav>
