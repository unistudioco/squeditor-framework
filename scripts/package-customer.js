// scripts/package-customer.js
// Assembles the customer-facing static package from the project's compiled dist/.
// Produces: <config.name>/ directory + <config.name>.zip

const fs   = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { projectRoot, config, findPrettier, safeMkdir, stripDevContent, stripDemoContent } = require('./utils/core');
const fwRoot = path.resolve(projectRoot, config.framework);
const ui     = require('./utils/cli-ui');

// ─── Optional dependencies (graceful degradation) ───────────────────────────

let micromatch;
try {
    micromatch = require(path.join(projectRoot, 'node_modules/micromatch'));
} catch {
    try { micromatch = require('micromatch'); }
    catch { ui.warning('micromatch not found. Media blurring will be skipped.'); }
}

let sharp;
try { sharp = require(path.join(projectRoot, 'node_modules/sharp')); } catch { }

let ffmpeg;
try { ffmpeg = require(path.join(projectRoot, 'node_modules/fluent-ffmpeg')); } catch { }

// ─── Paths & config ──────────────────────────────────────────────────────────

const customerBuildDir = path.join(projectRoot, config.name || 'customer-package');
const distDir          = path.join(projectRoot, 'dist');
const srcDir           = path.join(projectRoot, 'src');
const zipName          = (config.name || 'customer-package') + '.zip';
const zipPath          = path.join(projectRoot, zipName);

const mediaConfig = config.media || {};
const blurConfig  = mediaConfig.blur     || { enabled: false };
const optConfig   = mediaConfig.optimize || { enabled: false };

// ─── Media processing helpers ────────────────────────────────────────────────

async function processMediaFile(src, dest, relPath) {
    const isBlurEnabled = blurConfig.enabled && micromatch;
    const isMatched     = isBlurEnabled && micromatch.isMatch(relPath, blurConfig.include || [], { ignore: blurConfig.exclude || [] });
    const ext           = path.extname(src).toLowerCase();

    fs.mkdirSync(path.dirname(dest), { recursive: true });

    if (isMatched) {
        if (['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext) && sharp) {
            try {
                const quality  = optConfig.imageQuality || 80;
                let   pipeline = sharp(src).blur(blurConfig.amount || 20);
                if      (ext === '.jpg' || ext === '.jpeg') pipeline = pipeline.jpeg({ quality, mozjpeg: true });
                else if (ext === '.png')                    pipeline = pipeline.png({ quality, compressionLevel: 9, palette: true });
                else if (ext === '.webp')                   pipeline = pipeline.webp({ quality, effort: 6 });
                await pipeline.toFile(dest);
                return;
            } catch (err) {
                ui.warning(`Failed to blur image ${relPath}: ${err.message}`);
            }
        } else if (['.mp4', '.webm'].includes(ext) && ffmpeg) {
            try {
                return new Promise((resolve) => {
                    ffmpeg(src)
                        .videoFilters(`boxblur=${blurConfig.amount || 20}:1`)
                        .outputOptions([`-crf ${optConfig.videoQuality || 28}`, '-preset slower', '-c:a aac', '-b:a 128k'])
                        .save(dest)
                        .on('end', () => {
                            // Regression check — if optimised is larger, keep original
                            if (fs.statSync(dest).size > fs.statSync(src).size) fs.copyFileSync(src, dest);
                            resolve();
                        })
                        .on('error', (err) => {
                            ui.warning(`Failed to blur video ${relPath}: ${err.message}`);
                            fs.copyFileSync(src, dest);
                            resolve();
                        });
                });
            } catch (err) {
                ui.warning(`Video blur error for ${relPath}: ${err.message}`);
            }
        }
    }

    fs.copyFileSync(src, dest);
}

async function walkAndProcessMedia(currentSrc, currentDest, baseDir) {
    for (const file of fs.readdirSync(currentSrc)) {
        if (file === '.DS_Store') continue;
        const srcPath  = path.join(currentSrc, file);
        const destPath = path.join(currentDest, file);
        const relPath  = path.relative(baseDir, srcPath);
        if (fs.statSync(srcPath).isDirectory()) {
            await walkAndProcessMedia(srcPath, destPath, baseDir);
        } else {
            await processMediaFile(srcPath, destPath, relPath);
        }
    }
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function createCustomerPackage() {
    ui.header('Assembling Customer Package');

    // Safety guard: never let customerBuildDir be the project root itself
    if (path.resolve(customerBuildDir) === path.resolve(projectRoot)) {
        ui.error('CRITICAL: customerBuildDir === projectRoot. Update "name" in squeditor.config.js to avoid recursive deletion.');
        process.exit(1);
    }

    if (fs.existsSync(customerBuildDir)) {
        ui.step('Cleaning existing customer package directory...');
        fs.rmSync(customerBuildDir, { recursive: true, force: true });
    }

    // ── Content-stripping helpers ────────────────────────────────────────────

    function stripConditionalContent(content) {
        return stripDemoContent(stripDevContent(content));
    }

    // Remove demo-only selectors from compiled CSS (theme-switcher UI, etc.)
    function cleanCssContent(content) {
        content = stripConditionalContent(content);
        content = content.replace(/html\s+body\s+h[1-6][^}]*\{[^}]*var\(--sq-font-heading\)[^}]*\}/gi, '');
        content = content.replace(/\.sq-theme-switcher[^}]*\{[^}]*\}/gi, '');
        content = content.replace(/\.theme-[a-z0-9-]+[^}]*h[1-6][^}]*\{[^}]*font-family:\s*var\(--sq-font-heading\)[^}]*\}/gi, '');
        return content;
    }

    // ── HTML helpers ─────────────────────────────────────────────────────────

    // Recursively collect all .html files outside of assets/ folders
    function getHtmlFilesRecursive(dir, base = '') {
        let results = [];
        for (const file of fs.readdirSync(dir)) {
            const filePath = path.join(dir, file);
            const relPath  = path.join(base, file);
            if (fs.statSync(filePath).isDirectory()) {
                if (file !== 'assets') results = results.concat(getHtmlFilesRecursive(filePath, relPath));
            } else if (file.endsWith('.html')) {
                results.push(relPath);
            }
        }
        return results;
    }

    // Strip all demo-purpose blocks from raw HTML
    function removeDemoBlocks(html) {
        html = html.replace(/<!--\s*DEMO PURPOSE ONLY:[\s\S]*?-->[\s\S]*?<!--\s*\/DEMO\s*-->/gi, '');
        html = html.replace(/<style>\s*\/\* Isolate Theme Switcher[\s\S]*?<\/style>/gi, '');
        html = html.replace(/<style>[^<]*\.sq-theme-switcher[\s\S]*?<\/style>/gi, ''); // ← add this
        html = html.replace(/<div class="sq-theme-switcher[\s\S]*?<\/script>/gi, '');
        html = html.replace(/<!--\s*DEMO PURPOSE ONLY:[\s\S]*?-->/gi, '');
        return html;
    }

    // ── Build page→theme lookup ───────────────────────────────────────────────

    const pageToTheme = {};
    if (config.themes) {
        for (const [themeKey, themeData] of Object.entries(config.themes)) {
            const subfolder = themeData.distSubfolder || '';
            for (const page of (themeData.pages || [])) {
                if (typeof page !== 'string') continue;
                const htmlName = page.replace('.php', '.html');
                pageToTheme[path.join(subfolder, htmlName)] = themeKey;
            }
        }
    }

    // ── Verify dist integrity ─────────────────────────────────────────────────

    safeMkdir(path.join(customerBuildDir, 'dist/assets'));

    for (const dir of ['assets/css', 'assets/js', 'assets/static']) {
        if (!fs.existsSync(path.join(distDir, dir))) {
            ui.warning(`Missing in dist: ${dir} — verify build integrity.`);
        }
    }

    // ── 1. HTML — dist/ (production) and src/ (Vite dev) ─────────────────────

    ui.step('Copying compiled HTML to dist/ and src/...');

    const distHtmlFiles  = getHtmlFilesRecursive(distDir);
    const allThemes      = Object.keys(config.themes || {});
    // Shared pattern — CSS files that ARE Vite build outputs (excluded from passthrough copy).
    // Everything else in dist/assets/css/ is pre-compiled and treated as a verbatim asset.
    const viteCssOutputs = /^(main\.min|tailwind|theme-.+\.min)\.css$/;

    safeMkdir(path.join(customerBuildDir, 'src'));

    for (const file of distHtmlFiles) {
        const distDest = path.join(customerBuildDir, 'dist', file);
        const srcDest  = path.join(customerBuildDir, 'src',  file);
        fs.mkdirSync(path.dirname(distDest), { recursive: true });
        fs.mkdirSync(path.dirname(srcDest),  { recursive: true });

        let html            = fs.readFileSync(path.join(distDir, file), 'utf8');
        html                = stripConditionalContent(html);
        html                = removeDemoBlocks(html);
        const assignedTheme = pageToTheme[file];

        // Depth-relative prefix for subfolder pages (e.g. saas-demo/index.html → '../')
        const depth  = file.split(path.sep).length - 1;
        const prefix = depth > 0 ? '../'.repeat(depth) : '';

        // ── dist/ HTML: compiled CSS/JS references ────────────────────────────

        let distHtml = html;

        // main.js must be type="module" (ES module entry point)
        distHtml = distHtml.replace(
            /<script([^>]*?)src="[^"]*?assets\/js\/main\.js"([^>]*?)>/g,
            (match, pre, post) => /type=["']module["']/.test(match)
                ? match
                : `<script${pre}type="module" src="${prefix}assets/js/main.js"${post}>`
        );

        // uikit-components.js is a UMD classic script — rewrite prefix only, no type="module"
        distHtml = distHtml.replace(
            /<script([^>]*?)src="[^"]*?assets\/js\/uikit-components\.js"([^>]*?)>/g,
            `<script$1src="${prefix}assets/js/uikit-components.js"$2>`
        );

        // Keep only the assigned theme's CSS link; remove all others
        for (const t of allThemes) {
            if (t !== assignedTheme) {
                distHtml = distHtml.replace(
                    new RegExp(`<link[^>]*?href="[^"]*?assets/css/theme-${t}\\.min\\.css"[^>]*?>\\s*`, 'g'), ''
                );
            } else {
                distHtml = distHtml.replace(
                    new RegExp(`(<link[^>]*?href=")[^"]*?(assets/css/theme-${t}\\.min\\.css"[^>]*?>)`, 'g'),
                    `$1${prefix}$2`
                );
            }
        }

        // Normalise all remaining asset paths to use depth-correct relative prefix
        if (prefix) {
            distHtml = distHtml.replace(
                /(href|src)="(?!http|\/\/|#|data:)([^"]*?assets\/[^"]+)"/g,
                (match, attr, assetPath) => {
                    if (assetPath.startsWith(prefix)) return match;
                    return `${attr}="${prefix}${assetPath.replace(/^(\.\.\/)+/, '')}"`;
                }
            );
        }

        fs.writeFileSync(distDest, distHtml);

        // ── src/ HTML: Vite dev-server references ─────────────────────────────
        // Rules:
        //   • SCSS entries use <script type="module" src="...scss"> (Vite pipeline)
        //   • tailwind.css stays as a <link> (plain CSS in src/)
        //   • fonts.css / squeditor-icons.css / slider.min.css use ABSOLUTE paths
        //     (/assets/css/...) so Vite treats them as public-dir pass-through files
        //     and never tries to resolve their @font-face url() declarations
        //   • uikit-components.js uses ABSOLUTE path for the same reason (public-dir UMD)
        //   • main.js is a type="module" Vite entry

        let devHtml = html;

        // main.min.css → SCSS module (compiled by Vite)
        devHtml = devHtml.replace(
            /<link[^>]*?href="[^"]*?assets\/css\/main\.min\.css"[^>]*?>/g,
            `<script type="module" src="${prefix}assets/scss/main.scss"></script>`
        );

        // tailwind.css → keep as <link>, correct prefix
        devHtml = devHtml.replace(
            /(href=")[^"]*?(assets\/css\/tailwind\.css")/g,
            `$1${prefix}$2`
        );

        // Pre-compiled static CSS → absolute paths (public-dir, Vite must not process).
        // Dynamically scans dist/assets/css/ — anything that isn't a Vite build output is passthrough.
        for (const cssFile of fs.readdirSync(path.join(distDir, 'assets/css'))) {
            if (!cssFile.endsWith('.css') || viteCssOutputs.test(cssFile)) continue;
            devHtml = devHtml.replace(
                new RegExp(`<link([^>]*?)href="[^"]*?assets/css/${cssFile.replace(/\./g, '\\.')}"([^>]*?)>`, 'g'),
                `<link$1href="/assets/css/${cssFile}"$2>`
            );
        }

        // main.js → type="module" for Vite HMR
        devHtml = devHtml.replace(
            /<script([^>]*?)src="[^"]*?assets\/js\/main\.js"([^>]*?)>/g,
            (match, pre, post) => /type=["']module["']/.test(match)
                ? `<script${pre}src="${prefix}assets/js/main.js"${post}>`
                : `<script${pre}type="module" src="${prefix}assets/js/main.js"${post}>`
        );

        // uikit-components.js → absolute path (public-dir UMD, never bundle)
        devHtml = devHtml.replace(
            /<script([^>]*?)src="[^"]*?assets\/js\/uikit-components\.js"([^>]*?)>/g,
            `<script$1src="/assets/js/uikit-components.js"$2>`
        );

        // Theme CSS: assigned theme → SCSS module; all others → removed
        for (const t of allThemes) {
            const linkRe = new RegExp(`<link[^>]*?href="[^"]*?assets/css/theme-${t}\\.min\\.css"[^>]*?>`, 'g');
            devHtml = t === assignedTheme
                ? devHtml.replace(linkRe, `<script type="module" src="${prefix}assets/scss/theme-${t}.scss"></script>`)
                : devHtml.replace(linkRe, '');
        }

        // FOUC guard — hides page until Vite injects all CSS modules.
        // main.js removes 'js-fouc' from documentElement once ready.
        devHtml = devHtml.replace(
            '</head>',
            '  <!-- Vite FOUC Prevention -->\n' +
            '  <style>html.js-fouc{opacity:0;transition:opacity .2s ease-out}</style>\n' +
            '  <script>document.documentElement.classList.add(\'js-fouc\');</script>\n' +
            '</head>'
        );

        fs.writeFileSync(srcDest, devHtml);
    }

    // ── 2. Source assets ──────────────────────────────────────────────────────
    // Layout:
    //   src/assets/css/       → tailwind.css only (Vite processes it)
    //   src/assets/scss/      → full SCSS source tree (customer edits here)
    //   src/assets/js/        → JS source tree (excludes uikit-components.js)
    //   public/assets/css/    → fonts.css, squeditor-icons.css, slider.min.css
    //   public/assets/js/     → uikit-components.js
    //   public/assets/static/ → images, videos, fonts
    //
    // public/ is served verbatim in dev and copied verbatim on build (no Rollup/PostCSS).
    // Pre-compiled CSS and UMD scripts must live here to avoid Vite processing them.

    ui.step('Copying developer source files to src/assets...');

    fs.mkdirSync(path.join(customerBuildDir, 'src/assets/css'),  { recursive: true });
    fs.mkdirSync(path.join(customerBuildDir, 'dist/assets/css'), { recursive: true });

    // tailwind.css → src/ and dist/ (customers recompile Tailwind via npm run build)
    const tailwindSrc = path.join(distDir, 'assets/css/tailwind.css');
    if (fs.existsSync(tailwindSrc)) {
        const tw = cleanCssContent(fs.readFileSync(tailwindSrc, 'utf8'));
        fs.writeFileSync(path.join(customerBuildDir, 'src/assets/css/tailwind.css'),  tw);
        fs.writeFileSync(path.join(customerBuildDir, 'dist/assets/css/tailwind.css'), tw);
    }

    // main.min.css → dist/ only (rebuilt by customer's npm run build)
    const mainCssSrc = path.join(distDir, 'assets/css/main.min.css');
    if (fs.existsSync(mainCssSrc)) {
        fs.writeFileSync(
            path.join(customerBuildDir, 'dist/assets/css/main.min.css'),
            cleanCssContent(fs.readFileSync(mainCssSrc, 'utf8'))
        );
    }

    // SCSS source tree
    fs.cpSync(path.join(srcDir, 'assets/scss'), path.join(customerBuildDir, 'src/assets/scss'), {
        recursive: true,
        filter: (s) => !s.endsWith('.php'),
    });

    // Ensure custom.scss @import is last in main.scss
    const customerScssDir = path.join(customerBuildDir, 'src/assets/scss');
    const mainScssPath    = path.join(customerScssDir, 'main.scss');
    if (fs.existsSync(mainScssPath)) {
        let mainScss = fs.readFileSync(mainScssPath, 'utf8');
        mainScss = mainScss.replace(/@import\s+['"]custom['"];\n?/g, '');
        mainScss += `\n// --- Customer customisations (runs last to override theme blocks)\n@import 'custom';\n`;
        fs.writeFileSync(mainScssPath, mainScss);

        // Mark framework-owned files so customers know not to edit them
        for (const file of ['_tokens.scss', '_functions.scss', '_theme-engine.scss', 'main.scss']) {
            const fp = path.join(customerScssDir, file);
            if (!fs.existsSync(fp)) continue;
            let c = fs.readFileSync(fp, 'utf8');
            if (!c.startsWith('// ⚠️ FRAMEWORK FILE')) {
                c = '// ⚠️ FRAMEWORK FILE — Do not edit. Replace on updates.\n// Customise colors in _config.scss instead.\n' + c;
                fs.writeFileSync(fp, c);
            }
        }

        // Remove font-family force blocks from theme SCSS files (demo-only overrides)
        const themesScssDir = path.join(customerScssDir, 'themes');
        if (fs.existsSync(themesScssDir)) {
            for (const f of fs.readdirSync(themesScssDir).filter(f => f.endsWith('.scss'))) {
                const fp = path.join(themesScssDir, f);
                let   c  = fs.readFileSync(fp, 'utf8');
                c = c.replace(/\s*h1,\s*h2,\s*h3,\s*h4,\s*h5,\s*h6\s*\{[^}]*font-family:\s*var\(--sq-font-heading\);?\s*\}/gi, '');
                fs.writeFileSync(fp, c);
            }
        }
    }

    // JS source tree (uikit-components.js goes to public/ separately)
    fs.cpSync(path.join(srcDir, 'assets/js'), path.join(customerBuildDir, 'src/assets/js'), {
        recursive: true,
        filter: (s) => !s.endsWith('.php') && !s.includes('uikit-components.js'),
    });

    // ── 3. public/ — Vite static passthrough ─────────────────────────────────

    const publicCssDir = path.join(customerBuildDir, 'public/assets/css');
    const publicJsDir  = path.join(customerBuildDir, 'public/assets/js');
    fs.mkdirSync(publicCssDir, { recursive: true });
    fs.mkdirSync(publicJsDir,  { recursive: true });

    // Copy all pre-compiled CSS verbatim to public/ + dist/.
    // Uses the same exclusion as the devHtml pass above — anything that isn't a
    // Vite build output is a passthrough asset (icons, fonts, slider, or developer additions).
    const distCssDir = path.join(distDir, 'assets/css');
    if (fs.existsSync(distCssDir)) {
        for (const file of fs.readdirSync(distCssDir)) {
            if (!file.endsWith('.css') || viteCssOutputs.test(file)) continue;
            fs.copyFileSync(path.join(distCssDir, file), path.join(publicCssDir, file));
            fs.copyFileSync(path.join(distCssDir, file), path.join(customerBuildDir, 'dist/assets/css', file));
        }
    }

    // uikit-components.js → public/ (dev) + dist/ (pre-built preview)
    const uikitSrc = path.join(srcDir, 'assets/js/uikit-components.js');
    if (fs.existsSync(uikitSrc)) {
        fs.copyFileSync(uikitSrc, path.join(publicJsDir, 'uikit-components.js'));
        fs.mkdirSync(path.join(customerBuildDir, 'dist/assets/js'), { recursive: true });
        fs.copyFileSync(uikitSrc, path.join(customerBuildDir, 'dist/assets/js/uikit-components.js'));
    }

    // Static assets (images, videos, fonts) → public/ + dist/
    const staticDistPath         = path.join(distDir, 'assets/static');
    const publicStaticPath       = path.join(customerBuildDir, 'public/assets/static');
    const staticCustomerDistPath = path.join(customerBuildDir, 'dist/assets/static');
    if (fs.existsSync(staticDistPath)) {
        ui.step('Consolidating static assets to public/...');
        fs.mkdirSync(path.dirname(publicStaticPath), { recursive: true });
        await walkAndProcessMedia(staticDistPath, publicStaticPath, staticDistPath);
        fs.mkdirSync(path.dirname(staticCustomerDistPath), { recursive: true });
        fs.cpSync(publicStaticPath, staticCustomerDistPath, { recursive: true });
    }

    // ── 4. Compiled JS (main.js + chunks) → dist/ ────────────────────────────
    // Copied from main project dist so the pre-built dist works without `npm run build`

    ui.step('Copying compiled JS bundle to customer dist/...');
    const mainDistJsDir     = path.join(distDir, 'assets/js');
    const customerDistJsDir = path.join(customerBuildDir, 'dist/assets/js');
    if (fs.existsSync(mainDistJsDir)) {
        const copyJs = (srcD, destD) => {
            fs.mkdirSync(destD, { recursive: true });
            for (const entry of fs.readdirSync(srcD, { withFileTypes: true })) {
                if (entry.name === 'uikit-components.js') continue; // already handled above
                const s = path.join(srcD, entry.name);
                const d = path.join(destD, entry.name);
                entry.isDirectory() ? copyJs(s, d) : fs.copyFileSync(s, d);
            }
        };
        copyJs(mainDistJsDir, customerDistJsDir);
    } else {
        ui.warning('dist/assets/js not found — run npm run build:css in the main project first.');
    }

    // ── 5. Theme CSS → dist/ ─────────────────────────────────────────────────

    if (config.themes) {
        for (const themeKey of Object.keys(config.themes)) {
            const src = path.join(distDir, 'assets/css', `theme-${themeKey}.min.css`);
            if (!fs.existsSync(src)) continue;
            fs.writeFileSync(
                path.join(customerBuildDir, 'dist/assets/css', `theme-${themeKey}.min.css`),
                cleanCssContent(fs.readFileSync(src, 'utf8'))
            );
        }
    }

    // ── 6. Config files ───────────────────────────────────────────────────────

    ui.step('Generating package.json, configs and scripts...');

    // package.json — fully derived from the project's own package.json:
    //   • All runtime dependencies are copied verbatim (developer controls these)
    //   • Dev dependencies are filtered to the build-tool subset customers need.
    //     The list is controlled via squeditor.config.js `customerDevDeps` so developers
    //     can add extras (e.g. 'sass-embedded') etc.. without touching this framework script.
    const originalPkg    = require(path.join(projectRoot, 'package.json'));
    const defaultDevKeys = ['vite', 'sass', 'tailwindcss', 'autoprefixer', 'prettier'];
    const buildDevKeys   = (config.customerDevDeps && Array.isArray(config.customerDevDeps))
        ? [...new Set([...defaultDevKeys, ...config.customerDevDeps])]
        : defaultDevKeys;
    const devDeps = {};
    for (const key of buildDevKeys) {
        if (originalPkg.devDependencies?.[key]) devDeps[key] = originalPkg.devDependencies[key];
    }

    fs.writeFileSync(path.join(customerBuildDir, 'package.json'), JSON.stringify({
        name:    originalPkg.name,
        private: true,
        scripts: {
            dev:     'vite',
            build:   'vite build && node scripts/rewrite-dist-html.js',
            preview: 'vite preview',
            format:  'prettier --write "src/**/*.html"',
        },
        dependencies:    { ...originalPkg.dependencies },
        devDependencies: devDeps,
    }, null, 2));

    // tailwind.config.js — copied verbatim from the project, only the content glob
    // is updated (.php → .html) since customers have HTML pages, not PHP pages
    const twConfigSrc = path.join(projectRoot, 'tailwind.config.js');
    if (fs.existsSync(twConfigSrc)) {
        let twConfig = fs.readFileSync(twConfigSrc, 'utf8');
        twConfig = twConfig.replace(
            /content\s*:\s*\[[\s\S]*?\]/,
            `content: ['./src/**/*.html']`
        );
        fs.writeFileSync(path.join(customerBuildDir, 'tailwind.config.js'), twConfig);
    }

    // postcss.config.js — copied verbatim from the project
    const postcssConfigSrc = path.join(projectRoot, 'postcss.config.js');
    if (fs.existsSync(postcssConfigSrc)) {
        fs.copyFileSync(postcssConfigSrc, path.join(customerBuildDir, 'postcss.config.js'));
    }

    // .prettierrc — copied verbatim so formatting behaviour matches the project
    const prettierrcSrc = path.join(projectRoot, '.prettierrc');
    if (fs.existsSync(prettierrcSrc)) {
        fs.copyFileSync(prettierrcSrc, path.join(customerBuildDir, '.prettierrc'));
    } else {
        fs.writeFileSync(path.join(customerBuildDir, '.prettierrc'),
            JSON.stringify({ printWidth: 10000, tabWidth: 4, useTabs: false, semi: true,
                singleQuote: true, trailingComma: 'es5', bracketSpacing: true,
                htmlWhitespaceSensitivity: 'ignore' }, null, 2)
        );
    }

    // scripts/rewrite-dist-html.js + page-to-theme.json
    const customerScriptsDir = path.join(customerBuildDir, 'scripts');
    fs.mkdirSync(customerScriptsDir, { recursive: true });
    const rewriteSrc = path.join(fwRoot, 'scripts', 'rewrite-dist-html.js');
    if (fs.existsSync(rewriteSrc)) {
        fs.copyFileSync(rewriteSrc, path.join(customerScriptsDir, 'rewrite-dist-html.js'));
    }
    fs.writeFileSync(path.join(customerScriptsDir, 'page-to-theme.json'), JSON.stringify(pageToTheme, null, 2));

    // ── 7. vite.config.js — generated, fully generic ─────────────────────────

    // Rollup HTML + CSS/JS entries
    let rollupInputs = '';
    for (const file of distHtmlFiles) {
        const name = file.replace('.html', '').replace(/[\\/]/g, '-');
        rollupInputs += `                '${name}': path.resolve(__dirname, 'src/${file}'),\n`;
    }
    rollupInputs += `                'main':     path.resolve(__dirname, 'src/assets/js/main.js'),\n`;
    rollupInputs += `                'main_css': path.resolve(__dirname, 'src/assets/scss/main.scss'),\n`;
    rollupInputs += `                'tailwind': path.resolve(__dirname, 'src/assets/css/tailwind.css'),\n`;
    if (config.themes) {
        for (const t of Object.keys(config.themes)) {
            rollupInputs += `                'theme-${t}': path.resolve(__dirname, 'src/assets/scss/theme-${t}.scss'),\n`;
        }
    }

    // Carry the SCSS additionalData line straight from the project's vite.config.js
    // so it's never out of sync with whatever globals the project declares
    const projectViteConfigPath = path.join(projectRoot, 'vite.config.js');
    let   scssAdditionalData    = `'@import "/assets/scss/_config.scss"; @import "/assets/scss/_functions.scss"; @import "/assets/scss/_theme-engine.scss";'`;
    if (fs.existsSync(projectViteConfigPath)) {
        const adMatch = fs.readFileSync(projectViteConfigPath, 'utf8').match(/additionalData\s*:\s*`([^`]+)`/);
        if (adMatch) scssAdditionalData = '`' + adMatch[1] + '`';
    }

    const viteConfigContent = `import { defineConfig } from 'vite';
import path from 'path';
import fs from 'fs';

export default defineConfig({
    root: 'src',
    base: './',
    // public/ is served verbatim in dev and copied verbatim on build.
    // Pre-compiled CSS (fonts, icons, slider) and uikit-components.js live here
    // so Vite never tries to process their @font-face / UMD internals.
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
            // Suppress "didn't resolve at build time" warnings for static asset url()
            // references in CSS/SCSS. These are valid at runtime (browser resolves them
            // relative to the HTML document) but Vite can't follow them at build time.
            onwarn(warning, warn) {
                if (warning.message && warning.message.includes("didn't resolve at build time")) return;
                warn(warning);
            },
            input: {
${rollupInputs}            },
            output: {
                entryFileNames: 'assets/js/[name].js',
                chunkFileNames: 'assets/js/chunks/[name].js',
                assetFileNames: (assetInfo) => {
                    const name = assetInfo.names?.[0] ?? (assetInfo.name || '');

                    if (name.endsWith('.css')) {
                        if (name.replace('.css', '') === 'main_css')        return 'assets/css/main.min[extname]';
                        if (name.replace('.css', '').startsWith('theme-')) return 'assets/css/[name].min[extname]';
                        return 'assets/css/[name][extname]';
                    }

                    // Font routing: subfolder names are discovered dynamically from
                    // dist/assets/static/fonts/ so any icon font library works without
                    // editing this config (not just the default squeditor-icons).
                    if (name.match(/\\.(woff2?|eot|ttf|otf|svg)$/)) {
                        const fontsDir = path.resolve(__dirname, 'dist', 'assets', 'static', 'fonts');
                        if (fs.existsSync(fontsDir)) {
                            const baseName = name.replace(/\\.[^.]+$/, '');
                            for (const sub of fs.readdirSync(fontsDir)) {
                                const subDir = path.join(fontsDir, sub);
                                if (fs.statSync(subDir).isDirectory()) {
                                    if (fs.readdirSync(subDir).some(f => f.startsWith(baseName))) {
                                        return \`assets/static/fonts/\${sub}/[name][extname]\`;
                                    }
                                }
                            }
                        }
                        return 'assets/static/fonts/[name][extname]';
                    }

                    // Preserve folder structure for images and other static assets
                    const orig = assetInfo.originalFileName || '';
                    if (orig.includes('assets/static/')) {
                        const m = orig.match(/assets\\/static\\/(.*)/);
                        if (m) return ('assets/static/' + m[1].split('/').slice(0, -1).join('/') + '/[name][extname]').replace('//', '/');
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
                additionalData: ${scssAdditionalData},
            },
        },
    },
});
`;
    fs.writeFileSync(path.join(customerBuildDir, 'vite.config.js'), viteConfigContent);

    // ── 8. README ─────────────────────────────────────────────────────────────

    fs.writeFileSync(path.join(customerBuildDir, 'README.md'), `# ${config.name} — Customer Package

This package contains everything needed to use, customise and deploy your template.

## Directory structure

| Path | Purpose |
|---|---|
| \`src/\` | Editable source — HTML pages, SCSS, JS |
| \`dist/\` | Pre-built static files — drop on any host |
| \`public/\` | Static passthrough assets (do not edit) |
| \`scripts/\` | Post-build tooling (do not edit) |

## Quick start

\`\`\`bash
npm install
npm run dev      # live dev server at http://127.0.0.1:5173
npm run build    # rebuild dist/
\`\`\`

## Customising styles

1. **Colors** — edit \`src/assets/scss/_config.scss\` (\`$base-colors\` / \`$base-colors-dark\`)
2. **Theme overrides** — edit files in \`src/assets/scss/themes/\`
3. **Custom CSS** — add to \`src/assets/scss/custom.scss\` (loaded last)

## Safe to replace on updates

- \`_tokens.scss\`, \`_functions.scss\`, \`_theme-engine.scss\`, \`main.scss\`

## Never replace to not lose your changes

- \`_config.scss\`, \`custom.scss\`, and any \`themes/\` files you have edited.
`);

    // ── 9. Format + ZIP ───────────────────────────────────────────────────────

    try {
        ui.step('Formatting customer HTML files with Prettier...', 'pretty');
        const prettierBin = findPrettier();
        execSync(`"${prettierBin}" --write "src/**/*.html" "dist/**/*.html"`, { cwd: customerBuildDir, stdio: 'ignore' });
    } catch {
        ui.warning('Prettier formatting skipped or errored.');
    }

    ui.step(`Zipping to ${zipName}...`, 'package');
    try {
        execSync(`find "${customerBuildDir}" -name ".DS_Store" -delete`, { stdio: 'ignore' });
        execSync(`cd "${customerBuildDir}" && zip -q -r -9 "${zipPath}" . -x "*.DS_Store" -x "*/.DS_Store"`, { stdio: 'ignore' });
        ui.success(`ZIP created: ${zipName}`);
    } catch (e) {
        ui.error(`Failed to create ZIP: ${e.message}`);
    }
}

createCustomerPackage();