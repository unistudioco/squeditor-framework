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

    // Start Vite
    const vite = spawn('npx', [
        'vite',
        '--port', vitePort.toString(),
        '--strictPort', 'false'
    ], {
        stdio: 'inherit',
        env: { ...process.env, SQUEDITOR_PHP_PORT: phpPort, SQUEDITOR_VITE_PORT: vitePort }
    });

    process.on('SIGINT', () => {
        php.kill();
        vite.kill();
        process.exit();
    });
}

startDev();
