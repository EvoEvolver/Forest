import { Router, Request, Response } from 'express';
import axios from 'axios';

const mcpProxyRouter = Router();

// Store mappings between (toolsetUrl + configHash) and server metadata
const serverConnections = new Map<string, {
    toolsetUrl: string;
    configHash: string;
    mcpConfig: any;
    connectedAt: Date;
    lastUsed: Date;
    toolsCount: number;
}>();

// Default configuration
const DEFAULT_TIMEOUT = 30000;
const DEBUG = process.env.NODE_ENV === 'development';

// Helper function to generate unique connection key
function getConnectionKey(toolsetUrl: string, configHash: string): string {
    return `${toolsetUrl}:${configHash}`;
}

// Helper function to validate toolset URL
function validateToolsetUrl(toolsetUrl: string): { valid: boolean; error?: string } {
    if (!toolsetUrl || typeof toolsetUrl !== 'string') {
        return { valid: false, error: 'toolsetUrl must be a non-empty string' };
    }

    if (!toolsetUrl.startsWith('http://') && !toolsetUrl.startsWith('https://')) {
        return { valid: false, error: 'toolsetUrl must be a valid HTTP or HTTPS URL' };
    }

    try {
        new URL(toolsetUrl);
        return { valid: true };
    } catch {
        return { valid: false, error: 'toolsetUrl must be a valid URL' };
    }
}

// Helper function to validate MCP config
function validateMcpConfig(config: any): { valid: boolean; error?: string } {
    if (!config || typeof config !== 'object') {
        return { valid: false, error: 'mcpConfig must be an object' };
    }

    if (!config.servers || typeof config.servers !== 'object') {
        return { valid: false, error: 'mcpConfig must have a "servers" object' };
    }

    const serverNames = Object.keys(config.servers);
    if (serverNames.length === 0) {
        return { valid: false, error: 'mcpConfig.servers must have at least one server' };
    }

    // Validate each server configuration
    for (const [serverName, serverConfig] of Object.entries(config.servers)) {
        if (!serverConfig || typeof serverConfig !== 'object') {
            return { valid: false, error: `Server "${serverName}" must be an object` };
        }

        const sc = serverConfig as any;
        if (!sc.type || !sc.url) {
            return { valid: false, error: `Server "${serverName}" must have "type" and "url" properties` };
        }

        if (!['http', 'stdio'].includes(sc.type)) {
            return { valid: false, error: `Server "${serverName}" type must be "http" or "stdio"` };
        }
    }

    return { valid: true };
}

// Helper function to generate config hash from MCP config
function generateConfigHash(mcpConfig: any): string {
    const configStr = JSON.stringify(mcpConfig, Object.keys(mcpConfig).sort());
    return Buffer.from(configStr).toString('base64').substring(0, 16);
}

// Helper function to call Toolset backend
async function callToolsetBackend(toolsetUrl: string, endpoint: string, data?: any, method: 'GET' | 'POST' = 'POST'): Promise<any> {
    try {
        if (DEBUG) {
            console.log(`🔍 Toolset Call: ${method} ${toolsetUrl}${endpoint}`, data ? JSON.stringify(data, null, 2) : 'no data');
        }

        const response = await axios({
            method,
            url: `${toolsetUrl}${endpoint}`,
            data,
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Forest-MCP-Proxy/1.0.0'
            },
            timeout: DEFAULT_TIMEOUT
        });

        if (DEBUG) {
            console.log(`✅ Toolset Response:`, response.status, response.data);
        }

        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            const errorMessage = error.response?.data?.detail ||
                                error.response?.data?.message ||
                                error.response?.statusText ||
                                'Toolset request failed';
            
            console.error('❌ Toolset Error:', {
                toolsetUrl,
                endpoint,
                status: error.response?.status,
                message: errorMessage
            });
            
            throw new Error(`Toolset Error (${error.response?.status || 'Network'}): ${errorMessage}`);
        }
        console.error('❌ Non-Axios Toolset Error:', error);
        throw error;
    }
}

// Helper function to check if Toolset backend is available
async function checkToolsetHealth(toolsetUrl: string): Promise<boolean> {
    try {
        await axios.get(`${toolsetUrl}/health`, { timeout: 5000 });
        return true;
    } catch {
        try {
            // Fallback: try root endpoint or docs
            await axios.get(toolsetUrl, { timeout: 5000 });
            return true;
        } catch {
            return false;
        }
    }
}

// Connect to MCP server via Toolset
mcpProxyRouter.post('/connect', async (req: Request, res: Response): Promise<void> => {
    const { toolsetUrl, mcpConfig } = req.body;
    
    // Validate inputs
    const toolsetValidation = validateToolsetUrl(toolsetUrl);
    if (!toolsetValidation.valid) {
        res.status(400).json({ error: toolsetValidation.error });
        return;
    }

    const configValidation = validateMcpConfig(mcpConfig);
    if (!configValidation.valid) {
        res.status(400).json({ error: configValidation.error });
        return;
    }

    try {
        // Check if Toolset backend is available
        const isHealthy = await checkToolsetHealth(toolsetUrl);
        if (!isHealthy) {
            res.status(503).json({ 
                error: `Toolset backend not available at ${toolsetUrl}. Please check if the service is running.` 
            });
            return;
        }

        const configHash = generateConfigHash(mcpConfig);
        const connectionKey = getConnectionKey(toolsetUrl, configHash);
        
        console.log(`🔌 Connecting MCP via Toolset: ${toolsetUrl}, config hash: ${configHash}`);

        // Call Toolset to add MCP server
        const result = await callToolsetBackend(toolsetUrl, '/addMCP', mcpConfig);

        if (result.status === 'error') {
            console.error('❌ Toolset returned error:', result.message);
            res.status(400).json({ 
                error: result.message || 'Toolset backend error: Failed to add MCP server'
            });
            return;
        }

        // Store connection metadata
        serverConnections.set(connectionKey, {
            toolsetUrl,
            configHash: result.config_hash || configHash,
            mcpConfig,
            connectedAt: new Date(),
            lastUsed: new Date(),
            toolsCount: result.tools ? Object.keys(result.tools).length : 0
        });

        console.log(`✅ Connected MCP via Toolset: config_hash=${result.config_hash}, tools=${Object.keys(result.tools || {}).length}`);

        // Return legacy-compatible response for frontend
        res.json({
            jsonrpc: '2.0',
            id: 1,
            result: {
                protocolVersion: '2024-11-05',
                capabilities: {
                    tools: {}
                },
                serverInfo: {
                    name: 'forest-toolset-mcp-proxy',
                    version: '1.0.0'
                }
            },
            // Additional metadata for debugging
            _metadata: {
                toolsetUrl,
                configHash: result.config_hash || configHash,
                toolsCount: Object.keys(result.tools || {}).length,
                backendStatus: result.status,
                connectionKey
            }
        });

    } catch (error) {
        console.error('❌ MCP connect error:', error);
        res.status(500).json({ 
            error: error instanceof Error ? error.message : 'Failed to connect to MCP server via Toolset' 
        });
    }
});

// List tools from MCP server via Toolset
mcpProxyRouter.post('/list-tools', async (req: Request, res: Response): Promise<void> => {
    const { toolsetUrl, mcpConfig } = req.body;
    
    // Validate inputs
    const toolsetValidation = validateToolsetUrl(toolsetUrl);
    if (!toolsetValidation.valid) {
        res.status(400).json({ error: toolsetValidation.error });
        return;
    }

    const configValidation = validateMcpConfig(mcpConfig);
    if (!configValidation.valid) {
        res.status(400).json({ error: configValidation.error });
        return;
    }

    try {
        const configHash = generateConfigHash(mcpConfig);
        const connectionKey = getConnectionKey(toolsetUrl, configHash);
        
        console.log(`📋 Listing tools for MCP via Toolset: ${toolsetUrl}, config hash: ${configHash}`);

        // Get or refresh connection to get current tools
        const result = await callToolsetBackend(toolsetUrl, '/addMCP', mcpConfig);

        if (result.status === 'error') {
            console.error('❌ Toolset returned error for list-tools:', result.message);
            res.status(400).json({ 
                error: result.message || 'Toolset backend error: Failed to get tools'
            });
            return;
        }

        // Update connection metadata
        const connection = serverConnections.get(connectionKey);
        if (connection) {
            connection.lastUsed = new Date();
            connection.toolsCount = result.tools ? Object.keys(result.tools).length : 0;
        }

        // Convert tools to legacy format expected by frontend
        const tools = Object.entries(result.tools || {}).map(([name, tool]: [string, any]) => ({
            name,
            description: tool.description || '',
            inputSchema: tool.inputSchema || {}
        }));

        console.log(`✅ Listed ${tools.length} tools for MCP via Toolset`);

        res.json({
            jsonrpc: '2.0',
            id: 2,
            result: {
                tools
            },
            _metadata: {
                toolsetUrl,
                configHash,
                toolsCount: tools.length,
                backendStatus: result.status
            }
        });

    } catch (error) {
        console.error('❌ MCP list-tools error:', error);
        res.status(500).json({ 
            error: error instanceof Error ? error.message : 'Failed to list tools from MCP server via Toolset' 
        });
    }
});

// Call MCP tool via Toolset
mcpProxyRouter.post('/call-tool', async (req: Request, res: Response): Promise<void> => {
    const { toolsetUrl, mcpConfig, toolName, arguments: toolArgs, configHash: configHash } = req.body;
    console.log(req.body);
    // Validate inputs
    const toolsetValidation = validateToolsetUrl(toolsetUrl);
    if (!toolsetValidation.valid) {
        res.status(400).json({ error: toolsetValidation.error });
        return;
    }

    const configValidation = validateMcpConfig(mcpConfig);
    if (!configValidation.valid) {
        res.status(400).json({ error: configValidation.error });
        return;
    }

    if (!toolName || typeof toolName !== 'string') {
        res.status(400).json({ error: 'toolName is required and must be a string' });
        return;
    }

    try {
        const connectionKey = getConnectionKey(toolsetUrl, configHash);
        
        console.log(`🛠️ Calling tool "${toolName}" via Toolset: ${toolsetUrl}, config hash: ${configHash}`);
        if (DEBUG && toolArgs) {
            console.log(`🔍 Tool arguments:`, JSON.stringify(toolArgs, null, 2));
        }
        
        // Call the tool using the generated endpoint: /{config_hash}_{tool_name}
        const toolEndpoint = `/${configHash}_${toolName}`;
        const result = await callToolsetBackend(toolsetUrl, toolEndpoint, toolArgs || {});

        // Update connection metadata
        const connection = serverConnections.get(connectionKey);
        if (connection) {
            connection.lastUsed = new Date();
            connection.configHash = configHash;
        }

        console.log(`✅ Tool "${toolName}" executed successfully via Toolset`);

        res.json({
            jsonrpc: '2.0',
            id: 3,
            result,
            _metadata: {
                toolsetUrl,
                configHash: configHash,
                toolName,
                executedAt: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error(`❌ MCP call-tool error for "${toolName}":`, error);
        res.status(500).json({ 
            error: error instanceof Error ? error.message : `Failed to call tool "${toolName}" via Toolset` 
        });
    }
});

mcpProxyRouter.post('/health', async (req: Request, res: Response): Promise<void> => {
    const { toolsetUrl, config_hash } = req.body;

    const toolsetValidation = validateToolsetUrl(toolsetUrl);
    if (!toolsetValidation.valid) {
        res.status(400).json({ error: toolsetValidation.error });
        return;
    }

    try {
        const result = await callToolsetBackend(toolsetUrl, '/health', { config_hash });
        res.json(result);
    } catch (error) {
        res.status(500).json({ 
            error: error instanceof Error ? error.message : 'Failed to check toolset health' 
        });
    }
});

// Disconnect from MCP server via Toolset
mcpProxyRouter.post('/disconnect', async (req: Request, res: Response): Promise<void> => {
    const { toolsetUrl, mcpConfig } = req.body;
    
    // Validate inputs (optional for disconnect)
    if (toolsetUrl) {
        const toolsetValidation = validateToolsetUrl(toolsetUrl);
        if (!toolsetValidation.valid) {
            res.status(400).json({ error: toolsetValidation.error });
            return;
        }
    }

    try {
        let disconnectedConnections = 0;

        if (toolsetUrl && mcpConfig) {
            // Disconnect specific configuration
            const configHash = generateConfigHash(mcpConfig);
            const connectionKey = getConnectionKey(toolsetUrl, configHash);
            const connection = serverConnections.get(connectionKey);

            if (connection) {
                await callToolsetBackend(toolsetUrl, '/close', { config_hash: connection.configHash });
                serverConnections.delete(connectionKey);
                disconnectedConnections = 1;
                console.log(`🔌 Disconnected specific MCP connection: ${toolsetUrl}, config hash: ${configHash}`);
            }
        } else if (toolsetUrl) {
            // Disconnect all connections for this toolset URL
            const keysToDelete: string[] = [];
            for (const [key, connection] of serverConnections.entries()) {
                if (connection.toolsetUrl === toolsetUrl) {
                    try {
                        await callToolsetBackend(toolsetUrl, '/close', { config_hash: connection.configHash });
                        keysToDelete.push(key);
                    } catch (e) {
                        console.error(`Failed to close connection for ${key}, continuing...`, e);
                    }
                }
            }
            
            keysToDelete.forEach(key => serverConnections.delete(key));
            disconnectedConnections = keysToDelete.length;
            console.log(`🔌 Disconnected ${disconnectedConnections} MCP connections for toolset: ${toolsetUrl}`);
        } else {
            // Disconnect all connections
            const keysToDelete: string[] = [];
            for (const [key, connection] of serverConnections.entries()) {
                try {
                    await callToolsetBackend(connection.toolsetUrl, '/close', { config_hash: connection.configHash });
                    keysToDelete.push(key);
                } catch (e) {
                    console.error(`Failed to close connection for ${key}, continuing...`, e);
                }
            }
            disconnectedConnections = serverConnections.size;
            serverConnections.clear();
            console.log(`🔌 Disconnected all ${disconnectedConnections} MCP connections`);
        }

        res.json({ 
            success: true,
            disconnectedConnections,
            message: `Disconnected ${disconnectedConnections} connection(s)`
        });

    } catch (error) {
        console.error('❌ MCP disconnect error:', error);
        res.status(500).json({ 
            error: error instanceof Error ? error.message : 'Failed to disconnect from MCP server' 
        });
    }
});

// Get connection status for specific MCP configuration
mcpProxyRouter.post('/status', async (req: Request, res: Response): Promise<void> => {
    const { toolsetUrl, mcpConfig } = req.body;
    
    try {
        if (!toolsetUrl || !mcpConfig) {
            // Return summary of all connections
            const connections = Array.from(serverConnections.entries()).map(([key, conn]) => ({
                connectionKey: key,
                toolsetUrl: conn.toolsetUrl,
                configHash: conn.configHash,
                connectedAt: conn.connectedAt,
                lastUsed: conn.lastUsed,
                toolsCount: conn.toolsCount,
                connected: true // If it's in our map, we consider it connected
            }));
            
            res.json({
                totalConnections: connections.length,
                connections
            });
            return;
        }

        // Validate inputs
        const toolsetValidation = validateToolsetUrl(toolsetUrl);
        if (!toolsetValidation.valid) {
            res.status(400).json({ error: toolsetValidation.error });
            return;
        }

        const configHash = generateConfigHash(mcpConfig);
        const connectionKey = getConnectionKey(toolsetUrl, configHash);
        const connection = serverConnections.get(connectionKey);

        if (!connection) {
            res.json({
                connected: false,
                type: 'toolset-managed',
                error: 'No active connection found for this configuration'
            });
            return;
        }

        // Try to refresh connection status by calling Toolset
        try {
            const result = await callToolsetBackend(toolsetUrl, '/addMCP', mcpConfig);
            const isConnected = result.status === 'success' || result.status === 'cached';
            
            // Update metadata
            connection.lastUsed = new Date();
            connection.toolsCount = result.tools ? Object.keys(result.tools).length : 0;
            
            res.json({
                connected: isConnected,
                type: 'toolset-managed',
                toolsetUrl,
                configHash: connection.configHash,
                connectedAt: connection.connectedAt,
                lastUsed: connection.lastUsed,
                toolsCount: connection.toolsCount,
                backendStatus: result.status,
                message: result.message
            });
        } catch (error) {
            res.json({
                connected: false,
                type: 'toolset-managed',
                toolsetUrl,
                configHash: connection.configHash,
                error: error instanceof Error ? error.message : 'Failed to check backend status',
                lastKnownConnection: {
                    connectedAt: connection.connectedAt,
                    lastUsed: connection.lastUsed,
                    toolsCount: connection.toolsCount
                }
            });
        }

    } catch (error) {
        console.error('❌ MCP status error:', error);
        res.status(500).json({
            connected: false,
            error: error instanceof Error ? error.message : 'Failed to check connection status'
        });
    }
});

// List all active MCP connections
mcpProxyRouter.get('/connections', async (req: Request, res: Response): Promise<void> => {
    try {
        const connections = Array.from(serverConnections.entries()).map(([key, conn]) => {
            const serverNames = Object.keys(conn.mcpConfig.servers || {});
            return {
                connectionKey: key,
                toolsetUrl: conn.toolsetUrl,
                configHash: conn.configHash,
                serverNames,
                serverCount: serverNames.length,
                connectedAt: conn.connectedAt,
                lastUsed: conn.lastUsed,
                toolsCount: conn.toolsCount,
                connected: true, // Assume connected if in our map
                type: 'toolset-managed'
            };
        });

        // Sort by last used (most recent first)
        connections.sort((a, b) => new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime());

        console.log(`📊 Listed ${connections.length} active MCP connections`);
        
        res.json({ 
            totalConnections: connections.length,
            connections 
        });

    } catch (error) {
        console.error('❌ MCP connections error:', error);
        res.status(500).json({
            error: error instanceof Error ? error.message : 'Failed to list connections'
        });
    }
});

// Health check endpoint
mcpProxyRouter.get('/health', (req: Request, res: Response): void => {
    res.json({
        status: 'healthy',
        service: 'forest-mcp-proxy',
        version: '1.0.0',
        activeConnections: serverConnections.size,
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

export default mcpProxyRouter;