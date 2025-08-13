import React from 'react';
import {useAtomValue, useSetAtom} from 'jotai';
import {Box, Chip, IconButton, Paper, Tooltip, Typography} from '@mui/material';
import {useTheme} from '@mui/system';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import ClearIcon from '@mui/icons-material/Clear';
import {clearAllMarkedNodesAtom, markedNodesAtom, markedNodesCountAtom, treeAtom} from '../TreeState/TreeState';
import {TreeVM} from "@forest/schema";

export const MarkedNodesBar = () => {
    const theme = useTheme();
    const markedCount = useAtomValue(markedNodesCountAtom);
    const markedNodes = useAtomValue(markedNodesAtom);
    const tree: TreeVM = useAtomValue(treeAtom);
    const clearAllMarkedNodes = useSetAtom(clearAllMarkedNodesAtom);

    if (markedCount === 0) {
        return null;
    }

    const handleClearAll = (event: React.MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();
        clearAllMarkedNodes();
    };

    // Get marked node titles
    const markedNodeTitles = Array.from(markedNodes)
        .map(nodeId => {
            try {
                if (!tree) {
                    return {id: nodeId, title: 'Tree not loaded'};
                }

                const nodeInfo = tree.getNonReactiveNodeInfo(nodeId);
                if (nodeInfo) {
                    return {id: nodeId, title: nodeInfo.title || 'Untitled Node'};
                }

                return {id: nodeId, title: 'Node not found'};
            } catch (error) {
                console.warn('Error getting node info for', nodeId, error);
                return {id: nodeId, title: 'Error loading node'};
            }
        })
        .filter(Boolean);

    return (
        <Box
            sx={{
                position: 'fixed',
                bottom: 0,
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 1000,
                pb: '20px',
                maxWidth: '80vw'
            }}
        >
            <Paper
                elevation={8}
                data-testid="marked-bar"
                sx={{
                    px: 3,
                    py: 2,
                    borderRadius: 3,
                    backgroundColor: theme.palette.primary.main,
                    color: theme.palette.primary.contrastText,
                    minWidth: 300,
                    maxWidth: '80vw',
                    transition: 'all 0.3s ease-in-out'
                }}
            >
                <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
                    <Box display="flex" alignItems="center" gap={1}>
                        <CheckBoxIcon fontSize="small"/>
                        <Typography variant="body2" fontWeight="medium">
                            {markedCount} marked:
                        </Typography>
                    </Box>

                    <Box display="flex" alignItems="center" gap={1} flexWrap="wrap" sx={{flex: 1}}>
                        {markedNodeTitles.map((node) => (
                            <Chip
                                key={node.id}
                                label={node.title}
                                size="small"
                                sx={{
                                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                                    color: theme.palette.primary.contrastText,
                                    maxWidth: 200,
                                    '& .MuiChip-label': {
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap'
                                    }
                                }}
                            />
                        ))}
                    </Box>

                    <Tooltip title="Clear all marked nodes">
                        <IconButton
                            size="small"
                            onClick={handleClearAll}
                            sx={{
                                color: theme.palette.primary.contrastText,
                                '&:hover': {
                                    backgroundColor: 'rgba(255, 255, 255, 0.1)'
                                }
                            }}
                        >
                            <ClearIcon fontSize="small"/>
                        </IconButton>
                    </Tooltip>
                </Box>
            </Paper>
        </Box>
    );
};