<?php
require_once __DIR__ . '/init.php';
/*|
title: Page Not Found
|*/
$page_title = '404 - Not Found';
$body_class = 'page-404';

ob_start();
?>
<section class="h-[75vh] flex items-center justify-center text-center">
  <div>
    <h1 class="text-9xl font-bold mb-4 opacity-20">404</h1>
    <h2 class="text-3xl font-bold mb-6">Page Not Found</h2>
    <p class="mb-8">The page you are looking for does not exist.</p>
    <a href="index.html" class="btn btn-secondary !h-10 px-10 rounded-full">Return Home</a>
  </div>
</section>
<?php
$content = ob_get_clean();
require __DIR__ . '/page-templates/base.php';
