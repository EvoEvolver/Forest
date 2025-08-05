/**
 * UserPanelPage - A full-page version of UserPanel for standalone routing
 * Provides proper height container for direct /user route access
 */

import React from 'react';
import {Box, useTheme} from '@mui/material';
import { UserPanel } from './UserPanel';

export const UserPanelPage: React.FC = () => {
    const theme = useTheme();
    return (
        <Box sx={{
            height: '100dvh', // Use dynamic viewport height instead of 100vh
            width: '100vw',
            overflow: 'auto', // Allow scrolling if content exceeds viewport
            backgroundColor: theme.palette.background.default,
            display: 'flex',
            flexDirection: 'column'
        }}>
            <UserPanel />
        </Box>
    );
};