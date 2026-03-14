const fs = require('fs');
const path = require('path');
const { spawn, execSync } = require('child_process');
const { projectRoot, fwRoot, config } = require('./utils/core');
const getAvailablePort = require('./get-port');
const ui = require('./utils/cli-ui');

async function startDev() {
    const projectRoot = process.cwd();

    // Find available ports
    const phpPort = await getAvailablePort(config.devServer?.port || 3001);
    const vitePort = await getAvailablePort(config.devServer?.vitePort || 5173);

    ui.header('Squeditor Development Mode');
    ui.step(`PHP Server: http://127.0.0.1:${phpPort}`, 'info');
    ui.step(`Vite Server: http://127.0.0.1:${vitePort}`, 'info');

    const configPath = path.join(projectRoot, 'squeditor.config.js');

    // Run build-components.js BEFORE starting servers
    const buildComponentsPath = path.join(fwRoot, 'scripts/build-components.js');
    ui.step('Building dynamic components...', 'gear');
    try {
        execSync(`node "${buildComponentsPath}"`, { stdio: 'inherit', cwd: projectRoot });
    } catch (e) {
        ui.error(`Failed to build dynamic components: ${e.message}`);
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
