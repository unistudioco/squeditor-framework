const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { projectRoot, config, findPrettier, safeMkdir, stripDevContent, stripDemoContent } = require('./utils/core');
const fwRoot = path.resolve(projectRoot, config.framework);
const ui = require('./utils/cli-ui');

let micromatch;
try {
    micromatch = require(path.join(projectRoot, 'node_modules/micromatch'));
} catch (e) {
    try {
        micromatch = require('micromatch');
    } catch (ee) {
        ui.warning('micromatch not found. Media blurring will be skipped.');
    }
}

let sharp;
try {
    sharp = require('sharp');
} catch (e) { }

let ffmpeg;
try {
    ffmpeg = require('fluent-ffmpeg');
} catch (e) { }

const customerBuildDir = path.join(projectRoot, config.name || 'customer-package');
const distDir = path.join(projectRoot, 'dist');
const srcDir = path.join(projectRoot, 'src');
// Derive ZIP name from config.name directly to avoid double-suffix issues
const zipName = (config.name || 'customer-package') + '.zip';
const zipPath = path.join(projectRoot, zipName);

const mediaConfig = config.media || {};
const blurConfig = mediaConfig.blur || { enabled: false };
const optConfig = mediaConfig.optimize || { enabled: false };

async function processMediaFile(src, dest, relPath) {
    const isBlurEnabled = blurConfig.enabled && micromatch;
    const isMatched = isBlurEnabled && micromatch.isMatch(relPath, blurConfig.include || [], { ignore: blurConfig.exclude || [] });

    const ext = path.extname(src).toLowerCase();
    const isImage = ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext);
    const isVideo = ['.mp4', '.webm'].includes(ext);

    fs.mkdirSync(path.dirname(dest), { recursive: true });

    if (isMatched) {
        if (isImage && sharp) {
            try {
                console.log(`   - Blurring image: ${relPath}`);
                let pipeline = sharp(src).blur(blurConfig.amount || 20);

                // Re-apply optimization settings to the blurred output to prevent size bloat
                const quality = optConfig.imageQuality || 80;
                if (ext === '.jpg' || ext === '.jpeg') {
                    pipeline = pipeline.jpeg({ quality, mozjpeg: true });
                } else if (ext === '.png') {
                    pipeline = pipeline.png({ quality, compressionLevel: 9, palette: true });
                } else if (ext === '.webp') {
                    pipeline = pipeline.webp({ quality, effort: 6 });
                }

                await pipeline.toFile(dest);
                return;
            } catch (err) {
                console.error(`   - ❌ Failed to blur image ${relPath}:`, err.message);
            }
        } else if (isVideo && ffmpeg) {
            try {
                console.log(`   - Blurring video: ${relPath} (This may take a while...)`);
                return new Promise((resolve, reject) => {
                    ffmpeg(src)
                        .videoFilters(`boxblur=${blurConfig.amount || 20}:1`)
                        .outputOptions([
                            `-crf ${optConfig.videoQuality || 28}`,
                            '-preset slower',
                            '-c:a aac',
                            '-b:a 128k'
                        ])
                        .save(dest)
                        .on('end', () => {
                            // Video regression check
                            const originalSize = fs.statSync(src).size;
                            const optimizedSize = fs.statSync(dest).size;
                            if (optimizedSize > originalSize) {
                                fs.copyFileSync(src, dest);
                            }
                            resolve();
                        })
                        .on('error', (err) => {
                            console.error(`   - ❌ Failed to blur video ${relPath}:`, err.message);
                            fs.copyFileSync(src, dest);
                            resolve();
                        });
                });
            } catch (err) {
                console.error(`   - ❌ Video blur error for ${relPath}:`, err.message);
            }
        }
    }

    // Default: Just copy
    fs.copyFileSync(src, dest);
}

async function walkAndProcessMedia(currentSrc, currentDest, baseDir) {
    const files = fs.readdirSync(currentSrc);
    for (const file of files) {
        if (file === '.DS_Store') continue;

        const srcPath = path.join(currentSrc, file);
        const destPath = path.join(currentDest, file);
        const relPath = path.relative(baseDir, srcPath);
        const stat = fs.statSync(srcPath);

        if (stat.isDirectory()) {
            await walkAndProcessMedia(srcPath, destPath, baseDir);
        } else {
            await processMediaFile(srcPath, destPath, relPath);
        }
    }
}

async function createCustomerPackage() {
    ui.header('Assembling Customer Package');

    if (path.resolve(customerBuildDir) === path.resolve(projectRoot)) {
        console.error(`[Squeditor] 🚨 CRITICAL ERROR: customerBuildDir resolves to the active project workspace root!`);
        console.error(`[Squeditor] Aborting immediately to prevent recursive deletion. Please update 'name' in your squeditor.config.js so it does not target the parent folder (e.g., avoid '../folder-name').`);
        process.exit(1);
    }

    // Clean existing build directory to prevent stale assets / duplicates
    if (fs.existsSync(customerBuildDir)) {
        ui.step('Cleaning existing customer package directory...');
        fs.rmSync(customerBuildDir, { recursive: true, force: true });
    }


    // General function to strip conditional content based on comment markers
    function stripConditionalContent(content, isCustomerPackage = true) {
        content = stripDevContent(content);
        if (isCustomerPackage) {
            content = stripDemoContent(content);
        }
        return content;
    }

    // CSS cleaning function to remove demo-specific selectors
    function cleanCssContent(content, isCustomerPackage = true) {
        // Strip general conditional blocks first
        content = stripConditionalContent(content, isCustomerPackage);

        // 1. Remove high-specificity typography overrides (demo mode stuff)
        const highSpecRegex = /html\s+body\s+h[1-6][^}]*\{[^}]*var\(--sq-font-heading\)[^}]*\}/gi;
        content = content.replace(highSpecRegex, '');

        // 2. Remove .sq-theme-switcher specific styles
        const switcherStylesRegex = /\.sq-theme-switcher[^}]*\{[^}]*\}/gi;
        content = content.replace(switcherStylesRegex, '');

        // 3. Remove theme-level font-family forces if requested (as per user feedback)
        const themeFontRegex = /\.theme-[a-z0-9-]+\s+h[1-6][^}]*\{[^}]*font-family:\s*var\(--sq-font-heading\)[^}]*\}/gi;
        content = content.replace(themeFontRegex, '');

        // Additional catch-all for the complex selector from user feedback
        const complexThemeFontRegex = /\.theme-[a-z0-9-]+[^}]*h[1-6][^}]*\{[^}]*font-family:\s*var\(--sq-font-heading\)[^}]*\}/gi;
        content = content.replace(complexThemeFontRegex, '');

        return content;
    }

    safeMkdir(path.join(customerBuildDir, 'dist/assets'));

    // 1. Copy Compiled HTML
    ui.step('Copying compiled HTML to dist/ and src/...');

    // Recursive function to find all HTML files in dist/
    function getHtmlFilesRecursive(dir, base = '') {
        let results = [];
        const list = fs.readdirSync(dir);
        list.forEach(file => {
            const filePath = path.join(dir, file);
            const relPath = path.join(base, file);
            const stat = fs.statSync(filePath);
            if (stat && stat.isDirectory()) {
                if (file !== 'assets') { // Skip assets folder
                    results = results.concat(getHtmlFilesRecursive(filePath, relPath));
                }
            } else if (file.endsWith('.html')) {
                results.push(relPath);
            }
        });
        return results;
    }

    const distHtmlFiles = getHtmlFilesRecursive(distDir);
    safeMkdir(path.join(customerBuildDir, 'src'));

    const pageToTheme = {};
    if (config.themes) {
        Object.keys(config.themes).forEach(themeKey => {
            const themeData = config.themes[themeKey];
            if (themeData && themeData.pages) {
                const subfolder = themeData.distSubfolder || '';
                themeData.pages.forEach(page => {
                    if (typeof page === 'string') {
                        const htmlName = page.replace('.php', '.html');
                        // Store the full relative path as expected in dist/
                        const distHtmlPath = path.join(subfolder, htmlName);
                        pageToTheme[distHtmlPath] = themeKey;
                    }
                });
            }
        });
    }

    const requiredDirs = ['assets/css', 'assets/js', 'assets/static/images'];
    requiredDirs.forEach(dir => {
        if (!fs.existsSync(path.join(distDir, dir))) {
            ui.warning(`Missing in dist: ${dir} — please verify build integrity.`);
        }
    });

    distHtmlFiles.forEach(file => {
        const srcFile = path.join(distDir, file);
        const distDest = path.join(customerBuildDir, 'dist', file);
        const srcDest = path.join(customerBuildDir, 'src', file);

        // Ensure target directories exist (for subfolder support)
        fs.mkdirSync(path.dirname(distDest), { recursive: true });
        fs.mkdirSync(path.dirname(srcDest), { recursive: true });

        let htmlContent = fs.readFileSync(srcFile, 'utf8');
        // Apply general conditional content stripping (both Dev and Demo blocks)
        htmlContent = stripConditionalContent(htmlContent, true);

        // 1. Remove "DEMO PURPOSE ONLY" blocks aggressively
        // This catches everything wrapped in <!-- DEMO PURPOSE ONLY: ... --> ... <!-- /DEMO --> or standard comment headers
        htmlContent = htmlContent.replace(/<!--\s*DEMO PURPOSE ONLY:[\s\S]*?-->[\s\S]*?<!--\s*\/DEMO\s*-->/gi, '');
        // Targeted cleaning for the specific floating switcher block and its isolator
        htmlContent = htmlContent.replace(/<style>\s*\/\* Isolate Theme Switcher[\s\S]*?<\/style>/gi, '');
        htmlContent = htmlContent.replace(/<!--\s*DEMO PURPOSE ONLY:[\s\S]*?Floating Theme Switcher[\s\S]*?-->\s*<div class="sq-theme-switcher[\s\S]*?<\/script>/gi, '');
        htmlContent = htmlContent.replace(/<!--\s*Floating Theme Switcher\s*-->\s*<div class="sq-theme-switcher[\s\S]*?<\/script>/gi, '');
        htmlContent = htmlContent.replace(/<div class="sq-theme-switcher[\s\S]*?<\/script>/gi, '');
        
        // Remove standing demo comments that might be floating
        htmlContent = htmlContent.replace(/<!--\s*DEMO PURPOSE ONLY:[\s\S]*?-->/gi, '');

        // 2. Identify assigned theme
        const assignedTheme = pageToTheme[file];
        const allThemes = Object.keys(config.themes || {});

        // Calculate relative prefix back to dist/src root.
        // path.sep-aware: split by OS separator and count directory components.
        const depth = file.split(path.sep).length - 1;
        const prefix = depth > 0 ? '../'.repeat(depth) : '';

        // ─── dist/ HTML: production references to compiled CSS/JS ────────────────
        let distHtml = htmlContent;

        // Ensure main.js loads as a module (ESM entry point)
        distHtml = distHtml.replace(
            /<script([^>]*?)src="([^"]*?)assets\/js\/main\.js"([^>]*?)>/g,
            (match, pre, p, post) => {
                // Add type="module" if not already present
                if (/type=["']module["']/.test(match)) return match;
                return `<script${pre}type="module" src="${prefix}assets/js/main.js"${post}>`;
            }
        );

        // uikit-components.js must remain a classic (non-module) UMD script — rewrite prefix only
        distHtml = distHtml.replace(
            /<script([^>]*?)src="[^"]*?assets\/js\/uikit-components\.js"([^>]*?)>/g,
            `<script$1src="${prefix}assets/js/uikit-components.js"$2>`
        );

        // Remove all theme CSS links that do NOT belong to this page; keep only the assigned one
        allThemes.forEach(t => {
            if (t !== assignedTheme) {
                const regex = new RegExp(`<link[^>]*?href="[^"]*?assets/css/theme-${t}\\.min\\.css"[^>]*?>\\s*`, 'g');
                distHtml = distHtml.replace(regex, '');
            } else {
                // Ensure the assigned theme link has the correct prefix
                const regex = new RegExp(`(<link[^>]*?href=")[^"]*?(assets/css/theme-${t}\\.min\\.css"[^>]*?>)`, 'g');
                distHtml = distHtml.replace(regex, `$1${prefix}$2`);
            }
        });

        // Rewrite any remaining root-relative asset hrefs/srcs to depth-adjusted paths
        // (catches tailwind.css, main.min.css, fonts.css, squeditor-icons.css, slider.min.css, etc.)
        if (prefix) {
            distHtml = distHtml.replace(
                /(href|src)="(?!http|\/\/|#|data:)([^"]*?assets\/[^"]+)"/g,
                (match, attr, assetPath) => {
                    // Already has the right prefix? Don't double-prefix.
                    if (assetPath.startsWith(prefix)) return match;
                    // Strip any stale leading ../  from the snapshot so we always start clean
                    const cleanPath = assetPath.replace(/^(\.\.\/)+/, '');
                    return `${attr}="${prefix}${cleanPath}"`;
                }
            );
        }

        fs.writeFileSync(distDest, distHtml);

        // ─── src/ HTML: Vite dev-server references ───────────────────────────────
        // The customer runs `npm run dev` (plain Vite) from the package root.
        // Vite processes HTML, serves SCSS/CSS through its pipeline and injects HMR.
        //
        // Key rules:
        //   • SCSS must be imported via <script type="module"> — NOT <link href>.
        //     Browsers cannot parse SCSS; only Vite's module pipeline can.
        //   • tailwind.css and plain CSS files stay as <link rel="stylesheet">.
        //   • main.js must be <script type="module"> for Vite HMR.
        //   • uikit-components.js is a UMD classic script — no type="module".
        //     It lives in public/ so Vite never tries to bundle it.
        //   • A FOUC-prevention inline style+script is injected so the page stays
        //     invisible until Vite has injected all CSS modules (main.js removes
        //     the js-fouc class once initialisation is complete).

        let devHtml = htmlContent;

        // Replace compiled main.min.css <link> with a Vite SCSS module script
        devHtml = devHtml.replace(
            /<link[^>]*?href="[^"]*?assets\/css\/main\.min\.css"[^>]*?>/g,
            `<script type="module" src="${prefix}assets/scss/main.scss"></script>`
        );

        // Keep tailwind.css as a plain stylesheet (it's a real CSS file in src/)
        devHtml = devHtml.replace(
            /(href=")[^"]*?(assets\/css\/tailwind\.css")/g,
            `$1${prefix}$2`
        );

        // Pre-compiled static CSS (fonts, icons, slider) — use ABSOLUTE paths.
        // These files live in public/assets/css/ and Vite must NOT process them:
        // they contain @font-face url() references that Vite can't resolve because
        // the font files are in public/assets/static/fonts/, not in src/.
        // Absolute paths tell Vite they are public-dir assets → copied verbatim,
        // no CSS processing, no font-resolution warnings.
        ['squeditor-icons.css', 'fonts.css', 'slider.min.css'].forEach(cssFile => {
            devHtml = devHtml.replace(
                new RegExp(`<link([^>]*?)href="[^"]*?assets/css/${cssFile.replace(/\./g, '\\.')}"([^>]*?)>`, 'g'),
                `<link$1href="/assets/css/${cssFile}"$2>`
            );
        });

        // main.js → module script for Vite HMR
        devHtml = devHtml.replace(
            /<script([^>]*?)src="[^"]*?assets\/js\/main\.js"([^>]*?)>/g,
            (match, pre, post) => {
                if (/type=["']module["']/.test(match)) return `<script${pre}src="${prefix}assets/js/main.js"${post}>`;
                return `<script${pre}type="module" src="${prefix}assets/js/main.js"${post}>`;
            }
        );

        // uikit-components.js — classic UMD script served from public/ by Vite.
        // MUST use an absolute path (/assets/js/...) so Vite recognises it as a
        // public-dir asset and skips bundling entirely (eliminates "can't be bundled
        // without type=module" warning). The prefix is irrelevant here: absolute paths
        // are always resolved relative to the server root, not the HTML file location.
        devHtml = devHtml.replace(
            /<script([^>]*?)src="[^"]*?assets\/js\/uikit-components\.js"([^>]*?)>/g,
            `<script$1src="/assets/js/uikit-components.js"$2>`
        );

        // Rewrite / clean theme CSS for dev:
        //   assigned theme → <script type="module" src="...theme-X.scss">
        //   all others     → removed entirely
        allThemes.forEach(t => {
            const themeLinkRegex = new RegExp(`<link[^>]*?href="[^"]*?assets/css/theme-${t}\\.min\\.css"[^>]*?>`, 'g');
            if (t === assignedTheme) {
                devHtml = devHtml.replace(
                    themeLinkRegex,
                    `<script type="module" src="${prefix}assets/scss/theme-${t}.scss"></script>`
                );
            } else {
                devHtml = devHtml.replace(themeLinkRegex, '');
            }
        });

        // FIX Issue C — FOUC Prevention
        // Inject the js-fouc guard just before </head> so the page is invisible until
        // Vite's CSS modules have been applied. main.js must call:
        //   document.documentElement.classList.remove('js-fouc');
        // once UIKit and all styles are ready. (The framework's main.js already does this.)
        const foucSnippet = [
            '  <!-- Vite FOUC Prevention: hides page until CSS modules are applied -->',
            '  <style>html.js-fouc{opacity:0;transition:opacity .2s ease-out}</style>',
            '  <script>document.documentElement.classList.add(\'js-fouc\');</script>',
        ].join('\n');
        devHtml = devHtml.replace('</head>', `${foucSnippet}\n</head>`);

        fs.writeFileSync(srcDest, devHtml);
    });

    // 2. [REMOVED] Copy Theme Configs
    // Customer package should NOT have PHP/Config files.

    // ─── Developer Source Assets ────────────────────────────────────────────────
    // IMPORTANT: only tailwind.css belongs in src/assets/css/.
    // Pre-compiled CSS files (squeditor-icons, fonts, slider) must NOT go into
    // src/ — Vite processes every CSS file it finds there and tries to resolve
    // url() font paths, which fail because those fonts are in public/assets/static/,
    // not src/assets/static/. These files go to public/ ONLY (handled below).
    ui.step('Copying developer source files to src/assets...');
    fs.mkdirSync(path.join(customerBuildDir, 'src/assets/css'), { recursive: true });
    fs.mkdirSync(path.join(customerBuildDir, 'dist/assets/css'), { recursive: true });

    // tailwind.css: copied to src/ so the customer can recompile Tailwind on changes
    const tailwindPath = path.join(distDir, 'assets/css/tailwind.css');
    if (fs.existsSync(tailwindPath)) {
        let twContent = fs.readFileSync(tailwindPath, 'utf8');
        fs.writeFileSync(path.join(customerBuildDir, 'src/assets/css/tailwind.css'), cleanCssContent(twContent));
        fs.writeFileSync(path.join(customerBuildDir, 'dist/assets/css/tailwind.css'), cleanCssContent(twContent));
    }

    // main.min.css: dist only (customers rebuild it via npm run build)
    const mainCssPath = path.join(distDir, 'assets/css/main.min.css');
    if (fs.existsSync(mainCssPath)) {
        let mainContent = fs.readFileSync(mainCssPath, 'utf8');
        fs.writeFileSync(path.join(customerBuildDir, 'dist/assets/css/main.min.css'), cleanCssContent(mainContent));
    }

    // SCSS source files
    fs.cpSync(path.join(srcDir, 'assets/scss'), path.join(customerBuildDir, 'src/assets/scss'), { 
        recursive: true,
        filter: (src) => !src.endsWith('.php') 
    });

    const customerScssDir = path.join(customerBuildDir, 'src/assets/scss');
    const mainScssPath = path.join(customerScssDir, 'main.scss');
    if (fs.existsSync(mainScssPath)) {
        let mainScssContent = fs.readFileSync(mainScssPath, 'utf8');
        mainScssContent = mainScssContent.replace(/@import\s+['"]custom['"];\n?/g, '');
        mainScssContent += `\n// --- CUSTOM SCRIPTS --- (These run last to override themes block cleanly)\n@import 'custom';\n`;
        fs.writeFileSync(mainScssPath, mainScssContent);

        // Add framework-file headers to protected SCSS files
        const frameworkFiles = ['_tokens.scss', '_functions.scss', '_theme-engine.scss', 'main.scss'];
        frameworkFiles.forEach(file => {
            const filePath = path.join(customerScssDir, file);
            if (fs.existsSync(filePath)) {
                let content = fs.readFileSync(filePath, 'utf8');
                if (!content.startsWith('// ⚠️ FRAMEWORK FILE')) {
                    content = `// ⚠️ FRAMEWORK FILE — Do not edit. This file will be replaced on updates.\n// To customize colors, edit _config.scss instead.\n${content}`;
                    fs.writeFileSync(filePath, content);
                }
            }
        });

        // Clean source SCSS theme files to remove font-family forces
        const themesScssDir = path.join(customerScssDir, 'themes');
        if (fs.existsSync(themesScssDir)) {
            const themeScssFiles = fs.readdirSync(themesScssDir).filter(f => f.endsWith('.scss'));
            themeScssFiles.forEach(f => {
                const filePath = path.join(themesScssDir, f);
                let content = fs.readFileSync(filePath, 'utf8');
                // Remove the h1-h6 font-family block
                const scssFontRegex = /\s*h1,\s*h2,\s*h3,\s*h4,\s*h5,\s*h6\s*\{[^}]*font-family:\s*var\(--sq-font-heading\);?\s*\}/gi;
                content = content.replace(scssFontRegex, '');
                fs.writeFileSync(filePath, content);
            });
        }
    }

    // Copy source JS to customer src/ (exclude PHP files; exclude uikit-components.js —
    // it goes into public/ so Vite treats it as a static passthrough, not a bundling target)
    fs.cpSync(path.join(srcDir, 'assets/js'), path.join(customerBuildDir, 'src/assets/js'), { 
        recursive: true,
        filter: (src) => !src.endsWith('.php') && !src.includes('uikit-components.js')
    });

    // ─── FIX Issue B — uikit-components.js → public/ (not dist/) ────────────────
    // Vite's publicDir is served as-is in dev and copied verbatim on build.
    // Placing the UMD bundle here means Vite NEVER tries to bundle or type-check it,
    // which eliminates the "can't be bundled without type=module" warning entirely.
    //
    // We also write it directly into the pre-built dist/ so customers who just want to
    // drop the dist/ folder onto a host don't need to run `npm run build` first.
    const uikitSource = path.join(srcDir, 'assets/js/uikit-components.js');
    if (fs.existsSync(uikitSource)) {
        // public/ → Vite dev server + build output pipeline
        const publicJsDir = path.join(customerBuildDir, 'public/assets/js');
        fs.mkdirSync(publicJsDir, { recursive: true });
        fs.copyFileSync(uikitSource, path.join(publicJsDir, 'uikit-components.js'));

        // dist/ → pre-built static distribution (no npm build required)
        const distJsDir = path.join(customerBuildDir, 'dist/assets/js');
        fs.mkdirSync(distJsDir, { recursive: true });
        fs.copyFileSync(uikitSource, path.join(distJsDir, 'uikit-components.js'));
    }

    // ─── FIX Issue A — copy compiled main.js + chunks to customer dist/ ─────────
    // The main project's `dist/assets/js/` contains Vite's compiled output:
    //   main.js          — the bundled ES module entry point
    //   chunks/          — Rollup code-split chunks
    // These are NEVER generated inside the customer package by the current flow,
    // so `dist/index.html`'s <script src="assets/js/main.js"> 404s out of the box.
    // We copy them verbatim from the main project's dist so the pre-built dist works
    // immediately without requiring the customer to run `npm run build`.
    ui.step('Copying compiled JS bundle to customer dist/...');
    const mainDistJsDir = path.join(distDir, 'assets/js');
    const customerDistJsDir = path.join(customerBuildDir, 'dist/assets/js');
    if (fs.existsSync(mainDistJsDir)) {
        fs.mkdirSync(customerDistJsDir, { recursive: true });
        const copyCompiledJs = (srcD, destD) => {
            const entries = fs.readdirSync(srcD, { withFileTypes: true });
            for (const entry of entries) {
                // uikit-components.js is already handled above — skip it here
                if (entry.name === 'uikit-components.js') continue;
                const entrySrc = path.join(srcD, entry.name);
                const entryDest = path.join(destD, entry.name);
                if (entry.isDirectory()) {
                    fs.mkdirSync(entryDest, { recursive: true });
                    copyCompiledJs(entrySrc, entryDest);
                } else {
                    fs.copyFileSync(entrySrc, entryDest);
                }
            }
        };
        copyCompiledJs(mainDistJsDir, customerDistJsDir);
    } else {
        ui.warning('dist/assets/js not found — run the main project build first (npm run build:css).');
    }

    // Copy compiled theme CSS files to customer dist
    if (config.themes) {
        Object.keys(config.themes).forEach(themeKey => {
            const themeCssName = `theme-${themeKey}.min.css`;
            const themeCssPath = path.join(distDir, 'assets/css', themeCssName);
            if (fs.existsSync(themeCssPath)) {
                let themeContent = fs.readFileSync(themeCssPath, 'utf8');
                fs.writeFileSync(path.join(customerBuildDir, 'dist/assets/css', themeCssName), cleanCssContent(themeContent));
            }
        });
    }

    const staticDistPath = path.join(distDir, 'assets/static');
    const staticCustomerDistPath = path.join(customerBuildDir, 'dist/assets/static');
    const publicStaticPath = path.join(customerBuildDir, 'public/assets/static');

    // ─── public/ — Vite static passthrough (dev server + verbatim build copy) ──
    // Everything in public/ is served at the root in dev and copied verbatim to dist/
    // on build, WITHOUT going through Rollup/PostCSS. This is the only safe place for:
    //   • uikit-components.js — UMD bundle that must NOT be bundled
    //   • squeditor-icons.css / fonts.css / slider.min.css — pre-compiled CSS with
    //     @font-face url() references that Vite can't resolve (fonts live in public/)
    //   • All static assets (images, videos, fonts)

    const publicCssDir = path.join(customerBuildDir, 'public/assets/css');
    fs.mkdirSync(publicCssDir, { recursive: true });

    // squeditor-icons.css — pre-compiled icon font CSS, font files in public/static/
    const iconPath = path.join(distDir, 'assets/css/squeditor-icons.css');
    if (fs.existsSync(iconPath)) {
        fs.copyFileSync(iconPath, path.join(publicCssDir, 'squeditor-icons.css'));
        fs.copyFileSync(iconPath, path.join(customerBuildDir, 'dist/assets/css/squeditor-icons.css'));
    }

    // fonts.css — @font-face declarations for custom fonts, font files in public/static/
    const fontsCssPath = path.join(distDir, 'assets/css/fonts.css');
    if (fs.existsSync(fontsCssPath)) {
        fs.copyFileSync(fontsCssPath, path.join(publicCssDir, 'fonts.css'));
        fs.copyFileSync(fontsCssPath, path.join(customerBuildDir, 'dist/assets/css/fonts.css'));
    }

    // slider.min.css — pre-built slider library CSS (Splide/Swiper), keep exact filename
    const sliderCssSrc = path.join(distDir, 'assets/css/slider.min.css');
    if (fs.existsSync(sliderCssSrc)) {
        fs.copyFileSync(sliderCssSrc, path.join(publicCssDir, 'slider.min.css'));
        fs.copyFileSync(sliderCssSrc, path.join(customerBuildDir, 'dist/assets/css/slider.min.css'));
    }

    // Static assets (images, videos, fonts)
    if (fs.existsSync(staticDistPath)) {
        ui.step('Consolidating static assets to public/...');
        fs.mkdirSync(path.dirname(publicStaticPath), { recursive: true });
        await walkAndProcessMedia(staticDistPath, publicStaticPath, staticDistPath);

        // Also populate dist/ for the pre-built preview (no npm run build needed)
        fs.mkdirSync(path.dirname(staticCustomerDistPath), { recursive: true });
        fs.cpSync(publicStaticPath, staticCustomerDistPath, { recursive: true });
    }

    // 5. Generate package.json, vite.config.js, rewrite script and manifest
    ui.step('Generating lean package.json and vite.config.js...');
    const originalPkg = require(path.join(projectRoot, 'package.json'));
    const customerPkg = {
        name: originalPkg.name,
        private: true,
        scripts: {
            "dev": "vite",
            "build": "vite build && node scripts/rewrite-dist-html.js",
            "preview": "vite preview",
            "format": "prettier --write \"src/**/*.html\""
        },
        dependencies: {
            "uikit": originalPkg.dependencies.uikit || "^3.21.0",
            "gsap": originalPkg.dependencies.gsap || "^3.12.0",
            "swiper": originalPkg.dependencies.swiper || "^11.0.0",
            "@splidejs/splide": originalPkg.dependencies['@splidejs/splide'] || "^4.1.0",
            "@splidejs/splide-extension-auto-scroll": originalPkg.dependencies['@splidejs/splide-extension-auto-scroll'] || "^0.5.0"
        },
        devDependencies: {
            "sass": originalPkg.devDependencies.sass,
            "vite": originalPkg.devDependencies.vite,
            "tailwindcss": originalPkg.devDependencies.tailwindcss,
            "autoprefixer": originalPkg.devDependencies.autoprefixer,
            "prettier": originalPkg.devDependencies.prettier || "^3.0.0"
        }
    };
    fs.writeFileSync(path.join(customerBuildDir, 'package.json'), JSON.stringify(customerPkg, null, 2));

    // Post-build rewrite: so dist HTML matches framework format (SOP-customer-dist-matches-framework.md)
    const customerScriptsDir = path.join(customerBuildDir, 'scripts');
    fs.mkdirSync(customerScriptsDir, { recursive: true });
    const rewriteScriptPath = path.join(fwRoot, 'scripts', 'rewrite-dist-html.js');
    if (fs.existsSync(rewriteScriptPath)) {
        fs.copyFileSync(rewriteScriptPath, path.join(customerScriptsDir, 'rewrite-dist-html.js'));
    }
    fs.writeFileSync(path.join(customerScriptsDir, 'page-to-theme.json'), JSON.stringify(pageToTheme, null, 2));

    const prettierrcContent = `{\n  "printWidth": 10000,\n  "tabWidth": 4,\n  "useTabs": false,\n  "semi": true,\n  "singleQuote": true,\n  "trailingComma": "es5",\n  "bracketSpacing": true,\n  "htmlWhitespaceSensitivity": "ignore"\n}`;
    fs.writeFileSync(path.join(customerBuildDir, '.prettierrc'), prettierrcContent);

    let rollupInputs = '';
    distHtmlFiles.forEach(file => {
        // Handle naming for subfolders: saas-demo/landing -> saas-demo-landing
        const name = file.replace('.html', '').replace(/[\\/]/g, '-');
        rollupInputs += `                '${name}': path.resolve(__dirname, 'src/${file}'),\n`;
    });

    // Add CSS and JS entries.
    // NOTE: squeditor-icons.css, fonts.css and slider.min.css are NOT rollup entries.
    // They are pre-compiled artifacts that live in public/assets/css/ and are copied
    // verbatim by Vite. Adding them as entries caused Vite to process their @font-face
    // url() declarations and emit "didn't resolve at build time" warnings for every font.
    rollupInputs += `                'main': path.resolve(__dirname, 'src/assets/js/main.js'),\n`;
    rollupInputs += `                'main_css': path.resolve(__dirname, 'src/assets/scss/main.scss'),\n`;
    rollupInputs += `                'tailwind': path.resolve(__dirname, 'src/assets/css/tailwind.css'),\n`;
    
    // Theme entries - these are generated by build-components.js in the main SCSS folder
    if (config.themes) {
        Object.keys(config.themes).forEach(t => {
            rollupInputs += `                'theme-${t}': path.resolve(__dirname, 'src/assets/scss/theme-${t}.scss'),\n`;
        });
    }

    // ─── FIX Issue B — vite.config.js for the customer package ──────────────────
    // publicDir points to public/ where uikit-components.js lives.
    // Vite copies public/ contents verbatim on build and serves them in dev —
    // the UMD bundle is never passed through Rollup, so there is no bundling warning.
    const viteConfigContent = `import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
    root: 'src',
    base: './',
    // public/ is served as-is by Vite dev server and copied verbatim on build.
    // uikit-components.js lives here so Vite never tries to bundle the UMD script.
    publicDir: path.resolve(__dirname, 'public'),
    server: {
        host: '127.0.0.1',
        port: 5173,
        strictPort: false,
    },
    build: {
        outDir: path.resolve(__dirname, 'dist'),
        emptyOutDir: true,
        rollupOptions: {
            input: {
${rollupInputs}            },
            output: {
                entryFileNames: 'assets/js/[name].js',
                chunkFileNames: 'assets/js/chunks/[name].js',
                assetFileNames: (assetInfo) => {
                    const name = assetInfo.names ? assetInfo.names[0] : (assetInfo.name || '');
                    
                    if (name.endsWith('.css')) {
                        const baseName = name.replace('.css', '');
                        if (baseName === 'main_css') return 'assets/css/main.min[extname]';
                        if (baseName.startsWith('theme-')) return 'assets/css/[name].min[extname]';
                        return 'assets/css/[name][extname]';
                    }
                    
                    // Route fonts to their static folder
                    const isFont = name.match(/\\.(woff2?|eot|ttf|otf)$/) || name.includes('squeditor-icons.svg');
                    if (isFont) {
                        if (name.startsWith('squeditor-icons')) {
                            return 'assets/static/fonts/squeditor-icons/[name][extname]';
                        }
                        return 'assets/static/fonts/[name][extname]';
                    }

                    // Preserve folder structure for static assets where possible
                    const originalPath = assetInfo.originalFileName || '';
                    if (originalPath.includes('assets/static/')) {
                        const staticMatch = originalPath.match(/assets\\/static\\/(.*)/);
                        if (staticMatch) return \`assets/static/\${staticMatch[1].split('/').slice(0,-1).join('/')}/[name][extname]\`.replace('//', '/');
                    }
                    
                    return 'assets/static/media/[name][extname]';
                },
            },
        },
    },
    css: {
        preprocessorOptions: {
            scss: {
                api: 'modern-compiler',
                silenceDeprecations: ['import', 'legacy-js-api', 'global-builtin'],
                additionalData: '@import "/assets/scss/_config.scss"; @import "/assets/scss/_functions.scss"; @import "/assets/scss/_theme-engine.scss"; @import "/assets/scss/_tokens.scss";',
            },
        },
    },
});
`;
    fs.writeFileSync(path.join(customerBuildDir, 'vite.config.js'), viteConfigContent);

    const tailwindConfig = `/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ['selector', '.sq-theme-dark'],
    content: [ './src/**/*.html' ],
    theme: {
        extend: {
            screens: {
                'sm':  '459px',
                'md':  '768px',
                'lg':  '992px',
                'xl':  '1200px',
                '2xl': '1400px',
            },
            container: {
                center:  true,
                padding: '1rem',
            },
            colors: {
                primary: 'rgb(var(--sq-color-primary-rgb) / <alpha-value>)',
                secondary: 'rgb(var(--sq-color-secondary-rgb) / <alpha-value>)',
                accent: 'rgb(var(--sq-color-accent-rgb) / <alpha-value>)',
                body: 'rgb(var(--sq-color-body-bg-rgb) / <alpha-value>)',
                muted:   'rgb(var(--sq-color-muted-bg-rgb) / <alpha-value>)',
                light:   'rgb(var(--sq-color-light-rgb) / <alpha-value>)',
                dark:    'rgb(var(--sq-color-dark-rgb) / <alpha-value>)',
                'transition-from': 'var(--sq-page-transition-from)',
                'transition-via': 'var(--sq-page-transition-via)',
                'transition-to': 'var(--sq-page-transition-to)',
            },
            textColor: {
                heading: 'rgb(var(--sq-color-heading-text-rgb) / <alpha-value>)',
                body: 'rgb(var(--sq-color-body-text-rgb) / <alpha-value>)',
                muted: 'rgb(var(--sq-color-muted-text-rgb) / <alpha-value>)',
            },
            fontFamily: {
                sans: ['var(--sq-font-sans)'],
                serif: ['var(--sq-font-serif)'],
                mono: ['var(--sq-font-mono)'],
            },
            fontSize: {
                'display-1': ['8rem',    { lineHeight: '1',   letterSpacing: '-0.32rem' }],
                'display-2': ['6rem',    { lineHeight: '1',   letterSpacing: '-0.24rem' }],
                'display-3': ['5rem',    { lineHeight: '1',   letterSpacing: '-0.2rem'  }],
                'display-4': ['4.5rem',  { lineHeight: '1',   letterSpacing: '-0.18rem' }],
                'display-5': ['4rem',    { lineHeight: '1',   letterSpacing: '-0.16rem' }],
                'display-6': ['3.5rem',  { lineHeight: '1',   letterSpacing: '-0.14rem' }],
                'h1': ['3rem',    { lineHeight: '1.1', letterSpacing: '-0.12rem'  }],
                'h2': ['2.5rem',  { lineHeight: '1.1', letterSpacing: '-0.08rem'  }],
                'h3': ['2rem',    { lineHeight: '1.1', letterSpacing: '-0.07rem'  }],
                'h4': ['1.5rem',  { lineHeight: '1.2', letterSpacing: '-0.06rem'  }],
                'h5': ['1.25rem', { lineHeight: '1.2', letterSpacing: '-0.05rem'  }],
                'h6': ['1rem',    { lineHeight: '1.2', letterSpacing: '-0.004rem' }],
            },
        },
    },
    plugins: [],
}`;
    fs.writeFileSync(path.join(customerBuildDir, 'tailwind.config.js'), tailwindConfig);

    const postcssConfig = `module.exports = {\n  plugins: {\n    tailwindcss: {},\n    autoprefixer: {},\n  },\n}`;
    fs.writeFileSync(path.join(customerBuildDir, 'postcss.config.js'), postcssConfig);

    const readmeContent = `# ${config.name} - Customer Package\n\nThis package contains everything you need to use, customize, and deploy your template.\n\n## Directory Structure\n- \`src/\`: Developer Source files (\`npm run dev\` needed).\n- \`dist/\`: Production-ready compiled HTML snapshot (Drop into any hosting).\n- \`public/\`: Static assets served verbatim by Vite (do not edit).\n- \`scripts/\`: Post-build script \`rewrite-dist-html.js\` runs after \`vite build\` so \`dist/\` HTML matches framework format.\n\n## How to Customize Styles\n1. Install dependencies: \`npm install\`\n2. Run live development server: \`npm run dev\`\n3. **Colors:** Edit \`src/assets/scss/_config.scss\` — change \`$base-colors\` and \`$base-colors-dark\` maps\n4. **Theme overrides:** Edit files in \`src/assets/scss/themes/\`\n5. **Custom styles:** Add your CSS to \`src/assets/scss/custom.scss\`\n6. Build production: \`npm run build\` (overwrites \`dist/\`, then rewrites HTML to framework format).\n\n## File Update Safety\nWhen updating to a new version, these files can be safely replaced (your changes are in \`_config.scss\`, \`themes/\`, and \`custom.scss\` which are yours to keep):\n- \`_tokens.scss\` — auto-generated from \`_config.scss\`\n- \`_functions.scss\` — framework helper functions\n- \`_theme-engine.scss\` — theme generator mixin\n- \`main.scss\` — main import orchestrator\n\n**Never replace:** \`_config.scss\`, \`custom.scss\`, and any \`themes/*.scss\` files you have customized.\n`;
    fs.writeFileSync(path.join(customerBuildDir, 'README.md'), readmeContent);

    // Format customer HTML files with Prettier (fallback in case snapshot.js Prettier was skipped)
    try {
        ui.step('Formatting customer HTML files with Prettier...', 'pretty');
        const prettierBin = findPrettier();
        // Use inherit stdio for better error visibility
        execSync(`"${prettierBin}" --write "src/**/*.html" "dist/**/*.html"`, { cwd: customerBuildDir, stdio: 'ignore' });
    } catch (e) {
        console.warn(`   - ⚠️  Prettier formatting skipped or errored.`);
    }

    ui.step(`Zipping Customer Package to ${zipName}...`, 'package');
    try {
        // Explicitly clean up any .DS_Store files that might have been created by the OS
        execSync(`find "${customerBuildDir}" -name ".DS_Store" -delete`, { stdio: 'ignore' });
        execSync(`cd "${customerBuildDir}" && zip -q -r -9 "${zipPath}" . -x "*.DS_Store" -x "*/.DS_Store"`, { stdio: 'ignore' });
        ui.success(`ZIP created: ${zipName}`);
    } catch (e) {
        ui.error(`Failed to create ZIP archive: ${e.message}`);
    }
}

createCustomerPackage();