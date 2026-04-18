const dgram = require('dgram');

/**
 * Executes an RCON command on the FiveM server using core Node.js UDP sockets.
 * This removes the need for external dependencies like `rcon-client`.
 * 
 * @param {string} command - The console command to execute.
 * @returns {Promise<string>} - The response from the server.
 */
const executeRcon = (command) => {
    return new Promise((resolve, reject) => {
        const host = process.env.RCON_HOST || '127.0.0.1';
        const port = parseInt(process.env.RCON_PORT || '30120', 10);
        const password = process.env.RCON_PASSWORD;

        if (!password) {
            return reject(new Error('RCON_PASSWORD is not set in the .env file.'));
        }

        const client = dgram.createSocket('udp4');
        
        // Timeout handling
        const timeout = setTimeout(() => {
            client.close();
            reject(new Error('RCON request timed out. Check server IP, Port, and Password.'));
        }, 5000);

        client.on('message', (msg) => {
            clearTimeout(timeout);
            client.close();
            
            // FiveM RCON responses start with \xff\xff\xff\xffprint\n
            // We slice the first 11 bytes to get the actual text
            let responseStr = msg.toString('utf8');
            if (responseStr.startsWith('\xff\xff\xff\xffprint\n')) {
                responseStr = responseStr.substring(10);
            }
            resolve(responseStr.trim());
        });

        client.on('error', (err) => {
            clearTimeout(timeout);
            client.close();
            reject(err);
        });

        // FiveM UDP RCON Packet Format:
        // \xff\xff\xff\xffrcon password command
        const rconPacket = Buffer.from(`\xff\xff\xff\xffrcon ${password} ${command}`, 'utf8');

        client.send(rconPacket, 0, rconPacket.length, port, host, (err) => {
            if (err) {
                clearTimeout(timeout);
                client.close();
                reject(err);
            }
        });
    });
};

module.exports = { executeRcon };
