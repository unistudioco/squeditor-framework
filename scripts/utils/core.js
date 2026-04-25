const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();

/**
 * Loads the project configuration from squeditor.config.js
 */
function loadConfig() {
    const configPath = path.join(projectRoot, 'squeditor.config.js');
    if (!fs.existsSync(configPath)) {
        throw new Error(`Configuration file not found: ${configPath}`);
    }
    return require(configPath);
}

const config = loadConfig();

/**
 * Resolves the framework root directory
 */
const fwRoot = path.resolve(projectRoot, config.framework);

/**
 * Resolve the Prettier module (Node API, not CLI binary).
 * Returns the module or null if not installed.
 */
function loadPrettier() {
    const locations = [
        path.join(projectRoot, 'node_modules/prettier'),
        path.join(fwRoot,       'node_modules/prettier'),
    ];
    for (const loc of locations) {
        try { return require(loc); } catch { /* try next */ }
    }
    try { return require('prettier'); } catch { return null; }
}

/**
 * Recursively collect all .html files under `dir`.
 */
function walkHtmlFiles(dir, results = []) {
    if (!fs.existsSync(dir)) return results;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory())          walkHtmlFiles(full, results);
        else if (entry.name.endsWith('.html')) results.push(full);
    }
    return results;
}

/**
 * Format all .html files under `dirs` (array) using the Prettier Node API.
 * Falls back gracefully if Prettier is not installed.
 * Always applies stripVoidSlashes() after formatting.
 *
 * @param {string|string[]} dirs   One or more directories to walk.
 * @param {string}          [configFile]  Path to .prettierrc (optional).
 * @returns {Promise<{ok:boolean, error?:string}>}
 */
async function formatHtmlFiles(dirs, configFile) {
    const prettier = loadPrettier();
    if (!prettier) {
        return { ok: false, error: 'prettier module not found' };
    }

    const dirList = Array.isArray(dirs) ? dirs : [dirs];
    const files   = dirList.flatMap(d => walkHtmlFiles(d));

    // Resolve Prettier config once (Prettier v2 + v3 compatible)
    let resolvedConfig = {};
    try {
        // v3 API: resolveConfig returns a Promise
        const resolved = await prettier.resolveConfig(configFile || projectRoot);
        if (resolved) resolvedConfig = resolved;
    } catch { /* use defaults */ }

    const formatOptions = {
        ...resolvedConfig,
        parser: 'html',
        printWidth: resolvedConfig.printWidth || 10000,
        htmlWhitespaceSensitivity: resolvedConfig.htmlWhitespaceSensitivity || 'ignore',
    };

    let errors = [];
    for (const file of files) {
        try {
            const source    = fs.readFileSync(file, 'utf8');
            // Prettier v3: format() is async; v2: sync — handle both
            const formatted = typeof prettier.format === 'function'
                ? await Promise.resolve(prettier.format(source, formatOptions))
                : source;
            fs.writeFileSync(file, stripVoidSlashes(formatted));
        } catch (err) {
            errors.push(`${path.basename(file)}: ${err.message}`);
        }
    }

    return errors.length === 0
        ? { ok: true }
        : { ok: false, error: errors.join('; ') };
}

/** @deprecated Use formatHtmlFiles() instead. Kept for backward compatibility. */
function findPrettier() {
    const localPrettier = path.join(projectRoot, 'node_modules/.bin/prettier');
    if (fs.existsSync(localPrettier)) return localPrettier;
    const fwPrettier = path.join(fwRoot, 'node_modules/.bin/prettier');
    if (fs.existsSync(fwPrettier)) return fwPrettier;
    return 'prettier';
}

/**
 * Helper to safely create a directory
 */
function safeMkdir(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

/**
 * Strips dev-only content blocks from HTML/JS
 */
function stripDevContent(html) {
    // 1. Strip "DEV ONLY" blocks
    const devOnlyJs = /(\/\/\s*DEV\s+ONLY\s+START|\/\*\s*DEV\s+ONLY\s+START\s*\*\/)[\s\S]*?(\/\/\s*DEV\s+ONLY\s+END|\/\*\s*DEV\s+ONLY\s+END\s*\*\/)/gi;
    const devOnlyHtml = /<!--\s*DEV\s+ONLY\s+START\s*-->[\s\S]*?<!--\s*DEV\s+ONLY\s+END\s*-->/gi;
    return html.replace(devOnlyJs, '').replace(devOnlyHtml, '');
}

/**
 * Strips demo-only content blocks from HTML
 */
function stripDemoContent(html) {
    const demoOnlyHtml = /<!--\s*DEMO\s+MODE\s+ONLY\s+START\s*-->[\s\S]*?<!--\s*DEMO\s+MODE\s+ONLY\s+END\s*-->/gi;
    return html.replace(demoOnlyHtml, '');
}

/**
 * Removes trailing slashes from HTML5 void elements.
 * Prettier (and some PHP renderers) emit XHTML-style <img /> / <input /> etc.
 * which triggers "Trailing slash on void elements" W3C validation warnings.
 * This post-processor strips them back to valid HTML5 form (<img>, <input>).
 */
function stripVoidSlashes(html) {
    // HTML5 void elements — self-closing slash has no effect and may break parsers
    const voidElements = 'area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr';
    const re = new RegExp(`(<(?:${voidElements})\\b[^>]*?)\\s*/\\s*>`, 'gi');
    return html.replace(re, '$1>');
}

module.exports = {
    projectRoot,
    fwRoot,
    config,
    findPrettier,       // legacy — prefer formatHtmlFiles()
    formatHtmlFiles,
    walkHtmlFiles,
    safeMkdir,
    stripDevContent,
    stripDemoContent,
    stripVoidSlashes,
};
