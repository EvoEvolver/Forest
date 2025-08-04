import {NodeM, NodeVM} from "@forest/schema";
import React, {useEffect, useState} from "react";
import * as Y from "yjs";
import CollaborativeEditor from "./CodeEditor";
import MCPViewer from "./mcp/MCPViewer";
import {json as jsonLang} from '@codemirror/lang-json';
import {
    MCPConnection,
    MCPTool,
    generatePromptFromMCPTool,
    createMCPToolCall,
    createToolsetConnection,
    createToolsetToolCall,
    parseMCPTools,
    generateConfigId
} from "./mcp/mcpParser";
import {httpUrl} from "@forest/schema/src/config";
import {ActionableNodeType, Action, ActionParameter} from "./ActionableNodeType";
import {AgentSessionState} from "./sessionState";
import {ToolCallingMessage, ToolResponseMessage} from "@forest/agent-chat/src/AgentMessageTypes";

const MCPServerConfigText = "MCPServerConfigText";
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

    private getRawMCPConnection(node: NodeM): MCPConnection | null {
        // @ts-ignore
        const yText: Y.Text = node.ydata().get(MCPConnectionCacheText) as Y.Text;
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

    getMCPConnection(node: NodeM): MCPConnection | null {
        const connection = this.getRawMCPConnection(node);
        if (!connection) {
            return null;
        }
        
        // Apply tool enabled states and filter out disabled tools
        this.applyToolEnabledStates(connection);
        
        // Return connection with only enabled tools - disabled tools are invisible to the model
        const filteredConnection = {
            ...connection,
            tools: connection.tools.filter(tool => tool.enabled !== false)
        };
        
        return filteredConnection;
    }

    private saveMCPConnection(node: NodeM, connection: MCPConnection) {
        // @ts-ignore
        const yText: Y.Text = node.ydata().get(MCPConnectionCacheText) as Y.Text;
        if (yText) {
            yText.delete(0, yText.length);
            yText.insert(0, JSON.stringify(connection, null, 2));
        }
    }

    private saveServerConfig(node: NodeM, config: MCPServerConfig | MCPToolsetConfig) {
        // @ts-ignore
        const yText: Y.Text = node.ydata().get(MCPServerConfigText) as Y.Text;
        if (yText) {
            yText.delete(0, yText.length);
            yText.insert(0, JSON.stringify(config, null, 2));
        }
    }

    private applyToolEnabledStates(connection: MCPConnection) {
        // Get previously saved enabled states
        const savedEnabledTools = connection.enabledTools;
        
        // If enabledTools is undefined, this is the first time - default all to enabled
        // If enabledTools is an empty array, it means all tools were explicitly disabled
        if (savedEnabledTools === undefined) {
            // First time initialization - enable all tools
            connection.tools = connection.tools.map(tool => ({
                ...tool,
                enabled: true
            }));
            connection.enabledTools = connection.tools.map(tool => tool.name);
        } else {
            // Apply saved enabled states
            const savedEnabledSet = new Set(savedEnabledTools);
            connection.tools = connection.tools.map(tool => ({
                ...tool,
                enabled: savedEnabledSet.has(tool.name)
            }));
            
            // Update enabledTools array to match current state
            connection.enabledTools = connection.tools
                .filter(tool => tool.enabled !== false)
                .map(tool => tool.name);
        }
    }

    render(node: NodeVM): React.ReactNode {
        const [connection, setConnection] = useState<MCPConnection | null>(this.getMCPConnection(node.nodeM));
        const [loading, setLoading] = useState(false);
        const [error, setError] = useState<string | null>(null);
        const [statusCheckInterval, setStatusCheckInterval] = useState<NodeJS.Timeout | null>(null);

        // @ts-ignore
        const configYText: Y.Text = node.ydata.get(MCPServerConfigText) as Y.Text;
        // @ts-ignore
        const cacheYText: Y.Text = node.ydata.get(MCPConnectionCacheText) as Y.Text;

        useEffect(() => {
            const observer = () => {
                // Use filtered connection for UI display
                const newConnection = this.getMCPConnection(node.nodeM);
                setConnection(newConnection);
            };

            cacheYText.observe(observer);
            return () => {
                cacheYText.unobserve(observer);
            };
        }, [cacheYText, node.nodeM]);

        const checkConnectionStatus = async () => {
            if (!connection || !connection.toolsetUrl || !connection.configId) return;

            try {
                const response = await fetch(`${httpUrl}/api/mcp-proxy/health`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ toolsetUrl: connection.toolsetUrl, config_hash: connection.configId })
                });

                if (response.ok) {
                    const status = await response.json();
                    if (connection.connected && !status.healthy) {
                        console.log(`MCP connection health check failed, updating status`);
                        const disconnectedConnection: MCPConnection = {
                            ...connection,
                            connected: false,
                            error: status.message || 'Connection lost'
                        };
                        this.saveMCPConnection(node.nodeM, disconnectedConnection);
                        setConnection(disconnectedConnection);
                        setError(status.message || 'Connection lost');
                    }
                } else {
                    // Handle non-ok responses, e.g. server is down
                    if (connection.connected) {
                        const disconnectedConnection: MCPConnection = {
                            ...connection,
                            connected: false,
                            error: 'Health check failed: Server unreachable'
                        };
                        this.saveMCPConnection(node.nodeM, disconnectedConnection);
                        setConnection(disconnectedConnection);
                        setError('Health check failed: Server unreachable');
                    }
                }
            } catch (err) {
                if (connection.connected) {
                    console.log(`MCP Toolset proxy unreachable, assuming disconnected`);
                    const disconnectedConnection: MCPConnection = {
                        ...connection,
                        connected: false,
                        error: 'Toolset proxy unreachable'
                    };
                    this.saveMCPConnection(node.nodeM, disconnectedConnection);
                    setConnection(disconnectedConnection);
                    setError('Toolset proxy unreachable');
                }
            }
        };

        // Start/stop status checking based on connection state
        useEffect(() => {
            if (connection && connection.connected && connection.toolsetUrl) {
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
                // Save Toolset config
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

                // Create connection object with new Toolset format
                const configId = generateConfigId(mcpConfig);
                const newConnection: MCPConnection = {
                    toolsetUrl,
                    mcpConfig,
                    configId,
                    type: 'toolset-managed',
                    connected: true,
                    serverInfo: connectResult.result,
                    tools,
                    resources: [],
                    prompts: [],
                    lastFetched: new Date()
                };

                // Apply previously saved enabled states or default to all enabled
                this.applyToolEnabledStates(newConnection);
                
                this.saveMCPConnection(node.nodeM, newConnection);
                setConnection(newConnection);

            } catch (err: any) {
                console.error('MCP Toolset connection error:', err);
                setError(err.message || 'Failed to connect to MCP server via Toolset');
                
                // Save disconnected state
                const configId = generateConfigId(mcpConfig);
                const failedConnection: MCPConnection = {
                    toolsetUrl,
                    mcpConfig,
                    configId,
                    type: 'toolset-managed',
                    connected: false,
                    tools: [],
                    resources: [],
                    prompts: [],
                    error: err.message
                };
                this.saveMCPConnection(node.nodeM, failedConnection);
                setConnection(failedConnection);
            } finally {
                setLoading(false);
            }
        };

        const handleDisconnect = async () => {
            if (!connection) return;

            setLoading(true);
            try {
                await fetch(`${httpUrl}/api/mcp-proxy/disconnect`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        toolsetUrl: connection.toolsetUrl, 
                        mcpConfig: connection.mcpConfig 
                    })
                });
            } catch (err) {
                console.warn('Error disconnecting from Toolset:', err);
            } finally {
                const disconnectedConnection: MCPConnection = {
                    ...connection,
                    connected: false,
                    tools: [],
                    resources: [],
                    prompts: []
                };
                this.saveMCPConnection(node.nodeM, disconnectedConnection);
                setConnection(disconnectedConnection);
                setLoading(false);
            }
        };

        const handleRefresh = async () => {
            if (!connection) return;
            
            // First check the current status
            await checkConnectionStatus();
            
            // Then try to reconnect if we still think we should be connected
            if (connection.connected && connection.toolsetUrl && connection.mcpConfig) {
                await handleConnect(connection.toolsetUrl, connection.mcpConfig);
            }
        };

        const handleExecuteTool = async (toolName: string, params: any) => {
            if (!connection || !connection.connected) {
                throw new Error('Not connected to MCP server via Toolset');
            }

            if (!connection.toolsetUrl || !connection.mcpConfig) {
                throw new Error('Invalid Toolset connection configuration');
            }
            
            const toolCallPayload = createToolsetToolCall(
                connection.toolsetUrl, 
                connection.mcpConfig, 
                toolName, 
                params
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
            // Get raw connection data (with all tools) for modification
            const rawConnection = this.getRawMCPConnection(node.nodeM);
            if (!rawConnection) return;
            
            // Apply current tool states to get the latest state
            this.applyToolEnabledStates(rawConnection);
            
            // Update tool enabled state in raw data
            const updatedTools = rawConnection.tools.map(tool => 
                tool.name === toolName ? { ...tool, enabled } : tool
            );
            
            // Rebuild enabledTools array from the updated tools
            const updatedEnabledTools = updatedTools
                .filter(tool => tool.enabled !== false)
                .map(tool => tool.name);
            
            const updatedConnection = {
                ...rawConnection,
                tools: updatedTools,
                enabledTools: updatedEnabledTools
            };
            
            // Save updated raw connection
            this.saveMCPConnection(node.nodeM, updatedConnection);
            
            // Update UI with filtered connection
            setConnection(this.getMCPConnection(node.nodeM));
        };

        const handleGetAllTools = (): MCPTool[] => {
            const rawConnection = this.getRawMCPConnection(node.nodeM);
            if (!rawConnection) return [];
            
            // Apply current tool states and return all tools
            this.applyToolEnabledStates(rawConnection);
            return rawConnection.tools;
        };

        const handleBulkToggleTools = (enabled: boolean) => {
            // Get raw connection data (with all tools) for modification
            const rawConnection = this.getRawMCPConnection(node.nodeM);
            if (!rawConnection) return;
            
            // Apply current tool states to get the latest state
            this.applyToolEnabledStates(rawConnection);
            
            // Update all tools to the same enabled state
            const updatedTools = rawConnection.tools.map(tool => ({
                ...tool,
                enabled
            }));
            
            // Rebuild enabledTools array from the updated tools
            const updatedEnabledTools = enabled 
                ? updatedTools.map(tool => tool.name)
                : [];
            
            const updatedConnection = {
                ...rawConnection,
                tools: updatedTools,
                enabledTools: updatedEnabledTools
            };
            
            // Save updated raw connection
            this.saveMCPConnection(node.nodeM, updatedConnection);
            
            // Update UI with filtered connection
            setConnection(this.getMCPConnection(node.nodeM));
        };

        return (
            <div>
                <MCPViewer
                    connection={connection}
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
                <h1>Connection Cache</h1>
                <CollaborativeEditor yText={node.ydata.get(MCPConnectionCacheText)} langExtension={jsonLang}/>
            </>
        );
    }

    actions(node: NodeM): Action[] {
        const connection = this.getMCPConnection(node);
        if (!connection || !connection.connected || !connection.tools || connection.tools.length === 0) {
            return [];
        }

        return connection.tools.map(tool => {
            const parameters: Record<string, ActionParameter> = {};
            
            if (tool.inputSchema && tool.inputSchema.properties) {
                Object.entries(tool.inputSchema.properties).forEach(([key, prop]: [string, any]) => {
                    parameters[key] = {
                        type: prop.type || "string",
                        description: prop.description || ""
                    };
                });
            }

            return {
                label: `Call ${tool.name}`,
                description: tool.description || `Execute MCP tool: ${tool.name}`,
                parameter: parameters
            };
        });
    }

    async executeAction(node: NodeM, label: string, parameters: Record<string, any>, callerNode: NodeM, agentSessionState: AgentSessionState): Promise<any> {
        const connection = this.getMCPConnection(node);
        if (!connection || !connection.connected) {
            throw new Error("MCP server not connected");
        }

        // Extract tool name from label (format: "Call {toolName}")
        const toolName = label.replace("Call ", "");
        const tool = connection.tools.find(t => t.name === toolName);
        if (!tool) {
            throw new Error(`Tool ${toolName} not found`);
        }

        const toolCallingMessage = new ToolCallingMessage({
            toolName: toolName,
            parameters: parameters,
            author: callerNode.title(),
        });
        agentSessionState.addMessage(callerNode, toolCallingMessage);

        try {
            const result = await this.callMCPTool(node, toolName, parameters);
            
            const toolResponseMessage = new ToolResponseMessage({
                toolName: toolName,
                response: result,
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
        const connection = this.getMCPConnection(node);
        if (!connection || !connection.connected || !connection.tools || connection.tools.length === 0) {
            return '';
        }

        // Apply tool enabled states before generating prompts
        this.applyToolEnabledStates(connection);
        
        // Only include enabled tools in the prompt
        const enabledTools = connection.tools.filter(tool => tool.enabled !== false);
        
        if (enabledTools.length === 0) {
            return '';
        }

        const toolPrompts = enabledTools.map(tool => generatePromptFromMCPTool(tool)).join('\n-------\n');
        
        return toolPrompts;
    }

    async callMCPTool(node: NodeM, toolName: string, params: any) {
        const connection = this.getMCPConnection(node);
        if (!connection || !connection.connected) {
            throw new Error("MCP server not connected via Toolset");
        }

        if (!connection.toolsetUrl || !connection.mcpConfig) {
            throw new Error("Invalid Toolset connection configuration");
        }

        // Note: No need to check if tool is enabled here because getMCPConnection() 
        // already filters out disabled tools. If the model tries to call a disabled tool,
        // it means the tool doesn't exist from the model's perspective.

        const toolCallPayload = createToolsetToolCall(
            connection.toolsetUrl, 
            connection.mcpConfig, 
            toolName, 
            params
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

    ydataInitialize(node: NodeM) {
        const ydata = node.ydata();
        if (!ydata.has(MCPServerConfigText)) {
            // @ts-ignore
            ydata.set(MCPServerConfigText, new Y.Text());
        }
        if (!ydata.has(MCPConnectionCacheText)) {
            // @ts-ignore
            ydata.set(MCPConnectionCacheText, new Y.Text());
        }
    }
}