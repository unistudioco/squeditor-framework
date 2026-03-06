const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const projectRoot = process.cwd();
const config = require(path.join(projectRoot, 'squeditor.config.js'));

const distDir = path.join(projectRoot, 'dist');
const zipName = config.dist.zipName || 'squeditor-dist.zip';
const zipPath = path.join(projectRoot, zipName);

// Clean up existing ZIP
if (fs.existsSync(zipPath)) {
    fs.unlinkSync(zipPath);
}

// 1. Create ZIP using system zip command
console.log('[Squeditor] 📦 Creating ZIP archive...');
try {
    // Explicitly clean up any .DS_Store files that might have been created by the OS
    execSync(`find "${distDir}" -name ".DS_Store" -delete`, { stdio: 'inherit' });
    execSync(`cd "${distDir}" && zip -r -9 "${zipPath}" . -x "*.DS_Store" -x "*/.DS_Store"`, { stdio: 'inherit' });
    console.log(`[Squeditor] ✅ Dist ZIP Ready: ${zipName}`);
} catch (e) {
    console.error(`[Squeditor] ❌ Failed to create ZIP archive using system zip.`, e);
}

const requiredDirs = ['assets/css', 'assets/js', 'assets/static/images'];
requiredDirs.forEach(dir => {
    if (!fs.existsSync(path.join(distDir, dir))) {
        console.warn(`[Squeditor] ⚠️  Missing in dist: ${dir} — please verify build integrity.`);
    }
});

// 2. Deploy preview
function deployPreview() {
    const platform = config.dist.previewPlatform;
    if (!platform) return; // Skip deployment if none configured
    console.log(`[Squeditor] 🚀 Deploying preview to ${platform}...`);

    if (platform === 'netlify') {
        try {
            execSync('netlify deploy --dir=dist', { stdio: 'inherit', cwd: projectRoot });  // removed --open for headless
        } catch (e) { console.error("[Squeditor] Failed to deploy netlify (you may need to login or install CLI)", e.message); }
    } else if (platform === 'vercel') {
        try {
            execSync('vercel dist --yes', { stdio: 'inherit', cwd: projectRoot });
        } catch (e) { console.error("[Squeditor] Failed to deploy vercel", e); }
    } else {
        console.log('[Squeditor] ⚠️  Unknown preview platform. Set config.dist.previewPlatform to "netlify" or "vercel".');
    }
}

deployPreview();
