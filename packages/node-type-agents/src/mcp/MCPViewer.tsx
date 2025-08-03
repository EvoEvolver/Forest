import React from 'react';
import {Alert, Box, CircularProgress, Typography, Button, TextField, Chip, Collapse, FormControlLabel, Checkbox} from '@mui/material';
import {MCPConnection, MCPTool} from './mcpParser';
import MCPCard from './MCPCard';
import RefreshIcon from '@mui/icons-material/Refresh';
import LinkIcon from '@mui/icons-material/Link';
import LinkOffIcon from '@mui/icons-material/LinkOff';

interface MCPViewerProps {
    connection: MCPConnection | null;
    loading: boolean;
    error: string | null;
    onConnect: (serverUrl: string, authHeaders?: Record<string, string>) => void;
    onDisconnect: () => void;
    onRefresh: () => void;
    onExecuteTool?: (toolName: string, params: any) => Promise<any>;
}

const MCPViewer: React.FC<MCPViewerProps> = ({
    connection,
    loading,
    error,
    onConnect,
    onDisconnect,
    onRefresh,
    onExecuteTool
}) => {
    const [serverUrl, setServerUrl] = React.useState(connection?.serverUrl || '');
    const [showAuthFields, setShowAuthFields] = React.useState(false);
    const [authToken, setAuthToken] = React.useState('');

    const handleConnect = () => {
        if (serverUrl.trim()) {
            const isHttpConnection = serverUrl.startsWith('http://') || serverUrl.startsWith('https://');
            const authHeaders = isHttpConnection && authToken ? { 'Authorization': `Bearer ${authToken}` } : undefined;
            onConnect(serverUrl.trim(), authHeaders);
        }
    };

    const handleKeyPress = (event: React.KeyboardEvent) => {
        if (event.key === 'Enter') {
            handleConnect();
        }
    };

    const groupToolsByCategory = (tools: MCPTool[]) => {
        // Simple grouping - you can enhance this based on tool naming conventions
        const grouped: Record<string, MCPTool[]> = { 'Tools': tools };
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
                    />
                ))}
            </Box>
        ));
    };

    return (
        <Box>
            {/* Connection Section */}
            <Box sx={{mb: 3, p: 2, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider'}}>
                <Typography variant="h6" sx={{mb: 2}}>
                    MCP Server Connection
                </Typography>
                
                <Box sx={{display: 'flex', gap: 1, mb: 2}}>
                    <TextField
                        fullWidth
                        size="small"
                        label="MCP Server URL"
                        placeholder="ws://localhost:3001 or https://api.githubcopilot.com/mcp/"
                        value={serverUrl}
                        onChange={(e) => setServerUrl(e.target.value)}
                        onKeyPress={handleKeyPress}
                        disabled={loading}
                    />
                    {connection?.connected ? (
                        <Button
                            variant="outlined"
                            color="error"
                            onClick={onDisconnect}
                            disabled={loading}
                            startIcon={<LinkOffIcon />}
                        >
                            Disconnect
                        </Button>
                    ) : (
                        <Button
                            variant="contained"
                            onClick={handleConnect}
                            disabled={loading || !serverUrl.trim()}
                            startIcon={<LinkIcon />}
                        >
                            Connect
                        </Button>
                    )}
                </Box>

                {/* Authentication Section */}
                <FormControlLabel
                    control={
                        <Checkbox
                            checked={showAuthFields}
                            onChange={(e) => setShowAuthFields(e.target.checked)}
                            size="small"
                        />
                    }
                    label="Use Authentication (for HTTP connections)"
                    sx={{ mb: 1 }}
                />

                <Collapse in={showAuthFields}>
                    <Box sx={{ mb: 2 }}>
                        <TextField
                            fullWidth
                            size="small"
                            label="Bearer Token"
                            type="password"
                            placeholder="Enter your authentication token"
                            value={authToken}
                            onChange={(e) => setAuthToken(e.target.value)}
                            disabled={loading}
                            sx={{ mb: 1 }}
                        />
                        <Typography variant="caption" color="text.secondary">
                            For GitHub MCP server, use your Personal Access Token
                        </Typography>
                    </Box>
                </Collapse>

                {/* Connection Status */}
                {connection && (
                    <Box sx={{display: 'flex', alignItems: 'center', gap: 1, mb: 1}}>
                        <Chip
                            label={connection.connected ? 'Connected' : 'Disconnected'}
                            color={connection.connected ? 'success' : 'default'}
                            size="small"
                        />
                        <Chip
                            label={connection.type === 'http' ? 'HTTP' : 'WebSocket'}
                            variant="outlined"
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
                        startIcon={<RefreshIcon />}
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
                    {connection.tools.length > 0 ? (
                        <>
                            <Typography variant="h5" sx={{mb: 3}}>
                                Available Tools ({connection.tools.length})
                            </Typography>
                            {renderToolsByCategory()}
                        </>
                    ) : (
                        <Alert severity="info">
                            No tools found on this MCP server.
                        </Alert>
                    )}
                </Box>
            )}

            {/* Server Info */}
            {connection?.serverInfo && (
                <Box sx={{mt: 4, p: 2, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider'}}>
                    <Typography variant="h6" sx={{mb: 2}}>
                        Server Information
                    </Typography>
                    <Typography variant="body2">
                        <strong>Name:</strong> {connection.serverInfo.name}
                    </Typography>
                    <Typography variant="body2">
                        <strong>Version:</strong> {connection.serverInfo.version}
                    </Typography>
                    {connection.serverInfo.capabilities && (
                        <Box sx={{mt: 1}}>
                            <Typography variant="body2">
                                <strong>Capabilities:</strong>
                            </Typography>
                            <Box sx={{ml: 2}}>
                                {connection.serverInfo.capabilities.tools && (
                                    <Chip label="Tools" size="small" sx={{mr: 1, mb: 1}} />
                                )}
                                {connection.serverInfo.capabilities.resources && (
                                    <Chip label="Resources" size="small" sx={{mr: 1, mb: 1}} />
                                )}
                                {connection.serverInfo.capabilities.prompts && (
                                    <Chip label="Prompts" size="small" sx={{mr: 1, mb: 1}} />
                                )}
                                {connection.serverInfo.capabilities.logging && (
                                    <Chip label="Logging" size="small" sx={{mr: 1, mb: 1}} />
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
        </Box>
    );
};

export default MCPViewer;