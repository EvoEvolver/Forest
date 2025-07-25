import React, {useState} from 'react';
import {useAtomValue, useSetAtom} from 'jotai';
import {Box, Chip, IconButton, List, ListItem, Paper, Popover, Tooltip, Typography} from '@mui/material';
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
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

    if (markedCount === 0) {
        return null;
    }

    const handleMouseEnter = (event: React.MouseEvent<HTMLElement>) => {
        console.log('Mouse entered MarkedNodesBar'); // Debug log
        const paperElement = event.currentTarget.querySelector('[data-testid="marked-bar"]') as HTMLElement;
        setAnchorEl(paperElement || event.currentTarget);
    };

    const handleMouseLeave = () => {
        console.log('Mouse left MarkedNodesBar'); // Debug log
        setAnchorEl(null);
    };


    const handleClearAll = (event: React.MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();
        console.log('Clear all clicked'); // Debug log
        try {
            clearAllMarkedNodes();
            console.log('Clear all executed'); // Debug log
        } catch (error) {
            console.error('Error clearing marked nodes:', error);
        }
        setAnchorEl(null);
    };

    const open = Boolean(anchorEl);

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
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            sx={{
                position: 'fixed',
                bottom: 0,
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 1000,
                // Create an invisible area that includes the popover space
                height: open ? 400 : 100,
                width: open ? 420 : 200,
                pointerEvents: 'none', // Allow clicks to pass through the invisible area
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'flex-end',
                pb: '20px'
            }}
        >
            <Paper
                elevation={8}
                data-testid="marked-bar"
                sx={{
                    px: 3,
                    py: 1.5,
                    borderRadius: 3,
                    backgroundColor: theme.palette.primary.main,
                    color: theme.palette.primary.contrastText,
                    minWidth: 200,
                    transition: 'all 0.3s ease-in-out',
                    cursor: 'pointer',
                    pointerEvents: 'auto', // Re-enable pointer events for the actual bar
                    '&:hover': {
                        transform: 'scale(1.02)',
                        elevation: 12
                    }
                }}
            >
                <Box display="flex" alignItems="center" gap={1} justifyContent="space-between">
                    <Box display="flex" alignItems="center" gap={1}>
                        <CheckBoxIcon fontSize="small"/>
                        <Typography variant="body2" fontWeight="medium">
                            {markedCount} marked node{markedCount !== 1 ? 's' : ''}
                        </Typography>
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

            <Popover
                open={open}
                anchorEl={anchorEl}
                onClose={() => setAnchorEl(null)}
                anchorOrigin={{
                    vertical: 'top',
                    horizontal: 'center',
                }}
                transformOrigin={{
                    vertical: 'bottom',
                    horizontal: 'center',
                }}
                sx={{
                    '& .MuiPopover-paper': {
                        maxWidth: 500,
                        maxHeight: 500,
                        mt: -1,
                        pointerEvents: 'auto' // Ensure popover can receive events
                    }
                }}
                disableRestoreFocus
                disableAutoFocus
                disableEnforceFocus
            >
                <Box sx={{p: 2}}>
                    <Typography variant="subtitle2" sx={{mb: 1, fontWeight: 600}}>
                        Marked Nodes
                    </Typography>
                    <List dense sx={{py: 0}}>
                        {markedNodeTitles.map((node) => (
                            <ListItem key={node.id} sx={{px: 0, py: 0.5}}>
                                <Chip
                                    label={node.title}
                                    size="small"
                                    variant="outlined"
                                    sx={{
                                        maxWidth: '100%',
                                        '& .MuiChip-label': {
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                            maxWidth: 300
                                        }
                                    }}
                                />
                            </ListItem>
                        ))}
                    </List>
                </Box>
            </Popover>
        </Box>
    );
};