const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const projectRoot = process.cwd();
const config = require(path.join(projectRoot, 'squeditor.config.js'));
const micromatch = require(path.join(projectRoot, 'node_modules/micromatch'));

let sharp;
try {
    sharp = require(path.join(projectRoot, 'node_modules/sharp'));
} catch (e) { }

let ffmpeg;
try {
    ffmpeg = require(path.join(projectRoot, 'node_modules/fluent-ffmpeg'));
} catch (e) { }

const customerBuildDir = path.join(projectRoot, 'build-customer-package');
const distDir = path.join(projectRoot, 'dist');
const srcDir = path.join(projectRoot, 'src');
const zipName = config.dist.zipName ? config.dist.zipName.replace('.zip', '-customer.zip') : 'customer-package.zip';
const zipPath = path.join(projectRoot, zipName);

const mediaConfig = config.media || {};
const blurConfig = mediaConfig.blur || { enabled: false };
const optConfig = mediaConfig.optimize || { enabled: false };

async function processMediaFile(src, dest, relPath) {
    const isBlurEnabled = blurConfig.enabled;
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
    console.log('[Squeditor] 📦 Assembling Customer Package...');

    if (fs.existsSync(customerBuildDir)) {
        try {
            execSync(`rm -rf "${customerBuildDir}"`);
        } catch (e) {
            console.warn(`   - ⚠️  Warning: Could not fully clean ${customerBuildDir}. You may need to run 'sudo rm -rf' on it manually.`);
        }
    }
    if (fs.existsSync(zipPath)) {
        fs.unlinkSync(zipPath);
    }

    fs.mkdirSync(path.join(customerBuildDir, 'src/assets'), { recursive: true });

    console.log('   - Copying compiled HTML to src/');
    const distHtmlFiles = fs.readdirSync(distDir).filter(file => file.endsWith('.html'));

    distHtmlFiles.forEach(file => {
        let htmlContent = fs.readFileSync(path.join(distDir, file), 'utf8');
        htmlContent = htmlContent.replace(
            /<link rel="stylesheet" href="assets\/css\/main_css\.css">/g,
            '<link rel="stylesheet" href="assets/scss/main.scss">'
        );
        htmlContent = htmlContent.replace(
            /<script src="assets\/js\/uikit-components\.js"><\/script>/g,
            '<script type="module" src="assets/js/uikit-components.js"></script>'
        );
        fs.writeFileSync(path.join(customerBuildDir, 'src', file), htmlContent);
    });

    console.log('   - Copying necessary assets to src/assets');
    fs.mkdirSync(path.join(customerBuildDir, 'src/assets/css'), { recursive: true });
    fs.copyFileSync(path.join(distDir, 'assets/css/tailwind.css'), path.join(customerBuildDir, 'src/assets/css/tailwind.css'));
    if (fs.existsSync(path.join(distDir, 'assets/css/squeditor-icons.css'))) {
        fs.copyFileSync(path.join(distDir, 'assets/css/squeditor-icons.css'), path.join(customerBuildDir, 'src/assets/css/squeditor-icons.css'));
    }

    fs.cpSync(path.join(srcDir, 'assets/scss'), path.join(customerBuildDir, 'src/assets/scss'), { recursive: true });

    const customerScssDir = path.join(customerBuildDir, 'src/assets/scss');
    const mainScssPath = path.join(customerScssDir, 'main.scss');
    if (fs.existsSync(mainScssPath)) {
        let mainScssContent = fs.readFileSync(mainScssPath, 'utf8');
        mainScssContent = mainScssContent.replace(/@import\s+['"]custom['"];\n?/g, '');
        mainScssContent += `\n// --- CUSTOM SCRIPTS --- (These run last to override themes block cleanly)\n@import 'custom-config';\n@import 'custom';\n`;
        fs.writeFileSync(mainScssPath, mainScssContent);

        const customConfigContent = `// custom-config.scss\n// Define your theme variable overrides here.\n:root, [class*="theme-"] {\n    // --sq-color-primary: #ff0000;\n}\n`;
        fs.writeFileSync(path.join(customerScssDir, 'custom-config.scss'), customConfigContent);
    }

    fs.mkdirSync(path.join(customerBuildDir, 'src/assets/js'), { recursive: true });
    fs.copyFileSync(path.join(distDir, 'assets/js/uikit-components.js'), path.join(customerBuildDir, 'src/assets/js/uikit-components.js'));
    fs.copyFileSync(path.join(distDir, 'assets/js/main.js'), path.join(customerBuildDir, 'src/assets/js/main.js'));

    const staticDistPath = path.join(distDir, 'assets/static');
    const staticCustomerPath = path.join(customerBuildDir, 'src/assets/static');
    if (fs.existsSync(staticDistPath)) {
        await walkAndProcessMedia(staticDistPath, staticCustomerPath, staticDistPath);
    }

    console.log('   - Generating lean package.json and vite.config.js');
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
        const name = file.replace('.html', '');
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
                    return 'assets/[name]-[hash][extname]';
                },
            },
        },
    },
    css: {
        preprocessorOptions: {
            scss: {
                api: 'modern-compiler',
                silenceDeprecations: ['import', 'legacy-js-api'],
                additionalData: '@import "/assets/scss/_tokens.scss";',
            },
        },
    },
});
`;
    fs.writeFileSync(path.join(customerBuildDir, 'vite.config.js'), viteConfigContent);

    const tailwindConfig = `/** @type {import('tailwindcss').Config} */\nmodule.exports = {\n    darkMode: ['selector', '.sq-theme-dark'],\n    content: [ './src/**/*.html' ],\n    theme: {\n        extend: {\n            colors: {\n                primary: 'var(--sq-color-primary)',\n                secondary: 'var(--sq-color-secondary)',\n                accent: 'var(--sq-color-accent)',\n            },\n            fontFamily: {\n                sans: ['var(--sq-font-sans)'],\n                serif: ['var(--sq-font-serif)'],\n                mono: ['var(--sq-font-mono)'],\n            },\n        },\n    },\n    plugins: [],\n}`;
    fs.writeFileSync(path.join(customerBuildDir, 'tailwind.config.js'), tailwindConfig);

    const postcssConfig = `module.exports = {\n  plugins: {\n    tailwindcss: {},\n    autoprefixer: {},\n  },\n}`;
    fs.writeFileSync(path.join(customerBuildDir, 'postcss.config.js'), postcssConfig);

    const readmeContent = `# ${config.name} - Customer Package\n\nThis package contains everything you need to use, customize, and deploy your template.\n\n## Directory Structure\n- \`src/\`: Source HTML files.\n- \`src/assets/\`: Source files for customization (SCSS, JS, Images).\n\n## How to Customize Styles\n1. Install dependencies: \`npm install\`\n2. Run live development server: \`npm run dev\`\n3. Build production assets: \`npm run build\`\n`;
    fs.writeFileSync(path.join(customerBuildDir, 'README.md'), readmeContent);

    try {
        console.log('   - Formatting customer HTML files with Prettier...');
        execSync('npx prettier --write "src/**/*.html" --print-width 10000 --tab-width 4', { cwd: customerBuildDir, stdio: 'ignore' });
    } catch (e) { }

    console.log(`[Squeditor] 📦 Zipping Customer Package to ${zipName}...`);
    try {
        // Explicitly clean up any .DS_Store files that might have been created by the OS
        execSync(`find "${customerBuildDir}" -name ".DS_Store" -delete`, { stdio: 'ignore' });
        execSync(`cd "${customerBuildDir}" && zip -r -9 "${zipPath}" . -x "*.DS_Store" -x "*/.DS_Store"`, { stdio: 'ignore' });
        console.log(`[Squeditor] ✅ ZIP created: ${zipName}`);
    } catch (e) {
        console.error(`[Squeditor] ❌ Failed to create ZIP archive.`, e.message);
    }
}

createCustomerPackage();
