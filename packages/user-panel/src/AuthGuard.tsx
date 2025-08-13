/**
 * AuthGuard component that ensures authentication state is properly initialized
 * before rendering child components that require authentication
 */

import React, {useEffect, useState} from 'react';
import {Box, CircularProgress, Typography} from '@mui/material';
import {useAtom} from 'jotai';
import {subscriptionAtom} from '@forest/user-system/src/authStates';

interface AuthGuardProps {
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({
                                                        children,
                                                        fallback = <AuthLoadingState/>
                                                    }) => {
    const [, setSubscription] = useAtom(subscriptionAtom);
    const [authInitialized, setAuthInitialized] = useState(false);
    const [authInitializing, setAuthInitializing] = useState(true);

    useEffect(() => {
        const initializeAuth = async () => {
            try {
                setAuthInitializing(true);
                // Initialize subscription and wait for auth state to be determined
                await setSubscription();

                // Give a small delay to ensure all auth state updates are processed
                setTimeout(() => {
                    setAuthInitialized(true);
                    setAuthInitializing(false);
                }, 100);
            } catch (error) {
                console.error('Error initializing authentication:', error);
                setAuthInitialized(true);
                setAuthInitializing(false);
            }
        };

        initializeAuth();
    }, [setSubscription]);

    // Show loading state while auth is initializing
    if (authInitializing || !authInitialized) {
        return <>{fallback}</>;
    }

    // Auth is initialized, render children
    return <>{children}</>;
};

const AuthLoadingState: React.FC = () => {
    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '200px',
                gap: 2
            }}
        >
            <CircularProgress size={24}/>
            <Typography variant="body2" color="text.secondary">
                Initializing authentication...
            </Typography>
        </Box>
    );
};