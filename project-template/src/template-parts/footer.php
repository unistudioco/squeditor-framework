<?php
// src/template-parts/footer.php
$layout  = $layout ?? 'default';
$isDark  = $isDark ?? false;

if ($layout !== 'default') {
    get_section('footer/' . $layout, get_defined_vars());
    return;
}
?>
<!-- Site Footer -->
<footer id="sq_footer" class="sq-footer py-12 md:py-18 lg:py-24 border-t dark:border-transparent dark:bg-black/40">
  <div class="sq-footer-inner max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-5 gap-6 md:gap-8 lg:gap-12">
    <div class="sq--footer--brand md:col-span-2">
      <div class="flex items-center gap-2 mb-6">
        <a href="index.html" class="sq--logo flex items-center gap-2 group">
          <div class="w-8 h-8 sq-bg-secondary rounded-lg flex items-center justify-center transition-transform group-hover:scale-110">
            <i class="sq-icon-zap"></i>
          </div>
          <h1 class="font-bold text-xl m-0 tracking-tight"><?= htmlspecialchars($site['name']) ?></h1>
        </a>
      </div>
      <p class="text-sm max-w-xs leading-relaxed mb-6">
        <?= htmlspecialchars($site['description']) ?>
      </p>
      <div class="flex gap-4">
        <?php foreach ($site['socials'] as $platform => $url): ?>
          <a href="<?= htmlspecialchars($url) ?>" class="hover:text-secondary transition-colors">
            <span data-uk-icon="icon: <?= htmlspecialchars($platform) ?>; ratio: 0.8"></span>
          </a>
        <?php endforeach; ?>
      </div>
    </div>
    
    <div class="sq--footer--links">
      <h3 class="font-bold text-sm mb-6">Product</h3>
      <ul class="space-y-4 text-sm">
        <li><a href="#" class="hover:text-secondary transition-colors">Editor</a></li>
        <li><a href="#" class="hover:text-secondary transition-colors">Framework</a></li>
        <li><a href="#" class="hover:text-secondary transition-colors">Templates</a></li>
        <li><a href="#" class="hover:text-secondary transition-colors">Pricing</a></li>
      </ul>
    </div>

    <div class="sq--footer--links">
      <h3 class="font-bold text-sm mb-6">Support</h3>
      <ul class="space-y-4 text-sm">
        <li><a href="#" class="hover:text-secondary transition-colors">Help Center</a></li>
        <li><a href="#" class="hover:text-secondary transition-colors">API Documentation</a></li>
        <li><a href="#" class="hover:text-secondary transition-colors">Community</a></li>
        <li><a href="#" class="hover:text-secondary transition-colors">FAQ</a></li>
      </ul>
    </div>
    
    <div class="sq--footer--links">
      <h3 class="font-bold text-sm mb-6">Resources</h3>
      <ul class="space-y-4 text-sm">
        <li><a href="#" class="hover:text-secondary transition-colors">Blog</a></li>
        <li><a href="#" class="hover:text-secondary transition-colors">Changelog</a></li>
        <li><a href="#" class="hover:text-secondary transition-colors">Freebies</a></li>
      </ul>
    </div>
  </div>
  <div class="sq-footer-divider max-w-7xl mx-auto px-6 mt-8 md:mt-12 lg:mt-16 mb-8">
    <hr>
  </div>
  <div class="sq-footer-bottom max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted">
    <p>&copy; <?= date('Y') ?> <?= htmlspecialchars($site['name']) ?>. Built with ❤️ by Expert Developers.</p>
    <div class="flex gap-8">
      <a href="#" class="hover:text-secondary transition-colors">Terms of Service</a>
      <a href="#" class="hover:text-secondary transition-colors">Privacy Policy</a>
    </div>
  </div>
</footer>