import React from 'react';
import {
    Alert,
    Box,
    CircularProgress,
    Typography,
    Button,
    TextField,
    Chip,
    FormControlLabel,
    Switch,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    List,
    ListItem,
    ListItemText
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import LinkIcon from '@mui/icons-material/Link';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import { A2AConnection, A2AAgentSkill, getActiveAgentCard } from './a2aParser';
import A2ACard from './A2ACard';

interface A2AViewerProps {
    connection: A2AConnection | null;
    loading: boolean;
    error: string | null;
    onConnect: (agentUrl: string, authToken?: string) => void;
    onDisconnect: () => void;
    onRefresh: () => void;
    onExecuteSkill?: (skillId: string, params: any, authToken?: string) => Promise<any>;
    onToggleSkillEnabled?: (skillId: string, enabled: boolean) => void;
    onGetAllSkills?: () => A2AAgentSkill[];
    onBulkToggleSkills?: (enabled: boolean) => void;
}

const A2AViewer: React.FC<A2AViewerProps> = ({
    connection,
    loading,
    error,
    onConnect,
    onDisconnect,
    onRefresh,
    onExecuteSkill,
    onToggleSkillEnabled,
    onGetAllSkills,
    onBulkToggleSkills
}) => {
    const [agentUrl, setAgentUrl] = React.useState(connection?.agentUrl || 'http://localhost:9999');
    const [authToken, setAuthToken] = React.useState(connection?.authToken || '');
    const [showSkillManagement, setShowSkillManagement] = React.useState(false);
    const [urlError, setUrlError] = React.useState<string | null>(null);

    const activeCard = connection ? getActiveAgentCard(connection) : null;
    const skills = activeCard?.skills || [];

    const handleConnect = () => {
        setUrlError(null);
        
        if (!agentUrl.trim()) {
            setUrlError('Agent URL is required');
            return;
        }

        // Basic URL validation
        try {
            new URL(agentUrl.trim());
        } catch (e) {
            setUrlError('Please enter a valid URL (e.g., http://localhost:9999)');
            return;
        }
        
        onConnect(agentUrl.trim(), authToken.trim() || undefined);
    };

    const handleKeyPress = (event: React.KeyboardEvent) => {
        if (event.key === 'Enter') {
            handleConnect();
        }
    };

    const handleEnableAll = () => {
        if (onBulkToggleSkills) {
            onBulkToggleSkills(true);
        } else if (onToggleSkillEnabled && onGetAllSkills) {
            const allSkills = onGetAllSkills();
            allSkills.forEach(skill => {
                onToggleSkillEnabled(skill.id, true);
            });
        }
    };

    const handleDisableAll = () => {
        if (onBulkToggleSkills) {
            onBulkToggleSkills(false);
        } else if (onToggleSkillEnabled && onGetAllSkills) {
            const allSkills = onGetAllSkills();
            allSkills.forEach(skill => {
                onToggleSkillEnabled(skill.id, false);
            });
        }
    };

    const getEnabledSkillsCount = () => {
        return skills.filter(skill => skill.enabled !== false).length;
    };

    const getTotalSkillsCount = () => {
        if (onGetAllSkills) {
            return onGetAllSkills().length;
        }
        return skills.length;
    };

    const groupSkillsByCategory = (skills: A2AAgentSkill[]) => {
        // Simple grouping - you can enhance this based on skill tags or other criteria
        const grouped: Record<string, A2AAgentSkill[]> = { 'Skills': skills };
        return grouped;
    };

    const renderSkillsByCategory = () => {
        if (!skills.length) return null;

        const groupedSkills = groupSkillsByCategory(skills);

        return Object.entries(groupedSkills).map(([category, categorySkills]) => (
            <Box key={category} sx={{ mb: 4 }}>
                <Typography variant="h6" sx={{ mb: 2, color: 'text.secondary' }}>
                    {category} ({categorySkills.length})
                </Typography>
                {categorySkills.map(skill => (
                    <A2ACard
                        key={skill.id}
                        skill={skill}
                        onExecute={onExecuteSkill}
                        onToggleEnabled={onToggleSkillEnabled}
                    />
                ))}
            </Box>
        ));
    };

    return (
        <Box>
            {/* Connection Section */}
            <Box sx={{ mb: 3, p: 2, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                <Typography variant="h6" sx={{ mb: 2 }}>
                    A2A Agent Connection
                </Typography>
                
                {/* Agent URL Field */}
                <Box sx={{ mb: 2 }}>
                    <TextField
                        fullWidth
                        size="small"
                        label="Agent URL"
                        placeholder="http://localhost:9999"
                        value={agentUrl}
                        onChange={(e) => {
                            setAgentUrl(e.target.value);
                            setUrlError(null);
                        }}
                        onKeyPress={handleKeyPress}
                        disabled={loading}
                        error={!!urlError}
                        helperText={urlError || "URL of the A2A protocol agent"}
                    />
                </Box>
                
                {/* Auth Token Field */}
                <Box sx={{ mb: 2 }}>
                    <TextField
                        fullWidth
                        size="small"
                        label="Auth Token (Optional)"
                        placeholder="Bearer token for extended agent card"
                        value={authToken}
                        onChange={(e) => setAuthToken(e.target.value)}
                        onKeyPress={handleKeyPress}
                        disabled={loading}
                        type="password"
                        helperText="Optional authentication token for accessing extended agent capabilities"
                    />
                </Box>
                
                {/* Connect/Disconnect Button */}
                <Box sx={{ display: 'flex', gap: 1 }}>
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
                            disabled={loading || !agentUrl.trim()}
                            startIcon={<LinkIcon />}
                        >
                            Connect
                        </Button>
                    )}
                </Box>

                {/* Connection Status */}
                {connection && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2, flexWrap: 'wrap' }}>
                        <Chip
                            label={connection.connected ? 'Connected' : 'Disconnected'}
                            color={connection.connected ? 'success' : 'default'}
                            size="small"
                        />
                        {connection.connected && (
                            <Chip
                                label={connection.supportsStreaming !== false ? 'Streaming' : 'Non-streaming'}
                                color={connection.supportsStreaming !== false ? 'primary' : 'warning'}
                                size="small"
                                variant="outlined"
                            />
                        )}
                        {activeCard && (
                            <Typography variant="caption" color="text.secondary">
                                {activeCard.name} {activeCard.version ? `v${activeCard.version}` : ''}
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
                        sx={{ mt: 1 }}
                    >
                        Refresh Agent Card
                    </Button>
                )}
            </Box>

            {/* Loading State */}
            {loading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
                    <CircularProgress />
                    <Typography variant="body1" sx={{ ml: 2 }}>
                        {connection?.connected ? 'Loading agent skills...' : 'Connecting to A2A agent...'}
                    </Typography>
                </Box>
            )}

            {/* Error State */}
            {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    {error}
                </Alert>
            )}

            {/* Skills Display */}
            {connection?.connected && !loading && (
                <Box>
                    {getTotalSkillsCount() > 0 ? (
                        <>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                                <Typography variant="h5">
                                    Available Skills ({getEnabledSkillsCount()}/{getTotalSkillsCount()} enabled)
                                </Typography>
                                <Box sx={{ display: 'flex', gap: 1 }}>
                                    <Button
                                        size="small"
                                        variant="outlined"
                                        onClick={() => setShowSkillManagement(true)}
                                        disabled={!onToggleSkillEnabled || !onGetAllSkills}
                                    >
                                        Manage Skills
                                    </Button>
                                </Box>
                            </Box>
                            {skills.length > 0 ? (
                                renderSkillsByCategory()
                            ) : (
                                <Alert severity="info" sx={{ mb: 2 }}>
                                    All skills are currently disabled. Use "Manage Skills" to enable some skills.
                                </Alert>
                            )}
                        </>
                    ) : (
                        <Alert severity="info">
                            No skills found on this A2A agent.
                        </Alert>
                    )}
                </Box>
            )}

            {/* Agent Information */}
            {activeCard && (
                <Box sx={{ mt: 4, p: 2, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="h6" sx={{ mb: 2 }}>
                        Agent Information
                    </Typography>
                    <Typography variant="body2">
                        <strong>Name:</strong> {activeCard.name}
                    </Typography>
                    {activeCard.description && (
                        <Typography variant="body2">
                            <strong>Description:</strong> {activeCard.description}
                        </Typography>
                    )}
                    <Typography variant="body2">
                        <strong>URL:</strong> {activeCard.url}
                    </Typography>
                    {activeCard.version && (
                        <Typography variant="body2">
                            <strong>Version:</strong> {activeCard.version}
                        </Typography>
                    )}
                    {activeCard.protocolVersion && (
                        <Typography variant="body2">
                            <strong>Protocol Version:</strong> {activeCard.protocolVersion}
                        </Typography>
                    )}
                    {activeCard.capabilities && (
                        <Box sx={{ mt: 1 }}>
                            <Typography variant="body2">
                                <strong>Capabilities:</strong>
                            </Typography>
                            <Box sx={{ ml: 2 }}>
                                {activeCard.capabilities.streaming && (
                                    <Chip label="Streaming" size="small" sx={{ mr: 1, mb: 1 }} />
                                )}
                                {activeCard.supportsAuthenticatedExtendedCard && (
                                    <Chip label="Extended Card" size="small" sx={{ mr: 1, mb: 1 }} />
                                )}
                            </Box>
                        </Box>
                    )}
                </Box>
            )}

            {/* Empty State for no connection */}
            {!connection && !loading && (
                <Alert severity="info">
                    Enter an A2A agent URL above to connect and view available skills.
                </Alert>
            )}

            {/* Skill Management Dialog */}
            <Dialog
                open={showSkillManagement}
                onClose={() => setShowSkillManagement(false)}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>Manage A2A Agent Skills</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Enable or disable skills to control which ones are available to the AI model.
                        Disabled skills are completely hidden from the model.
                    </Typography>
                    <List>
                        {onGetAllSkills && onGetAllSkills().map((skill) => (
                            <ListItem key={skill.id} sx={{ px: 0 }}>
                                <ListItemText
                                    primary={skill.name}
                                    secondary={skill.description || 'No description'}
                                />
                                <Switch
                                    checked={skill.enabled !== false}
                                    onChange={(e) => onToggleSkillEnabled && onToggleSkillEnabled(skill.id, e.target.checked)}
                                />
                            </ListItem>
                        ))}
                    </List>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleDisableAll}>Disable All</Button>
                    <Button onClick={handleEnableAll}>Enable All</Button>
                    <Button onClick={() => setShowSkillManagement(false)} variant="contained">
                        Done
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default A2AViewer;