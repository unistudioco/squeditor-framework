<?php
// scripts/dev-router.php
// Custom router for PHP built-in development server (npm run dev)

$uri = urldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH));
$doc_root = $_SERVER['DOCUMENT_ROOT'];

// 1. If it's a direct file request that exists, serve it natively
if ($uri !== '/' && file_exists($doc_root . $uri)) {
    return false;
}

// 2. If it is an HTML file request, route it to the equivalent PHP file
if (preg_match('/\.html$/', $uri)) {
    $php_file = preg_replace('/\.html$/', '.php', $uri);
    if (file_exists($doc_root . $php_file)) {
        require $doc_root . $php_file;
        return true;
    }
}

// 3. If it is an extensionless request, route it to the equivalent PHP file
if ($uri !== '/' && !pathinfo($uri, PATHINFO_EXTENSION)) {
    $php_file = $uri . '.php';
    if (file_exists($doc_root . $php_file)) {
        require $doc_root . $php_file;
        return true;
    }
}

// 4. Let PHP's core handle index.php fallback for directories or 404s
return false;
