import React, {useEffect, useState} from 'react';
import {Alert, Box, CircularProgress, Typography} from '@mui/material';
import {ApiEndpoint, ApiSpec, parseApiSpec} from './apiParser';
import EndpointCard from './EndpointCard';


interface CardViewerProps {
    json?: string;
    title?: string;
}

const CardViewer: React.FC<CardViewerProps> = ({apiSpec, loading, error}: {apiSpec: ApiSpec, loading: boolean, error: string}) => {

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
            {false && apiSpec && (<Box>
                    {apiSpec.servers && apiSpec.servers.length > 0 && (
                        <Typography variant="body2" sx={{fontFamily: 'monospace'}}>
                            {apiSpec.servers[0].url}
                        </Typography>
                    )}
                </Box>
            )}

            {/* Empty State */}
            {apiSpec && apiSpec.endpoints.length === 0 && !loading && (
                <Alert severity="info">
                    No endpoints found in this API specification.
                </Alert>
            )}
        </Box>)
};



export default CardViewer;