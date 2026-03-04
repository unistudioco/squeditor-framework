<?php
// src/init.php

// Require framework helpers
require_once __DIR__ . '/../../squeditor-framework/php/functions.php';

// Require site-wide config
require_once __DIR__ . '/config/site-config.php';

// Define SRC_PATH for get_template_part() calls
define('SRC_PATH', __DIR__);

// Global Theme & Schema Detection
$active_theme  = $_GET['theme']  ?? 'default';
$active_schema = $_GET['schema'] ?? 'light';

// Add to site config for template access
$site['theme']  = $active_theme;
$site['schema'] = $active_schema;
