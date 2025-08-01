import { Router, Request, Response } from 'express';
import { WebSocket } from 'ws';

const mcpProxyRouter = Router();

// Store active MCP connections
const mcpConnections = new Map<string, WebSocket>();

// Helper function to create WebSocket connection
function createMCPConnection(serverUrl: string): Promise<WebSocket> {
    return new Promise((resolve, reject) => {
        try {
            const ws = new WebSocket(serverUrl);
            
            ws.on('open', () => {
                console.log(`MCP WebSocket connected to ${serverUrl}`);
                resolve(ws);
            });

            ws.on('error', (error) => {
                console.error(`MCP WebSocket error for ${serverUrl}:`, error);
                reject(error);
            });

            ws.on('close', () => {
                console.log(`MCP WebSocket closed for ${serverUrl}`);
                mcpConnections.delete(serverUrl);
            });

            // Set connection timeout
            setTimeout(() => {
                if (ws.readyState === WebSocket.CONNECTING) {
                    ws.close();
                    reject(new Error('Connection timeout'));
                }
            }, 10000); // 10 second timeout

        } catch (error) {
            reject(error);
        }
    });
}

// Helper function to send JSON-RPC request
function sendMCPRequest(ws: WebSocket, request: any): Promise<any> {
    return new Promise((resolve, reject) => {
        const requestId = Date.now().toString();
        const jsonRpcRequest = {
            jsonrpc: '2.0',
            id: requestId,
            method: request.method,
            params: request.params || {}
        };

        // Set up response handler
        const responseHandler = (data: Buffer) => {
            try {
                const response = JSON.parse(data.toString());
                if (response.id === requestId) {
                    ws.off('message', responseHandler);
                    if (response.error) {
                        reject(new Error(response.error.message || 'MCP request failed'));
                    } else {
                        resolve(response);
                    }
                }
            } catch (error) {
                ws.off('message', responseHandler);
                reject(error);
            }
        };

        // Set up timeout
        const timeout = setTimeout(() => {
            ws.off('message', responseHandler);
            reject(new Error('Request timeout'));
        }, 30000); // 30 second timeout

        ws.on('message', responseHandler);

        // Clear timeout when response is received
        ws.on('message', () => clearTimeout(timeout));

        // Send request
        ws.send(JSON.stringify(jsonRpcRequest));
    });
}

// Connect to MCP server
mcpProxyRouter.post('/connect', async (req: Request, res: Response): Promise<void> => {
    const { serverUrl, request } = req.body;
    
    if (!serverUrl) {
        res.status(400).json({ error: 'serverUrl is required' });
        return;
    }

    if (!request || !request.method) {
        res.status(400).json({ error: 'request with method is required' });
        return;
    }

    try {
        // Check if connection already exists
        let ws = mcpConnections.get(serverUrl);
        
        if (!ws || ws.readyState !== WebSocket.OPEN) {
            // Create new connection
            ws = await createMCPConnection(serverUrl);
            mcpConnections.set(serverUrl, ws);
        }

        // Send initialize request
        const response = await sendMCPRequest(ws, request);
        res.json(response);

    } catch (error) {
        console.error('MCP connect error:', error);
        res.status(500).json({ 
            error: error instanceof Error ? error.message : 'Failed to connect to MCP server' 
        });
    }
});

// List tools from MCP server
mcpProxyRouter.post('/list-tools', async (req: Request, res: Response): Promise<void> => {
    const { serverUrl, request } = req.body;
    
    if (!serverUrl) {
        res.status(400).json({ error: 'serverUrl is required' });
        return;
    }

    if (!request || !request.method) {
        res.status(400).json({ error: 'request with method is required' });
        return;
    }

    try {
        const ws = mcpConnections.get(serverUrl);
        
        if (!ws || ws.readyState !== WebSocket.OPEN) {
            res.status(400).json({ error: 'MCP server not connected' });
            return;
        }

        const response = await sendMCPRequest(ws, request);
        res.json(response);

    } catch (error) {
        console.error('MCP list-tools error:', error);
        res.status(500).json({ 
            error: error instanceof Error ? error.message : 'Failed to list tools' 
        });
    }
});

// Call MCP tool
mcpProxyRouter.post('/call-tool', async (req: Request, res: Response): Promise<void> => {
    const { serverUrl, request } = req.body;
    
    if (!serverUrl) {
        res.status(400).json({ error: 'serverUrl is required' });
        return;
    }

    if (!request || !request.method) {
        res.status(400).json({ error: 'request with method is required' });
        return;
    }

    try {
        const ws = mcpConnections.get(serverUrl);
        
        if (!ws || ws.readyState !== WebSocket.OPEN) {
            res.status(400).json({ error: 'MCP server not connected' });
            return;
        }

        const response = await sendMCPRequest(ws, request);
        res.json(response);

    } catch (error) {
        console.error('MCP call-tool error:', error);
        res.status(500).json({ 
            error: error instanceof Error ? error.message : 'Failed to call tool' 
        });
    }
});

// Disconnect from MCP server
mcpProxyRouter.post('/disconnect', async (req: Request, res: Response): Promise<void> => {
    const { serverUrl } = req.body;
    
    if (!serverUrl) {
        res.status(400).json({ error: 'serverUrl is required' });
        return;
    }

    try {
        const ws = mcpConnections.get(serverUrl);
        
        if (ws) {
            ws.close();
            mcpConnections.delete(serverUrl);
        }

        res.json({ success: true });

    } catch (error) {
        console.error('MCP disconnect error:', error);
        res.status(500).json({ 
            error: error instanceof Error ? error.message : 'Failed to disconnect' 
        });
    }
});

// Get connection status
mcpProxyRouter.get('/status/:serverUrl', (req: Request, res: Response): void => {
    const serverUrl = decodeURIComponent(req.params.serverUrl);
    const ws = mcpConnections.get(serverUrl);
    
    res.json({
        connected: ws && ws.readyState === WebSocket.OPEN,
        readyState: ws ? ws.readyState : null
    });
});

// List all connections
mcpProxyRouter.get('/connections', (req: Request, res: Response): void => {
    const connections = Array.from(mcpConnections.entries()).map(([url, ws]) => ({
        url,
        connected: ws.readyState === WebSocket.OPEN,
        readyState: ws.readyState
    }));
    
    res.json({ connections });
});

export default mcpProxyRouter;