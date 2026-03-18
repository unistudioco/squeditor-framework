const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const deploy = require('./utils/deploy');

const projectRoot = process.cwd();
const config = require(path.join(projectRoot, 'squeditor.config.js'));
const ui = require('./utils/cli-ui');

const distDir = path.join(projectRoot, 'dist');
const zipName = config.dist.zipName || 'squeditor-dist.zip';
const zipPath = path.join(projectRoot, zipName);

// Clean up existing ZIP
if (fs.existsSync(zipPath)) {
    fs.unlinkSync(zipPath);
}

// 1. Create ZIP using system zip command
ui.header('Packaging Distribution ZIP');
ui.step('Creating ZIP archive...', 'package');
try {
    // Explicitly clean up any .DS_Store files that might have been created by the OS
    execSync(`find "${distDir}" -name ".DS_Store" -delete`, { stdio: 'ignore' });
    execSync(`cd "${distDir}" && zip -q -r -9 "${zipPath}" . -x "*.DS_Store" -x "*/.DS_Store"`, { stdio: 'ignore' });
    ui.success(`Dist ZIP Ready: ${zipName}`);
} catch (e) {
    ui.error('Failed to create ZIP archive using system zip.');
}

const requiredDirs = ['assets/css', 'assets/js', 'assets/static/images'];
requiredDirs.forEach(dir => {
    if (!fs.existsSync(path.join(distDir, dir))) {
        ui.warning(`Missing in dist: ${dir} — please verify build integrity.`);
    }
});

// 2. Deploy preview via modular system
deploy.run(projectRoot, config);
