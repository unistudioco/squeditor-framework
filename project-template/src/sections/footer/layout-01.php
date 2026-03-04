<?php
// src/sections/footer/layout-01.php
// Custom footer layout example triggered by $footer_args['layout'] = 'layout-01'

$isDark = $isDark ?? false;
$footerClasses = 'sq--footer py-16';
if ($isDark) $footerClasses .= ' bg-zinc-900 text-white';
else $footerClasses .= ' bg-zinc-50 border-t';
?>
<footer id="sq_footer_01" class="<?= htmlspecialchars($footerClasses) ?>">
    <div class="max-w-7xl mx-auto px-6">
        
        <div class="flex flex-col md:flex-row justify-between items-center gap-8 mb-12">
            <div>
                <h2 class="text-3xl font-bold mb-4">Let's build something great.</h2>
                <p class="opacity-70 max-w-md">Layout 01 features a simplified, high-impact footer designed to drive immediate conversions.</p>
            </div>
            <a href="register.html" class="btn btn-lg btn-accent rounded-full px-8 shadow-xl hover:-translate-y-1 transition-transform">Start your free trial</a>
        </div>

        <hr class="border-zinc-200 dark:border-zinc-800 mb-8">

        <div class="flex flex-col md:flex-row justify-between items-center gap-4 text-sm opacity-60">
            <p>&copy; <?= date('Y') ?> <?= htmlspecialchars($site['name']) ?>. Layout 01 Active.</p>
            <div class="flex gap-6">
                <?php foreach ($site['socials'] as $platform => $url): ?>
                    <a href="<?= htmlspecialchars($url) ?>" class="hover:text-primary transition-colors">
                        <span data-uk-icon="icon: <?= htmlspecialchars($platform) ?>; ratio: 0.8"></span>
                    </a>
                <?php endforeach; ?>
            </div>
        </div>
        
    </div>
</footer>
