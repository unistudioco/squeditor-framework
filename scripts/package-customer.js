const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { projectRoot, config, findPrettier, safeMkdir, stripDevContent, stripDemoContent } = require('./utils/core');
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

        // 1. Remove Theme Switcher Block (div + script + styles + comments)
        // Aggressively target the isolation style block
        htmlContent = htmlContent.replace(/<style>\s*\/\* Isolate Theme Switcher[\s\S]*?<\/style>/gi, '');
        // Target the switcher floating component
        htmlContent = htmlContent.replace(/<!--\s*Floating Theme Switcher\s*-->\s*<div class="sq-theme-switcher[\s\S]*?<\/script>/gi, '');
        htmlContent = htmlContent.replace(/<div class="sq-theme-switcher[\s\S]*?<\/script>/gi, '');
        htmlContent = htmlContent.replace(/<!--\s*Floating Theme Switcher\s*-->/g, '');

        // 2. Identify assigned theme
        const assignedTheme = pageToTheme[file];
        const allThemes = Object.keys(config.themes || {});

        // Calculate relative prefix back to dist/src root
        const depth = file.split(path.sep).length - 1;
        const prefix = depth > 0 ? '../'.repeat(depth) : '';

        // dist/ gets production HTML referencing compiled CSS
        let distHtml = htmlContent;
        allThemes.forEach(t => {
            if (t !== assignedTheme) {
                const regex = new RegExp(`<link rel="stylesheet" href="([^"]*?)assets/css/theme-${t}\\.min\\.css"\\s*/?>\\s*`, 'g');
                distHtml = distHtml.replace(regex, '');
            }
        });
        fs.writeFileSync(distDest, distHtml);

        // src/ gets dev HTML: rewrite CSS refs to raw SCSS for Vite HMR
        let devHtml = htmlContent;
        // Rewrite main CSS
        devHtml = devHtml.replace(/href="([^"]*?)assets\/css\/main\.min\.css"/g, `href="${prefix}assets/scss/main.scss"`);
        devHtml = devHtml.replace(/href="([^"]*?)assets\/css\/tailwind\.css"/g, `href="${prefix}assets/css/tailwind.css"`);
        
        // Rewrite/Clean themes for dev
        allThemes.forEach(t => {
            const themeLinkRegex = new RegExp(`<link rel="stylesheet" href="([^"]*?)assets/css/theme-${t}\\.min\\.css"\\s*/?>`, 'g');
            if (t === assignedTheme) {
                // Transform to SCSS script for HMR
                devHtml = devHtml.replace(themeLinkRegex, `<script type="module" src="${prefix}assets/scss/theme-${t}.scss"></script>`);
            } else {
                // Remove entirely
                devHtml = devHtml.replace(themeLinkRegex, '');
            }
        });
        
        fs.writeFileSync(srcDest, devHtml);
    });

    // 3. Copy Theme Configs
    ui.step('Copying theme configurations to src/config...');
    const customerConfigDir = path.join(customerBuildDir, 'src/config');
    if (!fs.existsSync(customerConfigDir)) {
        fs.mkdirSync(customerConfigDir, { recursive: true });
    }
    const configFiles = fs.readdirSync(path.join(srcDir, 'config'));
    configFiles.forEach(file => {
        const srcConfig = path.join(srcDir, 'config', file);
        const destConfig = path.join(customerConfigDir, file);

        if (file === 'site-settings.php') {
            // Force demo_mode to false in customer package
            const settingsContent = `<?php\n// Auto-generated by package-customer.js\n$site_settings = [\n    'is_demo_mode' => false,\n];\n`;
            fs.writeFileSync(destConfig, settingsContent);
        } else {
            fs.copyFileSync(srcConfig, destConfig);
        }
    });

    // 4. Copy Developer Assets
    ui.step('Copying developer source files to src/assets...');
    fs.mkdirSync(path.join(customerBuildDir, 'src/assets/css'), { recursive: true });
    // Also copy dist production files
    fs.mkdirSync(path.join(customerBuildDir, 'dist/assets/css'), { recursive: true });
    
    const tailwindPath = path.join(distDir, 'assets/css/tailwind.css');
    if (fs.existsSync(tailwindPath)) {
        let twContent = fs.readFileSync(tailwindPath, 'utf8');
        fs.writeFileSync(path.join(customerBuildDir, 'src/assets/css/tailwind.css'), cleanCssContent(twContent));
        fs.writeFileSync(path.join(customerBuildDir, 'dist/assets/css/tailwind.css'), cleanCssContent(twContent));
    }
    
    const iconPath = path.join(distDir, 'assets/css/squeditor-icons.css');
    if (fs.existsSync(iconPath)) {
        fs.copyFileSync(iconPath, path.join(customerBuildDir, 'src/assets/css/squeditor-icons.css'));
        fs.copyFileSync(iconPath, path.join(customerBuildDir, 'dist/assets/css/squeditor-icons.css'));
    }

    const fontsCssPath = path.join(distDir, 'assets/css/fonts.css');
    if (fs.existsSync(fontsCssPath)) {
        fs.copyFileSync(fontsCssPath, path.join(customerBuildDir, 'src/assets/css/fonts.css'));
        fs.copyFileSync(fontsCssPath, path.join(customerBuildDir, 'dist/assets/css/fonts.css'));
    }
    
    const mainCssPath = path.join(distDir, 'assets/css/main.min.css');
    if (fs.existsSync(mainCssPath)) {
        let mainContent = fs.readFileSync(mainCssPath, 'utf8');
        fs.writeFileSync(path.join(customerBuildDir, 'dist/assets/css/main.min.css'), cleanCssContent(mainContent));
    }

    // slider.min.css contains the slider library CSS (Splide/Swiper)
    if (fs.existsSync(path.join(distDir, 'assets/css/slider.min.css'))) {
        fs.copyFileSync(path.join(distDir, 'assets/css/slider.min.css'), path.join(customerBuildDir, 'src/assets/css/slider.min.css'));
        fs.copyFileSync(path.join(distDir, 'assets/css/slider.min.css'), path.join(customerBuildDir, 'dist/assets/css/slider.min.css'));
    }

    fs.cpSync(path.join(srcDir, 'assets/scss'), path.join(customerBuildDir, 'src/assets/scss'), { recursive: true });

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

        // Add headers to framework config files
        const frameworkConfigs = ['active-components.php', 'active-themes.php', 'theme-entries.php'];
        frameworkConfigs.forEach(file => {
            const filePath = path.join(customerConfigDir, file);
            if (fs.existsSync(filePath)) {
                let content = fs.readFileSync(filePath, 'utf8');
                if (!content.includes('⚠️ FRAMEWORK FILE')) {
                    content = content.replace('<?php', '<?php\n// ⚠️ FRAMEWORK FILE — Do not edit. This file will be replaced on updates.');
                    fs.writeFileSync(filePath, content);
                }
            }
        });

        // Clean source SCSS theme files to remove font-family forces
        const themeScssFiles = fs.readdirSync(path.join(customerScssDir, 'themes')).filter(f => f.endsWith('.scss'));
        themeScssFiles.forEach(f => {
            const filePath = path.join(customerScssDir, 'themes', f);
            let content = fs.readFileSync(filePath, 'utf8');
            // Remove the h1-h6 font-family block
            const scssFontRegex = /\s*h1,\s*h2,\s*h3,\s*h4,\s*h5,\s*h6\s*\{[^}]*font-family:\s*var\(--sq-font-heading\);?\s*\}/gi;
            content = content.replace(scssFontRegex, '');
            fs.writeFileSync(filePath, content);
        });
    }

    fs.mkdirSync(path.join(customerBuildDir, 'src/assets/js'), { recursive: true });
    fs.mkdirSync(path.join(customerBuildDir, 'dist/assets/js'), { recursive: true });
    fs.copyFileSync(path.join(distDir, 'assets/js/uikit-components.js'), path.join(customerBuildDir, 'src/assets/js/uikit-components.js'));
    fs.copyFileSync(path.join(distDir, 'assets/js/uikit-components.js'), path.join(customerBuildDir, 'dist/assets/js/uikit-components.js'));
    fs.copyFileSync(path.join(distDir, 'assets/js/main.js'), path.join(customerBuildDir, 'src/assets/js/main.js'));
    fs.copyFileSync(path.join(distDir, 'assets/js/main.js'), path.join(customerBuildDir, 'dist/assets/js/main.js'));

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
    const staticCustomerSourcePath = path.join(customerBuildDir, 'src/assets/static');
    const staticCustomerDistPath = path.join(customerBuildDir, 'dist/assets/static');
    if (fs.existsSync(staticDistPath)) {
        await walkAndProcessMedia(staticDistPath, staticCustomerSourcePath, staticDistPath);
        // Also move these final processed media assets directly from src/ back to dist/
        fs.cpSync(staticCustomerSourcePath, staticCustomerDistPath, { recursive: true });
    }

    // 5. Generate package.json and vite.config.js
    ui.step('Generating lean package.json and vite.config.js...');
    const originalPkg = require(path.join(projectRoot, 'package.json'));
    const customerPkg = {
        name: originalPkg.name,
        private: true,
        scripts: {
            "dev": "vite",
            "build": "vite build",
            "preview": "vite preview",
            "format": "prettier --write \"src/**/*.html\""
        },
        dependencies: {
            "uikit": originalPkg.dependencies.uikit
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

    const prettierrcContent = `{\n  "printWidth": 10000,\n  "tabWidth": 4,\n  "useTabs": false,\n  "semi": true,\n  "singleQuote": true,\n  "trailingComma": "es5",\n  "bracketSpacing": true,\n  "htmlWhitespaceSensitivity": "ignore"\n}`;
    fs.writeFileSync(path.join(customerBuildDir, '.prettierrc'), prettierrcContent);

    let rollupInputs = '';
    distHtmlFiles.forEach(file => {
        // Handle naming for subfolders: saas-demo/landing -> saas-demo-landing
        const name = file.replace('.html', '').replace(/[\\/]/g, '-');
        rollupInputs += `                '${name}': path.resolve(__dirname, 'src/${file}'),\n`;
    });

    const viteConfigContent = `import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
    root: 'src',
    base: './',
    publicDir: false,
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
                entryFileNames: 'assets/js/[name]-[hash].js',
                assetFileNames: (assetInfo) => {
                    const name = assetInfo.names ? assetInfo.names[0] : assetInfo.name;
                    if (name.endsWith('.css')) return 'assets/css/[name]-[hash][extname]';
                    
                    // Route fonts to their static folder while preserving subfolders if possible
                    const isFont = name.match(/\.(woff2?|eot|ttf|otf)$/) || name.includes('squeditor-icons.svg');
                    if (isFont) {
                        return 'assets/static/fonts/[name][extname]';
                    }
                    
                    return 'assets/[name]-[hash][extname]';
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

    const tailwindConfig = `/** @type {import('tailwindcss').Config} */\nmodule.exports = {\n    darkMode: ['selector', '.sq-theme-dark'],\n    content: [ './src/**/*.html' ],\n    theme: {\n        extend: {\n            colors: {\n                primary: 'rgb(var(--sq-color-primary-rgb) / <alpha-value>)',\n                secondary: 'rgb(var(--sq-color-secondary-rgb) / <alpha-value>)',\n                accent: 'rgb(var(--sq-color-accent-rgb) / <alpha-value>)',\n                muted: 'rgb(var(--sq-color-muted-text-rgb) / <alpha-value>)',\n                light: 'rgb(var(--sq-color-light-rgb) / <alpha-value>)',\n                dark: 'rgb(var(--sq-color-dark-rgb) / <alpha-value>)',\n            },\n            fontFamily: {\n                sans: ['var(--sq-font-sans)'],\n                serif: ['var(--sq-font-serif)'],\n                mono: ['var(--sq-font-mono)'],\n            },\n        },\n    },\n    plugins: [],\n}`;
    fs.writeFileSync(path.join(customerBuildDir, 'tailwind.config.js'), tailwindConfig);

    const postcssConfig = `module.exports = {\n  plugins: {\n    tailwindcss: {},\n    autoprefixer: {},\n  },\n}`;
    fs.writeFileSync(path.join(customerBuildDir, 'postcss.config.js'), postcssConfig);

    const readmeContent = `# ${config.name} - Customer Package\n\nThis package contains everything you need to use, customize, and deploy your template.\n\n## Directory Structure\n- \`src/\`: Developer Source files (\`npm run dev\` needed).\n- \`dist/\`: Production-ready compiled HTML snapshot (Drop into any hosting).\n\n## How to Customize Styles\n1. Install dependencies: \`npm install\`\n2. Run live development server: \`npm run dev\`\n3. **Colors:** Edit \`src/assets/scss/_config.scss\` — change \`$base-colors\` and \`$base-colors-dark\` maps\n4. **Theme overrides:** Edit files in \`src/assets/scss/themes/\`\n5. **Custom styles:** Add your CSS to \`src/assets/scss/custom.scss\`\n6. Build production assets to \`dist/\`: \`npm run build\`\n\n## File Update Safety\nWhen updating to a new version, these files can be safely replaced (your changes are in \`_config.scss\`, \`themes/\`, and \`custom.scss\` which are yours to keep):\n- \`_tokens.scss\` — auto-generated from \`_config.scss\`\n- \`_functions.scss\` — framework helper functions\n- \`_theme-engine.scss\` — theme generator mixin\n- \`main.scss\` — main import orchestrator\n\n**Never replace:** \`_config.scss\`, \`custom.scss\`, and any \`themes/*.scss\` files you have customized.\n`;
    fs.writeFileSync(path.join(customerBuildDir, 'README.md'), readmeContent);

    // Helper to find the prettier executable in the main project

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
