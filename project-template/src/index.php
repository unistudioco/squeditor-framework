<?php
// src/index.php
require_once __DIR__ . '/init.php';
/*|
title: Home — Squeditor
description: A Squeditor project starter template.
|*/

// Page config
$is_home    = true;
$page_title = 'Home — Squeditor';
$page_description = 'A Squeditor project starter template.';
$body_class = 'page-home';

// Header config
// $header_args = [
//     'layout'  => 'layout-01',
//     'isDark'  => false,
//     'isFloat' => true
// ];

// Footer config
// $footer_args = [
//     'layout'  => 'layout-01',
//     'isDark'  => true
// ];

// Content
ob_start();
?>

    <section class="py-32 md:py-48 flex items-center justify-center bg-gradient-to-b from-zinc-100 to-transparent" data-uk-height-viewport="offset-top: true">
        <div class="max-w-4xl mx-auto px-6 text-center">
            
            <h2 class="text-6xl font-bold tracking-tight mb-8 lg:px-8">
                Start building<span class="opacity-30"> creative websites</span> with Squeditor
            </h2>
            
            <p class="text-xl text-muted max-w-2xl mx-auto font-light leading-relaxed mb-12">
               You can now begin creating interactive GSAP experiences, modifying the UIKit configuration, and adding content to your template files.
            </p>

            <div class="flex items-center justify-center gap-4">
                <a href="https://squeditor.com/" class="btn btn-lg btn-secondary !px-8 !py-3 !rounded-full text-white font-medium hover:scale-105 transition-transform">
                    Try Squeditor
                </a>
                <a href="https://docs.squeditor.com/" class="btn btn-lg !px-8 !py-3 !rounded-full text-white font-medium !border !border-1 !border-solid !border-zinc-200 hover:scale-105 transition-transform">
                    View Docs
                </a>
            </div>

        </div>
    </section>

<?php
$content = ob_get_clean();
require SRC_PATH . '/page-templates/base.php';