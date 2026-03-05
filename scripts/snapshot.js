const fs = require('fs');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');

const projectRoot = process.cwd();
const config = require(path.join(projectRoot, 'squeditor.config.js'));

const { baseUrl, pages, outputDir, rewriteExtension } = config.snapshot;
const distDir = path.join(projectRoot, outputDir);

fs.mkdirSync(distDir, { recursive: true });

// Start PHP built-in server
const phpServer = spawn('php', [
    '-S', '127.0.0.1:' + config.devServer.port,
    '-t', path.join(projectRoot, 'src')
], {
    stdio: 'ignore',
    env: { ...process.env, SQUEDITOR_SNAPSHOT: '1' }
});

// Wait for PHP server to start
setTimeout(async () => {
    console.log('[Squeditor] 📸 Starting snapshot...');

    const themes = config.themes || { default: { pages: config.snapshot.pages, distSubfolder: '' } };

    for (const [themeKey, theme] of Object.entries(themes)) {
        const themeDistDir = path.join(distDir, theme.distSubfolder || '');
        fs.mkdirSync(themeDistDir, { recursive: true });

        for (const pagePath of theme.pages) {
            try {
                console.log(`[Squeditor] Fetching ${pagePath} (Theme: ${themeKey})...`);
                const normalizedPagePath = pagePath.startsWith('/') ? pagePath : `/${pagePath}`;
                const urlToFetch = `${baseUrl.replace(/\/$/, '')}${normalizedPagePath}?theme=${themeKey}&snapshot=1`;
                const html = await fetchPage(urlToFetch);

                // Remove leading slash for local save path
                let savePath = pagePath.startsWith('/') ? pagePath.slice(1) : pagePath;
                if (savePath === '') savePath = 'index.html';
                if (rewriteExtension && savePath.endsWith('.php')) {
                    savePath = savePath.replace(/\.php$/, '.html');
                }

                const rewrittenHtml = rewriteLinks(html, savePath, theme.distSubfolder);

                const fullPath = path.join(themeDistDir, savePath);
                fs.mkdirSync(path.dirname(fullPath), { recursive: true });
                fs.writeFileSync(fullPath, rewrittenHtml);
            } catch (err) {
                console.error(`[Squeditor] Failed to snapshot ${pagePath}:`, err.message);
            }
        }
    }

    phpServer.kill();
    console.log('[Squeditor] 🏁 Snapshot complete.');
}, 1500);

function fetchPage(url) {
    return new Promise((resolve, reject) => {
        http.get(url, (res) => {
            if (res.statusCode < 200 || res.statusCode >= 300) {
                return reject(new Error(`Status Code: ${res.statusCode}`));
            }
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
        }).on('error', reject);
    });
}

function rewriteLinks(html, savePath, distSubfolder) {
    let result = html;
    
    // Calculate relative path back to dist root
    // 1. Account for subfolder depth
    // 2. Account for savePath directory depth
    const subfolderDepth = distSubfolder ? distSubfolder.split('/').filter(Boolean).length : 0;
    const savePathDepth = path.dirname(savePath) === '.' ? 0 : path.dirname(savePath).split('/').length;
    
    const totalDepth = subfolderDepth + savePathDepth;
    const prefix = totalDepth > 0 ? '../'.repeat(totalDepth) : '';

    // Rewrite root-relative and purely relative absolute references to depth-adjusted references.
    // Example: /assets/css/... -> ../assets/css/...
    // Example: assets/css/... -> ../assets/css/...
    result = result.replace(/(href|src)=["']\/?([^"']+)["']/g, (match, attr, targetPath) => {
        // Skip external URLs and hashes
        if (targetPath.startsWith('http') || targetPath.startsWith('//') || targetPath.startsWith('#')) {
            return match;
        }
        return `${attr}="${prefix}${targetPath}"`;
    });

    if (rewriteExtension) {
        // Replace .php hrefs with .html, ensuring they also get prefixed if they were root-relative
        result = result.replace(/href=["']([^"']*?)\.php([^"']*?)["']/g, 'href="$1.html$2"');
    }
    
    return result;
}
