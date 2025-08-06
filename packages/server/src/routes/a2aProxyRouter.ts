import {Request, Response, Router} from 'express';
import {A2AClient} from '@a2a-js/sdk/client';
import {AgentCard, Message, MessageSendParams} from '@a2a-js/sdk';

const a2aProxyRouter = Router();

// Default configuration
const DEFAULT_TIMEOUT = 30000;
const DEBUG = process.env.NODE_ENV === 'development';

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

// Helper function to get or create A2A client
function getA2AClient(agentUrl: string, authToken?: string): A2AClient {
    const connectionKey = `${agentUrl}:${authToken || 'no-auth'}`;
    let connection = clientConnections.get(connectionKey);

    if (!connection) {
        if (DEBUG) {
            console.log(`🔌 Creating new A2A client for: ${agentUrl}`);
        }

        const client = new A2AClient(agentUrl);
        connection = {
            client,
            agentUrl,
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

    try {
        if (DEBUG) {
            console.log(`🎫 Fetching agent card from: ${agentUrl}`);
        }

        const client = getA2AClient(agentUrl, authToken);
        const agentCard = await client.getAgentCard();

        // Cache the agent card in the connection
        const connectionKey = `${agentUrl}:${authToken || 'no-auth'}`;
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

// Send message to A2A agent (non-streaming)
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

        const params: MessageSendParams = {
            message: message as Message,
            configuration: configuration || {blocking: true}
        };

        // For non-streaming, try sendMessage first, fallback to sendMessageStream
        let response;
        let isStream = false;

        try {
            // Try sendMessage method first (if it exists)
            response = await (client as any).sendMessage?.(params);
        } catch (error) {
            // Fallback to streaming method
            response = await client.sendMessageStream(params);
            isStream = true;
        }

        if (!response) {
            // If sendMessage doesn't exist, use streaming
            response = await client.sendMessageStream(params);
            isStream = true;
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
                streaming: true
            });
        } else {
            res.json({
                success: true,
                response,
                streaming: false
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
            eventCount: events.length
        });

    } catch (error) {
        console.error('❌ A2A send-message-stream error:', error);
        res.status(500).json({
            error: error instanceof Error ? error.message : 'Failed to send streaming message to A2A agent'
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
        const agentCard = await client.getAgentCard();

        res.json({
            healthy: true,
            agentUrl,
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