<?php
// src/config/site-config.php
// Global site data — available in all templates via $site

$site = [
    'name'        => 'My Project',
    'lang'        => 'en',
    'dir'         => 'ltr', // 'ltr' or 'rtl'
    'logo'        => 'assets/static/images/logo.svg',
    'description' => 'Squeditor project starter template.',
    'og_image'    => 'assets/static/images/og-default.png',
    'url'         => 'https://example.com',
    'page_transition' => 'disabled', // Options: 'curve', 'wave', 'blinds', 'slide', 'disabled'
    'enable_cursor'   => false,      // Global GSAP Cursor State
    'cursor_config'   => '',         // Default cursor settings
    'enable_theme_switcher' => true,  // Toggle the floating theme switcher

    'nav' => [
        ['label' => 'Products', 'url' => '#'],
        ['label' => 'Pricing', 'url' => '#'],
        ['label' => 'About', 'url' => '#'],
        ['label' => 'Contact', 'url' => '#'],
    ],

    'socials' => [
        'twitter'   => 'https://twitter.com/squeditor',
        'github'  => 'https://github.com/squeditor',
        'instagram' => 'https://instagram.com/squeditor',
    ],

    'contact' => [
        'email'   => 'hello@example.com',
        'phone'   => '+1 555 000 0000',
        'address' => '123 Main Street, City, Country',
    ],
];
