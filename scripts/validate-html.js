/**
 * scripts/validate-html.js
 * Validates all HTML files in dist/ against the W3C Nu Html Checker —
 * the exact same engine that powers https://validator.w3.org/
 *
 * Usage:
 *   node validate-html.js              — validate all HTML files in dist/
 *   node validate-html.js --warnings   — include warnings (default: errors only)
 *   node validate-html.js --fix        — auto-fix common issues before validating
 *   node validate-html.js --file=path  — validate a single file relative to dist/
 *
 * Exit codes:
 *   0 — all files pass validation
 *   1 — one or more files have errors
 */

const fs   = require('fs');
const path = require('path');
const http = require('https');
const { projectRoot, config, walkHtmlFiles, stripVoidSlashes } = require('./utils/core');
const ui   = require('./utils/cli-ui');

// ─── Configuration ──────────────────────────────────────────────────────────

const VALIDATOR_URL  = 'https://validator.w3.org/nu/';
const REQUEST_DELAY  = 1200; // ms between requests (W3C rate limit: ~1 req/sec)
const MAX_RETRIES    = 2;
const RETRY_DELAY    = 5000; // ms

// Parse CLI args
const args          = process.argv.slice(2);
const showWarnings  = args.includes('--warnings');
const autoFix       = args.includes('--fix');
const singleFile    = args.find(a => a.startsWith('--file='))?.split('=')[1] || null;
const customDir     = args.find(a => a.startsWith('--dir='))?.split('=')[1] || null;

const distDir = customDir
    ? path.resolve(projectRoot, customDir)
    : path.join(projectRoot, config.snapshot?.outputDir || 'dist');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Send HTML content to the W3C Nu validator and return parsed messages.
 */
function validateHtml(htmlContent, retries = 0) {
    return new Promise((resolve, reject) => {
        const postData = Buffer.from(htmlContent, 'utf8');
        const url      = new URL(VALIDATOR_URL);

        const options = {
            hostname: url.hostname,
            port:     443,
            path:     url.pathname + '?out=json',
            method:   'POST',
            headers:  {
                'Content-Type':   'text/html; charset=utf-8',
                'Content-Length': postData.length,
                'User-Agent':    'Squeditor-Validator/1.0 (build-tool)',
            },
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                // Rate limited — retry after delay
                if (res.statusCode === 429 && retries < MAX_RETRIES) {
                    setTimeout(() => {
                        validateHtml(htmlContent, retries + 1).then(resolve).catch(reject);
                    }, RETRY_DELAY);
                    return;
                }

                if (res.statusCode < 200 || res.statusCode >= 300) {
                    return reject(new Error(`Validator returned HTTP ${res.statusCode}`));
                }

                try {
                    const result = JSON.parse(data);
                    resolve(result.messages || []);
                } catch (e) {
                    reject(new Error(`Failed to parse validator response: ${e.message}`));
                }
            });
        });

        req.on('error', (err) => {
            if (retries < MAX_RETRIES) {
                setTimeout(() => {
                    validateHtml(htmlContent, retries + 1).then(resolve).catch(reject);
                }, RETRY_DELAY);
            } else {
                reject(err);
            }
        });

        req.write(postData);
        req.end();
    });
}

/**
 * Categorise messages into errors, warnings, and info.
 */
function categorise(messages) {
    const errors   = [];
    const warnings = [];
    const info     = [];

    for (const msg of messages) {
        if (msg.type === 'error')  errors.push(msg);
        else if (msg.type === 'info' && msg.subType === 'warning') warnings.push(msg);
        else info.push(msg);
    }

    return { errors, warnings, info };
}

/**
 * Format a single validation message for CLI output.
 */
function formatMessage(msg, type) {
    const line    = msg.lastLine || msg.firstLine || '?';
    const col     = msg.lastColumn || msg.firstColumn || '?';
    const loc     = ui.chalk.gray(`L${line}:${col}`);
    const label   = type === 'error'
        ? ui.chalk.red('ERROR')
        : ui.chalk.yellow('WARN');
    const message = msg.message || 'Unknown issue';

    let output = `      ${label} ${loc}  ${message}`;

    // Show the extract (the offending code snippet) if available
    if (msg.extract) {
        const extract = msg.extract.replace(/\n/g, '↵').substring(0, 120);
        output += `\n             ${ui.chalk.gray(extract)}`;
    }

    return output;
}

/**
 * Apply common auto-fixes to HTML before validation.
 */
function applyAutoFixes(html) {
    // 1. Strip trailing slashes on void elements (XHTML remnants)
    html = stripVoidSlashes(html);

    // 2. Remove duplicate IDs (keep first occurrence)
    const seenIds = new Set();
    html = html.replace(/\bid="([^"]+)"/g, (match, id) => {
        if (seenIds.has(id)) return '';
        seenIds.add(id);
        return match;
    });

    return html;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function run() {
    if (!fs.existsSync(distDir)) {
        ui.error(`dist/ directory not found at ${distDir}`);
        ui.step('Run "npm run build:snap" first to generate the HTML files.', 'info');
        process.exit(1);
    }

    ui.header('W3C HTML Validation');
    ui.step(`Validator: ${VALIDATOR_URL}`, 'info');
    ui.step(`Mode: ${showWarnings ? 'errors + warnings' : 'errors only'}${autoFix ? ' (auto-fix enabled)' : ''}`, 'info');

    // Collect HTML files
    let files;
    if (singleFile) {
        const fullPath = path.join(distDir, singleFile);
        if (!fs.existsSync(fullPath)) {
            ui.error(`File not found: ${singleFile}`);
            process.exit(1);
        }
        files = [fullPath];
    } else {
        files = walkHtmlFiles(distDir);
    }

    if (files.length === 0) {
        ui.warning('No HTML files found in dist/');
        process.exit(0);
    }

    ui.step(`Found ${files.length} HTML file(s) to validate\n`, 'info');

    // Results tracking
    const results    = [];
    let totalErrors  = 0;
    let totalWarnings = 0;
    let passCount    = 0;
    let failCount    = 0;

    for (let i = 0; i < files.length; i++) {
        const file    = files[i];
        const relPath = path.relative(distDir, file);

        ui.progressBar(i + 1, files.length, `Validating ${i + 1}/${files.length}`);

        let html = fs.readFileSync(file, 'utf8');

        // Auto-fix if requested
        if (autoFix) {
            const fixed = applyAutoFixes(html);
            if (fixed !== html) {
                fs.writeFileSync(file, fixed);
                html = fixed;
            }
        }

        try {
            const messages = await validateHtml(html);
            const { errors, warnings } = categorise(messages);

            totalErrors   += errors.length;
            totalWarnings += warnings.length;

            const fileResult = {
                file:     relPath,
                errors:   errors.length,
                warnings: warnings.length,
                messages: [...errors, ...(showWarnings ? warnings : [])],
            };

            if (errors.length > 0) {
                failCount++;
            } else {
                passCount++;
            }

            results.push(fileResult);

            // Rate limiting — wait between requests
            if (i < files.length - 1) {
                await sleep(REQUEST_DELAY);
            }
        } catch (err) {
            ui.error(`Failed to validate ${relPath}: ${err.message}`);
            results.push({ file: relPath, errors: -1, warnings: 0, messages: [], error: err.message });
            failCount++;
        }
    }

    // ── Print detailed results ───────────────────────────────────────────────

    console.log('\n');
    ui.header('Validation Results');

    for (const result of results) {
        if (result.error) {
            console.log(`   ${ui.chalk.red('✗')} ${result.file} — ${ui.chalk.red('request failed: ' + result.error)}`);
            continue;
        }

        const hasErrors = result.errors > 0;
        const icon      = hasErrors ? ui.chalk.red('✗') : ui.chalk.green('✓');
        const summary   = [];

        if (result.errors > 0)   summary.push(ui.chalk.red(`${result.errors} error(s)`));
        if (result.warnings > 0) summary.push(ui.chalk.yellow(`${result.warnings} warning(s)`));
        if (summary.length === 0) summary.push(ui.chalk.green('passed'));

        console.log(`   ${icon} ${result.file} — ${summary.join(', ')}`);

        // Print individual messages for files with issues
        if (result.messages.length > 0) {
            for (const msg of result.messages) {
                const type = msg.type === 'error' ? 'error' : 'warning';
                console.log(formatMessage(msg, type));
            }
            console.log('');
        }
    }

    // ── Summary table ────────────────────────────────────────────────────────

    console.log(ui.chalk.gray('─'.repeat(50)));
    console.log(`   📊 ${ui.chalk.bold('Summary')}`);
    console.log(`      Files validated:  ${files.length}`);
    console.log(`      ${ui.chalk.green('Passed')}:  ${passCount}`);
    console.log(`      ${ui.chalk.red('Failed')}:  ${failCount}`);
    console.log(`      Total errors:     ${totalErrors}`);
    console.log(`      Total warnings:   ${totalWarnings}`);
    console.log(ui.chalk.gray('─'.repeat(50)));

    if (failCount > 0) {
        ui.error(`${failCount} file(s) failed W3C validation.`);
        process.exit(1);
    } else {
        ui.success('All files passed W3C validation!');
        process.exit(0);
    }
}

run().catch(err => {
    ui.error(`Validation failed: ${err.message}`);
    process.exit(1);
});
