// A2A Protocol Client Utilities - Server Proxy Version
// Uses Forest server's A2A proxy to avoid CORS issues

import { httpUrl } from "@forest/schema/src/config";

// Official A2A SDK types (we use these for type safety)
export interface A2AAgentCard {
    name: string;
    description?: string;
    url: string;
    version?: string;
    protocolVersion?: string;
    defaultInputModes?: string[];
    defaultOutputModes?: string[];
    capabilities?: {
        streaming?: boolean;
        [key: string]: any;
    };
    skills?: A2AAgentSkill[];
    supportsAuthenticatedExtendedCard?: boolean;
    preferredTransport?: string;
}

export interface A2AAgentSkill {
    id: string;
    name: string;
    description?: string;
    tags?: string[];
    examples?: string[];
    enabled?: boolean;
}

export interface A2AConnection {
    agentUrl: string;
    connected: boolean;
    agentCard?: A2AAgentCard;
    extendedCard?: A2AAgentCard;
    lastFetched?: Date;
    error?: string;
    authToken?: string;
    supportsStreaming?: boolean; // Cached streaming capability
}

export interface A2AMessage {
    messageId: string;
    kind: 'message';
    role: 'user' | 'agent';
    parts: A2APart[];
}

export interface A2APart {
    kind: 'text' | 'file' | 'data';
    text?: string;
    file?: any;
    data?: any;
}

export interface A2AMessageSendParams {
    message: A2AMessage;
    configuration?: {
        acceptedOutputModes?: string[];
        blocking?: boolean;
    };
}

// A2A Protocol Constants
export const AGENT_CARD_WELL_KNOWN_PATH = '/.well-known/agent-card.json';
export const EXTENDED_AGENT_CARD_PATH = '/agent/authenticatedExtendedCard';

export class A2ACardResolver {
    constructor(
        private agentUrl: string,
        private authToken?: string
    ) {}

    async getAgentCard(): Promise<A2AAgentCard> {
        try {
            const response = await fetch(`${httpUrl}/api/a2a-proxy/get-agent-card`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    agentUrl: this.agentUrl,
                    authToken: this.authToken
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Failed to fetch agent card: ${response.status} ${response.statusText}`);
            }

            const result = await response.json();
            if (!result.success) {
                throw new Error(result.error || 'Failed to fetch agent card');
            }

            return result.agentCard as A2AAgentCard;
        } catch (error) {
            throw new Error(`Error fetching agent card: ${error.message}`);
        }
    }

    async getExtendedAgentCard(): Promise<A2AAgentCard | null> {
        if (!this.authToken) {
            return null;
        }

        try {
            // For extended card, we'll try with the auth token
            return await this.getAgentCard();
        } catch (error) {
            console.warn('Failed to fetch extended agent card:', error);
            return null;
        }
    }
}

export class A2AClient {
    constructor(
        private agentUrl: string,
        private authToken?: string
    ) {}

    async sendMessage(params: A2AMessageSendParams): Promise<any> {
        try {
            const response = await fetch(`${httpUrl}/api/a2a-proxy/send-message`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    agentUrl: this.agentUrl,
                    authToken: this.authToken,
                    message: params.message,
                    configuration: params.configuration
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `A2A request failed: ${response.status} ${response.statusText}`);
            }

            const result = await response.json();
            if (!result.success) {
                throw new Error(result.error || 'A2A message sending failed');
            }

            // Return the response or events depending on the type
            // Include metadata about streaming capability and method used
            const responseData = result.streaming ? result.events : result.response;
            
            // Add metadata about the communication method used
            if (typeof responseData === 'object' && responseData !== null) {
                responseData._metadata = {
                    streaming: result.streaming,
                    agentSupportsStreaming: result.agentSupportsStreaming,
                    communicationMethod: result.streaming ? 'streaming' : 'synchronous'
                };
            }
            
            return responseData;
        } catch (error) {
            throw new Error(`Error sending message to A2A agent: ${error.message}`);
        }
    }

    async sendMessageStream(params: A2AMessageSendParams): Promise<AsyncIterable<any>> {
        try {
            const response = await fetch(`${httpUrl}/api/a2a-proxy/send-message-stream`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    agentUrl: this.agentUrl,
                    authToken: this.authToken,
                    message: params.message,
                    configuration: params.configuration
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `A2A streaming request failed: ${response.status} ${response.statusText}`);
            }

            const result = await response.json();
            if (!result.success) {
                throw new Error(result.error || 'A2A streaming message sending failed');
            }

            // Return an async iterable that yields the events
            const events = result.events || [];
            return {
                async *[Symbol.asyncIterator]() {
                    for (const event of events) {
                        yield event;
                    }
                }
            };
        } catch (error) {
            throw new Error(`Error sending streaming message to A2A agent: ${error.message}`);
        }
    }

    private generateId(): string {
        return Math.random().toString(36).substring(2) + Date.now().toString(36);
    }

    // Polling method for non-streaming agents or task status checking
    async pollTaskStatus(taskId: string, maxAttempts: number = 10, intervalMs: number = 1000): Promise<any> {
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            try {
                const response = await fetch(`${httpUrl}/api/a2a-proxy/get-task-status`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        agentUrl: this.agentUrl,
                        authToken: this.authToken,
                        taskId
                    })
                });

                if (!response.ok) {
                    if (attempt === maxAttempts - 1) {
                        const errorData = await response.json();
                        throw new Error(errorData.error || `Task status check failed: ${response.status} ${response.statusText}`);
                    }
                    // Wait before retrying
                    await new Promise(resolve => setTimeout(resolve, intervalMs));
                    continue;
                }

                const result = await response.json();
                if (!result.success) {
                    if (attempt === maxAttempts - 1) {
                        throw new Error(result.error || 'Task status check failed');
                    }
                    // Wait before retrying
                    await new Promise(resolve => setTimeout(resolve, intervalMs));
                    continue;
                }

                // Check if task is completed
                const task = result.task;
                if (task && (task.state === 'completed' || task.state === 'failed' || task.state === 'cancelled')) {
                    return task;
                }

                // Task is still running, wait before polling again
                if (attempt < maxAttempts - 1) {
                    await new Promise(resolve => setTimeout(resolve, intervalMs));
                }
            } catch (error) {
                if (attempt === maxAttempts - 1) {
                    throw error;
                }
                // Wait before retrying
                await new Promise(resolve => setTimeout(resolve, intervalMs));
            }
        }

        throw new Error(`Task ${taskId} did not complete within ${maxAttempts} polling attempts`);
    }
}

// Utility functions
export function parseA2ASkills(agentCard: A2AAgentCard): A2AAgentSkill[] {
    if (!agentCard.skills) {
        return [];
    }

    return agentCard.skills.map(skill => ({
        ...skill,
        enabled: skill.enabled !== false // Default to enabled
    }));
}

export function generatePromptFromA2ASkill(skill: A2AAgentSkill): string {
    let prompt = `Skill: ${skill.name}\n`;
    
    if (skill.description) {
        prompt += `Description: ${skill.description}\n`;
    }
    
    if (skill.examples && skill.examples.length > 0) {
        prompt += `Examples: ${skill.examples.join(', ')}\n`;
    }
    
    if (skill.tags && skill.tags.length > 0) {
        prompt += `Tags: ${skill.tags.join(', ')}\n`;
    }
    
    return prompt;
}

export async function connectToA2AAgent(
    agentUrl: string, 
    authToken?: string
): Promise<A2AConnection> {
    try {
        const resolver = new A2ACardResolver(agentUrl, authToken);
        
        // Fetch public agent card
        const agentCard = await resolver.getAgentCard();
        
        // Determine streaming capability
        const supportsStreaming = agentCard.capabilities?.streaming !== false;
        
        // Try to fetch extended card if supported and auth token provided
        let extendedCard: A2AAgentCard | undefined;
        if (agentCard.supportsAuthenticatedExtendedCard && authToken) {
            extendedCard = await resolver.getExtendedAgentCard() || undefined;
        }

        const connection: A2AConnection = {
            agentUrl,
            connected: true,
            agentCard,
            extendedCard,
            lastFetched: new Date(),
            authToken,
            supportsStreaming
        };

        return connection;
    } catch (error) {
        return {
            agentUrl,
            connected: false,
            error: error.message,
            lastFetched: new Date(),
            supportsStreaming: false // Assume no streaming on connection failure
        };
    }
}

export function createA2AMessage(content: string, messageId?: string): A2AMessage {
    return {
        messageId: messageId || Math.random().toString(36).substring(2) + Date.now().toString(36),
        kind: 'message',
        role: 'user',
        parts: [
            {
                kind: 'text',
                text: content
            }
        ]
    };
}

export function getActiveAgentCard(connection: A2AConnection): A2AAgentCard | null {
    // Prefer extended card if available, otherwise use public card
    return connection.extendedCard || connection.agentCard || null;
}

// Health check function
export async function checkA2AAgentHealth(agentUrl: string, authToken?: string): Promise<boolean> {
    try {
        const response = await fetch(`${httpUrl}/api/a2a-proxy/health`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                agentUrl,
                authToken
            })
        });

        if (!response.ok) {
            return false;
        }

        const result = await response.json();
        return result.healthy === true;
    } catch (error) {
        console.warn('A2A health check failed:', error);
        return false;
    }
}