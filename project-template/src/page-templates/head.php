<?php
// src/page-templates/head.php

$is_snapshot = getenv('SQUEDITOR_SNAPSHOT') === '1' || (isset($_GET['snapshot']) && $_GET['snapshot'] === '1');
$vite_port   = getenv('SQUEDITOR_VITE_PORT') ?: '5173';
$vite_server = "http://127.0.0.1:{$vite_port}";
$is_vite     = false;

if (!$is_snapshot) {
    $fp = @fsockopen('127.0.0.1', $vite_port, $errno, $errstr, 0.05);
    if ($fp) {
        $is_vite = true;
        fclose($fp);
    }
}

// Load slider config for conditional CSS loading
$active_slider = false;
if (file_exists(__DIR__ . '/../config/active-slider.php')) {
    require_once __DIR__ . '/../config/active-slider.php';
}

// Load active themes for conditional theme CSS loading
$theme_entries = [];
if (file_exists(__DIR__ . '/../config/theme-entries.php')) {
    require_once __DIR__ . '/../config/theme-entries.php';
}
?>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title><?= htmlspecialchars($page_title) ?></title>
  <meta name="description" content="<?= htmlspecialchars($page_description) ?>">
  
  <!-- Typography -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@100;200;300;400;500;600;700&family=TASA+Orbiter:wght@400..800&display=swap" rel="stylesheet">

  <!-- Open Graph -->
  <meta property="og:title"       content="<?= htmlspecialchars($page_title) ?>">
  <meta property="og:description" content="<?= htmlspecialchars($page_description) ?>">
  <meta property="og:image"       content="assets/static/images/og-default.png">
  <meta property="og:type"        content="website">

  <!-- Squeditor CSS -->
<?php if ($is_vite): ?>
  <!-- Vite Development Environment -->
  <script type="module" src="<?= $vite_server ?>/@vite/client"></script>
  <link rel="stylesheet" href="<?= $vite_server ?>/assets/css/fonts.css">
  <link rel="stylesheet" href="<?= $vite_server ?>/assets/css/squeditor-icons.css">
  <?php if ($active_slider): ?><link rel="stylesheet" href="<?= $vite_server ?>/assets/css/slider.min.css"><?php endif; ?>
  <link rel="stylesheet" href="<?= $vite_server ?>/assets/css/tailwind.css">
  <script type="module" src="<?= $vite_server ?>/assets/scss/main.scss"></script>
  <?php if ($site['demo_mode']): ?>
      <?php foreach ($theme_entries as $themeKey): ?>
          <script type="module" src="<?= $vite_server ?>/assets/scss/theme-<?= htmlspecialchars($themeKey) ?>.scss"></script>
      <?php endforeach; ?>
  <?php else: ?>
      <?php 
      $current_page = basename($_SERVER['PHP_SELF']); 
      // Handle extensionless requests in dev
      if ($current_page === 'index.php' && $_SERVER['REQUEST_URI'] !== '/index.php' && $_SERVER['REQUEST_URI'] !== '/') {
          $current_page = ltrim(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), '/') . '.php';
      }
      if (isset($active_themes[$current_page])): 
          $theme_key = $active_themes[$current_page];
      ?>
          <script type="module" src="<?= $vite_server ?>/assets/scss/theme-<?= htmlspecialchars($theme_key) ?>.scss"></script>
      <?php endif; ?>
  <?php endif; ?>
  <style>html.js-fouc { opacity: 0; transition: opacity 0.15s ease-out; }</style>
  <script>document.documentElement.classList.add('js-fouc');</script>
<?php else: ?>
  <!-- Production Static Assets -->
  <link rel="stylesheet" href="assets/css/fonts.css">
  <link rel="stylesheet" href="assets/css/squeditor-icons.css">
  <?php if ($active_slider): ?><link rel="stylesheet" href="assets/css/slider.min.css"><?php endif; ?>
  <link rel="stylesheet" href="assets/css/tailwind.css">
  <link rel="stylesheet" href="assets/css/main.min.css">
  <?php if ($site['demo_mode']): ?>
      <?php foreach ($theme_entries as $themeKey): ?>
          <link rel="stylesheet" href="assets/css/theme-<?= htmlspecialchars($themeKey) ?>.min.css">
      <?php endforeach; ?>
  <?php else: ?>
      <?php 
      $current_page = basename($_SERVER['PHP_SELF']); 
      if (isset($active_themes[$current_page])): 
          $theme_key = $active_themes[$current_page];
      ?>
          <link rel="stylesheet" href="assets/css/theme-<?= htmlspecialchars($theme_key) ?>.min.css">
      <?php endif; ?>
  <?php endif; ?>
<?php endif; ?>

<!-- UIkit Components JS (Early Init) -->
<?php if ($is_vite): ?>
  <script src="<?= $vite_server ?>/assets/js/uikit-components.js"></script>
<?php else: ?>
  <script src="assets/js/uikit-components.js"></script>
<?php endif; ?>