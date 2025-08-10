import {NodeM, NodeVM} from "@forest/schema";
import React, {useEffect, useState} from "react";
import * as Y from "yjs";
import CollaborativeEditor from "./CodeEditor";
import MCPViewer from "./mcp/MCPViewer";
import {json as jsonLang} from '@codemirror/lang-json';
import {
    MCPConnection,
    MCPTool,
    ToolEnabledMap,
    createToolsetConnection,
    createToolsetToolCall,
    parseMCPTools
} from "./mcp/mcpParser";
import {httpUrl} from "@forest/schema/src/config";
import {ActionableNodeType, Action} from "./ActionableNodeType";
import {AgentSessionState} from "./sessionState";
import {ToolCallingMessage, ToolResponseMessage} from "@forest/agent-chat/src/AgentMessageTypes";

const MCPServerConfigText = "MCPServerConfigText";
const MCPToolEnabledText = "MCPToolEnabledText";
const MCPConnectionCacheText = "MCPConnectionCacheText";

// New configuration interface for Toolset integration
interface MCPToolsetConfig {
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

export class MCPNodeType extends ActionableNodeType {
    displayName = "MCP Tool"
    allowReshape = true
    allowAddingChildren = false
    allowEditTitle = true

    getServerConfig(node: NodeM): MCPServerConfig | MCPToolsetConfig | null {
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
    private isToolsetConfig(config: any): config is MCPToolsetConfig {
        return config && config.toolsetUrl && config.mcpConfig;
    }

    // Get tool enabled state map from yjs
    private getToolEnabledMap(node: NodeM): ToolEnabledMap {
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
    private saveToolEnabledMap(node: NodeM, enabledMap: ToolEnabledMap) {
        // @ts-ignore
        const yText: Y.Text = node.ydata().get(MCPToolEnabledText) as Y.Text;
        if (yText) {
            yText.delete(0, yText.length);
            yText.insert(0, JSON.stringify(enabledMap, null, 2));
        }
    }

    // Get MCPConnection from yjs cache
    private getCachedConnection(node: NodeM): MCPConnection | null {
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
    private saveCachedConnection(node: NodeM, connection: MCPConnection) {
        // @ts-ignore
        const yText: Y.Text = node.ydata().get(MCPConnectionCacheText) as Y.Text;
        if (yText) {
            yText.delete(0, yText.length);
            yText.insert(0, JSON.stringify(connection, null, 2));
        }
    }

    // Get enabled tools by combining MCPConnection.tools with yjs enabled state
    private getEnabledTools(connection: MCPConnection | null, node: NodeM): MCPTool[] {
        if (!connection || !connection.tools) {
            return [];
        }
        
        const enabledMap = this.getToolEnabledMap(node);
        
        // If no enabled map exists, default all tools to enabled
        if (Object.keys(enabledMap).length === 0) {
            return connection.tools;
        }
        
        // Filter tools based on enabled map
        return connection.tools.filter(tool => enabledMap[tool.name] !== false);
    }

    private saveServerConfig(node: NodeM, config: MCPServerConfig | MCPToolsetConfig) {
        // @ts-ignore
        const yText: Y.Text = node.ydata().get(MCPServerConfigText) as Y.Text;
        if (yText) {
            yText.delete(0, yText.length);
            yText.insert(0, JSON.stringify(config, null, 2));
        }
    }


    render(node: NodeVM): React.ReactNode {
        const [connection, setConnection] = useState<MCPConnection | null>(this.getCachedConnection(node.nodeM));
        const [loading, setLoading] = useState(false);
        const [error, setError] = useState<string | null>(null);
        const [statusCheckInterval, setStatusCheckInterval] = useState<NodeJS.Timeout | null>(null);

        // @ts-ignore
        const toolEnabledYText: Y.Text = node.ydata.get(MCPToolEnabledText) as Y.Text;
        // @ts-ignore
        const connectionCacheYText: Y.Text = node.ydata.get(MCPConnectionCacheText) as Y.Text;

        useEffect(() => {
            const toolEnabledObserver = () => {
                // Tool enabled state changed, trigger re-render
                setConnection((prevConnection: MCPConnection | null) => ({ ...prevConnection }));
            };
            
            const connectionObserver = () => {
                // Connection cache changed, update state
                const newConnection = this.getCachedConnection(node.nodeM);
                setConnection(newConnection);
            };

            toolEnabledYText.observe(toolEnabledObserver);
            connectionCacheYText.observe(connectionObserver);
            return () => {
                toolEnabledYText.unobserve(toolEnabledObserver);
                connectionCacheYText.unobserve(connectionObserver);
            };
        }, [toolEnabledYText, connectionCacheYText, node.nodeM]);

        const checkConnectionStatus = async () => {
            if (!connection || !connection.toolsetUrl || !connection.configHash) return;

            try {
                const response = await fetch(`${httpUrl}/api/mcp-proxy/health`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ toolsetUrl: connection.toolsetUrl, config_hash: connection.configHash })
                });

                if (response.ok) {
                    const status = await response.json();
                    if (connection.connected && !status.healthy) {
                        console.log(`MCP connection health check failed, updating status`);
                        const disconnectedConnection: MCPConnection = {
                            ...connection,
                            connected: false
                        };
                        setConnection(disconnectedConnection);
                        setError(status.message || 'Connection lost');
                    }
                } else {
                    // Handle non-ok responses, e.g. server is down
                    if (connection.connected) {
                        const disconnectedConnection: MCPConnection = {
                            ...connection,
                            connected: false
                        };
                        setConnection(disconnectedConnection);
                        setError('Health check failed: Server unreachable');
                    }
                }
            } catch (err) {
                if (connection.connected) {
                    console.log(`MCP Toolset proxy unreachable, assuming disconnected`);
                    const disconnectedConnection: MCPConnection = {
                        ...connection,
                        connected: false
                    };
                    setConnection(disconnectedConnection);
                    setError('Toolset proxy unreachable');
                }
            }
        };

        // Start/stop status checking based on connection state
        useEffect(() => {
            if (connection && connection.connected && connection.toolsetUrl) {
                // Immediately check connection status when component mounts or connection becomes available
                checkConnectionStatus();
                
                // Start periodic status checking every 10 seconds
                const interval = setInterval(() => {
                    checkConnectionStatus();
                }, 10000);
                
                setStatusCheckInterval(interval);
                
                return () => {
                    clearInterval(interval);
                };
            } else {
                // Stop status checking if disconnected
                if (statusCheckInterval) {
                    clearInterval(statusCheckInterval);
                    setStatusCheckInterval(null);
                }
            }
        }, [connection?.connected, connection?.toolsetUrl]);

        // Cleanup on unmount
        useEffect(() => {
            return () => {
                if (statusCheckInterval) {
                    clearInterval(statusCheckInterval);
                }
            };
        }, [statusCheckInterval]);

        const handleConnect = async (toolsetUrl: string, mcpConfig: any) => {
            setLoading(true);
            setError(null);

            try {
                // Save Toolset config to yjs
                const config: MCPToolsetConfig = { 
                    toolsetUrl,
                    mcpConfig
                };
                this.saveServerConfig(node.nodeM, config);

                // Connect to MCP server via Toolset
                const connectPayload = createToolsetConnection(toolsetUrl, mcpConfig);
                const connectResponse = await fetch(`${httpUrl}/api/mcp-proxy/connect`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(connectPayload)
                });

                if (!connectResponse.ok) {
                    const errorData = await connectResponse.json();
                    throw new Error(errorData.error || `Failed to connect: ${connectResponse.statusText}`);
                }

                const connectResult = await connectResponse.json();
                const configHash = connectResult._metadata.configHash;
                
                // Fetch tools list
                const toolsResponse = await fetch(`${httpUrl}/api/mcp-proxy/list-tools`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(connectPayload)
                });

                if (!toolsResponse.ok) {
                    const errorData = await toolsResponse.json();
                    throw new Error(errorData.error || `Failed to fetch tools: ${toolsResponse.statusText}`);
                }

                const toolsResult = await toolsResponse.json();
                const tools = parseMCPTools(toolsResult);

                // Create simplified connection object (browser cache only)
                const newConnection: MCPConnection = {
                    toolsetUrl,
                    configHash,
                    connected: true,
                    tools,
                    lastFetched: new Date(),
                    serverInfo: connectResult.result
                };

                // Generate simple enabled state map and save to yjs
                const currentEnabledMap = this.getToolEnabledMap(node.nodeM);
                const newEnabledMap: ToolEnabledMap = {};
                
                tools.forEach(tool => {
                    // If tool was previously configured, keep its state; otherwise default to enabled
                    newEnabledMap[tool.name] = currentEnabledMap[tool.name] !== undefined ? currentEnabledMap[tool.name] : true;
                });
                
                this.saveToolEnabledMap(node.nodeM, newEnabledMap);
                this.saveCachedConnection(node.nodeM, newConnection);
                setConnection(newConnection);

            } catch (err: any) {
                console.error('MCP Toolset connection error:', err);
                setError(err.message || 'Failed to connect to MCP server via Toolset');
                
                // Save disconnected state (browser cache only)
                const failedConnection: MCPConnection = {
                    toolsetUrl,
                    configHash: "",
                    connected: false,
                    tools: [],
                    error: err.message
                };
                this.saveCachedConnection(node.nodeM, failedConnection);
                setConnection(failedConnection);
            } finally {
                setLoading(false);
            }
        };

        const handleDisconnect = async () => {
            if (!connection) return;

            setLoading(true);
            try {
                // Get mcpConfig from yjs for disconnect call
                const config = this.getServerConfig(node.nodeM);
                if (config && this.isToolsetConfig(config)) {
                    await fetch(`${httpUrl}/api/mcp-proxy/disconnect`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            toolsetUrl: connection.toolsetUrl, 
                            mcpConfig: config.mcpConfig 
                        })
                    });
                }
            } catch (err) {
                console.warn('Error disconnecting from Toolset:', err);
            } finally {
                const disconnectedConnection: MCPConnection = {
                    ...connection,
                    connected: false,
                    tools: []
                };
                this.saveCachedConnection(node.nodeM, disconnectedConnection);
                setConnection(disconnectedConnection);
                setLoading(false);
            }
        };

        const handleRefresh = async () => {
            if (!connection) return;
            
            // First check the current status
            await checkConnectionStatus();
            
            // Then try to reconnect if we still think we should be connected
            if (connection.connected && connection.toolsetUrl) {
                const config = this.getServerConfig(node.nodeM);
                if (config && this.isToolsetConfig(config)) {
                    await handleConnect(connection.toolsetUrl, config.mcpConfig);
                }
            }
        };

        const handleExecuteTool = async (toolName: string, params: any) => {
            if (!connection || !connection.connected) {
                throw new Error('Not connected to MCP server via Toolset');
            }

            const config = this.getServerConfig(node.nodeM);
            if (!config || !this.isToolsetConfig(config)) {
                throw new Error('Invalid Toolset connection configuration');
            }
            
            const toolCallPayload = createToolsetToolCall(
                connection.toolsetUrl, 
                config.mcpConfig, 
                toolName, 
                params,
                connection.configHash
            );
            
            try {
                const response = await fetch(`${httpUrl}/api/mcp-proxy/call-tool`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(toolCallPayload)
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    // If we get a connection error, check status immediately
                    if (response.status === 400 || response.status === 503) {
                        if (errorData.error && (errorData.error.includes('not connected') || errorData.error.includes('not available'))) {
                            await checkConnectionStatus();
                        }
                    }
                    throw new Error(errorData.error || `Tool execution failed: ${response.statusText}`);
                }

                const result = await response.json();
                if (result.error) {
                    // If we get a Toolset error that suggests disconnection, check status
                    if (result.error.includes && (result.error.includes('not connected') || result.error.includes('not available'))) {
                        await checkConnectionStatus();
                    }
                    throw new Error(result.error || 'Tool execution failed');
                }

                return result.result;
            } catch (error) {
                // On network errors, also check connection status
                if (error instanceof TypeError && error.message.includes('fetch')) {
                    await checkConnectionStatus();
                }
                throw error;
            }
        };

        const handleToggleToolEnabled = (toolName: string, enabled: boolean) => {
            // Get current enabled map from yjs
            const currentEnabledMap = this.getToolEnabledMap(node.nodeM);
            
            // Update the specific tool's enabled state
            const updatedEnabledMap = {
                ...currentEnabledMap,
                [toolName]: enabled
            };
            
            // Save back to yjs
            this.saveToolEnabledMap(node.nodeM, updatedEnabledMap);
            
            // Trigger re-render by updating connection object
            setConnection((prevConnection: MCPConnection | null) => ({ ...prevConnection }));
        };

        const handleGetAllTools = (): MCPTool[] => {
            if (!connection || !connection.tools) return [];
            
            // Return all tools from connection with enabled state from yjs
            const enabledMap = this.getToolEnabledMap(node.nodeM);
            return connection.tools.map((tool: MCPTool) => ({
                ...tool,
                enabled: enabledMap[tool.name] !== false
            }));
        };

        const handleBulkToggleTools = (enabled: boolean) => {
            if (!connection || !connection.tools) return;
            
            // Create new enabled map with all tools set to the same state
            const newEnabledMap: ToolEnabledMap = {};
            connection.tools.forEach((tool: MCPTool) => {
                newEnabledMap[tool.name] = enabled;
            });
            
            // Save to yjs
            this.saveToolEnabledMap(node.nodeM, newEnabledMap);
            
            // Trigger re-render
            setConnection((prevConnection: MCPConnection | null) => ({ ...prevConnection }));
        };

        // Create filtered connection for display with only enabled tools
        const displayConnection = connection ? {
            ...connection,
            tools: this.getEnabledTools(connection, node.nodeM)
        } : null;

        // Get current server config from yjs for MCPViewer
        const currentServerConfig = this.getServerConfig(node.nodeM);

        return (
            <div>
                <MCPViewer
                    connection={displayConnection}
                    currentServerConfig={currentServerConfig}
                    loading={loading}
                    error={error}
                    onConnect={handleConnect}
                    onDisconnect={handleDisconnect}
                    onRefresh={handleRefresh}
                    onExecuteTool={handleExecuteTool}
                    onToggleToolEnabled={handleToggleToolEnabled}
                    onGetAllTools={handleGetAllTools}
                    onBulkToggleTools={handleBulkToggleTools}
                />
            </div>
        );
    }

    renderTool1(node: NodeVM): React.ReactNode {
        return (
            <>
                <h1>MCP Server Configuration</h1>
                <CollaborativeEditor yText={node.ydata.get(MCPServerConfigText)} langExtension={jsonLang}/>
            </>
        );
    }

    renderTool2(node: NodeVM): React.ReactNode {
        return (
            <>
                <h1>Tool Enabled State</h1>
                <CollaborativeEditor yText={node.ydata.get(MCPToolEnabledText)} langExtension={jsonLang}/>
            </>
        );
    }

    actions(node: NodeM): Action[] {
        const connection = this.getCachedConnection(node);
        if (!connection || !connection.connected || !connection.tools || connection.tools.length === 0) {
            return [];
        }

        const enabledTools = this.getEnabledTools(connection, node);

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

    async executeAction(node: NodeM, label: string, parameters: Record<string, any>, callerNode: NodeM, agentSessionState: AgentSessionState): Promise<any> {
        const connection = this.getCachedConnection(node);
        if (!connection || !connection.connected) {
            throw new Error("MCP server not connected");
        }

        const toolName = label;
        const enabledTools = this.getEnabledTools(connection, node);
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
            const config = this.getServerConfig(node);
            if (!config || !this.isToolsetConfig(config)) {
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
                headers: { 'Content-Type': 'application/json' },
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
                response: { error: error.message },
                author: node.title(),
            });
            agentSessionState.addMessage(callerNode, errorMessage);
            throw error;
        }
    }

    renderPrompt(node: NodeM): string {
        const connection = this.getCachedConnection(node);
        if (!connection || !connection.connected || !connection.tools || connection.tools.length === 0) {
            return '';
        }

        const enabledTools = this.getEnabledTools(connection, node);
        
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

    async callMCPTool(node: NodeM, toolName: string, params: any): Promise<any> {
        // This method is for direct tool calls (like from UI), 
        // not for agent execution with session state
        const connection = this.getCachedConnection(node);
        if (!connection || !connection.connected) {
            throw new Error("MCP server not connected");
        }

        const enabledTools = this.getEnabledTools(connection, node);
        const tool = enabledTools.find(t => t.name === toolName);
        if (!tool) {
            throw new Error(`Tool ${toolName} not found or disabled`);
        }

        // Get mcpConfig from yjs for tool execution
        const config = this.getServerConfig(node);
        if (!config || !this.isToolsetConfig(config)) {
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
            headers: { 'Content-Type': 'application/json' },
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
    async attemptAutoConnect(node: NodeM): Promise<boolean> {
        try {
            // Check if already connected
            const connection = this.getCachedConnection(node);
            if (connection?.connected) {
                return true; // Already connected
            }

            // Get server config
            const config = this.getServerConfig(node);
            if (!config || !this.isToolsetConfig(config)) {
                console.log(`🔌 [MCP Auto-Connect] No valid config found for node ${node.title()}`);
                return false; // No configuration available
            }

            console.log(`🔌 [MCP Auto-Connect] Attempting to connect node ${node.title()}`);

            // Connect to MCP server via Toolset
            const connectPayload = createToolsetConnection(config.toolsetUrl, config.mcpConfig);
            const connectResponse = await fetch(`${httpUrl}/api/mcp-proxy/connect`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
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
                headers: { 'Content-Type': 'application/json' },
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
            const currentEnabledMap = this.getToolEnabledMap(node);
            const newEnabledMap: ToolEnabledMap = {};
            
            tools.forEach(tool => {
                // If tool was previously configured, keep its state; otherwise default to enabled
                newEnabledMap[tool.name] = currentEnabledMap[tool.name] !== undefined ? currentEnabledMap[tool.name] : true;
            });
            
            this.saveToolEnabledMap(node, newEnabledMap);
            this.saveCachedConnection(node, newConnection);

            console.log(`✅ [MCP Auto-Connect] Successfully connected node ${node.title()} with ${tools.length} tools`);
            return true;

        } catch (err: any) {
            console.error(`❌ [MCP Auto-Connect] Connection error for ${node.title()}:`, err);
            
            // Save disconnected state
            const config = this.getServerConfig(node);
            if (config && this.isToolsetConfig(config)) {
                const failedConnection: MCPConnection = {
                    toolsetUrl: config.toolsetUrl,
                    configHash: "",
                    connected: false,
                    tools: [],
                    error: err.message
                };
                this.saveCachedConnection(node, failedConnection);
            }
            return false;
        }
    }

    ydataInitialize(node: NodeM) {
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