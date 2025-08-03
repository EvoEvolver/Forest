import { Router, Request, Response } from 'express';
import { WebSocket } from 'ws';
import axios from 'axios';

const mcpProxyRouter = Router();

// Store active MCP connections
const mcpConnections = new Map<string, WebSocket>();

// Store HTTP MCP sessions (for session-based servers like GitHub)
const mcpSessions = new Map<string, {
    sessionId?: string;
    serverInfo?: any;
    capabilities?: any;
    lastUsed: Date;
}>();

// Clean up old sessions every 30 minutes
setInterval(() => {
    const now = new Date();
    const expiredSessions: string[] = [];
    
    mcpSessions.forEach((session, serverUrl) => {
        const sessionAge = now.getTime() - session.lastUsed.getTime();
        if (sessionAge > 2 * 60 * 60 * 1000) { // 2 hours
            expiredSessions.push(serverUrl);
        }
    });
    
    expiredSessions.forEach(serverUrl => {
        console.log('Cleaning up expired session for:', serverUrl);
        mcpSessions.delete(serverUrl);
    });
}, 30 * 60 * 1000); // Every 30 minutes

// Helper function to determine connection type from URL
function getConnectionType(serverUrl: string): 'websocket' | 'http' {
    if (serverUrl.startsWith('ws://') || serverUrl.startsWith('wss://')) {
        return 'websocket';
    } else if (serverUrl.startsWith('http://') || serverUrl.startsWith('https://')) {
        return 'http';
    }
    // Default to websocket for backward compatibility
    return 'websocket';
}

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

// Helper function to send HTTP JSON-RPC request with session support
async function sendHTTPMCPRequest(serverUrl: string, request: any, headers?: Record<string, string>): Promise<any> {
    const requestId = Date.now().toString();
    const jsonRpcRequest = {
        jsonrpc: '2.0',
        id: requestId,
        method: request.method,
        params: request.params || {}
    };

    const requestHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        ...headers
    };

    // For non-initialize requests, add session ID if available
    if (request.method !== 'initialize') {
        const session = mcpSessions.get(serverUrl);
        if (session?.sessionId) {
            requestHeaders['Mcp-Session-Id'] = session.sessionId;
            // Update last used time
            session.lastUsed = new Date();
        }
    }

    console.log('MCP HTTP Request:', {
        url: serverUrl,
        method: request.method,
        headers: requestHeaders,
        data: jsonRpcRequest
    });

    try {
        const response = await axios({
            url: serverUrl,
            method: 'POST',
            headers: requestHeaders,
            data: jsonRpcRequest,
            timeout: 30000 // 30 second timeout
        });

        console.log('MCP HTTP Response:', response.status, response.data);

        // For initialize requests, store session information
        if (request.method === 'initialize' && response.status === 200) {
            const sessionId = response.headers['mcp-session-id'] || 
                            response.headers['Mcp-Session-Id'] ||
                            response.data?.id || // Some servers might put session ID in response
                            requestId; // Fallback to request ID
            
            mcpSessions.set(serverUrl, {
                sessionId,
                serverInfo: response.data?.result?.serverInfo,
                capabilities: response.data?.result?.capabilities,
                lastUsed: new Date()
            });

            console.log('Stored session for', serverUrl, 'with ID:', sessionId);
        }

        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error('MCP HTTP Error:', {
                status: error.response?.status,
                statusText: error.response?.statusText,
                data: error.response?.data,
                headers: error.response?.headers
            });
            
            // Special handling for session-related errors
            if (error.response?.status === 400 && 
                (error.response?.data?.includes?.('session') || error.response?.data?.includes?.('Session'))) {
                // Clear invalid session and suggest reconnection
                mcpSessions.delete(serverUrl);
                throw new Error(`HTTP 400: ${error.response.data}. Session expired or invalid. Please reconnect.`);
            }
            
            const errorMessage = error.response?.data?.error?.message || error.response?.data || error.response?.statusText || 'Request failed';
            throw new Error(`HTTP ${error.response?.status || 500}: ${errorMessage}`);
        }
        console.error('Non-Axios error:', error);
        throw error;
    }
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
    const { serverUrl, request, headers } = req.body;
    
    if (!serverUrl) {
        res.status(400).json({ error: 'serverUrl is required' });
        return;
    }

    if (!request || !request.method) {
        res.status(400).json({ error: 'request with method is required' });
        return;
    }

    try {
        const connectionType = getConnectionType(serverUrl);
        
        if (connectionType === 'http') {
            // For HTTP connections, send the request directly
            const response = await sendHTTPMCPRequest(serverUrl, request, headers);
            res.json(response);
        } else {
            // For WebSocket connections, use existing logic
            let ws = mcpConnections.get(serverUrl);
            
            if (!ws || ws.readyState !== WebSocket.OPEN) {
                // Create new connection
                ws = await createMCPConnection(serverUrl);
                mcpConnections.set(serverUrl, ws);
            }

            // Send initialize request
            const response = await sendMCPRequest(ws, request);
            res.json(response);
        }

    } catch (error) {
        console.error('MCP connect error:', error);
        res.status(500).json({ 
            error: error instanceof Error ? error.message : 'Failed to connect to MCP server' 
        });
    }
});

// List tools from MCP server
mcpProxyRouter.post('/list-tools', async (req: Request, res: Response): Promise<void> => {
    const { serverUrl, request, headers } = req.body;
    
    if (!serverUrl) {
        res.status(400).json({ error: 'serverUrl is required' });
        return;
    }

    if (!request || !request.method) {
        res.status(400).json({ error: 'request with method is required' });
        return;
    }

    try {
        const connectionType = getConnectionType(serverUrl);
        
        if (connectionType === 'http') {
            // For HTTP connections, send the request directly
            const response = await sendHTTPMCPRequest(serverUrl, request, headers);
            res.json(response);
        } else {
            // For WebSocket connections, use existing logic
            const ws = mcpConnections.get(serverUrl);
            
            if (!ws || ws.readyState !== WebSocket.OPEN) {
                res.status(400).json({ error: 'MCP server not connected' });
                return;
            }

            const response = await sendMCPRequest(ws, request);
            res.json(response);
        }

    } catch (error) {
        console.error('MCP list-tools error:', error);
        res.status(500).json({ 
            error: error instanceof Error ? error.message : 'Failed to list tools' 
        });
    }
});

// Call MCP tool
mcpProxyRouter.post('/call-tool', async (req: Request, res: Response): Promise<void> => {
    const { serverUrl, request, headers } = req.body;
    
    if (!serverUrl) {
        res.status(400).json({ error: 'serverUrl is required' });
        return;
    }

    if (!request || !request.method) {
        res.status(400).json({ error: 'request with method is required' });
        return;
    }

    try {
        const connectionType = getConnectionType(serverUrl);
        
        if (connectionType === 'http') {
            // For HTTP connections, send the request directly
            const response = await sendHTTPMCPRequest(serverUrl, request, headers);
            res.json(response);
        } else {
            // For WebSocket connections, use existing logic
            const ws = mcpConnections.get(serverUrl);
            
            if (!ws || ws.readyState !== WebSocket.OPEN) {
                res.status(400).json({ error: 'MCP server not connected' });
                return;
            }

            const response = await sendMCPRequest(ws, request);
            res.json(response);
        }

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
        const connectionType = getConnectionType(serverUrl);
        
        if (connectionType === 'http') {
            // For HTTP connections, clear session
            mcpSessions.delete(serverUrl);
        } else {
            // For WebSocket connections, close connection
            const ws = mcpConnections.get(serverUrl);
            if (ws) {
                ws.close();
                mcpConnections.delete(serverUrl);
            }
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
mcpProxyRouter.get('/status/:serverUrl', async (req: Request, res: Response): Promise<void> => {
    const serverUrl = decodeURIComponent(req.params.serverUrl);
    const connectionType = getConnectionType(serverUrl);
    
    if (connectionType === 'http') {
        // For HTTP endpoints, check session status
        const session = mcpSessions.get(serverUrl);
        
        if (session) {
            // Check if session is still valid (less than 1 hour old)
            const now = new Date();
            const sessionAge = now.getTime() - session.lastUsed.getTime();
            const isSessionValid = sessionAge < 60 * 60 * 1000; // 1 hour
            
            res.json({
                connected: isSessionValid,
                type: 'http',
                sessionId: session.sessionId,
                serverInfo: session.serverInfo,
                sessionAge: Math.floor(sessionAge / 1000) + ' seconds'
            });
        } else {
            res.json({
                connected: false,
                type: 'http',
                error: 'No active session'
            });
        }
    } else {
        // For WebSocket connections, use existing logic
        const ws = mcpConnections.get(serverUrl);
        
        res.json({
            connected: ws && ws.readyState === WebSocket.OPEN,
            type: 'websocket',
            readyState: ws ? ws.readyState : null
        });
    }
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