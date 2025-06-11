import React, { useState, useEffect } from 'react';
import { useAtomValue } from 'jotai';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Stack,
    Button,
    List,
    ListItem,
    ListItemText,
    ListItemSecondaryAction,
    IconButton,
    Chip,
    Divider,
    CircularProgress,
    Alert,
    Tooltip
} from '@mui/material';
import {
    Delete as DeleteIcon,
    Launch as LaunchIcon,
    AccessTime as AccessTimeIcon,
    AccountTree as TreeIcon
} from '@mui/icons-material';
import { authTokenAtom, userAtom } from './authStates';
import { httpUrl } from '../appState';

interface UserTree {
    id: string;
    title: string;
    created_at: string;
    last_accessed: string;
    node_count: number;
}

interface UserTreesListProps {
    onTreeDeleted?: () => void;
}

export const UserTreesList: React.FC<UserTreesListProps> = ({ onTreeDeleted }) => {
    const [trees, setTrees] = useState<UserTree[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [deletingTreeId, setDeletingTreeId] = useState<string | null>(null);
    
    const authToken = useAtomValue(authTokenAtom);
    const user = useAtomValue(userAtom);

    const fetchUserTrees = async () => {
        if (!authToken || !user) return;
        
        try {
            setLoading(true);
            setError(null);
            
            const response = await fetch(`${httpUrl}/api/user/trees`, {
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
            console.error('Error fetching user trees:', err);
            setError(err instanceof Error ? err.message : 'Failed to fetch trees');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteTree = async (treeId: string) => {
        if (!authToken || !confirm('Are you sure you want to delete this tree?')) {
            return;
        }

        try {
            setDeletingTreeId(treeId);
            
            const response = await fetch(`${httpUrl}/api/trees/${treeId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
            });

            if (response.status === 401) {
                throw new Error('Authentication failed');
            }

            if (response.status === 403) {
                throw new Error('You do not have permission to delete this tree');
            }

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            // Remove the deleted tree from the list
            setTrees(prevTrees => prevTrees.filter(tree => tree.id !== treeId));
            onTreeDeleted?.();
            
        } catch (err) {
            console.error('Error deleting tree:', err);
            alert(`Failed to delete tree: ${err instanceof Error ? err.message : 'Unknown error'}`);
        } finally {
            setDeletingTreeId(null);
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
        fetchUserTrees();
    }, [authToken, user]);

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" p={2}>
                <CircularProgress size={24} />
            </Box>
        );
    }

    if (error) {
        return (
            <Alert severity="error" sx={{ m: 1 }}>
                {error}
                <Button size="small" onClick={fetchUserTrees} sx={{ ml: 1 }}>
                    Retry
                </Button>
            </Alert>
        );
    }

    return (
        <Card sx={{ mt: 2 }}>
            <CardContent>
                <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                    <TreeIcon color="primary" />
                    <Typography variant="h6" component="div">
                        My Trees ({trees.length})
                    </Typography>
                    <Button 
                        size="small" 
                        onClick={fetchUserTrees}
                        sx={{ ml: 'auto' }}
                    >
                        Refresh
                    </Button>
                </Stack>
                
                {trees.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" textAlign="center" py={2}>
                        You haven't created any trees yet. Click "Create new tree" to get started!
                    </Typography>
                ) : (
                    <List dense>
                        {trees.map((tree, index) => (
                            <React.Fragment key={tree.id}>
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
                                                </Typography>
                                                <Chip 
                                                    size="small" 
                                                    label={`${tree.node_count} nodes`}
                                                    variant="outlined"
                                                />
                                            </Stack>
                                        }
                                        secondary={
                                            <Stack spacing={0.5} mt={0.5}>
                                                <Typography variant="caption" display="flex" alignItems="center">
                                                    <AccessTimeIcon fontSize="inherit" sx={{ mr: 0.5 }} />
                                                    Last accessed: {formatDate(tree.last_accessed)}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    Created: {formatDate(tree.created_at)}
                                                </Typography>
                                            </Stack>
                                        }
                                    />
                                    <ListItemSecondaryAction>
                                        <Stack direction="row" spacing={0.5}>
                                            <Tooltip title="Open Tree">
                                                <IconButton 
                                                    edge="end" 
                                                    size="small"
                                                    onClick={() => handleOpenTree(tree.id)}
                                                    color="primary"
                                                >
                                                    <LaunchIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="Delete Tree">
                                                <IconButton 
                                                    edge="end" 
                                                    size="small"
                                                    onClick={() => handleDeleteTree(tree.id)}
                                                    disabled={deletingTreeId === tree.id}
                                                    color="error"
                                                >
                                                    {deletingTreeId === tree.id ? (
                                                        <CircularProgress size={16} />
                                                    ) : (
                                                        <DeleteIcon fontSize="small" />
                                                    )}
                                                </IconButton>
                                            </Tooltip>
                                        </Stack>
                                    </ListItemSecondaryAction>
                                </ListItem>
                                {index < trees.length - 1 && <Divider />}
                            </React.Fragment>
                        ))}
                    </List>
                )}
            </CardContent>
        </Card>
    );
};