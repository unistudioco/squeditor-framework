<?php
// src/template-parts/nav.php
$is_mobile = $mobile ?? false;
$nav_class = $is_mobile ? 'flex flex-col space-y-4' : 'flex space-x-8 items-center m-0 p-0';
?>
<nav>
  <ul class="<?= $nav_class ?>">
    <?php foreach ($site['nav'] as $item): ?>
      <li>
        <a href="<?= htmlspecialchars($item['url']) ?>" class="sq-nav-link">
          <?= htmlspecialchars($item['label']) ?>
        </a>
      </li>
    <?php endforeach; ?>
  </ul>
</nav>