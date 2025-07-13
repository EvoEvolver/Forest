import React, {useEffect, useState} from 'react';
import {Alert, Box, Card, CardContent, Chip, CircularProgress, Typography} from '@mui/material';
import {ApiEndpoint, ApiSpec, parseApiSpec} from './apiParser';
import EndpointCard from './EndpointCard';

interface CardViewerProps {
    yaml?: string;
    title?: string;
}

const CardViewer: React.FC<CardViewerProps> = ({yaml}) => {
    const [apiSpec, setApiSpec] = useState<ApiSpec | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadApiSpec = async (yamlContent: string) => {
        setLoading(true);
        setError(null);

        try {
            const spec = await parseApiSpec(yamlContent);
            setApiSpec(spec);
        } catch (err: any) {
            setError(`Failed to parse API specification: ${err.message}`);
            setApiSpec(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (yaml) {
            loadApiSpec(yaml);
        } else {
            setApiSpec(null);
            setError(null);
        }
    }, [yaml]);

    const baseUrl = apiSpec?.servers?.[0]?.url || '';

    const groupEndpointsByTag = (endpoints: ApiEndpoint[]) => {
        const grouped: Record<string, ApiEndpoint[]> = {};

        endpoints.forEach(endpoint => {
            const tags = endpoint.tags && endpoint.tags.length > 0 ? endpoint.tags : ['General'];
            tags.forEach(tag => {
                if (!grouped[tag]) {
                    grouped[tag] = [];
                }
                grouped[tag].push(endpoint);
            });
        });

        return grouped;
    };

    const renderEndpointsByTag = () => {
        if (!apiSpec || !apiSpec.endpoints) return null;

        const groupedEndpoints = groupEndpointsByTag(apiSpec.endpoints);

        return Object.entries(groupedEndpoints).map(([tag, endpoints]) => (
            <Box key={tag} sx={{mb: 4}}>
                <Typography variant="h5" sx={{mb: 2, display: 'flex', alignItems: 'center'}}>
                    {tag}
                    <Chip
                        label={`${endpoints.length} endpoint${endpoints.length > 1 ? 's' : ''}`}
                        size="small"
                        sx={{ml: 2}}
                    />
                </Typography>
                {endpoints.map(endpoint => (
                    <EndpointCard
                        key={endpoint.id}
                        endpoint={endpoint}
                        baseUrl={baseUrl}
                    />
                ))}
            </Box>
        ));
    };

    // Show empty state when no YAML is provided
    if (!yaml) {
        return (
            <Box>
                <Alert severity="info">
                    No API specification provided.
                </Alert>
            </Box>
        );
    }

    return (
        <Box>


            {/* Loading State */}
            {loading && (
                <Box sx={{display: 'flex', justifyContent: 'center', my: 4}}>
                    <CircularProgress/>
                    <Typography variant="body1" sx={{ml: 2}}>
                        Loading API specification...
                    </Typography>
                </Box>
            )}

            {/* Error State */}
            {error && (
                <Alert severity="error" sx={{mb: 3}}>
                    {error}
                </Alert>
            )}

            {/* Endpoints */}
            {apiSpec && !loading && (
                <Box>
                    {renderEndpointsByTag()}
                </Box>
            )}

            {/* API Overview */}
            {apiSpec && (
                <Card sx={{mb: 3}}>
                    <CardContent>
                        {apiSpec.info.title && <Typography variant="h5" component="h3" gutterBottom>
                            {apiSpec.info.title}
                        </Typography>}
                        {apiSpec.info.version && <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                            Version: {apiSpec.info.version}
                        </Typography>}
                        {apiSpec.info.description && (
                            <Typography variant="body1" sx={{mb: 2}}>
                                {apiSpec.info.description}
                            </Typography>
                        )}
                        {apiSpec.servers && apiSpec.servers.length > 0 && (
                            <Box>
                                <Typography variant="subtitle2" gutterBottom>
                                    Base URL:
                                </Typography>
                                <Typography variant="body2" sx={{fontFamily: 'monospace'}}>
                                    {apiSpec.servers[0].url}
                                </Typography>
                            </Box>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Empty State */}
            {apiSpec && apiSpec.endpoints.length === 0 && !loading && (
                <Alert severity="info">
                    No endpoints found in this API specification.
                </Alert>
            )}
        </Box>
    );
};

export default CardViewer;