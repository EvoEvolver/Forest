import React, {useState} from 'react';
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Alert,
    Box,
    Button,
    Card,
    Chip,
    CircularProgress,
    Divider,
    TextField,
    Typography,
    Checkbox,
    FormControlLabel
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import BuildIcon from '@mui/icons-material/Build';
import {MCPTool} from './mcpParser';

interface MCPCardProps {
    tool: MCPTool;
    onExecute?: (toolName: string, params: any) => Promise<any>;
    onToggleEnabled?: (toolName: string, enabled: boolean) => void;
}

const MCPCard: React.FC<MCPCardProps> = ({tool, onExecute, onToggleEnabled}) => {
    const [expanded, setExpanded] = useState(false);
    const [parameters, setParameters] = useState<Record<string, any>>({});
    const [loading, setLoading] = useState(false);
    const [response, setResponse] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    const isEnabled = tool.enabled !== false; // Default to enabled if not specified

    const handleToggleEnabled = (checked: boolean) => {
        if (onToggleEnabled) {
            onToggleEnabled(tool.name, checked);
        }
    };

    const handleExecute = async () => {
        if (!onExecute || !isEnabled) return;
        
        setLoading(true);
        setError(null);
        setResponse(null);

        try {
            // Validate required parameters
            const requiredParams = tool.inputSchema.required || [];
            const missingParams = requiredParams.filter(param => !parameters[param] || parameters[param].trim() === '');
            
            if (missingParams.length > 0) {
                throw new Error(`Missing required parameters: ${missingParams.join(', ')}`);
            }

            // Convert string values to appropriate types based on schema
            const processedParams = {};
            if (tool.inputSchema.properties) {
                Object.entries(parameters).forEach(([key, value]) => {
                    const propSchema = tool.inputSchema.properties![key];
                    if (propSchema && value !== '') {
                        // Convert based on schema type
                        switch (propSchema.type) {
                            case 'number':
                            case 'integer':
                                processedParams[key] = Number(value);
                                break;
                            case 'boolean':
                                processedParams[key] = value === 'true' || value === true;
                                break;
                            case 'object':
                            case 'array':
                                try {
                                    processedParams[key] = JSON.parse(value);
                                } catch (e) {
                                    processedParams[key] = value;
                                }
                                break;
                            default:
                                processedParams[key] = value;
                        }
                    }
                });
            }

            const result = await onExecute(tool.name, processedParams);
            setResponse(result);
        } catch (err: any) {
            setError(err.message || 'Failed to execute tool');
        } finally {
            setLoading(false);
        }
    };

    const renderParameterInput = (paramName: string, paramSchema: any) => {
        const isRequired = tool.inputSchema.required?.includes(paramName) || false;
        const paramType = paramSchema.type || 'string';
        
        return (
            <Box key={paramName} sx={{mb: 2}}>
                <Typography variant="subtitle2" sx={{mb: 1}}>
                    {paramName}
                    {isRequired && <span style={{color: 'red'}}> *</span>}
                    <Chip
                        label={paramType}
                        size="small"
                        sx={{ml: 1, fontSize: '0.7rem', height: '20px'}}
                    />
                </Typography>
                
                {paramType === 'boolean' ? (
                    <TextField
                        select
                        fullWidth
                        size="small"
                        value={parameters[paramName] ?? ''}
                        onChange={(e) => setParameters(prev => ({
                            ...prev,
                            [paramName]: e.target.value
                        }))}
                        SelectProps={{
                            native: true,
                        }}
                    >
                        <option value="">Select...</option>
                        <option value="true">true</option>
                        <option value="false">false</option>
                    </TextField>
                ) : paramType === 'object' || paramType === 'array' ? (
                    <TextField
                        fullWidth
                        multiline
                        rows={3}
                        size="small"
                        placeholder={`Enter JSON ${paramType}`}
                        value={parameters[paramName] || ''}
                        onChange={(e) => setParameters(prev => ({
                            ...prev,
                            [paramName]: e.target.value
                        }))}
                    />
                ) : (
                    <TextField
                        fullWidth
                        size="small"
                        type={paramType === 'number' || paramType === 'integer' ? 'number' : 'text'}
                        placeholder={paramSchema.description || `Enter ${paramName}`}
                        value={parameters[paramName] || ''}
                        onChange={(e) => setParameters(prev => ({
                            ...prev,
                            [paramName]: e.target.value
                        }))}
                    />
                )}
                
                {paramSchema.description && (
                    <Typography variant="caption" color="text.secondary" sx={{display: 'block', mt: 0.5}}>
                        {paramSchema.description}
                    </Typography>
                )}
            </Box>
        );
    };

    const hasParameters = tool.inputSchema.properties && Object.keys(tool.inputSchema.properties).length > 0;

    return (
        <Card sx={{
            mb: 2, 
            border: `2px solid ${isEnabled ? '#4caf50' : '#bdbdbd'}`,
            opacity: isEnabled ? 1 : 0.7,
            backgroundColor: isEnabled ? 'inherit' : '#f5f5f5'
        }}>
            <Accordion expanded={expanded} onChange={() => setExpanded(!expanded)}>
                <AccordionSummary expandIcon={<ExpandMoreIcon/>}>
                    <Box sx={{display: 'flex', alignItems: 'center', width: '100%'}}>
                        <Chip
                            icon={<BuildIcon />}
                            label="MCP"
                            sx={{
                                backgroundColor: isEnabled ? '#4caf50' : '#9e9e9e',
                                color: 'white',
                                fontWeight: 'bold',
                                mr: 2,
                                minWidth: '60px'
                            }}
                        />
                        <Typography variant="h6" sx={{
                            flexGrow: 1,
                            color: isEnabled ? 'inherit' : 'text.disabled'
                        }}>
                            {tool.name}
                        </Typography>
                        <Typography variant="body2" color={isEnabled ? 'text.secondary' : 'text.disabled'}>
                            {tool.description || 'No description'}
                        </Typography>
                    </Box>
                </AccordionSummary>

                <AccordionDetails>
                    <Box>
                        {tool.description && (
                            <Typography variant="body2" sx={{mb: 2}}>
                                {tool.description}
                            </Typography>
                        )}

                        {hasParameters && (
                            <Box sx={{mb: 2}}>
                                <Typography variant="h6" sx={{mb: 2}}>Parameters</Typography>
                                {Object.entries(tool.inputSchema.properties || {}).map(([paramName, paramSchema]) =>
                                    renderParameterInput(paramName, paramSchema)
                                )}
                            </Box>
                        )}

                        {!hasParameters && (
                            <Typography variant="body2" color="text.secondary" sx={{mb: 2}}>
                                This tool requires no parameters.
                            </Typography>
                        )}

                        <Box sx={{mb: 2}}>
                            <Button
                                variant="contained"
                                color={isEnabled ? "success" : "inherit"}
                                onClick={handleExecute}
                                disabled={loading || !onExecute || !isEnabled}
                                startIcon={loading ? <CircularProgress size={16}/> : <PlayArrowIcon/>}
                                sx={{
                                    backgroundColor: isEnabled ? undefined : '#e0e0e0',
                                    '&:disabled': {
                                        backgroundColor: isEnabled ? undefined : '#f5f5f5'
                                    }
                                }}
                            >
                                {!isEnabled ? 'Tool Disabled' : loading ? 'Executing...' : 'Execute Tool'}
                            </Button>
                        </Box>

                        {(response || error) && (
                            <Box sx={{mt: 2}}>
                                <Divider sx={{mb: 2}}/>
                                <Typography variant="h6" sx={{mb: 2}}>Response</Typography>

                                {error && (
                                    <Alert severity="error" sx={{mb: 2}}>
                                        {error}
                                    </Alert>
                                )}

                                {response && (
                                    <Box sx={{p: 2, backgroundColor: '#f5f5f5', borderRadius: 1}}>
                                        <pre style={{margin: 0, fontSize: '0.8rem', overflow: 'auto', whiteSpace: 'pre-wrap'}}>
                                            {typeof response === 'string' ? response : JSON.stringify(response, null, 2)}
                                        </pre>
                                    </Box>
                                )}
                            </Box>
                        )}

                        {tool.inputSchema && (
                            <Box sx={{mt: 2}}>
                                <Typography variant="h6" sx={{mb: 1}}>Schema</Typography>
                                <Box sx={{p: 2, backgroundColor: '#f8f9fa', borderRadius: 1}}>
                                    <pre style={{margin: 0, fontSize: '0.7rem', overflow: 'auto'}}>
                                        {JSON.stringify(tool.inputSchema, null, 2)}
                                    </pre>
                                </Box>
                            </Box>
                        )}
                    </Box>
                </AccordionDetails>
            </Accordion>
        </Card>
    );
};

export default MCPCard;