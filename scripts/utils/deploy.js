const { execSync } = require('child_process');
const ui = require('./cli-ui');

/**
 * Deployment Utility
 * Handles modular deployment providers based on configuration.
 */

const defaultProviders = {
    netlify: {
        name: 'Netlify',
        command: 'netlify deploy --dir=dist',
        installTip: 'npm install -g netlify-cli',
        loginTip: 'netlify login'
    },
    vercel: {
        name: 'Vercel',
        command: 'vercel dist --yes',
        installTip: 'npm install -g vercel',
        loginTip: 'vercel login'
    }
};

/**
 * Runs the deployment process based on the provided configuration.
 * @param {Object} projectRoot - The root directory of the project.
 * @param {Object} config - The project configuration object.
 */
function run(projectRoot, config) {
    const deployConfig = config.deploy || {};
    
    // Support legacy config.dist.previewPlatform for backward compatibility
    let platform = deployConfig.platform || (config.dist && config.dist.previewPlatform);
    const enabled = deployConfig.enabled !== undefined ? deployConfig.enabled : false;

    if (!enabled) {
        // Only show message if platform was explicitly set but deployment is disabled
        if (platform) {
            ui.step('Deployment is disabled in config.', 'info');
        }
        return;
    }

    if (!platform) {
        ui.warning('Deployment is enabled but no platform is selected. Set config.deploy.platform to "netlify" or "vercel".');
        return;
    }

    // Merge default providers with custom ones from config
    const providers = { ...defaultProviders, ...(deployConfig.providers || {}) };
    const provider = providers[platform];

    if (!provider) {
        ui.error(`Unknown deployment provider: "${platform}".`);
        return;
    }

    ui.header('Deploying Preview');
    ui.step(`Deploying preview to ${provider.name}...`, 'rocket');

    try {
        execSync(provider.command, { stdio: 'inherit', cwd: projectRoot });
        ui.success(`Deployed successfully to ${provider.name}!`);
    } catch (e) {
        ui.error(`Failed to deploy to ${provider.name}.`);
        
        if (provider.installTip || provider.loginTip) {
            console.log('\n   💡 Setup Instructions:');
            if (provider.installTip) console.log(`      - Install CLI: ${ui.chalk.cyan(provider.installTip)}`);
            if (provider.loginTip)   console.log(`      - Login:       ${ui.chalk.cyan(provider.loginTip)}`);
        }
    }
}

module.exports = {
    run,
    defaultProviders
};
