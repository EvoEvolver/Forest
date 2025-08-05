// UserDisplayName.tsx
import React from 'react';
import {
    Box,
    IconButton,
    Typography,
} from '@mui/material';
import { Edit as EditIcon } from '@mui/icons-material';

interface UserDisplayNameProps {
    userName: string | undefined;
    onEditClick: () => void;
}

export const UserDisplayName: React.FC<UserDisplayNameProps> = ({
                                                                    userName,
                                                                    onEditClick
                                                                }) => {
    return (
        <Box sx={{
        display: 'grid',
            gridTemplateColumns: '1fr auto 1fr',
            alignItems: 'center',
            mb: { xs: 1, md: 2 }
    }}>
    <Box /> {/* Empty left column */}

    <Typography variant="h5" component="div" sx={{
        fontSize: { xs: '1rem', md: '1.25rem' },
        textAlign: 'center',
            wordBreak: 'break-word'
    }}>
    {userName}
    </Typography>

    <Box sx={{ display: 'flex', justifyContent: 'flex-start', paddingLeft: 0.5 }}>
    <IconButton
        size="small"
    onClick={onEditClick}
    sx={{p: 0.5}}
>
    <EditIcon fontSize="small"/>
        </IconButton>
        </Box>
        </Box>
);
};
