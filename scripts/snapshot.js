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
                const urlToFetch = `${baseUrl}${pagePath}?theme=${themeKey}&snapshot=1`;
                const html = await fetchPage(urlToFetch);
                const rewrittenHtml = rewriteLinks(html);

                // Remove leading slash for local save path
                let savePath = pagePath.startsWith('/') ? pagePath.slice(1) : pagePath;
                if (savePath === '') savePath = 'index.html';
                if (rewriteExtension && savePath.endsWith('.php')) {
                    savePath = savePath.replace(/\.php$/, '.html');
                }

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
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
        }).on('error', reject);
    });
}

function rewriteLinks(html) {
    if (!rewriteExtension) return html;
    // Replace .php hrefs with .html
    return html.replace(/href="([^"]*?)\.php([^"]*?)"/g, 'href="$1.html$2"');
}
