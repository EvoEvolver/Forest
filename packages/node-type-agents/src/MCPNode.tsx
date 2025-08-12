import {NodeM} from "@forest/schema";
import * as Y from "yjs";
import {
    createToolsetConnection,
    createToolsetToolCall,
    MCPConnection,
    MCPTool,
    parseMCPTools,
    ToolEnabledMap
} from "./mcp/mcpParser";
import {httpUrl} from "@forest/schema/src/config";
import {Action, ActionableNodeType} from "./ActionableNodeType";
import {AgentSessionState} from "./sessionState";
import {ToolCallingMessage, ToolResponseMessage} from "@forest/agent-chat/src/AgentMessageTypes";

export const MCPServerConfigText = "MCPServerConfigText";
export const MCPToolEnabledText = "MCPToolEnabledText";
export const MCPConnectionCacheText = "MCPConnectionCacheText";

// New configuration interface for Toolset integration
export interface MCPToolsetConfig {
    toolsetUrl: string;
    mcpConfig: any;  // The MCP servers configuration
}

// Legacy interface (kept for backward compatibility)
interface MCPServerConfig {
    serverUrl: string;
    type?: 'websocket' | 'http'; // Auto-detected from URL if not specified
    auth?: {
        type: 'bearer' | 'basic' | 'none';
        token?: string;
        username?: string;
        password?: string;
        headers?: Record<string, string>; // Custom headers for HTTP
    };
    timeout?: number;
}

export class MCPNodeTypeM extends ActionableNodeType {
    static displayName = "MCP Tool"
    static allowReshape = true
    static allowAddingChildren = false
    static allowEditTitle = true

    static getServerConfig(node: NodeM): MCPServerConfig | MCPToolsetConfig | null {
        // @ts-ignore
        const yText: Y.Text = node.ydata().get(MCPServerConfigText) as Y.Text;
        if (!yText) {
            return null;
        }
        try {
            const config = JSON.parse(yText.toString());
            return config;
        } catch (e) {
            return null;
        }
    }

    // Helper to check if config is new Toolset format
    static isToolsetConfig(config: any): config is MCPToolsetConfig {
        return config && config.toolsetUrl && config.mcpConfig;
    }

    // Get tool enabled state map from yjs
    static getToolEnabledMap(node: NodeM): ToolEnabledMap {
        // @ts-ignore
        const yText: Y.Text = node.ydata().get(MCPToolEnabledText) as Y.Text;
        if (!yText || yText.length === 0) {
            return {};
        }
        try {
            return JSON.parse(yText.toString());
        } catch (e) {
            return {};
        }
    }

    // Save tool enabled state map to yjs  
    static saveToolEnabledMap(node: NodeM, enabledMap: ToolEnabledMap) {
        // @ts-ignore
        const yText: Y.Text = node.ydata().get(MCPToolEnabledText) as Y.Text;
        if (yText) {
            yText.delete(0, yText.length);
            yText.insert(0, JSON.stringify(enabledMap, null, 2));
        }
    }

    // Get MCPConnection from yjs cache
    static getCachedConnection(node: NodeM): MCPConnection | null {
        // @ts-ignore
        const yText: Y.Text = node.ydata().get(MCPConnectionCacheText) as Y.Text;
        if (!yText || yText.length === 0) {
            return null;
        }
        try {
            const connection = JSON.parse(yText.toString());
            // Convert date strings back to Date objects
            if (connection.lastFetched) {
                connection.lastFetched = new Date(connection.lastFetched);
            }
            // Ensure tools is always an array (for backward compatibility)
            if (!connection.tools) {
                connection.tools = [];
            }
            return connection;
        } catch (e) {
            return null;
        }
    }

    // Save MCPConnection to yjs cache
    static saveCachedConnection(node: NodeM, connection: MCPConnection) {
        // @ts-ignore
        const yText: Y.Text = node.ydata().get(MCPConnectionCacheText) as Y.Text;
        if (yText) {
            yText.delete(0, yText.length);
            yText.insert(0, JSON.stringify(connection, null, 2));
        }
    }

    // Get enabled tools by combining MCPConnection.tools with yjs enabled state
    static getEnabledTools(connection: MCPConnection | null, node: NodeM): MCPTool[] {
        if (!connection || !connection.tools) {
            return [];
        }

        const enabledMap = MCPNodeTypeM.getToolEnabledMap(node);

        // If no enabled map exists, default all tools to enabled
        if (Object.keys(enabledMap).length === 0) {
            return connection.tools;
        }

        // Filter tools based on enabled map
        return connection.tools.filter(tool => enabledMap[tool.name] !== false);
    }

    static saveServerConfig(node: NodeM, config: MCPServerConfig | MCPToolsetConfig) {
        // @ts-ignore
        const yText: Y.Text = node.ydata().get(MCPServerConfigText) as Y.Text;
        if (yText) {
            yText.delete(0, yText.length);
            yText.insert(0, JSON.stringify(config, null, 2));
        }
    }


    static actions(node: NodeM): Action[] {
        const connection = MCPNodeTypeM.getCachedConnection(node);
        if (!connection || !connection.connected || !connection.tools || connection.tools.length === 0) {
            return [];
        }

        const enabledTools = MCPNodeTypeM.getEnabledTools(connection, node);

        return enabledTools.map(tool => {
            const parameters: Record<string, any> = {};

            if (tool.inputSchema && tool.inputSchema.properties) {
                Object.entries(tool.inputSchema.properties).forEach(([key, prop]: [string, any]) => {
                    parameters[key] = {
                        type: prop.type || "string",
                        description: prop.description || ""
                    };
                });
            }

            return {
                label: `${tool.name}`,
                description: tool.description || `Execute MCP tool: ${tool.name}`,
                parameter: parameters
            };
        });
    }

    static async executeAction(node: NodeM, label: string, parameters: Record<string, any>, callerNode: NodeM, agentSessionState: AgentSessionState): Promise<any> {
        const connection = MCPNodeTypeM.getCachedConnection(node);
        if (!connection || !connection.connected) {
            throw new Error("MCP server not connected");
        }

        const toolName = label;
        const enabledTools = MCPNodeTypeM.getEnabledTools(connection, node);
        const tool = enabledTools.find(t => t.name === toolName);
        if (!tool) {
            throw new Error(`Tool ${toolName} not found or disabled`);
        }

        const toolCallingMessage = new ToolCallingMessage({
            toolName: toolName,
            parameters: parameters,
            author: callerNode.title(),
        });
        agentSessionState.addMessage(callerNode, toolCallingMessage);

        try {
            // Get mcpConfig from yjs for tool execution
            const config = MCPNodeTypeM.getServerConfig(node);
            if (!config || !MCPNodeTypeM.isToolsetConfig(config)) {
                throw new Error("Invalid Toolset connection configuration");
            }

            const toolCallPayload = createToolsetToolCall(
                connection.toolsetUrl,
                config.mcpConfig,
                toolName,
                parameters,
                connection.configHash
            );

            const response = await fetch(`${httpUrl}/api/mcp-proxy/call-tool`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(toolCallPayload)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `MCP tool call via Toolset failed: ${response.statusText}`);
            }

            const result = await response.json();
            if (result.error) {
                throw new Error(result.error || 'MCP tool execution via Toolset failed');
            }

            const toolResponseMessage = new ToolResponseMessage({
                toolName: toolName,
                response: result.result,
                author: node.title(),
            });
            agentSessionState.addMessage(callerNode, toolResponseMessage);

            return toolResponseMessage;
        } catch (error) {
            const errorMessage = new ToolResponseMessage({
                toolName: toolName,
                response: {error: error.message},
                author: node.title(),
            });
            agentSessionState.addMessage(callerNode, errorMessage);
            throw error;
        }
    }

    static renderPrompt(node: NodeM): string {
        const connection = MCPNodeTypeM.getCachedConnection(node);
        if (!connection || !connection.connected || !connection.tools || connection.tools.length === 0) {
            return '';
        }

        const enabledTools = MCPNodeTypeM.getEnabledTools(connection, node);

        if (enabledTools.length === 0) {
            return '';
        }

        // Import generatePromptFromMCPTool for use here
        const toolPrompts = enabledTools.map(tool => {
            const description = tool.description || 'No description provided.';
            let parametersPrompt = '';

            if (tool.inputSchema && tool.inputSchema.properties) {
                parametersPrompt = Object.entries(tool.inputSchema.properties)
                    .map(([key, prop]: [string, any]) => {
                        const type = prop.type || 'any';
                        const desc = prop.description || '';
                        const required = tool.inputSchema.required?.includes(key) ? ' (required)' : '';
                        return `"${key}" (${type})${required}: ${desc}`;
                    })
                    .join('\n');
            }

            return `Title: ${tool.name}
Description: ${description}
Parameters:
${parametersPrompt}`;
        }).join('\n-------\n');

        return toolPrompts;
    }

    static async callMCPTool(node: NodeM, toolName: string, params: any): Promise<any> {
        // This method is for direct tool calls (like from UI), 
        // not for agent execution with session state
        const connection = MCPNodeTypeM.getCachedConnection(node);
        if (!connection || !connection.connected) {
            throw new Error("MCP server not connected");
        }

        const enabledTools = MCPNodeTypeM.getEnabledTools(connection, node);
        const tool = enabledTools.find(t => t.name === toolName);
        if (!tool) {
            throw new Error(`Tool ${toolName} not found or disabled`);
        }

        // Get mcpConfig from yjs for tool execution
        const config = MCPNodeTypeM.getServerConfig(node);
        if (!config || !MCPNodeTypeM.isToolsetConfig(config)) {
            throw new Error("Invalid Toolset connection configuration");
        }

        const toolCallPayload = createToolsetToolCall(
            connection.toolsetUrl,
            config.mcpConfig,
            toolName,
            params,
            connection.configHash
        );

        const response = await fetch(`${httpUrl}/api/mcp-proxy/call-tool`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(toolCallPayload)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `MCP tool call via Toolset failed: ${response.statusText}`);
        }

        const result = await response.json();
        if (result.error) {
            throw new Error(result.error || 'MCP tool execution via Toolset failed');
        }

        return result.result;
    }

    // Auto-connection method that can be called programmatically
    static async attemptAutoConnect(node: NodeM): Promise<boolean> {
        try {
            // Check if already connected
            const connection = MCPNodeTypeM.getCachedConnection(node);
            if (connection?.connected) {
                return true; // Already connected
            }

            // Get server config
            const config = MCPNodeTypeM.getServerConfig(node);
            if (!config || !MCPNodeTypeM.isToolsetConfig(config)) {
                console.log(`🔌 [MCP Auto-Connect] No valid config found for node ${node.title()}`);
                return false; // No configuration available
            }

            console.log(`🔌 [MCP Auto-Connect] Attempting to connect node ${node.title()}`);

            // Connect to MCP server via Toolset
            const connectPayload = createToolsetConnection(config.toolsetUrl, config.mcpConfig);
            const connectResponse = await fetch(`${httpUrl}/api/mcp-proxy/connect`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(connectPayload)
            });

            if (!connectResponse.ok) {
                const errorData = await connectResponse.json();
                console.warn(`🔌 [MCP Auto-Connect] Connection failed for ${node.title()}: ${errorData.error || connectResponse.statusText}`);
                return false;
            }

            const connectResult = await connectResponse.json();
            const configHash = connectResult._metadata.configHash;

            // Fetch tools list
            const toolsResponse = await fetch(`${httpUrl}/api/mcp-proxy/list-tools`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(connectPayload)
            });

            if (!toolsResponse.ok) {
                const errorData = await toolsResponse.json();
                console.warn(`🔌 [MCP Auto-Connect] Failed to fetch tools for ${node.title()}: ${errorData.error || toolsResponse.statusText}`);
                return false;
            }

            const toolsResult = await toolsResponse.json();
            const tools = parseMCPTools(toolsResult);

            // Create simplified connection object
            const newConnection: MCPConnection = {
                toolsetUrl: config.toolsetUrl,
                configHash,
                connected: true,
                tools,
                lastFetched: new Date(),
                serverInfo: connectResult.result
            };

            // Generate enabled state map and save to yjs
            const currentEnabledMap = MCPNodeTypeM.getToolEnabledMap(node);
            const newEnabledMap: ToolEnabledMap = {};

            tools.forEach(tool => {
                // If tool was previously configured, keep its state; otherwise default to enabled
                newEnabledMap[tool.name] = currentEnabledMap[tool.name] !== undefined ? currentEnabledMap[tool.name] : true;
            });

            MCPNodeTypeM.saveToolEnabledMap(node, newEnabledMap);
            MCPNodeTypeM.saveCachedConnection(node, newConnection);

            console.log(`✅ [MCP Auto-Connect] Successfully connected node ${node.title()} with ${tools.length} tools`);
            return true;

        } catch (err: any) {
            console.error(`❌ [MCP Auto-Connect] Connection error for ${node.title()}:`, err);

            // Save disconnected state
            const config = MCPNodeTypeM.getServerConfig(node);
            if (config && MCPNodeTypeM.isToolsetConfig(config)) {
                const failedConnection: MCPConnection = {
                    toolsetUrl: config.toolsetUrl,
                    configHash: "",
                    connected: false,
                    tools: [],
                    error: err.message
                };
                MCPNodeTypeM.saveCachedConnection(node, failedConnection);
            }
            return false;
        }
    }

    static ydataInitialize(node: NodeM) {
        const ydata = node.ydata();
        if (!ydata.has(MCPServerConfigText)) {
            // @ts-ignore
            ydata.set(MCPServerConfigText, new Y.Text());
        }
        if (!ydata.has(MCPToolEnabledText)) {
            // @ts-ignore
            ydata.set(MCPToolEnabledText, new Y.Text());
        }
        if (!ydata.has(MCPConnectionCacheText)) {
            // @ts-ignore
            ydata.set(MCPConnectionCacheText, new Y.Text());
        }
    }
}

