<?php
// src/page-templates/base.php

// Page defaults (overridden by individual pages before including base.php)
$page_title       = $page_title       ?? $site['name'];
$page_description = $page_description ?? $site['description'];
$page_og_image    = $page_og_image    ?? $site['og_image'];
// Global body classes derived from theme/schema
$theme_class  = 'theme-' . htmlspecialchars($site['theme']);
$schema_class = 'sq-theme-' . htmlspecialchars($site['schema']);
$body_class   = trim($theme_class . ' ' . $schema_class . ' ' . ($body_class ?? ''));

?>
<!DOCTYPE html>
<html lang="<?= $site['lang'] ?? 'en' ?>">
<head>
<?php require __DIR__ . '/head.php'; ?>
<?php if (isset($extra_head)) echo $extra_head; ?>
</head>
<?php
$enable_cursor = $enable_cursor ?? ($site['enable_cursor'] ?? true);
$cursor_config = $cursor_config ?? ($site['cursor_config'] ?? '');
?>
<body class="<?= htmlspecialchars($body_class) ?>" <?= $body_attr ?? '' ?> data-sq-transition="<?= htmlspecialchars($site['page_transition'] ?? 'curve') ?>" <?php if ($enable_cursor): ?>data-sq-cursor="<?= htmlspecialchars($cursor_config) ?>"<?php endif; ?>>

  <?php get_template_part('header', $header_args ?? []); ?>

  <main id="main-content">
    <?php echo $content ?? ''; ?>
  </main>

  <?php get_template_part('footer', $footer_args ?? []); ?>

<?php require __DIR__ . '/body-scripts.php'; ?>
<?php if (isset($extra_footer)) echo $extra_footer; ?>
<?php require __DIR__ . '/transition.php'; ?>

<?php if ($site['demo_mode']): ?>
    <?php get_template_part('theme-switcher'); ?>
<?php endif; ?>

</body>
</html>
