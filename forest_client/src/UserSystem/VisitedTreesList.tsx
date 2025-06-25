import React, {useEffect, useState} from 'react';
import {useAtomValue} from 'jotai';
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    Divider,
    IconButton,
    List,
    ListItem,
    ListItemText,
    Stack,
    Tooltip,
    Typography
} from '@mui/material';
import {
    AccessTime as AccessTimeIcon,
    History as HistoryIcon,
    Launch as LaunchIcon,
    RemoveCircleOutline as RemoveIcon
} from '@mui/icons-material';
import {authTokenAtom, userAtom} from './authStates';
import {httpUrl} from '../appState';

interface VisitedTree {
    treeId: string;
    title: string;
    createdAt: string;
    lastAccessed: string;
    lastVisited: string;
    nodeCount: number;
    owner: string;
}

export const VisitedTreesList = () => {
    const [trees, setTrees] = useState<VisitedTree[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [removingTreeId, setRemovingTreeId] = useState<string | null>(null);

    const authToken = useAtomValue(authTokenAtom);
    const user = useAtomValue(userAtom);

    const fetchVisitedTrees = async () => {
        if (!authToken || !user) return;

        try {
            setLoading(true);
            setError(null);

            const response = await fetch(`${httpUrl}/api/user/visitedTrees`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
            });

            if (response.status === 401) {
                throw new Error('Authentication failed');
            }

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            setTrees(data.trees || []);
        } catch (err) {
            console.error('Error fetching visited trees:', err);
            setError(err instanceof Error ? err.message : 'Failed to fetch visited trees');
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveFromHistory = async (treeId: string) => {
        if (!authToken || !confirm('Remove this tree from your visit history?')) {
            return;
        }

        try {
            setRemovingTreeId(treeId);

            // Call the remove API endpoint (we'll need to implement this)
            const response = await fetch(`${httpUrl}/api/user/visitedTrees/${treeId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
            });

            if (response.status === 401) {
                throw new Error('Authentication failed');
            }

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            // Remove the tree from the list
            setTrees(prevTrees => prevTrees.filter(tree => tree.treeId !== treeId));

        } catch (err) {
            console.error('Error removing tree from history:', err);
            alert(`Failed to remove tree from history: ${err instanceof Error ? err.message : 'Unknown error'}`);
        } finally {
            setRemovingTreeId(null);
        }
    };

    const handleOpenTree = (treeId: string) => {
        window.location.href = `${window.location.origin}/?id=${treeId}`;
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    useEffect(() => {
        fetchVisitedTrees();
    }, [authToken, user]);

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" p={2}>
                <CircularProgress size={24}/>
            </Box>
        );
    }

    if (error) {
        return (
            <Alert severity="error" sx={{m: 1}}>
                {error}
                <Button size="small" onClick={fetchVisitedTrees} sx={{ml: 1}}>
                    Retry
                </Button>
            </Alert>
        );
    }

    return (
        <Card sx={{mt: 2}}>
            <CardContent>
                <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                    <HistoryIcon color="primary"/>
                    <Typography variant="h6" component="div">
                        Recently Visited Trees ({trees.length})
                    </Typography>
                    <Button
                        size="small"
                        onClick={fetchVisitedTrees}
                        sx={{ml: 'auto'}}
                    >
                        Refresh
                    </Button>
                </Stack>

                {trees.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" textAlign="center" py={2}>
                        No visited trees yet. Start exploring to see your visit history!
                    </Typography>
                ) : (
                    <List dense>
                        {trees.map((tree, index) => (
                            <React.Fragment key={tree.treeId}>
                                <ListItem
                                    sx={{
                                        bgcolor: 'background.paper',
                                        borderRadius: 1,
                                        mb: 1,
                                        border: '1px solid',
                                        borderColor: 'divider'
                                    }}
                                >
                                    <ListItemText
                                        primary={
                                            <Stack direction="row" alignItems="center" spacing={1}>
                                                <Typography variant="subtitle2" component="span">
                                                    {tree.title}
                                                    <Tooltip title="Click to copy ID">
                                                        <Typography
                                                            component="span"
                                                            variant="caption"
                                                            color="text.secondary"
                                                            sx={{
                                                                ml: 1,
                                                                cursor: 'pointer',
                                                                '&:hover': {textDecoration: 'underline'}
                                                            }}
                                                            onClick={() => {
                                                                navigator.clipboard.writeText(tree.treeId);
                                                            }}
                                                        >
                                                            {tree.treeId.substring(0, 9)}...
                                                        </Typography>
                                                    </Tooltip>
                                                </Typography>
                                                <Chip
                                                    size="small"
                                                    label={`${tree.nodeCount} nodes`}
                                                    variant="outlined"
                                                />
                                                {tree.owner !== user?.id && (
                                                    <Chip
                                                        size="small"
                                                        label="Not owned"
                                                        variant="outlined"
                                                        color="secondary"
                                                    />
                                                )}
                                                <Tooltip title="Open Tree">
                                                    <IconButton
                                                        edge="end"
                                                        size="small"
                                                        onClick={() => handleOpenTree(tree.treeId)}
                                                        color="primary"
                                                    >
                                                        <LaunchIcon fontSize="small"/>
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title="Remove from history">
                                                    <IconButton
                                                        edge="end"
                                                        size="small"
                                                        onClick={() => handleRemoveFromHistory(tree.treeId)}
                                                        disabled={removingTreeId === tree.treeId}
                                                        color="error"
                                                    >
                                                        {removingTreeId === tree.treeId ? (
                                                            <CircularProgress size={16}/>
                                                        ) : (
                                                            <RemoveIcon fontSize="small"/>
                                                        )}
                                                    </IconButton>
                                                </Tooltip>
                                            </Stack>
                                        }
                                        secondary={
                                            <Stack spacing={0.5} mt={0.5}>
                                                <Typography variant="caption" display="flex" alignItems="center">
                                                    <AccessTimeIcon fontSize="inherit" sx={{mr: 0.5}}/>
                                                    Last visited: {formatDate(tree.lastVisited)}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    Created: {formatDate(tree.createdAt)}
                                                </Typography>
                                            </Stack>
                                        }
                                    />
                                </ListItem>
                                {index < trees.length - 1 && <Divider/>}
                            </React.Fragment>
                        ))}
                    </List>
                )}
            </CardContent>
        </Card>
    );
}; 