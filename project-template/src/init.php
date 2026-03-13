<?php
// src/init.php

// Require framework helpers
require_once __DIR__ . '/../../squeditor-framework/php/functions.php';

// Require site-wide config
require_once __DIR__ . '/config/site-config.php';

// Load site settings (demo mode vs customer mode)
$site['demo_mode'] = true; // Default
if (file_exists(__DIR__ . '/config/site-settings.php')) {
    require_once __DIR__ . '/config/site-settings.php';
    if (isset($site_settings['is_demo_mode'])) {
        $site['demo_mode'] = $site_settings['is_demo_mode'];
    }
}

// Define SRC_PATH for get_template_part() calls
define('SRC_PATH', __DIR__);

// Global Theme & Schema Detection
$active_theme  = $_GET['theme']  ?? null;
$active_schema = $_GET['schema'] ?? 'light';

if (!$active_theme) {
    if (file_exists(__DIR__ . '/config/active-themes.php')) {
        require_once __DIR__ . '/config/active-themes.php';
        
        $current_uri = $_SERVER['REQUEST_URI'] ?? '/';
        $path_only = parse_url($current_uri, PHP_URL_PATH);
        
        // Strip trailing slash except for root
        if ($path_only !== '/' && substr($path_only, -1) === '/') {
            $path_only = rtrim($path_only, '/');
        }

        // Normalize .html requests to .php for config matching
        if (substr($path_only, -5) === '.html') {
            $path_only = substr($path_only, 0, -5) . '.php';
        } 
        // Normalize extensionless requests to .php for config matching
        elseif ($path_only !== '/' && !pathinfo($path_only, PATHINFO_EXTENSION)) {
            $path_only .= '.php';
        }

        // Check exact match, also check matching without leading slash
        $path_no_slash = ltrim($path_only, '/');
        
        if (isset($active_themes[$path_only])) {
            $active_theme = $active_themes[$path_only];
        } elseif (isset($active_themes[$path_no_slash])) {
            $active_theme = $active_themes[$path_no_slash];
        } else {
            $active_theme = 'modern';
        }
    } else {
        $active_theme = 'modern';
    }
}

// Add to site config for template access
$site['theme']  = $active_theme;
$site['schema'] = $active_schema;