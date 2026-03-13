const chalk = {
    blue: (s) => `\x1b[34m${s}\x1b[0m`,
    green: (s) => `\x1b[32m${s}\x1b[0m`,
    yellow: (s) => `\x1b[33m${s}\x1b[0m`,
    red: (s) => `\x1b[31m${s}\x1b[0m`,
    magenta: (s) => `\x1b[35m${s}\x1b[0m`,
    cyan: (s) => `\x1b[36m${s}\x1b[0m`,
    gray: (s) => `\x1b[90m${s}\x1b[0m`,
    bold: (s) => `\x1b[1m${s}\x1b[22m\x1b[0m`, // Fixed bold
};

const icons = {
    wait: '⏳',
    done: '✅',
    warn: '⚠️ ',
    info: 'ℹ️ ',
    error: '❌',
    package: '📦',
    vibrant: '✨',
    rocket: '🚀',
    css: '🎨',
    camera: '📸',
    pretty: '💅',
};

function header(title) {
    console.log(`\n${chalk.cyan(icons.vibrant)} ${chalk.bold(title.toUpperCase())}`);
    console.log(chalk.gray('─'.repeat(50)));
}

function step(message, status = 'wait') {
    const icon = icons[status] || icons.wait;
    console.log(`   ${icon} ${message}`);
}

function success(message) {
    console.log(`   ${icons.done} ${chalk.green(message)}`);
}

function warning(message) {
    console.log(`   ${icons.warn} ${chalk.yellow(message)}`);
}

function error(message) {
    console.log(`   ${icons.error} ${chalk.red(message)}`);
}

// Simple progress bar logic
function progressBar(current, total, label = '') {
    const width = 20;
    const percent = Math.min(Math.round((current / total) * 100), 100);
    const progress = Math.round((width * current) / total);
    const bar = '█'.repeat(progress) + '░'.repeat(width - progress);
    
    // Use clearLine and cursorTo to overwrite the same line
    process.stdout.clearLine(0);
    process.stdout.cursorTo(0);
    process.stdout.write(`   ${icons.wait} ${label} [${bar}] ${percent}%`);
    
    if (current === total) {
        process.stdout.write('\n');
    }
}

module.exports = {
    chalk,
    icons,
    header,
    step,
    success,
    warning,
    error,
    progressBar
};
