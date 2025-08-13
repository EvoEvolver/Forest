import React from 'react';
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    List,
    ListItem,
    ListItemText,
    Switch,
    TextField,
    Typography
} from '@mui/material';
import {MCPConnection, MCPTool} from './mcpParser';
import MCPCard from './MCPCard';
import RefreshIcon from '@mui/icons-material/Refresh';
import LinkIcon from '@mui/icons-material/Link';
import LinkOffIcon from '@mui/icons-material/LinkOff';

interface MCPViewerProps {
    connection: MCPConnection | null;
    currentServerConfig: any; // Current server config from yjs
    loading: boolean;
    error: string | null;
    onConnect: (toolsetUrl: string, mcpConfig: any) => void;  // Updated signature
    onDisconnect: () => void;
    onRefresh: () => void;
    onExecuteTool?: (toolName: string, params: any) => Promise<any>;
    onToggleToolEnabled?: (toolName: string, enabled: boolean) => void;
    onGetAllTools?: () => MCPTool[]; // Get all tools including disabled ones for management
    onBulkToggleTools?: (enabled: boolean) => void; // Bulk enable/disable all tools
}

const MCPViewer: React.FC<MCPViewerProps> = ({
                                                 connection,
                                                 currentServerConfig,
                                                 loading,
                                                 error,
                                                 onConnect,
                                                 onDisconnect,
                                                 onRefresh,
                                                 onExecuteTool,
                                                 onToggleToolEnabled,
                                                 onGetAllTools,
                                                 onBulkToggleTools
                                             }) => {
    const [toolsetUrl, setToolsetUrl] = React.useState(
        connection?.toolsetUrl ||
        (currentServerConfig?.toolsetUrl) ||
        'http://127.0.0.1:8001'
    );
    const [mcpConfigJson, setMcpConfigJson] = React.useState(() => {
        // Get mcpConfig from currentServerConfig (yjs) rather than connection
        if (currentServerConfig?.mcpConfig) {
            return JSON.stringify(currentServerConfig.mcpConfig, null, 2);
        }
        return JSON.stringify({
            servers: {
                example: {
                    type: 'http',
                    url: 'https://api.github.com/mcp',
                    headers: {
                        Authorization: 'Bearer YOUR_TOKEN_HERE'
                    }
                }
            }
        }, null, 2);
    });
    const [showToolManagement, setShowToolManagement] = React.useState(false);
    const [configError, setConfigError] = React.useState<string | null>(null);

    // Update UI when currentServerConfig changes (from yjs)
    React.useEffect(() => {
        if (currentServerConfig?.toolsetUrl) {
            setToolsetUrl(currentServerConfig.toolsetUrl);
        }
        if (currentServerConfig?.mcpConfig) {
            setMcpConfigJson(JSON.stringify(currentServerConfig.mcpConfig, null, 2));
        }
    }, [currentServerConfig]);

    const handleEnableAll = () => {
        if (onBulkToggleTools) {
            onBulkToggleTools(true);
        } else if (onToggleToolEnabled && onGetAllTools) {
            // Fallback to individual calls if bulk function not available
            const allTools = onGetAllTools();
            allTools.forEach(tool => {
                onToggleToolEnabled(tool.name, true);
            });
        }
    };

    const handleDisableAll = () => {
        if (onBulkToggleTools) {
            onBulkToggleTools(false);
        } else if (onToggleToolEnabled && onGetAllTools) {
            // Fallback to individual calls if bulk function not available
            const allTools = onGetAllTools();
            allTools.forEach(tool => {
                onToggleToolEnabled(tool.name, false);
            });
        }
    };

    const getEnabledToolsCount = () => {
        if (!connection?.tools) return 0;
        return connection.tools.length; // connection.tools now only contains enabled tools
    };

    const getTotalToolsCount = () => {
        if (!onGetAllTools) return 0;
        return onGetAllTools().length;
    };

    const handleConnect = () => {
        setConfigError(null);

        if (!toolsetUrl.trim()) {
            setConfigError('Toolset URL is required');
            return;
        }

        let mcpConfig;
        try {
            mcpConfig = JSON.parse(mcpConfigJson);
        } catch (e) {
            setConfigError('Invalid JSON in MCP Configuration');
            return;
        }

        // Basic validation
        if (!mcpConfig.servers || typeof mcpConfig.servers !== 'object') {
            setConfigError('MCP Configuration must have a "servers" object');
            return;
        }

        const serverNames = Object.keys(mcpConfig.servers);
        if (serverNames.length === 0) {
            setConfigError('MCP Configuration must have at least one server');
            return;
        }

        onConnect(toolsetUrl.trim(), mcpConfig);
    };

    const handleKeyPress = (event: React.KeyboardEvent) => {
        if (event.key === 'Enter') {
            handleConnect();
        }
    };

    const groupToolsByCategory = (tools: MCPTool[]) => {
        // Simple grouping - you can enhance this based on tool naming conventions
        const grouped: Record<string, MCPTool[]> = {'Tools': tools};
        return grouped;
    };

    const renderToolsByCategory = () => {
        if (!connection || !connection.tools) return null;

        const groupedTools = groupToolsByCategory(connection.tools);

        return Object.entries(groupedTools).map(([category, tools]) => (
            <Box key={category} sx={{mb: 4}}>
                <Typography variant="h6" sx={{mb: 2, color: 'text.secondary'}}>
                    {category} ({tools.length})
                </Typography>
                {tools.map(tool => (
                    <MCPCard
                        key={tool.name}
                        tool={tool}
                        onExecute={onExecuteTool}
                        onToggleEnabled={onToggleToolEnabled}
                    />
                ))}
            </Box>
        ));
    };

    return (
        <Box>
            {/* Connection Section */}
            <Box sx={{
                mb: 3,
                p: 2,
                bgcolor: 'background.paper',
                borderRadius: 1,
                border: '1px solid',
                borderColor: 'divider'
            }}>
                <Typography variant="h6" sx={{mb: 2}}>
                    MCP Toolset Connection
                </Typography>

                {/* Toolset URL Field */}
                <Box sx={{mb: 2}}>
                    <TextField
                        fullWidth
                        size="small"
                        label="Toolset Backend URL"
                        placeholder="http://127.0.0.1:8001"
                        value={toolsetUrl}
                        onChange={(e) => setToolsetUrl(e.target.value)}
                        disabled={loading}
                        helperText="URL of the Python Toolset backend service"
                    />
                </Box>

                {/* MCP Configuration JSON */}
                <Box sx={{mb: 2}}>
                    <Typography variant="subtitle2" sx={{mb: 1}}>
                        MCP Configuration (JSON)
                    </Typography>
                    <TextField
                        fullWidth
                        multiline
                        rows={8}
                        value={mcpConfigJson}
                        onChange={(e) => {
                            setMcpConfigJson(e.target.value);
                            setConfigError(null);
                        }}
                        disabled={loading}
                        error={!!configError}
                        helperText={configError || "Configure MCP servers, authentication, and settings in JSON format"}
                        sx={{
                            '& .MuiInputBase-input': {
                                fontFamily: 'monospace',
                                fontSize: '0.875rem'
                            }
                        }}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{mt: 1, display: 'block'}}>
                        Example: Supports both HTTP servers (with headers) and stdio servers (NPM packages)
                    </Typography>
                </Box>

                {/* Connect/Disconnect Button */}
                <Box sx={{display: 'flex', gap: 1}}>
                    {connection?.connected ? (
                        <Button
                            variant="outlined"
                            color="error"
                            onClick={onDisconnect}
                            disabled={loading}
                            startIcon={<LinkOffIcon/>}
                        >
                            Disconnect
                        </Button>
                    ) : (
                        <Button
                            variant="contained"
                            onClick={handleConnect}
                            disabled={loading || !toolsetUrl.trim()}
                            startIcon={<LinkIcon/>}
                        >
                            Connect
                        </Button>
                    )}
                </Box>


                {/* Connection Status */}
                {connection && (
                    <Box sx={{display: 'flex', alignItems: 'center', gap: 1, mb: 1}}>
                        <Chip
                            label={connection.connected ? 'Connected' : 'Disconnected'}
                            color={connection.connected ? 'success' : 'default'}
                            size="small"
                        />
                        {connection.serverInfo && (
                            <Typography variant="caption" color="text.secondary">
                                {connection.serverInfo.name} v{connection.serverInfo.version}
                            </Typography>
                        )}
                        {connection.lastFetched && (
                            <Typography variant="caption" color="text.secondary">
                                Last updated: {connection.lastFetched.toLocaleTimeString()}
                            </Typography>
                        )}
                    </Box>
                )}

                {/* Refresh Button */}
                {connection?.connected && (
                    <Button
                        size="small"
                        onClick={onRefresh}
                        disabled={loading}
                        startIcon={<RefreshIcon/>}
                    >
                        Refresh Tools
                    </Button>
                )}
            </Box>

            {/* Loading State */}
            {loading && (
                <Box sx={{display: 'flex', justifyContent: 'center', my: 4}}>
                    <CircularProgress/>
                    <Typography variant="body1" sx={{ml: 2}}>
                        {connection?.connected ? 'Loading tools...' : 'Connecting to MCP server...'}
                    </Typography>
                </Box>
            )}

            {/* Error State */}
            {error && (
                <Alert severity="error" sx={{mb: 3}}>
                    {error}
                </Alert>
            )}

            {/* Tools Display */}
            {connection?.connected && !loading && (
                <Box>
                    {getTotalToolsCount() > 0 ? (
                        <>
                            <Box sx={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3}}>
                                <Typography variant="h5">
                                    Available Tools ({getEnabledToolsCount()}/{getTotalToolsCount()} enabled)
                                </Typography>
                                <Box sx={{display: 'flex', gap: 1}}>
                                    <Button
                                        size="small"
                                        variant="outlined"
                                        onClick={() => setShowToolManagement(true)}
                                        disabled={!onToggleToolEnabled || !onGetAllTools}
                                    >
                                        Manage Tools
                                    </Button>
                                </Box>
                            </Box>
                            {connection.tools.length > 0 ? (
                                renderToolsByCategory()
                            ) : (
                                <Alert severity="info" sx={{mb: 2}}>
                                    All tools are currently disabled. Use "Manage Tools" to enable some tools.
                                </Alert>
                            )}
                        </>
                    ) : (
                        <Alert severity="info">
                            No tools found on this MCP server.
                        </Alert>
                    )}
                </Box>
            )}

            {/* Connection Info */}
            {connection && (
                <Box sx={{
                    mt: 4,
                    p: 2,
                    bgcolor: 'background.paper',
                    borderRadius: 1,
                    border: '1px solid',
                    borderColor: 'divider'
                }}>
                    <Typography variant="h6" sx={{mb: 2}}>
                        Connection Information
                    </Typography>
                    <Typography variant="body2">
                        <strong>Toolset URL:</strong> {connection.toolsetUrl}
                    </Typography>
                    <Typography variant="body2">
                        <strong>Config Hash:</strong> {connection.configHash || 'Not set'}
                    </Typography>
                    {connection.serverInfo && (
                        <>
                            <Typography variant="body2">
                                <strong>Server Name:</strong> {connection.serverInfo.name}
                            </Typography>
                            <Typography variant="body2">
                                <strong>Server Version:</strong> {connection.serverInfo.version}
                            </Typography>
                        </>
                    )}
                    {currentServerConfig?.mcpConfig && (
                        <Box sx={{mt: 1}}>
                            <Typography variant="body2">
                                <strong>Configured Servers:</strong>
                            </Typography>
                            <Box sx={{ml: 2}}>
                                {Object.entries(currentServerConfig.mcpConfig.servers || {}).map(([name, config]: [string, any]) => (
                                    <Chip
                                        key={name}
                                        label={`${name} (${config?.type || 'unknown'})`}
                                        size="small"
                                        sx={{mr: 1, mb: 1}}
                                    />
                                ))}
                            </Box>
                        </Box>
                    )}
                    {connection.serverInfo?.capabilities && (
                        <Box sx={{mt: 1}}>
                            <Typography variant="body2">
                                <strong>Capabilities:</strong>
                            </Typography>
                            <Box sx={{ml: 2}}>
                                {connection.serverInfo?.capabilities?.tools && (
                                    <Chip label="Tools" size="small" sx={{mr: 1, mb: 1}}/>
                                )}
                                {connection.serverInfo?.capabilities?.resources && (
                                    <Chip label="Resources" size="small" sx={{mr: 1, mb: 1}}/>
                                )}
                                {connection.serverInfo?.capabilities?.prompts && (
                                    <Chip label="Prompts" size="small" sx={{mr: 1, mb: 1}}/>
                                )}
                                {connection.serverInfo?.capabilities?.logging && (
                                    <Chip label="Logging" size="small" sx={{mr: 1, mb: 1}}/>
                                )}
                            </Box>
                        </Box>
                    )}
                </Box>
            )}

            {/* Empty State for no connection */}
            {!connection && !loading && (
                <Alert severity="info">
                    Enter an MCP server URL above to connect and view available tools.
                </Alert>
            )}

            {/* Tool Management Dialog */}
            <Dialog
                open={showToolManagement}
                onClose={() => setShowToolManagement(false)}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>Manage MCP Tools</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary" sx={{mb: 2}}>
                        Enable or disable tools to control which ones are available to the AI model.
                        Disabled tools are completely hidden from the model.
                    </Typography>
                    <List>
                        {onGetAllTools && onGetAllTools().map((tool) => (
                            <ListItem key={tool.name} sx={{px: 0}}>
                                <ListItemText
                                    primary={tool.name}
                                    secondary={tool.description || 'No description'}
                                />
                                <Switch
                                    checked={tool.enabled !== false}
                                    onChange={(e) => onToggleToolEnabled && onToggleToolEnabled(tool.name, e.target.checked)}
                                />
                            </ListItem>
                        ))}
                    </List>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleDisableAll}>Disable All</Button>
                    <Button onClick={handleEnableAll}>Enable All</Button>
                    <Button onClick={() => setShowToolManagement(false)} variant="contained">
                        Done
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default MCPViewer;