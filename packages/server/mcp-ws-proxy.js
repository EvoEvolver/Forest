const WebSocket = require('ws');
const {spawn} = require('child_process');

const wss = new WebSocket.Server({port: 3001});

wss.on('connection', (ws) => {
    console.log('WebSocket client connected');

    // Start MCP server process
    const mcpProcess = spawn('npx', ['mcp-filesystem-server'], {
        stdio: ['pipe', 'pipe', 'inherit']
    });

    // Forward WebSocket messages to MCP process
    ws.on('message', (data) => {
        console.log('-> MCP:', data.toString());
        mcpProcess.stdin.write(data + '\n');
    });

    // Forward MCP process output to WebSocket
    mcpProcess.stdout.on('data', (data) => {
        console.log('<- MCP:', data.toString());
        ws.send(data.toString());
    });

    ws.on('close', () => {
        console.log('WebSocket client disconnected');
        mcpProcess.kill();
    });

    mcpProcess.on('exit', () => {
        ws.close();
    });
});

console.log('MCP WebSocket proxy listening on ws://localhost:3001');
