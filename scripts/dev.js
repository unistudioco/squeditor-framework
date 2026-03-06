const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const getAvailablePort = require('./get-port');

async function startDev() {
    const projectRoot = process.cwd();

    // Find available ports
    const phpPort = await getAvailablePort(3001);
    const vitePort = await getAvailablePort(5173);

    console.log(`[Squeditor] 🚀 Starting Dev Servers...`);
    console.log(`   - PHP Server: http://127.0.0.1:${phpPort}`);
    console.log(`   - Vite Server: http://127.0.0.1:${vitePort}`);

    // Read config to resolve framework path dynamically
    const configPath = path.join(projectRoot, 'squeditor.config.js');
    let fwRoot = '..';
    if (fs.existsSync(configPath)) {
        const config = require(configPath);
        if (config.framework) {
            fwRoot = config.framework;
        }
    }

    // Run build-components.js BEFORE starting servers to ensure
    // active-themes.php, _uikit_dynamic.scss, _slider_dynamic.js etc. exist on first request
    const buildComponentsPath = path.join(fwRoot, 'scripts/build-components.js');
    console.log('[Squeditor] 🔧 Building dynamic components...');
    const { execSync } = require('child_process');
    try {
        execSync(`node "${buildComponentsPath}"`, { stdio: 'inherit', cwd: projectRoot });
    } catch (e) {
        console.error('[Squeditor] ❌ Failed to build dynamic components:', e.message);
    }

    const devRouterPath = path.join(fwRoot, 'scripts/dev-router.php');

    // Start PHP Server
    const php = spawn('php', [
        '-S', `127.0.0.1:${phpPort}`,
        '-t', 'src',
        devRouterPath
    ], {
        stdio: 'inherit',
        env: { ...process.env, SQUEDITOR_PHP_PORT: phpPort, SQUEDITOR_VITE_PORT: vitePort }
    });

    const vite = spawn('npx', [
        'vite',
        '--port', vitePort.toString(),
        '--strictPort', 'false'
    ], {
        stdio: 'inherit',
        env: { ...process.env, SQUEDITOR_PHP_PORT: phpPort, SQUEDITOR_VITE_PORT: vitePort }
    });

    // Watch squeditor.config.js for changes and rebuild dynamic components
    if (fs.existsSync(configPath)) {
        let rebuildTimeout;
        fs.watch(configPath, (eventType) => {
            if (eventType === 'change') {
                // Debounce to prevent multiple triggers from IDE saves
                clearTimeout(rebuildTimeout);
                rebuildTimeout = setTimeout(() => {
                    console.log(`\n[Squeditor] 🔄 Config changed. Rebuilding dynamic components...`);
                    const buildScript = spawn('node', [path.join(fwRoot, 'scripts/build-components.js')], { stdio: 'inherit' });
                    buildScript.on('close', (code) => {
                        if (code === 0) console.log(`[Squeditor] ✨ Rebuild complete! (Vite will hot-reload automatically)`);
                    });
                }, 300);
            }
        });
    }

    process.on('SIGINT', () => {
        php.kill();
        vite.kill();
        process.exit();
    });
}

startDev();
