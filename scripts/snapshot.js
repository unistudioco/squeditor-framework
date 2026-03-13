const fs = require('fs');
const path = require('path');
const http = require('http');
const { spawn, execSync } = require('child_process');

const projectRoot = process.cwd();
const config = require(path.join(projectRoot, 'squeditor.config.js'));
const resolvePages = require('./utils/resolve-pages');
const getAvailablePort = require('./get-port');
const ui = require('./utils/cli-ui');

const { outputDir, rewriteExtension } = config.snapshot;
const distDir = path.join(projectRoot, outputDir);

// Build a reverse lookup: pagePath -> themeKey
// This allows snapshot.pages to be the AUTHORITATIVE list while themes are applied per-page
function buildThemeLookup() {
    const lookup = {};
    if (config.themes) {
        for (const [themeKey, theme] of Object.entries(config.themes)) {
            const resolvedThemePages = resolvePages(theme.pages || [], projectRoot);
            for (const p of resolvedThemePages) {
                lookup[p] = { themeKey, distSubfolder: theme.distSubfolder || '' };
            }
        }
    }
    return lookup;
}

// Poll the PHP server until it responds (max ~10 seconds)
function waitForServer(url, maxRetries = 50, interval = 200) {
    return new Promise((resolve, reject) => {
        let attempts = 0;
        const check = () => {
            http.get(url, (res) => {
                resolve();
            }).on('error', () => {
                attempts++;
                if (attempts >= maxRetries) {
                    reject(new Error('PHP server failed to start within timeout'));
                } else {
                    setTimeout(check, interval);
                }
            });
        };
        check();
    });
}

async function runSnapshot() {
    fs.mkdirSync(distDir, { recursive: true });

    // Use a dynamic port to avoid collisions with a running dev server
    const snapshotPort = await getAvailablePort(config.devServer.port + 100);
    const snapshotBaseUrl = `http://127.0.0.1:${snapshotPort}`;

    // Resolve dev-router path for proper .html and extensionless URL handling
    const fwRoot = path.resolve(projectRoot, config.framework);
    const devRouterPath = path.join(fwRoot, 'scripts/dev-router.php');

    function findPrettier() {
        const localPrettier = path.join(projectRoot, 'node_modules/.bin/prettier');
        if (fs.existsSync(localPrettier)) return localPrettier;
        
        // Check framework node_modules as fallback
        const fwPrettier = path.join(fwRoot, 'node_modules/.bin/prettier');
        if (fs.existsSync(fwPrettier)) return fwPrettier;
        
        return 'prettier'; // Fallback to global if all else fails
    }

    // Start PHP built-in server WITH the dev-router
    const phpServer = spawn('php', [
        '-S', `127.0.0.1:${snapshotPort}`,
        '-t', path.join(projectRoot, 'src'),
        devRouterPath
    ], {
        stdio: 'ignore',
        env: { ...process.env, SQUEDITOR_SNAPSHOT: '1' }
    });

    try {
        // Wait for PHP server to be ready instead of a fixed timeout
        await waitForServer(snapshotBaseUrl);

        ui.header('Generating Static Snapshots');
        ui.step('Server ready, starting snapshot...', 'camera');

        // snapshot.pages is the AUTHORITATIVE list of pages to capture
        const allPages = resolvePages(config.snapshot.pages || ['*'], projectRoot);
        const themeLookup = buildThemeLookup();

        let completed = 0;
        const total = allPages.length;

        for (const pagePath of allPages) {
            try {
                // Determine which theme applies to this page (default if not in any theme)
                const themeInfo = themeLookup[pagePath] || { themeKey: 'default', distSubfolder: '' };
                const { themeKey, distSubfolder } = themeInfo;

                completed++;
                ui.progressBar(completed, total, `Fetching page ${completed}/${total}: ${pagePath}`);

                // Resolve fetch URI: '/' -> '/index.php'
                let fetchUri = pagePath;
                if (fetchUri === '/') fetchUri = '/index.php';

                const normalizedPagePath = fetchUri.startsWith('/') ? fetchUri : `/${fetchUri}`;
                const urlToFetch = `${snapshotBaseUrl}${normalizedPagePath}?theme=${themeKey}&snapshot=1`;
                const html = await fetchPage(urlToFetch);

                // Construct save path
                let savePath = pagePath;
                if (savePath === '/' || savePath === '') {
                    savePath = 'index.html';
                } else {
                    savePath = savePath.startsWith('/') ? savePath.slice(1) : savePath;
                    if (rewriteExtension && savePath.endsWith('.php')) {
                        savePath = savePath.replace(/\.php$/, '.html');
                    }
                }

                const themeDistDir = path.join(distDir, distSubfolder);
                fs.mkdirSync(themeDistDir, { recursive: true });

                const rewrittenHtml = rewriteLinks(html, savePath, distSubfolder);
                const cleanedHtml = stripDevContent(rewrittenHtml);

                const fullPath = path.join(themeDistDir, savePath);
                fs.mkdirSync(path.dirname(fullPath), { recursive: true });
                fs.writeFileSync(fullPath, cleanedHtml);
            } catch (err) {
                ui.error(`Failed to snapshot ${pagePath}: ${err.message}`);
            }
        }

        // Format all generated HTML with Prettier
        try {
            const prettierBin = findPrettier();
            const prettierConfig = path.join(projectRoot, '.prettierrc');
            ui.step('Formatting HTML with Prettier...', 'pretty');
            // We use relative globs and explicitly set cwd to the dist folder to be safer with Prettier version behavior
            execSync(`"${prettierBin}" --write "**/*.html" --config "${prettierConfig}"`, { 
                stdio: 'ignore', // SILENT PRETTIER
                cwd: distDir 
            });
        } catch (err) {
            ui.warning(`Prettier formatting issue: ${err.message}`);
        }

        ui.success('Snapshot complete.');
    } finally {
        phpServer.kill();
    }
}

runSnapshot().catch(err => {
    ui.error(`Snapshot failed: ${err.message}`);
    process.exit(1);
});

function fetchPage(url) {
    return new Promise((resolve, reject) => {
        http.get(url, (res) => {
            if (res.statusCode < 200 || res.statusCode >= 300) {
                return reject(new Error(`Status Code: ${res.statusCode} for ${url}`));
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
    const subfolderDepth = distSubfolder ? distSubfolder.split('/').filter(Boolean).length : 0;
    const savePathDepth = path.dirname(savePath) === '.' ? 0 : path.dirname(savePath).split('/').length;
    
    const totalDepth = subfolderDepth + savePathDepth;
    const prefix = totalDepth > 0 ? '../'.repeat(totalDepth) : '';

    // Rewrite root-relative and purely relative references to depth-adjusted references
    result = result.replace(/(href|src)=["']\/?([^"']+)["']/g, (match, attr, targetPath) => {
        if (targetPath.startsWith('http') || targetPath.startsWith('//') || targetPath.startsWith('#')) {
            return match;
        }
        return `${attr}="${prefix}${targetPath}"`;
    });

    if (rewriteExtension) {
        result = result.replace(/href=["']([^"']*?)\.php([^"']*?)["']/g, 'href="$1.html$2"');
    }
    
    return result;
}

function stripDevContent(html) {
    // 1. Strip "DEV ONLY" blocks
    // Supports //, /* */, and <!-- style comments
    const devOnlyJs = /(\/\/\s*DEV\s+ONLY\s+START|\/\*\s*DEV\s+ONLY\s+START\s*\*\/)[\s\S]*?(\/\/\s*DEV\s+ONLY\s+END|\/\*\s*DEV\s+ONLY\s+END\s*\*\/)/gi;
    const devOnlyHtml = /<!--\s*DEV\s+ONLY\s+START\s*-->[\s\S]*?<!--\s*DEV\s+ONLY\s+END\s*-->/gi;
    return html.replace(devOnlyJs, '').replace(devOnlyHtml, '');
}
