// scripts/scaffold.js
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const projectName = args[0];

if (!projectName) {
    console.error("Usage: node scripts/scaffold.js <project-name> --dest <optional-dest>");
    process.exit(1);
}

let destIndex = args.indexOf('--dest');
let destPath = destIndex !== -1 ? args[destIndex + 1] : projectName;
const sourceDir = path.join(__dirname, '..', 'project-template');
const targetDir = path.resolve(process.cwd(), destPath);

if (!fs.existsSync(sourceDir)) {
    console.error(`Source template directory does not exist: ${sourceDir}`);
    process.exit(1);
}

if (fs.existsSync(targetDir)) {
    console.error(`Target directory already exists: ${targetDir}`);
    process.exit(1);
}

function copyDirectory(src, dest) {
    fs.mkdirSync(dest, { recursive: true });
    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
        if (entry.name === '.DS_Store') continue;
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
            copyDirectory(srcPath, destPath);
        } else {
            // Must use copyFileSync to preserve binary data (fonts, images)
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

console.log(`[Squeditor] Scaffolding new project: ${projectName}...`);
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
    configContent = configContent.replace(/name:\s*['"][^'"]+['"]/, `name: '${projectName}'`);
    configContent = configContent.replace(/zipName:\s*['"][^'"]+['"]/, `zipName: '${projectName}.zip'`);
    fs.writeFileSync(configPath, configContent);
}

console.log(`[Squeditor] ✅ Scaffolded ${projectName} successfully at ${targetDir}`);
console.log(`Next steps:`);
console.log(`  cd ${destPath}`);
console.log(`  npm install`);
console.log(`  npm run dev`);
console.log(`  Note: For mac, use sudo if you get permission errors!`);
