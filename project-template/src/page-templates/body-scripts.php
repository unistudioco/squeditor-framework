<?php
// src/page-templates/body-scripts.php

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

if ($is_vite):
?>
  <!-- Vite Development Scripts -->
  <script src="<?= $vite_server ?>/assets/js/main.js" type="module"></script>
<?php else: ?>
  <!-- Production Static Scripts -->
  <script src="assets/js/main.js" type="module"></script>
<?php endif; ?>
