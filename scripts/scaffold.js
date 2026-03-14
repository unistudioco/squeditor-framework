#!/usr/bin/env node
// scripts/scaffold.js
const fs = require('fs');
const path = require('path');
const ui = require('./utils/cli-ui');

const args = process.argv.slice(2);
const projectName = args[0];

if (!projectName) {
    ui.error("Usage: node scripts/scaffold.js <project-name> --dest <optional-dest>");
    process.exit(1);
}

let destIndex = args.indexOf('--dest');
let destPath = destIndex !== -1 ? args[destIndex + 1] : projectName;
const sourceDir = path.join(__dirname, '..', 'project-template');

// Check if running directly inside the cloned framework repository
let isInsideRepo = false;
try {
    const pkgPath = path.join(process.cwd(), 'package.json');
    if (fs.existsSync(pkgPath)) {
        const pkg = require(pkgPath);
        if (pkg.name === '@squeditor/squeditor-framework') {
            isInsideRepo = true;
        }
    }
} catch (e) {}

// If running inside the repo, scaffold as a sibling (../destPath). 
// Otherwise scaffold in the current directory.
const targetDir = isInsideRepo 
    ? path.resolve(process.cwd(), '..', destPath) 
    : path.resolve(process.cwd(), destPath);

if (!fs.existsSync(sourceDir)) {
    ui.error(`Source template directory does not exist: ${sourceDir}`);
    process.exit(1);
}

if (fs.existsSync(targetDir)) {
    ui.error(`Target directory already exists: ${targetDir}`);
    process.exit(1);
}

function copyDirectory(src, dest, ignoreList = []) {
    fs.mkdirSync(dest, { recursive: true });
    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
        if (entry.name === '.DS_Store' || ignoreList.includes(entry.name)) continue;
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
            copyDirectory(srcPath, destPath, ignoreList);
        } else {
            // Must use copyFileSync to preserve binary data (fonts, images)
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

ui.header(`Scaffolding Project: ${projectName}`);

// 1. Copy the framework core
if (!isInsideRepo) {
    const frameworkSourceDir = path.join(__dirname, '..');
    const frameworkTargetDir = path.resolve(process.cwd(), 'squeditor-framework');

    if (!fs.existsSync(frameworkTargetDir)) {
        console.log(`[Squeditor] Installing local framework core at ./squeditor-framework...`);
        // Pass the name of the target directory to the ignore list to prevent infinite loop
        const ignoreCoreList = ['project-template', 'showcase', 'node_modules', '.git', '.github', 'squeditor-framework'];
        copyDirectory(frameworkSourceDir, frameworkTargetDir, ignoreCoreList);
    }
} else {
    console.log(`[Squeditor] Running inside framework repo. Skipping core installation (using repo).`);
}

// 2. Copy the project template
copyDirectory(sourceDir, targetDir);

// Update package.json name
const pkgJsonPath = path.join(targetDir, 'package.json');
if (fs.existsSync(pkgJsonPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
    pkg.name = projectName;
    fs.writeFileSync(pkgJsonPath, JSON.stringify(pkg, null, 2));
}

// Update squeditor.config.js properties
const configPath = path.join(targetDir, 'squeditor.config.js');
if (fs.existsSync(configPath)) {
    let configContent = fs.readFileSync(configPath, 'utf8');
    configContent = configContent.replace(/name:\s*['"][^'"]+['"]/, `name: '${projectName}-customer'`);
    configContent = configContent.replace(/zipName:\s*['"][^'"]+['"]/, `zipName: '${projectName}-customer.zip'`);
    fs.writeFileSync(configPath, configContent);
}

console.log(`[Squeditor] ✅ Scaffolded ${projectName} successfully at ${targetDir}`);
console.log(`Next steps:`);
console.log(`  cd ${destPath}`);
console.log(`  npm install`);
console.log(`  npm run dev`);
console.log(`  Note: For mac, use sudo if you get permission errors!`);
