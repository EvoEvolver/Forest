import {NodeM, NodeType, NodeVM} from "@forest/schema";
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
    createMCPListToolsRequest,
    createMCPInitializeRequest,
    parseMCPTools
} from "./mcp/mcpParser";
import {httpUrl} from "@forest/schema/src/config";

const MCPServerConfigText = "MCPServerConfigText";
const MCPConnectionCacheText = "MCPConnectionCacheText";

interface MCPServerConfig {
    serverUrl: string;
    auth?: {
        type: 'bearer' | 'basic' | 'none';
        token?: string;
        username?: string;
        password?: string;
    };
    timeout?: number;
}

export class MCPNodeType extends NodeType {
    displayName = "MCP Tool"
    allowReshape = true
    allowAddingChildren = false
    allowEditTitle = true

    getServerConfig(node: NodeM): MCPServerConfig | null {
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

    getMCPConnection(node: NodeM): MCPConnection | null {
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

    private saveMCPConnection(node: NodeM, connection: MCPConnection) {
        // @ts-ignore
        const yText: Y.Text = node.ydata().get(MCPConnectionCacheText) as Y.Text;
        if (yText) {
            yText.delete(0, yText.length);
            yText.insert(0, JSON.stringify(connection, null, 2));
        }
    }

    private saveServerConfig(node: NodeM, config: MCPServerConfig) {
        // @ts-ignore
        const yText: Y.Text = node.ydata().get(MCPServerConfigText) as Y.Text;
        if (yText) {
            yText.delete(0, yText.length);
            yText.insert(0, JSON.stringify(config, null, 2));
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
                const newConnection = this.getMCPConnection(node.nodeM);
                setConnection(newConnection);
            };

            cacheYText.observe(observer);
            return () => {
                cacheYText.unobserve(observer);
            };
        }, [cacheYText, node.nodeM]);

        // Function to check connection status
        const checkConnectionStatus = async (serverUrl: string) => {
            try {
                const encodedUrl = encodeURIComponent(serverUrl);
                const response = await fetch(`${httpUrl}/api/mcp-proxy/status/${encodedUrl}`);
                
                if (response.ok) {
                    const status = await response.json();
                    
                    // If server says disconnected but our local state says connected, update it
                    if (connection && connection.connected && !status.connected) {
                        console.log(`MCP connection lost for ${serverUrl}, updating status`);
                        const disconnectedConnection: MCPConnection = {
                            ...connection,
                            connected: false,
                            error: 'Connection lost'
                        };
                        this.saveMCPConnection(node.nodeM, disconnectedConnection);
                        setConnection(disconnectedConnection);
                        setError('Connection lost');
                    }
                }
            } catch (err) {
                // If we can't reach the proxy, assume disconnected
                if (connection && connection.connected) {
                    console.log(`MCP proxy unreachable for ${serverUrl}, assuming disconnected`);
                    const disconnectedConnection: MCPConnection = {
                        ...connection,
                        connected: false,
                        error: 'Proxy unreachable'
                    };
                    this.saveMCPConnection(node.nodeM, disconnectedConnection);
                    setConnection(disconnectedConnection);
                    setError('Proxy unreachable');
                }
            }
        };

        // Start/stop status checking based on connection state
        useEffect(() => {
            if (connection && connection.connected && connection.serverUrl) {
                // Start periodic status checking every 10 seconds
                const interval = setInterval(() => {
                    checkConnectionStatus(connection.serverUrl);
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
        }, [connection?.connected, connection?.serverUrl]);

        // Cleanup on unmount
        useEffect(() => {
            return () => {
                if (statusCheckInterval) {
                    clearInterval(statusCheckInterval);
                }
            };
        }, [statusCheckInterval]);

        const handleConnect = async (serverUrl: string) => {
            setLoading(true);
            setError(null);

            try {
                // Save server config
                const config: MCPServerConfig = { serverUrl };
                this.saveServerConfig(node.nodeM, config);

                // Connect to MCP server
                const initRequest = createMCPInitializeRequest();
                const connectResponse = await fetch(`${httpUrl}/api/mcp-proxy/connect`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        serverUrl,
                        request: initRequest
                    })
                });

                if (!connectResponse.ok) {
                    throw new Error(`Failed to connect: ${connectResponse.statusText}`);
                }

                const connectResult = await connectResponse.json();
                
                // Fetch tools list
                const listToolsRequest = createMCPListToolsRequest();
                const toolsResponse = await fetch(`${httpUrl}/api/mcp-proxy/list-tools`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        serverUrl,
                        request: listToolsRequest
                    })
                });

                if (!toolsResponse.ok) {
                    throw new Error(`Failed to fetch tools: ${toolsResponse.statusText}`);
                }

                const toolsResult = await toolsResponse.json();
                const tools = parseMCPTools(toolsResult);

                // Create connection object
                const newConnection: MCPConnection = {
                    serverUrl,
                    connected: true,
                    serverInfo: connectResult.result,
                    tools,
                    resources: [],
                    prompts: [],
                    lastFetched: new Date()
                };

                this.saveMCPConnection(node.nodeM, newConnection);
                setConnection(newConnection);

            } catch (err: any) {
                console.error('MCP connection error:', err);
                setError(err.message || 'Failed to connect to MCP server');
                
                // Save disconnected state
                const failedConnection: MCPConnection = {
                    serverUrl,
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
                    body: JSON.stringify({ serverUrl: connection.serverUrl })
                });
            } catch (err) {
                console.warn('Error disconnecting:', err);
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
            if (connection.serverUrl) {
                await checkConnectionStatus(connection.serverUrl);
            }
            
            // Then try to reconnect if we still think we should be connected
            if (connection.connected) {
                await handleConnect(connection.serverUrl);
            }
        };

        const handleExecuteTool = async (toolName: string, params: any) => {
            if (!connection || !connection.connected) {
                throw new Error('Not connected to MCP server');
            }

            const toolCallRequest = createMCPToolCall(toolName, params);
            
            try {
                const response = await fetch(`${httpUrl}/api/mcp-proxy/call-tool`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        serverUrl: connection.serverUrl,
                        request: toolCallRequest
                    })
                });

                if (!response.ok) {
                    // If we get a connection error, check status immediately
                    if (response.status === 400) {
                        const errorData = await response.json();
                        if (errorData.error && errorData.error.includes('not connected')) {
                            await checkConnectionStatus(connection.serverUrl);
                        }
                    }
                    throw new Error(`Tool execution failed: ${response.statusText}`);
                }

                const result = await response.json();
                if (result.error) {
                    // If we get an MCP error that suggests disconnection, check status
                    if (result.error.message && result.error.message.includes('not connected')) {
                        await checkConnectionStatus(connection.serverUrl);
                    }
                    throw new Error(result.error.message || 'Tool execution failed');
                }

                return result.result;
            } catch (error) {
                // On network errors, also check connection status
                if (error instanceof TypeError && error.message.includes('fetch')) {
                    await checkConnectionStatus(connection.serverUrl);
                }
                throw error;
            }
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

    renderPrompt(node: NodeM): string {
        const connection = this.getMCPConnection(node);
        if (!connection || !connection.connected || !connection.tools || connection.tools.length === 0) {
            return '';
        }

        const toolPrompts = connection.tools.map(tool => generatePromptFromMCPTool(tool)).join('\n-------\n');
        
        return toolPrompts;
    }

    async callMCPTool(node: NodeM, toolName: string, params: any) {
        const connection = this.getMCPConnection(node);
        if (!connection || !connection.connected) {
            throw new Error("MCP server not connected");
        }

        const toolCallRequest = createMCPToolCall(toolName, params);
        
        const response = await fetch(`${httpUrl}/api/mcp-proxy/call-tool`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                serverUrl: connection.serverUrl,
                request: toolCallRequest
            })
        });

        if (!response.ok) {
            throw new Error(`MCP tool call failed: ${response.statusText}`);
        }

        const result = await response.json();
        if (result.error) {
            throw new Error(result.error.message || 'MCP tool execution failed');
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