import {NodeTypeVM} from "@forest/schema/src/nodeTypeVM";
import {NodeVM} from "@forest/schema";
import React, {useEffect, useState} from "react";
import {
    createToolsetConnection,
    createToolsetToolCall,
    MCPConnection,
    MCPTool,
    parseMCPTools,
    ToolEnabledMap
} from "./mcp/mcpParser";
import * as Y from "yjs";
import {httpUrl} from "@forest/schema/src/config";
import MCPViewer from "./mcp/MCPViewer";
import CollaborativeEditor from "./CodeEditor";
import {json as jsonLang} from "@codemirror/lang-json";
import {
    MCPConnectionCacheText,
    MCPNodeTypeM,
    MCPServerConfigText,
    MCPToolEnabledText,
    MCPToolsetConfig
} from "./MCPNode";

export class MCPNodeTypeVM extends NodeTypeVM {
    static render(node: NodeVM): React.ReactNode {
        const [connection, setConnection] = useState<MCPConnection | null>(MCPNodeTypeM.getCachedConnection(node.nodeM));
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
                setConnection((prevConnection: MCPConnection | null) => ({...prevConnection}));
            };

            const connectionObserver = () => {
                // Connection cache changed, update state
                const newConnection = MCPNodeTypeM.getCachedConnection(node.nodeM);
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
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({toolsetUrl: connection.toolsetUrl, config_hash: connection.configHash})
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
                MCPNodeTypeM.saveServerConfig(node.nodeM, config);

                // Connect to MCP server via Toolset
                const connectPayload = createToolsetConnection(toolsetUrl, mcpConfig);
                const connectResponse = await fetch(`${httpUrl}/api/mcp-proxy/connect`, {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
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
                    headers: {'Content-Type': 'application/json'},
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
                const currentEnabledMap = MCPNodeTypeM.getToolEnabledMap(node.nodeM);
                const newEnabledMap: ToolEnabledMap = {};

                tools.forEach(tool => {
                    // If tool was previously configured, keep its state; otherwise default to enabled
                    newEnabledMap[tool.name] = currentEnabledMap[tool.name] !== undefined ? currentEnabledMap[tool.name] : true;
                });

                MCPNodeTypeM.saveToolEnabledMap(node.nodeM, newEnabledMap);
                MCPNodeTypeM.saveCachedConnection(node.nodeM, newConnection);
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
                MCPNodeTypeM.saveCachedConnection(node.nodeM, failedConnection);
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
                const config = MCPNodeTypeM.getServerConfig(node.nodeM);
                if (config && MCPNodeTypeM.isToolsetConfig(config)) {
                    await fetch(`${httpUrl}/api/mcp-proxy/disconnect`, {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
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
                MCPNodeTypeM.saveCachedConnection(node.nodeM, disconnectedConnection);
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
                const config = MCPNodeTypeM.getServerConfig(node.nodeM);
                if (config && MCPNodeTypeM.isToolsetConfig(config)) {
                    await handleConnect(connection.toolsetUrl, config.mcpConfig);
                }
            }
        };

        const handleExecuteTool = async (toolName: string, params: any) => {
            if (!connection || !connection.connected) {
                throw new Error('Not connected to MCP server via Toolset');
            }

            const config = MCPNodeTypeM.getServerConfig(node.nodeM);
            if (!config || !MCPNodeTypeM.isToolsetConfig(config)) {
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
                    headers: {'Content-Type': 'application/json'},
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
            const currentEnabledMap = MCPNodeTypeM.getToolEnabledMap(node.nodeM);

            // Update the specific tool's enabled state
            const updatedEnabledMap = {
                ...currentEnabledMap,
                [toolName]: enabled
            };

            // Save back to yjs
            MCPNodeTypeM.saveToolEnabledMap(node.nodeM, updatedEnabledMap);

            // Trigger re-render by updating connection object
            setConnection((prevConnection: MCPConnection | null) => ({...prevConnection}));
        };

        const handleGetAllTools = (): MCPTool[] => {
            if (!connection || !connection.tools) return [];

            // Return all tools from connection with enabled state from yjs
            const enabledMap = MCPNodeTypeM.getToolEnabledMap(node.nodeM);
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
            MCPNodeTypeM.saveToolEnabledMap(node.nodeM, newEnabledMap);

            // Trigger re-render
            setConnection((prevConnection: MCPConnection | null) => ({...prevConnection}));
        };

        // Create filtered connection for display with only enabled tools
        const displayConnection = connection ? {
            ...connection,
            tools: MCPNodeTypeM.getEnabledTools(connection, node.nodeM)
        } : null;

        // Get current server config from yjs for MCPViewer
        const currentServerConfig = MCPNodeTypeM.getServerConfig(node.nodeM);

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

    static renderTool1(node: NodeVM): React.ReactNode {
        return (
            <>
                <h1>MCP Server Configuration</h1>
                <CollaborativeEditor yText={node.ydata.get(MCPServerConfigText)} langExtension={jsonLang}/>
            </>
        );
    }

    static renderTool2(node: NodeVM): React.ReactNode {
        return (
            <>
                <h1>Tool Enabled State</h1>
                <CollaborativeEditor yText={node.ydata.get(MCPToolEnabledText)} langExtension={jsonLang}/>
            </>
        );
    }
}