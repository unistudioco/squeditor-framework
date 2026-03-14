const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();

/**
 * Loads the project configuration from squeditor.config.js
 */
function loadConfig() {
    const configPath = path.join(projectRoot, 'squeditor.config.js');
    if (!fs.existsSync(configPath)) {
        throw new Error(`Configuration file not found: ${configPath}`);
    }
    return require(configPath);
}

const config = loadConfig();

/**
 * Resolves the framework root directory
 */
const fwRoot = path.resolve(projectRoot, config.framework);

/**
 * Helper to find the prettier executable
 */
function findPrettier() {
    const localPrettier = path.join(projectRoot, 'node_modules/.bin/prettier');
    if (fs.existsSync(localPrettier)) return localPrettier;
    
    // Check framework node_modules as fallback
    const fwPrettier = path.join(fwRoot, 'node_modules/.bin/prettier');
    if (fs.existsSync(fwPrettier)) return fwPrettier;
    
    return 'prettier'; // Fallback to global
}

/**
 * Helper to safely create a directory
 */
function safeMkdir(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

/**
 * Strips dev-only content blocks from HTML/JS
 */
function stripDevContent(html) {
    // 1. Strip "DEV ONLY" blocks
    const devOnlyJs = /(\/\/\s*DEV\s+ONLY\s+START|\/\*\s*DEV\s+ONLY\s+START\s*\*\/)[\s\S]*?(\/\/\s*DEV\s+ONLY\s+END|\/\*\s*DEV\s+ONLY\s+END\s*\*\/)/gi;
    const devOnlyHtml = /<!--\s*DEV\s+ONLY\s+START\s*-->[\s\S]*?<!--\s*DEV\s+ONLY\s+END\s*-->/gi;
    return html.replace(devOnlyJs, '').replace(devOnlyHtml, '');
}

/**
 * Strips demo-only content blocks from HTML
 */
function stripDemoContent(html) {
    const demoOnlyHtml = /<!--\s*DEMO\s+MODE\s+ONLY\s+START\s*-->[\s\S]*?<!--\s*DEMO\s+MODE\s+ONLY\s+END\s*-->/gi;
    return html.replace(demoOnlyHtml, '');
}

module.exports = {
    projectRoot,
    fwRoot,
    config,
    findPrettier,
    safeMkdir,
    stripDevContent,
    stripDemoContent
};
