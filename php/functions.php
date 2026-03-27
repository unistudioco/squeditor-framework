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

/**
 * Load an asset file's contents directly (e.g., for inline SVG).
 *
 * @param string $path  Path relative to src/assets/, e.g., 'static/icons/vite.svg'
 * @return string       File contents or empty string if not found
 */
function get_asset(string $path): string {
    $full_path = SRC_PATH . '/assets/' . ltrim($path, '/');
    if (!file_exists($full_path)) {
        trigger_error("Asset not found: {$full_path}", E_USER_WARNING);
        return '';
    }
    return file_get_contents($full_path);
}

/**
 * Load an image file's contents directly (e.g., for inline SVG images) or return an <img> tag.
 *
 * @param string $filename  Filename inside src/assets/static/images/, e.g., 'logo.svg'
 * @param string $alt       Alt text for the image (if returning an <img> tag)
 * @param string $class     Custom CSS class(es) to add to the <img> tag
 * @param bool   $inline    Whether to return raw file contents (e.g. inline SVG). Default false.
 * @return string           Image tag or file contents, or empty string if not found
 */
function get_image(string $filename, string $alt = '', string $class = '', bool $inline = false): string {
    $is_external = preg_match('/^(https?:)?\/\//i', $filename);
    
    if (!$is_external) {
        $full_path = SRC_PATH . '/assets/static/images/' . ltrim($filename, '/');
        
        // If the requested image doesn't exist, handle it based on site config
        if (!file_exists($full_path)) {
            global $site;
            $use_fallback = isset($site['image_fallback']) && $site['image_fallback'] === true;

            if ($use_fallback) {
                $filename = 'placeholder.png';
                $full_path = SRC_PATH . '/assets/static/images/' . $filename;
                
                // If even the placeholder is missing, return empty
                if (!file_exists($full_path)) {
                    return '';
                }
            } else {
                trigger_error("Image not found: {$full_path}", E_USER_WARNING);
                return '';
            }
        }
        $source_path = $full_path;
        $web_path = '/assets/static/images/' . ltrim($filename, '/');
    } else {
        $source_path = $filename;
        $web_path = $filename;
    }
    
    if ($inline) {
        $svg_content = $is_external ? @file_get_contents($source_path) : file_get_contents($source_path);
        
        if ($svg_content === false) {
            if ($is_external) {
                trigger_error("External image not found or could not be loaded: {$source_path}", E_USER_WARNING);
            }
            return '';
        }
        
        if ($class !== '') {
            $class_attr = htmlspecialchars($class);
            if (preg_match('/<svg\s[^>]*class=([\'"])(.*?)\1/is', $svg_content, $matches)) {
                $new_class = trim($matches[2] . ' ' . $class_attr);
                $svg_content = preg_replace('/(<svg\s[^>]*)class=[\'"].*?[\'"]/is', '$1class="' . $new_class . '"', $svg_content, 1);
            } else {
                $svg_content = preg_replace('/<svg(\s|>)/is', '<svg class="' . $class_attr . '"$1', $svg_content, 1);
            }
        }
        return $svg_content;
    }
    
    $class_attr = $class !== '' ? sprintf(' class="%s"', htmlspecialchars($class)) : '';
    
    return sprintf('<img src="%s" alt="%s"%s>', htmlspecialchars($web_path), htmlspecialchars($alt), $class_attr);
}

/**
 * Get the path to a video file in the assets/static/videos/ directory.
 *
 * @param string $filename  Filename inside src/assets/static/videos/, e.g., 'medical-clinic-entrance.mp4'
 * @return string           Web path to the video file, or empty string if not found
 */
function get_video(string $filename): string {
    $full_path = SRC_PATH . '/assets/static/videos/' . ltrim($filename, '/');
    if (!file_exists($full_path)) {
        trigger_error("Video not found: {$full_path}", E_USER_WARNING);
        return '';
    }
    
    // We assume videos are served from /assets/static/videos/ relative to document root
    return 'assets/static/videos/' . ltrim($filename, '/');
}
