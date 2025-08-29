import {NodeM} from "@forest/schema";
import * as Y from "yjs";
import {preprocessA2AResponse} from "./a2a/utils";
import {
    A2AClient,
    A2AConnection,
    connectToA2AAgent,
    createA2AMessage,
    generatePromptFromA2ASkill,
    getActiveAgentCard
} from "./a2a/a2aParser";
import {Action, ActionableNodeType, ActionParameter} from "./ActionableNodeType";
import {AgentSessionState} from "./sessionState";
import {ToolCallingMessage, ToolResponseMessage} from "@forest/agent-chat/src/AgentMessageTypes";

export const A2AAgentUrlText = "A2AAgentUrlText";
export const A2AConnectionCacheText = "A2AConnectionCacheText";


export class A2ANodeTypeM extends ActionableNodeType {
    static displayName = "A2A Agent"
    static allowReshape = true
    static allowAddingChildren = false
    static allowEditTitle = true

    static getAgentUrl(node: NodeM): string | null {
        // @ts-ignore
        const yText: Y.Text = node.ydata().get(A2AAgentUrlText) as Y.Text;
        if (!yText) {
            return null;
        }
        let url = yText.toString().trim();
        if (!url) {
            return null;
        }
        
        // Normalize URL by ensuring it ends with a slash
        if (!url.endsWith('/')) {
            url += '/';
        }
        
        return url;
    }

    static getRawA2AConnection(node: NodeM): A2AConnection | null {
        // @ts-ignore
        const yText: Y.Text = node.ydata().get(A2AConnectionCacheText) as Y.Text;
        if (!yText) {
            return null;
        }
        try {
            const connection = JSON.parse(yText.toString());
            // Convert date strings back to Date objects
            if (connection.lastFetched) {
                connection.lastFetched = new Date(connection.lastFetched);
            }
            return connection;
        } catch (e) {
            return null;
        }
    }

    static getA2AConnection(node: NodeM): A2AConnection | null {
        const connection = A2ANodeTypeM.getRawA2AConnection(node);
        if (!connection) {
            return null;
        }

        // Apply skill enabled states and filter out disabled skills
        A2ANodeTypeM.applySkillEnabledStates(connection);

        // Return connection with only enabled skills - disabled skills are invisible to the model
        const activeCard = getActiveAgentCard(connection);
        if (activeCard && activeCard.skills) {
            const filteredConnection = {
                ...connection,
                agentCard: connection.agentCard ? {
                    ...connection.agentCard,
                    skills: connection.agentCard.skills?.filter(skill => skill.enabled !== false)
                } : connection.agentCard,
                extendedCard: connection.extendedCard ? {
                    ...connection.extendedCard,
                    skills: connection.extendedCard.skills?.filter(skill => skill.enabled !== false)
                } : connection.extendedCard
            };
            return filteredConnection;
        }

        return connection;
    }

    static saveA2AConnection(node: NodeM, connection: A2AConnection) {
        // @ts-ignore
        const yText: Y.Text = node.ydata().get(A2AConnectionCacheText) as Y.Text;
        if (yText) {
            yText.delete(0, yText.length);
            yText.insert(0, JSON.stringify(connection, null, 2));
        }
    }

    static saveAgentUrl(node: NodeM, url: string) {
        // @ts-ignore
        const yText: Y.Text = node.ydata().get(A2AAgentUrlText) as Y.Text;
        if (yText) {
            // Normalize URL before saving
            let normalizedUrl = url.trim();
            if (normalizedUrl && !normalizedUrl.endsWith('/')) {
                normalizedUrl += '/';
            }
            
            yText.delete(0, yText.length);
            yText.insert(0, normalizedUrl);
        }
    }

    static applySkillEnabledStates(connection: A2AConnection) {
        const activeCard = getActiveAgentCard(connection);
        if (!activeCard || !activeCard.skills) {
            return;
        }

        // Get previously saved enabled states
        const savedEnabledSkills = (connection as any).enabledSkills;

        // If enabledSkills is undefined, this is the first time - default all to enabled
        if (savedEnabledSkills === undefined) {
            // First time initialization - enable all skills
            activeCard.skills = activeCard.skills.map(skill => ({
                ...skill,
                enabled: true
            }));
            (connection as any).enabledSkills = activeCard.skills.map(skill => skill.id);
        } else {
            // Apply saved enabled states
            const savedEnabledSet = new Set(savedEnabledSkills);
            activeCard.skills = activeCard.skills.map(skill => ({
                ...skill,
                enabled: savedEnabledSet.has(skill.id)
            }));

            // Update enabledSkills array to match current state
            (connection as any).enabledSkills = activeCard.skills
                .filter(skill => skill.enabled !== false)
                .map(skill => skill.id);
        }
    }


    static actions(node: NodeM): Action[] {
        const connection = A2ANodeTypeM.getA2AConnection(node);
        if (!connection || !connection.connected) {
            return [];
        }

        const activeCard = getActiveAgentCard(connection);
        if (!activeCard || !activeCard.skills || activeCard.skills.length === 0) {
            return [];
        }

        return activeCard.skills.map(skill => {
            const parameters: Record<string, ActionParameter> = {
                query: {
                    type: "string",
                    description: "The message or query to send to the agent"
                }
            };

            return {
                label: `${skill.name}`,
                description: skill.description || `Execute A2A agent skill: ${skill.name}`,
                parameter: parameters
            };
        });
    }

    static async executeAction(node: NodeM, label: string, parameters: Record<string, any>, callerNode: NodeM, agentSessionState: AgentSessionState): Promise<any> {
        const connection = A2ANodeTypeM.getA2AConnection(node);
        if (!connection || !connection.connected) {
            throw new Error("A2A agent not connected");
        }

        const activeCard = getActiveAgentCard(connection);
        if (!activeCard) {
            throw new Error("No active agent card available");
        }

        const skillName = label;
        const skill = activeCard.skills?.find(s => s.name === skillName);
        if (!skill) {
            throw new Error(`Skill ${skillName} not found`);
        }

        const toolCallingMessage = new ToolCallingMessage({
            toolName: skillName,
            parameters: parameters,
            author: callerNode.title(),
        });
        agentSessionState.addMessage(callerNode, toolCallingMessage);

        try {
            const result = await A2ANodeTypeM.callA2AAgent(node, skill.id, parameters);

            // Preprocess the result to handle any image artifacts
            console.log(`🔄 [A2A executeAction] Starting response preprocessing for skill: ${skillName}`);
            const processedResult = await preprocessA2AResponse(result);
            console.log(`🔄 [A2A executeAction] Response preprocessing completed for skill: ${skillName}`);

            const toolResponseMessage = new ToolResponseMessage({
                toolName: skillName,
                response: processedResult,
                author: node.title(),
            });
            agentSessionState.addMessage(callerNode, toolResponseMessage);

            return toolResponseMessage;
        } catch (error) {
            const errorMessage = new ToolResponseMessage({
                toolName: skillName,
                response: {error: error.message},
                author: node.title(),
            });
            agentSessionState.addMessage(callerNode, errorMessage);
            throw error;
        }
    }

    static renderPrompt(node: NodeM): string {
        const connection = A2ANodeTypeM.getA2AConnection(node);
        if (!connection || !connection.connected) {
            return '';
        }

        const activeCard = getActiveAgentCard(connection);
        if (!activeCard || !activeCard.skills || activeCard.skills.length === 0) {
            return '';
        }

        // Apply skill enabled states before generating prompts
        A2ANodeTypeM.applySkillEnabledStates(connection);

        // Only include enabled skills in the prompt
        const enabledSkills = activeCard.skills.filter(skill => skill.enabled !== false);

        if (enabledSkills.length === 0) {
            return '';
        }

        const skillPrompts = enabledSkills.map(skill => generatePromptFromA2ASkill(skill)).join('\n-------\n');

        return skillPrompts;
    }

    static async callA2AAgent(node: NodeM, skillId: string, params: any) {
        const connection = A2ANodeTypeM.getA2AConnection(node);
        if (!connection || !connection.connected) {
            throw new Error("A2A agent not connected");
        }

        const activeCard = getActiveAgentCard(connection);
        if (!activeCard) {
            throw new Error("No active agent card available");
        }

        try {
            const client = new A2AClient(connection.agentUrl, connection.authToken);
            const message = createA2AMessage(params.query || JSON.stringify(params));

            // Configure based on agent's streaming capability
            const configuration = {
                blocking: true,
                // For non-streaming agents, ensure we use synchronous mode
                ...(connection.supportsStreaming === false && {
                    acceptedOutputModes: ['text'], // Request simple text output
                })
            };

            console.log(`🎯 Calling A2A agent (streaming support: ${connection.supportsStreaming})`);

            const response = await client.sendMessage({
                message,
                configuration
            });

            // Preprocess the response to handle any image artifacts
            console.log(`🔄 [A2A callA2AAgent] Starting response preprocessing`);
            const processedResponse = await preprocessA2AResponse(response);
            console.log(`🔄 [A2A callA2AAgent] Response preprocessing completed`);

            return processedResponse;
        } catch (error) {
            // Provide more context for streaming-related errors
            const errorMessage = error.message?.includes('streaming')
                ? `A2A agent call failed (agent streaming support: ${connection.supportsStreaming}): ${error.message}`
                : `A2A agent call failed: ${error.message}`;
            throw new Error(errorMessage);
        }
    }

    // Auto-connection method that can be called programmatically
    static async attemptAutoConnect(node: NodeM): Promise<boolean> {
        try {
            // Check if already connected
            const connection = A2ANodeTypeM.getA2AConnection(node);
            if (connection?.connected) {
                return true; // Already connected
            }

            // Get agent URL
            const agentUrl = A2ANodeTypeM.getAgentUrl(node);
            if (!agentUrl) {
                console.log(`🔌 [A2A Auto-Connect] No agent URL found for node ${node.title()}`);
                return false; // No URL configured
            }

            // Get auth token (if any)
            const rawConnection = A2ANodeTypeM.getRawA2AConnection(node);
            const authToken = rawConnection?.authToken;

            console.log(`🔌 [A2A Auto-Connect] Attempting to connect node ${node.title()} to ${agentUrl}`);

            // Connect to A2A agent
            const newConnection = await connectToA2AAgent(agentUrl, authToken);

            if (newConnection.connected) {
                // Apply previously saved enabled states or default to all enabled
                A2ANodeTypeM.applySkillEnabledStates(newConnection);

                A2ANodeTypeM.saveA2AConnection(node, newConnection);

                // Log streaming capability for debugging
                const activeCard = getActiveAgentCard(newConnection);
                console.log(`✅ [A2A Auto-Connect] Successfully connected node ${node.title()} to ${activeCard?.name || 'Unknown'} (streaming: ${newConnection.supportsStreaming})`);
                return true;
            } else {
                console.warn(`🔌 [A2A Auto-Connect] Connection failed for ${node.title()}: ${newConnection.error || 'Unknown error'}`);
                A2ANodeTypeM.saveA2AConnection(node, newConnection);
                return false;
            }

        } catch (err: any) {
            console.error(`❌ [A2A Auto-Connect] Connection error for ${node.title()}:`, err);

            // Save disconnected state
            const agentUrl = A2ANodeTypeM.getAgentUrl(node);
            if (agentUrl) {
                const rawConnection = A2ANodeTypeM.getRawA2AConnection(node);
                const failedConnection: A2AConnection = {
                    agentUrl,
                    connected: false,
                    error: err.message,
                    authToken: rawConnection?.authToken,
                    supportsStreaming: false
                };
                A2ANodeTypeM.saveA2AConnection(node, failedConnection);
            }
            return false;
        }
    }

    static ydataInitialize(node: NodeM) {
        const ydata = node.ydata();
        if (!ydata.has(A2AAgentUrlText)) {
            // @ts-ignore
            ydata.set(A2AAgentUrlText, new Y.Text());
        }
        if (!ydata.has(A2AConnectionCacheText)) {
            // @ts-ignore
            ydata.set(A2AConnectionCacheText, new Y.Text());
        }
    }
}

