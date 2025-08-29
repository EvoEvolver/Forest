import {Request, Response, Router} from 'express';
import {A2AClient} from '@a2a-js/sdk/client';
import {AgentCard, Message, MessageSendParams} from '@a2a-js/sdk';
import https from 'https';
import http from 'http';

const a2aProxyRouter = Router();

// Default configuration
const DEFAULT_TIMEOUT = 30000;
const DEBUG = process.env.NODE_ENV === 'development';

// Direct JSON-RPC request helper (bypassing A2A SDK)
async function makeDirectJsonRpcRequest(agentUrl: string, method: string, params: any): Promise<any> {
    const requestBody = {
        jsonrpc: "2.0",
        id: Date.now(),
        method: method,
        params: params
    };

    if (DEBUG) {
        console.log(`🔄 Making direct JSON-RPC request to ${agentUrl}`);
        console.log(`🔄 Method: ${method}`);
        console.log(`🔄 Request body:`, JSON.stringify(requestBody, null, 2));
    }

    try {
        const response = await fetch(agentUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Forest-A2A-Proxy/1.0.0'
            },
            body: JSON.stringify(requestBody)
        });

        if (DEBUG) {
            console.log(`🔄 Response status: ${response.status} ${response.statusText}`);
            console.log(`🔄 Response headers:`, Object.fromEntries(response.headers.entries()));
        }

        const responseText = await response.text();
        if (DEBUG) {
            console.log(`🔄 Raw response:`, responseText);
        }

        const responseJson = JSON.parse(responseText);
        return { success: response.ok, response: responseJson, status: response.status };
    } catch (error) {
        if (DEBUG) {
            console.error(`🔄 Direct JSON-RPC request failed:`, error);
        }
        return { success: false, error: error.message };
    }
}

// Network debugging helper
async function debugNetworkConnectivity(agentUrl: string): Promise<{success: boolean, details: any}> {
    const url = new URL(agentUrl);
    const isHttps = url.protocol === 'https:';
    const port = url.port || (isHttps ? '443' : '80');
    
    return new Promise((resolve) => {
        const module = isHttps ? https : http;
        const options = {
            hostname: url.hostname,
            port: parseInt(port),
            path: '/',
            method: 'HEAD',
            timeout: 5000,
            ...(isHttps && {
                rejectUnauthorized: false // Bypass SSL verification for debugging
            })
        };

        const req = module.request(options, (res) => {
            resolve({
                success: true,
                details: {
                    statusCode: res.statusCode,
                    headers: res.headers,
                    hostname: url.hostname,
                    port,
                    protocol: url.protocol
                }
            });
        });

        req.on('error', (error) => {
            resolve({
                success: false,
                details: {
                    error: error.message,
                    code: (error as any).code,
                    hostname: url.hostname,
                    port,
                    protocol: url.protocol
                }
            });
        });

        req.on('timeout', () => {
            req.destroy();
            resolve({
                success: false,
                details: {
                    error: 'Request timeout',
                    hostname: url.hostname,
                    port,
                    protocol: url.protocol
                }
            });
        });

        req.end();
    });
}

// Store active A2A client connections for potential reuse
const clientConnections = new Map<string, {
    client: A2AClient;
    agentUrl: string;
    agentCard?: AgentCard;
    connectedAt: Date;
    lastUsed: Date;
}>();

// Helper function to validate agent URL
function validateAgentUrl(agentUrl: string): { valid: boolean; error?: string } {
    if (!agentUrl || typeof agentUrl !== 'string') {
        return {valid: false, error: 'agentUrl must be a non-empty string'};
    }

    if (!agentUrl.startsWith('http://') && !agentUrl.startsWith('https://')) {
        return {valid: false, error: 'agentUrl must be a valid HTTP or HTTPS URL'};
    }

    try {
        new URL(agentUrl);
        return {valid: true};
    } catch {
        return {valid: false, error: 'agentUrl must be a valid URL'};
    }
}

// Helper function to normalize agent URL
function normalizeAgentUrl(agentUrl: string): string {
    try {
        let normalizedUrl = agentUrl.trim();
        
        // Ensure URL ends with slash for consistent handling
        if (!normalizedUrl.endsWith('/')) {
            normalizedUrl += '/';
        }
        
        // Validate the URL format
        const url = new URL(normalizedUrl);
        return normalizedUrl;
    } catch (error) {
        // If URL parsing fails, return original URL and let validation handle it
        return agentUrl;
    }
}

// Helper function to get or create A2A client with enhanced debugging
function getA2AClient(agentUrl: string, authToken?: string): A2AClient {
    // Normalize URL before using it
    const normalizedAgentUrl = normalizeAgentUrl(agentUrl);
    const connectionKey = `${normalizedAgentUrl}:${authToken || 'no-auth'}`;
    let connection = clientConnections.get(connectionKey);

    if (!connection) {
        if (DEBUG) {
            console.log(`🔌 Creating new A2A client for: ${agentUrl} (normalized: ${normalizedAgentUrl})`);
            console.log(`🔌 Node.js version: ${process.version}`);
            console.log(`🔌 Environment: ${process.env.NODE_ENV}`);
        }

        const client = new A2AClient(normalizedAgentUrl);
        
        if (DEBUG) {
            console.log(`🔌 A2A client created with baseUrl: ${normalizedAgentUrl}`);
        }
        
        connection = {
            client,
            agentUrl: normalizedAgentUrl,
            connectedAt: new Date(),
            lastUsed: new Date()
        };
        clientConnections.set(connectionKey, connection);
    } else {
        connection.lastUsed = new Date();
    }

    return connection.client;
}

// Get agent card from A2A agent
a2aProxyRouter.post('/get-agent-card', async (req: Request, res: Response): Promise<void> => {
    const {agentUrl, authToken} = req.body;

    // Validate agent URL
    const urlValidation = validateAgentUrl(agentUrl);
    if (!urlValidation.valid) {
        res.status(400).json({error: urlValidation.error});
        return;
    }

    // Normalize the agent URL for consistent handling
    const normalizedAgentUrl = normalizeAgentUrl(agentUrl);

    try {
        if (DEBUG) {
            console.log(`🎫 Fetching agent card from: ${agentUrl} (normalized: ${normalizedAgentUrl})`);
            console.log(`🎫 Expected endpoint: ${normalizedAgentUrl}.well-known/agent-card.json`);
        }

        const client = getA2AClient(normalizedAgentUrl, authToken);
        
        // Add more detailed debugging for the SDK call
        console.log(`🔍 [DEBUG] About to call client.getAgentCard() for: ${normalizedAgentUrl}`);
        
        const agentCard = await client.getAgentCard().catch(async (sdkError) => {
            console.error(`❌ [DEBUG] A2A SDK getAgentCard failed:`, sdkError);
            console.error(`❌ [DEBUG] SDK Error details:`, {
                message: sdkError.message,
                stack: sdkError.stack,
                name: sdkError.name,
                cause: sdkError.cause
            });
            
            // Try manual fetch as fallback to understand what's happening
            const manualUrl = `${normalizedAgentUrl}.well-known/agent-card.json`;
            console.log(`🔄 [DEBUG] Attempting manual fetch from: ${manualUrl}`);
            
            try {
                const manualResponse = await fetch(manualUrl);
                console.log(`🔄 [DEBUG] Manual fetch response:`, {
                    status: manualResponse.status,
                    statusText: manualResponse.statusText,
                    headers: Object.fromEntries(manualResponse.headers.entries()),
                    url: manualResponse.url
                });
                
                if (manualResponse.ok) {
                    const manualData = await manualResponse.json();
                    console.log(`✅ [DEBUG] Manual fetch successful, got data:`, manualData);
                    return manualData;
                } else {
                    const errorText = await manualResponse.text();
                    console.log(`❌ [DEBUG] Manual fetch failed with response:`, errorText);
                }
            } catch (manualError) {
                console.error(`❌ [DEBUG] Manual fetch also failed:`, manualError);
            }
            
            throw sdkError;
        });

        // Cache the agent card in the connection
        const connectionKey = `${normalizedAgentUrl}:${authToken || 'no-auth'}`;
        const connection = clientConnections.get(connectionKey);
        if (connection) {
            connection.agentCard = agentCard;
        }

        if (DEBUG) {
            console.log(`✅ Successfully fetched agent card: ${agentCard.name} v${agentCard.version}`);
        }

        res.json({
            success: true,
            agentCard
        });

    } catch (error) {
        console.error('❌ A2A get-agent-card error:', error);
        res.status(500).json({
            error: error instanceof Error ? error.message : 'Failed to fetch agent card'
        });
    }
});

// Send message to A2A agent (capability-aware)
a2aProxyRouter.post('/send-message', async (req: Request, res: Response): Promise<void> => {
    const {agentUrl, authToken, message, configuration} = req.body;

    // Validate agent URL
    const urlValidation = validateAgentUrl(agentUrl);
    if (!urlValidation.valid) {
        res.status(400).json({error: urlValidation.error});
        return;
    }

    // Validate message
    if (!message || typeof message !== 'object') {
        res.status(400).json({error: 'message is required and must be an object'});
        return;
    }

    try {
        if (DEBUG) {
            console.log(`📤 Sending message to A2A agent: ${agentUrl}`);
            console.log(`📝 Message content:`, JSON.stringify(message, null, 2));
        }

        const client = getA2AClient(agentUrl, authToken);

        // Normalize the agent URL for consistent handling
        const normalizedAgentUrl = normalizeAgentUrl(agentUrl);
        
        // First, get agent card to check capabilities with fallback
        let agentCard: AgentCard | undefined;
        try {
            agentCard = await client.getAgentCard();
            if (DEBUG) {
                console.log(`🎫 Agent card retrieved successfully, capabilities:`, JSON.stringify(agentCard?.capabilities));
            }
        } catch (cardError) {
            console.warn(`⚠️ A2A SDK failed to fetch agent card, attempting manual fetch: ${cardError.message}`);
            
            // Try manual fetch as fallback (same logic as in get-agent-card route)
            const manualUrl = `${normalizedAgentUrl}.well-known/agent-card.json`;
            try {
                const manualResponse = await fetch(manualUrl);
                if (manualResponse.ok) {
                    agentCard = await manualResponse.json();
                    if (DEBUG) {
                        console.log(`✅ Manual agent card fetch successful, capabilities:`, JSON.stringify(agentCard?.capabilities));
                    }
                } else {
                    console.warn(`⚠️ Manual agent card fetch also failed: ${manualResponse.status} ${manualResponse.statusText}`);
                    // If we can't even fetch the agent card manually, the agent might be unreachable
                    if (manualResponse.status === 404) {
                        console.warn(`⚠️ Agent card not found, proceeding without capability check`);
                    } else {
                        throw new Error(`Cannot reach A2A agent at ${normalizedAgentUrl}. Please verify the agent is running and accessible.`);
                    }
                }
            } catch (manualError) {
                console.error(`❌ Manual agent card fetch failed:`, manualError);
                // If we can't even fetch the agent card, the agent might be unreachable
                if (manualError.message?.includes('ECONNREFUSED') || manualError.message?.includes('fetch failed')) {
                    throw new Error(`Cannot reach A2A agent at ${normalizedAgentUrl}. Please verify the agent is running and accessible.`);
                }
            }
        }

        const supportsStreaming = agentCard?.capabilities?.streaming !== false;
        
        if (DEBUG) {
            console.log(`🎯 Agent streaming capability: ${supportsStreaming} (capabilities: ${JSON.stringify(agentCard?.capabilities)})`);
        }

        const params: MessageSendParams = {
            message: message as Message,
            configuration: configuration || {blocking: true}
        };

        let response;
        let isStream = false;

        if (supportsStreaming) {
            // Agent supports streaming - try sendMessage first, fallback to streaming
            try {
                // Try sendMessage method first (if it exists)
                response = await (client as any).sendMessage?.(params);
                if (DEBUG) {
                    console.log(`📦 Used sendMessage method (non-streaming)`);
                }
            } catch (error) {
                if (DEBUG) {
                    console.log(`📦 sendMessage failed, falling back to streaming: ${error.message}`);
                }
                // Fallback to streaming method
                response = await client.sendMessageStream(params);
                isStream = true;
            }

            if (!response) {
                // If sendMessage doesn't exist, use streaming
                if (DEBUG) {
                    console.log(`📦 sendMessage not available, using streaming`);
                }
                response = await client.sendMessageStream(params);
                isStream = true;
            }
        } else {
            // Agent does not support streaming - only try synchronous methods
            if (DEBUG) {
                console.log(`📦 Agent does not support streaming, using synchronous methods only`);
            }

            try {
                // First try: Use A2A SDK sendMessage
                if (typeof (client as any).sendMessage === 'function') {
                    response = await (client as any).sendMessage(params);
                    if (DEBUG) {
                        console.log(`📦 Used A2A SDK sendMessage successfully`);
                    }
                } else {
                    throw new Error('sendMessage method not available on A2A SDK client');
                }

                if (!response) {
                    throw new Error('A2A SDK sendMessage returned no response');
                }
            } catch (sdkError) {
                if (DEBUG) {
                    console.warn(`📦 A2A SDK failed, using direct JSON-RPC fallback: ${sdkError.message}`);
                }
                
                // Fallback: Try direct JSON-RPC request (same as Postman)
                try {
                    const directResult = await makeDirectJsonRpcRequest(agentUrl, 'message/send', {
                        message: params.message,
                        configuration: params.configuration
                    });
                    
                    if (directResult.success) {
                        if (DEBUG) {
                            console.log(`📦 Direct JSON-RPC request succeeded!`);
                        }
                        response = directResult.response.result;
                    } else {
                        throw new Error(`Direct JSON-RPC request failed: ${directResult.error}`);
                    }
                } catch (directError) {
                    // Enhanced error handling for non-streaming agents
                    if (sdkError.message?.includes('ECONNREFUSED') || directError.message?.includes('ECONNREFUSED')) {
                        throw new Error(`Cannot connect to A2A agent at ${agentUrl}. Please verify the agent is running and accessible.`);
                    }
                    if (sdkError.message?.includes('fetch failed') || directError.message?.includes('fetch failed')) {
                        throw new Error(`Network error connecting to A2A agent at ${agentUrl}. Agent may be offline or unreachable.`);
                    }
                    throw new Error(`Both A2A SDK and direct JSON-RPC failed. SDK error: ${sdkError.message}. Direct error: ${directError.message}`);
                }
            }
        }

        if (DEBUG) {
            console.log(`✅ A2A message sent successfully (streaming: ${isStream})`);
        }

        // If response is a stream, collect all events
        if (isStream || (response && typeof response[Symbol.asyncIterator] === 'function')) {
            const events = [];
            for await (const event of response as AsyncIterable<any>) {
                events.push(event);
            }
            res.json({
                success: true,
                events,
                streaming: true,
                agentSupportsStreaming: supportsStreaming
            });
        } else {
            res.json({
                success: true,
                response,
                streaming: false,
                agentSupportsStreaming: supportsStreaming
            });
        }

    } catch (error) {
        console.error('❌ A2A send-message error:', error);
        res.status(500).json({
            error: error instanceof Error ? error.message : 'Failed to send message to A2A agent'
        });
    }
});

// Send streaming message to A2A agent
a2aProxyRouter.post('/send-message-stream', async (req: Request, res: Response): Promise<void> => {
    const {agentUrl, authToken, message, configuration} = req.body;

    // Validate agent URL
    const urlValidation = validateAgentUrl(agentUrl);
    if (!urlValidation.valid) {
        res.status(400).json({error: urlValidation.error});
        return;
    }

    // Validate message
    if (!message || typeof message !== 'object') {
        res.status(400).json({error: 'message is required and must be an object'});
        return;
    }

    try {
        if (DEBUG) {
            console.log(`📤🔄 Sending streaming message to A2A agent: ${agentUrl}`);
        }

        const client = getA2AClient(agentUrl, authToken);

        // Normalize the agent URL for consistent handling
        const normalizedAgentUrl = normalizeAgentUrl(agentUrl);

        // Check if agent supports streaming before attempting with fallback
        let agentCard: AgentCard | undefined;
        try {
            agentCard = await client.getAgentCard();
            if (agentCard?.capabilities?.streaming === false) {
                res.status(400).json({
                    error: 'Agent does not support streaming (AgentCard.capabilities.streaming is false). Use /send-message endpoint instead.'
                });
                return;
            }
        } catch (cardError) {
            console.warn(`⚠️ A2A SDK failed to fetch agent card for streaming check, attempting manual fetch: ${cardError.message}`);
            
            // Try manual fetch as fallback
            const manualUrl = `${normalizedAgentUrl}.well-known/agent-card.json`;
            try {
                const manualResponse = await fetch(manualUrl);
                if (manualResponse.ok) {
                    agentCard = await manualResponse.json();
                    if (agentCard?.capabilities?.streaming === false) {
                        res.status(400).json({
                            error: 'Agent does not support streaming (AgentCard.capabilities.streaming is false). Use /send-message endpoint instead.'
                        });
                        return;
                    }
                    if (DEBUG) {
                        console.log(`✅ Manual agent card fetch for streaming check successful`);
                    }
                } else {
                    console.warn(`⚠️ Manual agent card fetch for streaming check failed: ${manualResponse.status} ${manualResponse.statusText}`);
                }
            } catch (manualError) {
                console.error(`❌ Manual agent card fetch for streaming check failed:`, manualError);
            }
        }

        const params: MessageSendParams = {
            message: message as Message,
            configuration: configuration || {blocking: false}
        };

        const stream = client.sendMessageStream(params);
        const events = [];

        // Collect all stream events
        for await (const event of stream) {
            events.push(event);
            if (DEBUG) {
                console.log(`📨 Stream event:`, event.kind || 'unknown');
            }
        }

        if (DEBUG) {
            console.log(`✅ A2A streaming message completed with ${events.length} events`);
        }

        res.json({
            success: true,
            events,
            streaming: true,
            eventCount: events.length,
            agentSupportsStreaming: agentCard?.capabilities?.streaming !== false
        });

    } catch (error) {
        console.error('❌ A2A send-message-stream error:', error);
        res.status(500).json({
            error: error instanceof Error ? error.message : 'Failed to send streaming message to A2A agent'
        });
    }
});

// Get task status for polling (for non-streaming agents)
a2aProxyRouter.post('/get-task-status', async (req: Request, res: Response): Promise<void> => {
    const {agentUrl, authToken, taskId} = req.body;

    // Validate agent URL
    const urlValidation = validateAgentUrl(agentUrl);
    if (!urlValidation.valid) {
        res.status(400).json({error: urlValidation.error});
        return;
    }

    if (!taskId || typeof taskId !== 'string') {
        res.status(400).json({error: 'taskId is required and must be a string'});
        return;
    }

    try {
        if (DEBUG) {
            console.log(`📋 Getting task status for task: ${taskId} from agent: ${agentUrl}`);
        }

        const client = getA2AClient(agentUrl, authToken);

        // Use the A2A SDK to get task status
        // This would typically be a tasks/get method call
        let taskStatus;
        try {
            // Try to call tasks/get method if available
            taskStatus = await (client as any).getTask?.(taskId);
        } catch (error) {
            if (DEBUG) {
                console.log(`📋 getTask method not available or failed: ${error.message}`);
            }
            // Fallback: assume task is completed immediately for simple agents
            taskStatus = {
                id: taskId,
                state: 'completed',
                artifacts: [],
                completedAt: new Date().toISOString()
            };
        }

        if (DEBUG) {
            console.log(`✅ Task status retrieved: ${taskStatus?.state || 'unknown'}`);
        }

        res.json({
            success: true,
            task: taskStatus
        });

    } catch (error) {
        console.error('❌ A2A get-task-status error:', error);
        res.status(500).json({
            error: error instanceof Error ? error.message : 'Failed to get task status from A2A agent'
        });
    }
});

// Check A2A agent health/connectivity
a2aProxyRouter.post('/health', async (req: Request, res: Response): Promise<void> => {
    const {agentUrl, authToken} = req.body;

    const urlValidation = validateAgentUrl(agentUrl);
    if (!urlValidation.valid) {
        res.status(400).json({error: urlValidation.error});
        return;
    }

    try {
        const client = getA2AClient(agentUrl, authToken);
        const normalizedAgentUrl = normalizeAgentUrl(agentUrl);
        
        let agentCard: AgentCard | undefined;
        try {
            agentCard = await client.getAgentCard();
        } catch (sdkError) {
            // Try manual fetch as fallback
            const manualUrl = `${normalizedAgentUrl}.well-known/agent-card.json`;
            const manualResponse = await fetch(manualUrl);
            if (manualResponse.ok) {
                agentCard = await manualResponse.json();
            } else {
                throw sdkError; // If manual fetch also fails, throw original SDK error
            }
        }

        res.json({
            healthy: true,
            agentUrl: normalizedAgentUrl,
            agentName: agentCard.name,
            agentVersion: agentCard.version,
            protocolVersion: (agentCard as any).protocolVersion,
            capabilities: agentCard.capabilities,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        res.status(503).json({
            healthy: false,
            agentUrl,
            error: error instanceof Error ? error.message : 'Agent health check failed',
            timestamp: new Date().toISOString()
        });
    }
});

// List active A2A connections
a2aProxyRouter.get('/connections', async (req: Request, res: Response): Promise<void> => {
    try {
        const connections = Array.from(clientConnections.entries()).map(([key, conn]) => ({
            connectionKey: key,
            agentUrl: conn.agentUrl,
            agentName: conn.agentCard?.name || 'Unknown',
            agentVersion: conn.agentCard?.version || 'Unknown',
            connectedAt: conn.connectedAt,
            lastUsed: conn.lastUsed,
            hasAgentCard: !!conn.agentCard
        }));

        // Sort by last used (most recent first)
        connections.sort((a, b) => new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime());

        console.log(`📊 Listed ${connections.length} active A2A connections`);

        res.json({
            totalConnections: connections.length,
            connections
        });

    } catch (error) {
        console.error('❌ A2A connections error:', error);
        res.status(500).json({
            error: error instanceof Error ? error.message : 'Failed to list connections'
        });
    }
});

// Disconnect from A2A agent (cleanup)
a2aProxyRouter.post('/disconnect', async (req: Request, res: Response): Promise<void> => {
    const {agentUrl, authToken} = req.body;

    try {
        let disconnectedConnections = 0;

        if (agentUrl) {
            // Disconnect specific agent
            const connectionKey = `${agentUrl}:${authToken || 'no-auth'}`;
            if (clientConnections.has(connectionKey)) {
                clientConnections.delete(connectionKey);
                disconnectedConnections = 1;
                console.log(`🔌 Disconnected A2A connection: ${agentUrl}`);
            }
        } else {
            // Disconnect all connections
            disconnectedConnections = clientConnections.size;
            clientConnections.clear();
            console.log(`🔌 Disconnected all ${disconnectedConnections} A2A connections`);
        }

        res.json({
            success: true,
            disconnectedConnections,
            message: `Disconnected ${disconnectedConnections} connection(s)`
        });

    } catch (error) {
        console.error('❌ A2A disconnect error:', error);
        res.status(500).json({
            error: error instanceof Error ? error.message : 'Failed to disconnect from A2A agent'
        });
    }
});

// Generate unique message ID
a2aProxyRouter.get('/generate-id', (req: Request, res: Response): void => {
    const id = Math.random().toString(36).substring(2) + Date.now().toString(36);
    res.json({id});
});


// Health check endpoint for the proxy itself
a2aProxyRouter.get('/health', (req: Request, res: Response): void => {
    res.json({
        status: 'healthy',
        service: 'forest-a2a-proxy',
        version: '1.0.0',
        activeConnections: clientConnections.size,
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

export default a2aProxyRouter;