const net = require('net');

/**
 * Finds an available port starting from the given port.
 * @param {number} startPort 
 * @returns {Promise<number>}
 */
function getAvailablePort(startPort) {
    return new Promise((resolve) => {
        const server = net.createServer();
        server.listen(startPort, '127.0.0.1', () => {
            const { port } = server.address();
            server.close(() => resolve(port));
        });
        server.on('error', () => {
            resolve(getAvailablePort(startPort + 1));
        });
    });
}

// If run directly, output the port for shell scripts to capture
if (require.main === module) {
    const basePort = parseInt(process.argv[2]) || 3000;
    getAvailablePort(basePort).then(port => process.stdout.write(port.toString()));
}

module.exports = getAvailablePort;
