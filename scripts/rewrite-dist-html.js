/**
 * Post-build script for customer package.
 * Rewrites Vite-emitted HTML so it matches framework dist format (dist-old):
 * - Head: explicit CSS order (fonts, squeditor-icons, slider.min, tailwind, main.min, theme), no Vite injection, no js-fouc.
 * - Body: single <script src=".../assets/js/main.js" type="module"></script>
 * Run after: vite build
 * Expects: scripts/page-to-theme.json (page path -> theme key) in same directory.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const distDir = path.resolve(__dirname, '..', 'dist');
const manifestPath = path.join(__dirname, 'page-to-theme.json');

if (!fs.existsSync(distDir)) {
    console.error('[rewrite-dist-html] dist/ not found at', distDir);
    process.exit(1);
}

let pageToTheme = {};
if (fs.existsSync(manifestPath)) {
    try {
        pageToTheme = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    } catch (e) {
        console.warn('[rewrite-dist-html] Could not load page-to-theme.json:', e.message);
    }
}

function getHtmlFilesRecursive(dir, base = '') {
    const results = [];
    const list = fs.readdirSync(dir);
    for (const file of list) {
        const filePath = path.join(dir, file);
        const relPath = path.join(base, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
            if (file !== 'assets') {
                results.push(...getHtmlFilesRecursive(filePath, relPath));
            }
        } else if (file.endsWith('.html')) {
            results.push(relPath);
        }
    }
    return results;
}

// Remove Vite-injected module scripts in head (chunks, main.js in head)
function removeViteInjectedScriptsInHead(html) {
    return html.replace(
        /<script\s+[^>]*type=["']module["'][^>]*src=["'][^"']*assets\/js\/(?:chunks\/[^"']+|main\.js)["'][^>]*>\s*<\/script>\s*/gi,
        ''
    );
}

// Remove Vite-injected stylesheet links (our assets - we will re-add in correct order)
// Matches: fonts.css, squeditor-icons.css, slider.min.css, tailwind.css,
//          main.min.css, theme-*.min.css, and any leftover slider.css Vite may have emitted.
function removeViteInjectedStylesInHead(html) {
    return html.replace(
        /<link\s+[^>]*rel=["']stylesheet["'][^>]*href=["'][^"']*assets\/css\/(?:fonts|squeditor-icons|slider(?:\.min)?|tailwind|main\.min|theme-[a-z0-9-]+\.min)\.css["'][^>]*>\s*/gi,
        ''
    );
}

// Remove Vite FOUC block: style html.js-fouc and script that adds js-fouc
function removeViteFoucBlock(html) {
    return html
        .replace(/<!--\s*Vite FOUC Prevention:[\s\S]*?-->\s*/gi, '')
        .replace(/<style>\s*html\.js-fouc\s*\{[^}]*\}\s*<\/style>\s*/gi, '')
        .replace(/<script>\s*document\.documentElement\.classList\.add\s*\(\s*['"]js-fouc['"]\s*\)\s*;?\s*<\/script>\s*/gi, '');
}

// Build the Squeditor CSS block (correct order, no leading ./)
// slider.min.css is optional — only included when the file is present in dist/assets/css/.
function buildSqueditorCssBlock(prefix, assignedTheme) {
    const sliderExists = fs.existsSync(path.join(distDir, 'assets', 'css', 'slider.min.css'));
    const links = [
        `<link rel="stylesheet" href="${prefix}assets/css/fonts.css" />`,
        `<link rel="stylesheet" href="${prefix}assets/css/squeditor-icons.css" />`,
    ];
    if (sliderExists) {
        links.push(`<link rel="stylesheet" href="${prefix}assets/css/slider.min.css" />`);
    }
    links.push(
        `<link rel="stylesheet" href="${prefix}assets/css/tailwind.css" />`,
        `<link rel="stylesheet" href="${prefix}assets/css/main.min.css" />`
    );
    if (assignedTheme) {
        links.push(`<link rel="stylesheet" href="${prefix}assets/css/theme-${assignedTheme}.min.css" />`);
    }
    return '\n        <!-- Squeditor CSS -->\n        ' + links.join('\n        ') + '\n';
}

// Insert Squeditor CSS block before UIkit script (so head order: meta, typography, og, Squeditor CSS, UIkit, FOUC dark)
function insertSqueditorCssBlock(html, block) {
    // Match <!-- UIkit Components JS --> or <script ... uikit-components.js
    const uikitRegex = /\s*(<!--\s*UIkit Components JS[^>]*-->|\s*<script[^>]*src=["'][^"']*uikit-components\.js["'][^>]*>)/i;
    const m = html.match(uikitRegex);
    if (m) {
        return html.replace(m[0], block + m[0]);
    }
    // Fallback: insert before first <script in head
    return html.replace(/(<head[^>]*>)([\s\S]*?)(<script\s)/i, (_, open, middle, scriptTag) => {
        return open + middle + block + scriptTag;
    });
}

// Remove existing Squeditor CSS comment and our asset link tags so we can insert fresh block
function removeExistingSqueditorCssBlock(html) {
    let out = html.replace(/\s*<!--\s*Squeditor CSS\s*-->\s*/gi, '');
    // Matches both the correctly-named files and any variant Vite may emit (e.g. slider.css instead of slider.min.css)
    out = out.replace(/<link\s+[^>]*href=["'][^"']*assets\/css\/(?:fonts|squeditor-icons|slider(?:\.min)?|tailwind|main\.min|theme-[a-z0-9-]+\.min)\.css["'][^>]*>\s*/gi, '');
    return out;
}

// Ensure body ends with single main.js script; remove chunk scripts from body
function fixBodyScript(html, prefix) {
    const mainScript = `\n        <!-- Production Static Scripts -->\n        <script src="${prefix}assets/js/main.js" type="module"></script>\n    </body>`;
    // Remove existing Production Static Scripts comments to prevent duplicates
    let out = html.replace(/\s*<!--\s*Production Static Scripts\s*-->\s*/gi, '');
    // Remove any script that loads our assets (chunks/* or main.js) from body
    out = out.replace(
        /<script\s+[^>]*src=["'][^"']*assets\/js\/(?:chunks\/[^"']+|main\.js)["'][^>]*>\s*<\/script>\s*/gi,
        ''
    );
    // Replace </body> with our single script + </body>
    out = out.replace(/\s*<\/body>\s*/, mainScript);
    return out;
}

// Normalize asset paths: ./assets/ -> assets/ or correct prefix
function normalizePaths(html, prefix) {
    return html.replace(
        /(href|src)=["']\.\/(assets\/[^"']+)["']/g,
        (_, attr, p) => `${attr}="${prefix}${p}"`
    );
}

const htmlFiles = getHtmlFilesRecursive(distDir);
for (const file of htmlFiles) {
    const depth = file.split(path.sep).length - 1;
    const prefix = depth > 0 ? '../'.repeat(depth) : '';
    const assignedTheme = pageToTheme[file] || null;

    const filePath = path.join(distDir, file);
    let html = fs.readFileSync(filePath, 'utf8');

    // 1. Remove Vite-injected scripts and styles in head
    html = removeViteInjectedScriptsInHead(html);
    html = removeViteInjectedStylesInHead(html);
    html = removeViteFoucBlock(html);

    // 2. Remove any existing Squeditor CSS block (so we can insert fresh)
    html = removeExistingSqueditorCssBlock(html);

    // 3. Insert correct Squeditor CSS block before UIkit script
    const cssBlock = buildSqueditorCssBlock(prefix, assignedTheme);
    html = insertSqueditorCssBlock(html, cssBlock);

    // 4. Fix body: single main.js script at end
    html = fixBodyScript(html, prefix);

    // 5. Normalize paths (./assets/ -> prefix + assets/)
    html = normalizePaths(html, prefix);

    fs.writeFileSync(filePath, html);
}

// 6. Prettify final HTML
console.log('[rewrite-dist-html] Formatting HTML files with Prettier...');
try {
    const prettierBin = path.resolve(__dirname, '..', 'node_modules', '.bin', 'prettier');
    const configPath = path.resolve(__dirname, '..', '.prettierrc');
    if (fs.existsSync(prettierBin)) {
        execSync(`"${prettierBin}" --config "${configPath}" --write "dist/**/*.html"`, { cwd: path.resolve(__dirname, '..'), stdio: 'ignore' });
        console.log('[rewrite-dist-html] Formatting complete.');
    } else {
        console.warn('[rewrite-dist-html] Prettier not found at', prettierBin);
    }
} catch (e) {
    console.warn('[rewrite-dist-html] Prettier formatting failed:', e.message);
}

console.log('[rewrite-dist-html] Rewrote', htmlFiles.length, 'HTML file(s) to framework dist format.');