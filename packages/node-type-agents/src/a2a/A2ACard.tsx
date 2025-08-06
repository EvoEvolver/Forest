import React, { useState } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Chip,
    Button,
    Collapse,
    TextField,
    Alert,
    Switch,
    FormControlLabel,
    CircularProgress,
    useTheme
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { A2AAgentSkill } from './a2aParser';

interface A2ACardProps {
    skill: A2AAgentSkill;
    onExecute?: (skillId: string, params: any) => Promise<any>;
    onToggleEnabled?: (skillId: string, enabled: boolean) => void;
}

const A2ACard: React.FC<A2ACardProps> = ({
    skill,
    onExecute,
    onToggleEnabled
}) => {
    const theme = useTheme();
    const [expanded, setExpanded] = useState(false);
    const [executing, setExecuting] = useState(false);
    const [result, setResult] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [userInput, setUserInput] = useState('');

    const handleExecute = async () => {
        if (!onExecute) return;

        setExecuting(true);
        setError(null);
        setResult(null);

        try {
            const response = await onExecute(skill.id, { query: userInput });
            setResult(JSON.stringify(response, null, 2));
        } catch (err: any) {
            setError(err.message || 'Execution failed');
        } finally {
            setExecuting(false);
        }
    };

    const handleToggleEnabled = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (onToggleEnabled) {
            onToggleEnabled(skill.id, event.target.checked);
        }
    };

    return (
        <Card 
            sx={{ 
                mb: 2, 
                opacity: skill.enabled === false ? 0.6 : 1,
                border: skill.enabled === false ? '1px dashed' : '1px solid',
                borderColor: skill.enabled === false ? 'text.disabled' : 'divider'
            }}
        >
            <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box sx={{ flex: 1 }}>
                        <Typography variant="h6" component="h3" sx={{ mb: 1 }}>
                            {skill.name}
                        </Typography>
                        {skill.description && (
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                {skill.description}
                            </Typography>
                        )}
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                            ID: {skill.id}
                        </Typography>
                    </Box>
                    
                    {onToggleEnabled && (
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={skill.enabled !== false}
                                    onChange={handleToggleEnabled}
                                    size="small"
                                />
                            }
                            label="Enabled"
                            sx={{ ml: 2 }}
                        />
                    )}
                </Box>

                {/* Tags */}
                {skill.tags && skill.tags.length > 0 && (
                    <Box sx={{ mb: 2 }}>
                        {skill.tags.map((tag, index) => (
                            <Chip
                                key={index}
                                label={tag}
                                size="small"
                                variant="outlined"
                                sx={{ mr: 1, mb: 1 }}
                            />
                        ))}
                    </Box>
                )}

                {/* Examples */}
                {skill.examples && skill.examples.length > 0 && (
                    <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" sx={{ mb: 1, fontWeight: 'medium' }}>
                            Examples:
                        </Typography>
                        <Box>
                            {skill.examples.map((example, index) => (
                                <Chip
                                    key={index}
                                    label={example}
                                    size="small"
                                    sx={{ mr: 1, mb: 1 }}
                                    onClick={() => setUserInput(example)}
                                    clickable
                                />
                            ))}
                        </Box>
                    </Box>
                )}

                {/* Execute Section */}
                {onExecute && skill.enabled !== false && (
                    <Box>
                        <Button
                            onClick={() => setExpanded(!expanded)}
                            startIcon={expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                            size="small"
                            sx={{ mb: 1 }}
                        >
                            {expanded ? 'Hide' : 'Test'} Skill
                        </Button>

                        <Collapse in={expanded}>
                            <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                                <TextField
                                    fullWidth
                                    label="Input Message"
                                    value={userInput}
                                    onChange={(e) => setUserInput(e.target.value)}
                                    placeholder="Enter your message or query..."
                                    multiline
                                    rows={2}
                                    sx={{ mb: 2 }}
                                    disabled={executing}
                                />

                                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                                    <Button
                                        variant="contained"
                                        onClick={handleExecute}
                                        disabled={executing || !userInput.trim()}
                                        startIcon={executing ? <CircularProgress size={16} /> : <PlayArrowIcon />}
                                        size="small"
                                    >
                                        {executing ? 'Executing...' : 'Execute'}
                                    </Button>
                                </Box>

                                {error && (
                                    <Alert severity="error" sx={{ mb: 2 }}>
                                        {error}
                                    </Alert>
                                )}

                                {result && (
                                    <Box>
                                        <Typography variant="body2" sx={{ mb: 1, fontWeight: 'medium' }}>
                                            Response:
                                        </Typography>
                                        <Box
                                            sx={{
                                                p: 1,
                                                bgcolor: theme.palette.mode === 'dark' ? theme.palette.grey[900] : theme.palette.grey[100],
                                                borderRadius: 1,
                                                fontFamily: 'monospace',
                                                fontSize: '0.875rem',
                                                whiteSpace: 'pre-wrap',
                                                maxHeight: 200,
                                                overflow: 'auto',
                                                color: theme.palette.text.primary
                                            }}
                                        >
                                            {result}
                                        </Box>
                                    </Box>
                                )}
                            </Box>
                        </Collapse>
                    </Box>
                )}
            </CardContent>
        </Card>
    );
};

export default A2ACard;