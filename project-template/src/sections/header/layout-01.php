<?php
// src/sections/header/layout-01.php

$isDark = $isDark ?? false;
$isFloat = $isFloat ?? false;

$headerClasses = 'sq--header w-full z-[1000]';
if ($isFloat) $headerClasses .= ' absolute top-0';
if ($isDark) $headerClasses .= ' dark-mode text-white bg-zinc-900';
else $headerClasses .= ' bg-white border-b';
?>
<header id="sq_header_01" class="<?= htmlspecialchars($headerClasses) ?>" data-uk-sticky="top: 80; cls-active: shadow-md border-b-0; animation: uk-animation-slide-top">
    <div class="max-w-7xl mx-auto px-6 h-24 flex items-center justify-between">
        
        <!-- Logo Left -->
        <a href="index.html" class="sq--logo flex items-center gap-3 group">
            <div class="w-8 h-8 bg-secondary text-white rounded-full flex items-center justify-center transition-transform group-hover:rotate-12">
                <i class="sq-icon-zap"></i>
            </div>
            <div>
                <h1 class="font-bold text-2xl m-0 leading-none"><?= htmlspecialchars($site['name']) ?></h1>
            </div>
        </a>

        <!-- Desktop Nav Right -->
        <div class="hidden md:flex items-center gap-8">
            <?php get_template_part('nav'); ?>
            <a href="contact.html" class="btn btn-secondary btn-md rounded-full px-6">Get in Touch</a>
        </div>

        <!-- Mobile Toggle -->
        <button class="md:hidden" data-uk-toggle="target: #sq_mobile_offcanvas" type="button" aria-label="Menu">
            <span data-uk-icon="icon: menu; ratio: 1.2"></span>
        </button>
    </div>
</header>
