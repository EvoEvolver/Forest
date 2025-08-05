const WebSocket = require('ws');
const { spawn } = require('child_process');

// --- Configuration ---
// IMPORTANT: You must get an API key from https://serpapi.com/ and place it here.
// You can also set this as an environment variable (SERPAPI_API_KEY).
const SERPAPI_API_KEY = process.env.SERPAPI_API_KEY || 'YOUR_SERPAPI_API_KEY_HERE';

if (SERPAPI_API_KEY === '38e879a790ff4cf8d230e3856a5ffcdd76e3c30fca45967e9e8f49eb57d53b03') {
    console.warn('\x1b[33m%s\x1b[0m', 'Warning: SERPAPI_API_KEY is not set. The web search server will not be able to perform searches.');
    console.warn('Please get a key from https://serpapi.com/ and add it to the script.');
}

// The WebSocket server will listen on this port.
const PORT = 3001;
const wss = new WebSocket.Server({ port: PORT });

wss.on('connection', (ws) => {
    console.log('WebSocket client connected. Starting MCP web search server process...');

    // Start the MCP web search server process using npx.
    // We pass the API key to the process via its environment variables.
    const mcpProcess = spawn('npx', ['-y', '@mzxrai/mcp-webresearch@latest'], {
        stdio: ['pipe', 'pipe', 'inherit'], // stdin, stdout, stderr
        env: {
            ...process.env, // Inherit the environment from the parent process
            SERPAPI_API_KEY: SERPAPI_API_KEY, // Set the specific API key for the child process
        }
    });

    console.log('MCP process spawned. Proxying data...');

    // Forward messages from the WebSocket client to the MCP process's standard input.
    ws.on('message', (data) => {
        const message = data.toString();
        console.log('-> to MCP:', message);
        // MCP processes expect each JSON-RPC message to be on a new line.
        try {
            mcpProcess.stdin.write(message + '\n');
        } catch (error) {
            console.error('Failed to write to MCP process stdin:', error);
        }
    });

    // Forward data from the MCP process's standard output to the WebSocket client.
    mcpProcess.stdout.on('data', (data) => {
        const message = data.toString();
        console.log('<- from MCP:', message);
        // Send each line of output as a separate WebSocket message.
        message.trim().split('\n').forEach(line => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(line);
            }
        });
    });

    // Handle the WebSocket client disconnecting.
    ws.on('close', () => {
        console.log('WebSocket client disconnected. Terminating MCP process.');
        mcpProcess.kill(); // Clean up the child process.
    });

    // Handle the MCP process exiting unexpectedly.
    mcpProcess.on('exit', (code) => {
        console.log(`MCP process exited with code ${code}. Closing WebSocket connection.`);
        if (ws.readyState === WebSocket.OPEN) {
            ws.close();
        }
    });

    mcpProcess.on('error', (err) => {
        console.error('Failed to start MCP process:', err);
        if (ws.readyState === WebSocket.OPEN) {
            ws.close();
        }
    });
});

console.log(`MCP WebSocket proxy for web search is listening on ws://localhost:${PORT}`);
