import React from 'react';
import { useAtomValue } from 'jotai';
import { Paper, Typography, Box } from '@mui/material';
import { useTheme } from '@mui/system';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import { markedNodesCountAtom } from '../TreeState/TreeState';

export const MarkedNodesBar = () => {
    const theme = useTheme();
    const markedCount = useAtomValue(markedNodesCountAtom);

    if (markedCount === 0) {
        return null;
    }

    return (
        <Paper
            elevation={8}
            sx={{
                position: 'fixed',
                bottom: 20,
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 1000,
                px: 3,
                py: 1.5,
                borderRadius: 3,
                backgroundColor: theme.palette.primary.main,
                color: theme.palette.primary.contrastText,
                minWidth: 150,
                transition: 'all 0.3s ease-in-out'
            }}
        >
            <Box display="flex" alignItems="center" gap={1}>
                <CheckBoxIcon fontSize="small" />
                <Typography variant="body2" fontWeight="medium">
                    {markedCount} marked node{markedCount !== 1 ? 's' : ''}
                </Typography>
            </Box>
        </Paper>
    );
};