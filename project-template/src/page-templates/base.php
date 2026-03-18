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

  <!-- FOUC Prevention Script for Dark Mode -->
  <script>
    (function () {
      try {
        var schema = localStorage.getItem('sq_schema');
        if (schema === 'dark') {
          document.documentElement.classList.add('sq-theme-dark');
          document.documentElement.classList.remove('sq-theme-light');
        } else if (schema === 'light') {
          document.documentElement.classList.add('sq-theme-light');
          document.documentElement.classList.remove('sq-theme-dark');
        }
      } catch (e) {}
    })();
    // Once the body is parsed, sync its class with the schema from localStorage
    document.addEventListener('DOMContentLoaded', function() {
        try {
            var schema = localStorage.getItem('sq_schema');
            if (schema === 'dark') {
                document.body.classList.add('sq-theme-dark');
                document.body.classList.remove('sq-theme-light');
            } else if (schema === 'light') {
                document.body.classList.add('sq-theme-light');
                document.body.classList.remove('sq-theme-dark');
            }
        } catch (e) {}
    });
  </script>
</head>
<?php
$enable_cursor = $enable_cursor ?? ($site['enable_cursor'] ?? true);
$cursor_config = $cursor_config ?? ($site['cursor_config'] ?? '');
?>
<body class="<?= htmlspecialchars($body_class) ?>" <?= $body_attr ?? '' ?> data-sq-transition="<?= htmlspecialchars($site['page_transition'] ?? 'curve') ?>" <?php if ($enable_cursor): ?>data-sq-cursor="<?= htmlspecialchars($cursor_config) ?>"<?php endif; ?>>

    <!-- Page Wrapper -->
    <div id="page-wrapper" class="sq-page-wrapper <?= htmlspecialchars($wrapper_class ?? 'relative overflow-clip') ?>">

        <?php get_template_part('header', $header_args ?? []); ?>

        <!-- Main Content -->
        <main id="main-content" class="sq-main-content <?= htmlspecialchars($main_class ?? 'relative z-20 bg-body') ?>">
            <?php echo $content ?? ''; ?>
        </main>

        <?php get_template_part('footer', $footer_args ?? []); ?>

    </div>

    <?php if (isset($extra_footer)) echo $extra_footer; ?>
    <?php require __DIR__ . '/offcanvas.php'; ?>
    
    <?php require __DIR__ . '/transition.php'; ?>

    <?php if ($site['demo_mode']): ?>
        <?php get_template_part('theme-switcher'); ?>
    <?php endif; ?>

    <?php require __DIR__ . '/body-scripts.php'; ?>


</body>
</html>
