const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const projectRoot = process.cwd();
const config = require(path.join(projectRoot, 'squeditor.config.js'));
const micromatch = require(path.join(projectRoot, 'node_modules/micromatch'));

let sharp;
try {
    sharp = require(path.join(projectRoot, 'node_modules/sharp'));
} catch (e) {
    console.warn('[Squeditor] ⚠️ sharp not found. Image optimization will be skipped.');
}

let ffmpeg;
try {
    ffmpeg = require(path.join(projectRoot, 'node_modules/fluent-ffmpeg'));
} catch (e) {
    console.warn('[Squeditor] ⚠️ fluent-ffmpeg not found. Video optimization will be skipped.');
}

const srcDir = path.join(projectRoot, 'src/assets/static');
const destDir = path.join(projectRoot, config.snapshot.outputDir, 'assets/static');

const mediaConfig = config.media || {};
const optConfig = mediaConfig.optimize || { enabled: false };

async function processFile(src, dest, relPath) {
    const isOptimizeEnabled = optConfig.enabled;
    const isMatched = isOptimizeEnabled && micromatch.isMatch(relPath, optConfig.include || [], { ignore: optConfig.exclude || [] });

    const ext = path.extname(src).toLowerCase();
    const isImage = ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext);
    const isVideo = ['.mp4', '.webm'].includes(ext);

    fs.mkdirSync(path.dirname(dest), { recursive: true });

    if (isMatched) {
        if (isImage && sharp) {
            try {
                console.log(`   - Optimizing image: ${relPath}`);
                let pipeline = sharp(src);

                const quality = optConfig.imageQuality || 80;

                if (ext === '.jpg' || ext === '.jpeg') {
                    pipeline = pipeline.jpeg({ quality, mozjpeg: true });
                } else if (ext === '.png') {
                    pipeline = pipeline.png({ quality, compressionLevel: 9, palette: true });
                } else if (ext === '.webp') {
                    pipeline = pipeline.webp({ quality, effort: 6 });
                } else if (ext === '.gif') {
                    pipeline = pipeline.gif(); // Standard gif optimization
                }

                await pipeline.toFile(dest);

                // --- Regression Check ---
                // If optimized file is somehow larger than original, fallback to original
                const originalSize = fs.statSync(src).size;
                const optimizedSize = fs.statSync(dest).size;

                if (optimizedSize > originalSize) {
                    // console.log(`     - ℹ️ Optimized size (${optimizedSize}) > original (${originalSize}). Falling back to original.`);
                    fs.copyFileSync(src, dest);
                }

                return;
            } catch (err) {
                console.error(`   - ❌ Failed to optimize image ${relPath}:`, err.message);
            }
        } else if (isVideo && ffmpeg) {
            try {
                console.log(`   - Optimizing video: ${relPath} (This may take a while...)`);
                return new Promise((resolve, reject) => {
                    ffmpeg(src)
                        .outputOptions([
                            '-c:v libx264',
                            `-crf ${optConfig.videoQuality || 28}`,
                            '-preset slower',
                            '-c:a aac',
                            '-b:a 128k',
                            '-movflags +faststart'
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
                            console.error(`   - ❌ Failed to optimize video ${relPath}:`, err.message);
                            fs.copyFileSync(src, dest);
                            resolve();
                        });
                });
            } catch (err) {
                console.error(`   - ❌ Video optimization error for ${relPath}:`, err.message);
            }
        }
    }

    // Default: Just copy
    fs.copyFileSync(src, dest);
}

async function walkAndProcess(currentSrc, currentDest, baseDir) {
    const files = fs.readdirSync(currentSrc);
    for (const file of files) {
        if (file === '.DS_Store') continue;

        const srcPath = path.join(currentSrc, file);
        const destPath = path.join(currentDest, file);
        const relPath = path.relative(baseDir, srcPath);
        const stat = fs.statSync(srcPath);

        if (stat.isDirectory()) {
            await walkAndProcess(srcPath, destPath, baseDir);
        } else {
            await processFile(srcPath, destPath, relPath);
        }
    }
}

async function run() {
    if (fs.existsSync(srcDir)) {
        console.log(`[Squeditor] 📂 Processing static assets from src/assets/static to dist/assets/static...`);
        fs.mkdirSync(destDir, { recursive: true });

        await walkAndProcess(srcDir, destDir, srcDir);

        console.log(`[Squeditor] ✅ Static assets processed.`);

        const uikitJs = path.join(projectRoot, 'src/assets/js/uikit-components.js');
        const uikitDest = path.join(projectRoot, config.snapshot.outputDir, 'assets/js/uikit-components.js');
        if (fs.existsSync(uikitJs)) {
            fs.mkdirSync(path.dirname(uikitDest), { recursive: true });
            fs.copyFileSync(uikitJs, uikitDest);
        }
    } else {
        console.warn(`[Squeditor] ⚠️ Source directory for static assets not found: ${srcDir}`);
    }

    // Post-Vite-build CSS renaming for clearer dist output
    const distCssDir = path.join(projectRoot, config.snapshot.outputDir, 'assets/css');

    // Rename main_css.css → main.min.css (SCSS entry output)
    const mainCssSrc = path.join(distCssDir, 'main_css.css');
    const mainCssDest = path.join(distCssDir, 'main.min.css');
    if (fs.existsSync(mainCssSrc)) {
        fs.renameSync(mainCssSrc, mainCssDest);
        console.log('[Squeditor] 📎 Renamed main_css.css → main.min.css');
    }

    // Remove stale main.css (previously contained CSS-in-JS extracted by Vite, now handled separately)
    const staleMainCss = path.join(distCssDir, 'main.css');
    if (fs.existsSync(staleMainCss)) {
        fs.unlinkSync(staleMainCss);
    }

    // Copy slider.min.css to dist (generated by build-components.js)
    const sliderCssSrc = path.join(projectRoot, 'src/assets/css/slider.min.css');
    const sliderCssDest = path.join(distCssDir, 'slider.min.css');
    if (fs.existsSync(sliderCssSrc)) {
        fs.mkdirSync(distCssDir, { recursive: true });
        fs.copyFileSync(sliderCssSrc, sliderCssDest);
        console.log('[Squeditor] 📎 Copied slider.min.css → dist/assets/css/');
    }
}

run();
