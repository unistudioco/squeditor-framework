<?php
// src/template-parts/nav.php
$is_mobile = $mobile ?? false;
$nav_class = $is_mobile ? 'flex flex-col space-y-4' : 'flex space-x-2 items-center m-0 p-0';
?>
<nav>
  <ul class="<?= $nav_class ?>">
    <?php foreach ($site['nav'] as $item): ?>
      <li>
        <a href="<?= htmlspecialchars($item['url']) ?>" class="sq-nav-link text-base font-medium text-zinc-900 dark:text-white !text-opacity-70 hover:text-secondary hover:!text-opacity-100 transition-colors py-2 px-3">
          <?= htmlspecialchars($item['label']) ?>
        </a>
      </li>
    <?php endforeach; ?>
  </ul>
</nav>