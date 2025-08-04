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
    useTheme
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import {ApiEndpoint} from './apiParser';
import axios from 'axios';

interface EndpointCardProps {
    endpoint: ApiEndpoint;
    baseUrl?: string;
}

const getMethodColor = (method: string, theme: any) => {
    const colors = {
        GET: theme.palette.info.main,
        POST: theme.palette.success.main,
        PUT: theme.palette.warning?.main || '#fca130',
        DELETE: theme.palette.error?.main || '#f93e3e',
        PATCH: theme.palette.secondary.main,
        OPTIONS: theme.palette.primary.main,
        HEAD: theme.palette.primary.light
    };
    return colors[method as keyof typeof colors] || theme.palette.grey[500];
};

const EndpointCard: React.FC<EndpointCardProps> = ({endpoint, baseUrl = ''}) => {
    const theme = useTheme();
    const [expanded, setExpanded] = useState(true);
    const [tryItMode, setTryItMode] = useState(true);
    const [parameters, setParameters] = useState<Record<string, any>>({});
    const [requestBody, setRequestBody] = useState('');
    const [loading, setLoading] = useState(false);
    const [response, setResponse] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    const handleTryIt = () => {
        setTryItMode(!tryItMode);
        setResponse(null);
        setError(null);
    };

    const handleExecute = async () => {
        setLoading(true);
        setError(null);
        setResponse(null);

        try {
            let url = `${baseUrl}${endpoint.path}`;

            // Replace path parameters
            if (endpoint.parameters) {
                endpoint.parameters.forEach(param => {
                    if (param.in === 'path' && parameters[param.name]) {
                        url = url.replace(`{${param.name}}`, parameters[param.name]);
                    }
                });
            }

            // Add query parameters
            const queryParams = new URLSearchParams();
            if (endpoint.parameters) {
                endpoint.parameters.forEach(param => {
                    if (param.in === 'query' && parameters[param.name]) {
                        queryParams.append(param.name, parameters[param.name]);
                    }
                });
            }

            if (queryParams.toString()) {
                url += `?${queryParams.toString()}`;
            }

            const config: any = {
                method: endpoint.method.toLowerCase(),
                url,
                headers: {}
            };

            // Add headers
            if (endpoint.parameters) {
                endpoint.parameters.forEach(param => {
                    if (param.in === 'header' && parameters[param.name]) {
                        config.headers[param.name] = parameters[param.name];
                    }
                });
            }

            // Add request body for POST/PUT/PATCH
            if (['POST', 'PUT', 'PATCH'].includes(endpoint.method) && requestBody) {
                try {
                    config.data = JSON.parse(requestBody);
                    config.headers['Content-Type'] = 'application/json';
                } catch (e) {
                    config.data = requestBody;
                }
            }

            const result = await axios(config);
            setResponse({
                status: result.status,
                statusText: result.statusText,
                data: result.data,
                headers: result.headers
            });
        } catch (err: any) {
            setError(err.response ? `${err.response.status}: ${err.response.statusText}` : err.message);
            if (err.response) {
                setResponse({
                    status: err.response.status,
                    statusText: err.response.statusText,
                    data: err.response.data,
                    headers: err.response.headers
                });
            }
        } finally {
            setLoading(false);
        }
    };

    const renderParameterInput = (param: any) => {
        return (
            <Box key={param.name} sx={{mb: 2}}>
                <Typography variant="subtitle2" sx={{mb: 1}}>
                    {param.name}
                    {param.required && <span style={{color: theme.palette.error.main}}> *</span>}
                    <Chip
                        label={param.in}
                        size="small"
                        sx={{ml: 1, fontSize: '0.7rem', height: '20px'}}
                    />
                </Typography>
                <TextField
                    fullWidth
                    size="small"
                    placeholder={param.description || `Enter ${param.name}`}
                    value={parameters[param.name] || ''}
                    onChange={(e) => setParameters(prev => ({
                        ...prev,
                        [param.name]: e.target.value
                    }))}
                />
                {param.description && (
                    <Typography variant="caption" color="text.secondary">
                        {param.description}
                    </Typography>
                )}
            </Box>
        );
    };

    return (
        <Card sx={{mb: 2, border: `2px solid ${getMethodColor(endpoint.method, theme)}`}}>
            <Accordion expanded={expanded} onChange={() => setExpanded(!expanded)}>
                <AccordionSummary expandIcon={<ExpandMoreIcon/>}>
                    <Box sx={{display: 'flex', alignItems: 'center', width: '100%'}}>
                        <Chip
                            label={endpoint.method}
                            sx={{
                                backgroundColor: getMethodColor(endpoint.method, theme),
                                color: 'white',
                                fontWeight: 'bold',
                                mr: 2,
                                minWidth: '60px'
                            }}
                        />
                        <Typography variant="h6" sx={{flexGrow: 1}}>
                            {endpoint.path}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {endpoint.summary}
                        </Typography>
                    </Box>
                </AccordionSummary>

                <AccordionDetails>
                    <Box>
                        {endpoint.description && (
                            <Typography variant="body2" sx={{mb: 2}}>
                                {endpoint.description}
                            </Typography>
                        )}

                        {endpoint.tags && endpoint.tags.length > 0 && (
                            <Box sx={{mb: 2}}>
                                {endpoint.tags.map(tag => (
                                    <Chip key={tag} label={tag} size="small" sx={{mr: 1}}/>
                                ))}
                            </Box>
                        )}

                        {(
                            <Box sx={{mb: 2}}>
                                {endpoint.parameters && <Typography variant="h6" sx={{mb: 2}}>Parameters</Typography>}

                                {endpoint.parameters && endpoint.parameters.length > 0 && (
                                    endpoint.parameters.map(renderParameterInput)
                                )}

                                {['POST', 'PUT', 'PATCH'].includes(endpoint.method) && endpoint.requestBody && (
                                    <Box sx={{mt: 2}}>
                                        <Typography variant="subtitle2" sx={{mb: 1}}>Request Body</Typography>
                                        <TextField
                                            fullWidth
                                            multiline
                                            rows={4}
                                            placeholder={
                                                endpoint.requestBody?.content?.['application/json']?.schema
                                                    ? generatePromptFromSchema(endpoint.requestBody.content['application/json'].schema)
                                                    : 'Enter JSON request body'
                                            }
                                            value={requestBody}
                                            onChange={(e) => setRequestBody(e.target.value)}
                                            sx={{
                                                '& .MuiOutlinedInput-root': {
                                                    backgroundColor: theme.palette.mode === 'dark' ? theme.palette.grey[800] : theme.palette.grey[50],
                                                },
                                            }}
                                        />
                                    </Box>
                                )}

                                <Box sx={{mt: 2}}>
                                    <Button
                                        variant="contained"
                                        color="primary"
                                        onClick={handleExecute}
                                        disabled={loading}
                                        startIcon={loading ? <CircularProgress size={16}/> : <PlayArrowIcon/>}
                                    >
                                        {loading ? 'Executing...' : 'Execute'}
                                    </Button>
                                </Box>
                            </Box>
                        )}

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
                                    <Box>
                                        <Typography variant="subtitle2">
                                            Status: {response.status} {response.statusText}
                                        </Typography>
                                        <Box sx={{
                                            mt: 1,
                                            p: 2,
                                            backgroundColor: theme.palette.mode === 'dark' ? theme.palette.grey[900] : theme.palette.grey[100],
                                            borderRadius: 1
                                        }}>
                                            <pre style={{
                                                margin: 0,
                                                fontSize: '0.8rem',
                                                overflow: 'auto',
                                                color: theme.palette.text.primary
                                            }}>
                        {JSON.stringify(response.data, null, 2)}
                      </pre>
                                        </Box>
                                    </Box>
                                )}
                            </Box>
                        )}

                        <Box sx={{mt: 2}}>
                            <Typography variant="h6" sx={{mb: 1}}>Response Schema</Typography>
                            {endpoint.responses && endpoint.responses['200'] && (
                                <Box sx={{mb: 1}}>
                                    <Typography variant="subtitle2">
                                        {endpoint.responses['200']?.description ?? 'No description available'}
                                    </Typography>
                                </Box>
                            )}
                            {endpoint.responses && endpoint.responses['200']?.content?.['application/json']?.schema && (
                                <Box sx={{
                                    mt: 1,
                                    p: 2,
                                    backgroundColor: theme.palette.mode === 'dark' ? theme.palette.grey[900] : theme.palette.grey[100],
                                    borderRadius: 1
                                }}>
                                    <pre style={{
                                        margin: 0,
                                        fontSize: '0.8rem',
                                        overflow: 'auto',
                                        color: theme.palette.text.primary
                                    }}>
                                        {JSON.stringify(endpoint.responses['200'].content['application/json'].schema, null, 2)}
                                    </pre>
                                </Box>
                            )}
                        </Box>
                    </Box>
                </AccordionDetails>
            </Accordion>
        </Card>
    );
};
type SchemaObject = any;

function generatePromptFromSchema(schema: SchemaObject): string {
    if (schema.type === 'object' && schema.properties) {
        return Object.entries(schema.properties)
            .map(([key, prop]: [string, any]) => {
                const type = prop.type || 'any';
                const desc = prop.description || '';
                return `"${key}" (${type}): ${desc}`;
            })
            .join('\n');
    }
    if (schema.type === 'array' && schema.items) {
        return `[${generatePromptFromSchema(schema.items)}]`;
    }
    const type = schema.type || 'any';
    const desc = schema.description || '';
    return `(${type}): ${desc}`;
}

export default EndpointCard;
