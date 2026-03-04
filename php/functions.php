<?php
// php/functions.php

/**
 * Include a template part from the template-parts/ directory.
 * Equivalent to WordPress get_template_part().
 *
 * @param string $slug  Folder/file slug, e.g. 'header', 'nav', 'sections/hero/hero-centered'
 * @param array  $args  Optional associative array passed as $args inside the partial
 */
function get_template_part(string $slug, array $args = []): void {
    $path = SRC_PATH . '/template-parts/' . $slug . '.php';
    if (!file_exists($path)) {
        trigger_error("Template part not found: {$path}", E_USER_WARNING);
        return;
    }
    extract($GLOBALS, EXTR_SKIP);
    global $site;
    if (!empty($args)) {
        extract($args, EXTR_SKIP);
    }
    include $path;
}

/**
 * Include a UIKit3 component partial from the components/ directory.
 *
 * @param string $component  Component name, e.g. 'accordion', 'modal'
 * @param array  $args       Data to pass into the component
 */
function get_component(string $component, array $args = []): void {
    $path = SRC_PATH . '/components/' . $component . '.php';
    if (!file_exists($path)) {
        trigger_error("Component not found: {$path}", E_USER_WARNING);
        return;
    }
    extract($GLOBALS, EXTR_SKIP);
    if (!empty($args)) {
        extract($args, EXTR_SKIP);
    }
    include $path;
}

/**
 * Include a section variant.
 *
 * @param string $section  Path within sections/, e.g. 'hero/hero-centered'
 * @param array  $args
 */
function get_section(string $section, array $args = []): void {
    $path = SRC_PATH . '/sections/' . $section . '.php';
    if (!file_exists($path)) {
        trigger_error("Section not found: {$path}", E_USER_WARNING);
        return;
    }
    extract($GLOBALS, EXTR_SKIP);
    if (!empty($args)) {
        extract($args, EXTR_SKIP);
    }
    include $path;
}

/**
 * Parse frontmatter from a PHP page file.
 * Frontmatter is a PHP comment block at the very top of a page file.
 *
 * Format inside page files:
 *   <?php
 *   /*|
 *   title: About Us
 *   description: Learn about our team
 *   og_image: /assets/static/images/og-about.jpg
 *   |*\/
 *
 * @param  string $file  Absolute path to the PHP page file
 * @return array         Associative array of frontmatter values
 */
function parse_frontmatter(string $file): array {
    $content = file_get_contents($file);
    if (preg_match('/\/\*\|(.*?)\|\*\//s', $content, $matches)) {
        $lines = explode("\n", trim($matches[1]));
        $data = [];
        foreach ($lines as $line) {
            if (str_contains($line, ':')) {
                [$key, $value] = explode(':', $line, 2);
                $data[trim($key)] = trim($value);
            }
        }
        return $data;
    }
    return [];
}
