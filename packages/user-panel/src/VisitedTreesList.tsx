import React, {useEffect, useState} from 'react';
import {useAtomValue} from 'jotai';
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    IconButton,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Tooltip,
    Typography
} from '@mui/material';
import {
    RemoveCircleOutline as RemoveIcon,
    Refresh as RefreshIcon
} from '@mui/icons-material';
import {authTokenAtom, userAtom} from '@forest/user-system/src/authStates';
import DashboardCard from './DashboardCard';

const currentPort = (process.env.NODE_ENV || 'development') == 'development' ? "29999" : window.location.port;
const httpUrl = `${window.location.protocol}//${location.hostname}:${currentPort}`

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
        // Don't fetch if not authenticated
        if (!authToken || !user) {
            setLoading(false);
            setError('Please log in to view visited trees');
            return;
        }

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

    const getOwnershipColor = (owner: string) => {
        return owner === user?.id ? "success.main" : "warning.main";
    };

    const getOwnershipLabel = (owner: string) => {
        return owner === user?.id ? "Owned" : "Shared";
    };

    useEffect(() => {
        // Only fetch if we have both auth token and user
        if (authToken && user) {
            fetchVisitedTrees();
        } else {
            // Set initial state for unauthenticated users
            setLoading(false);
            setTrees([]);
            if (!authToken && !user) {
                setError('Please log in to view visited trees');
            }
        }
    }, [authToken, user]);

    if (loading) {
        return (
            <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <DashboardCard title="Recently Visited Trees">
                    <Box display="flex" justifyContent="center" p={2}>
                        <CircularProgress size={20}/>
                    </Box>
                </DashboardCard>
            </Box>
        );
    }

    if (error) {
        return (
            <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <DashboardCard title="Recently Visited Trees">
                    <Alert severity="error" sx={{m: 1}}>
                        {error}
                        <Button size="small" onClick={fetchVisitedTrees} sx={{ml: 1}}>
                            Retry
                        </Button>
                    </Alert>
                </DashboardCard>
            </Box>
        );
    }

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <DashboardCard 
                title={`Recently Visited Trees (${trees.length})`}
                action={
                    <Tooltip title="Refresh">
                        <IconButton size="small" onClick={fetchVisitedTrees}>
                            <RefreshIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                }
                sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}
            >
                {trees.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" textAlign="center" py={3} fontSize={{ xs: '0.7rem', md: '0.8rem' }}>
                        No visited trees yet. Start exploring to see your visit history!
                    </Typography>
                ) : (
                    <Box sx={{
                        width: '100%',
                        overflow: 'auto',
                        flex: 1,
                        minHeight: 0,
                        '& .MuiTable-root': {
                            fontSize: { xs: '0.7rem', md: '0.8rem' }
                        }
                    }}>
                        <Table
                            aria-label="visited trees table"
                            size="small"
                            sx={{
                                minWidth: { xs: 300, md: 650 },
                                '& .MuiTableCell-root': {
                                    padding: { xs: '4px 8px', md: '8px 16px' },
                                    fontSize: { xs: '0.7rem', md: '0.8rem' }
                                }
                            }}
                        >
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{py: 1}}>
                                        <Typography variant="subtitle2" fontWeight={600} fontSize={{ xs: '0.7rem', md: '0.8rem' }}>
                                            Id
                                        </Typography>
                                    </TableCell>
                                    <TableCell sx={{ py: 1 }}>
                                        <Typography variant="subtitle2" fontWeight={600} fontSize={{ xs: '0.7rem', md: '0.8rem' }}>
                                            Details
                                        </Typography>
                                    </TableCell>
                                    <TableCell sx={{ py: 1 }}>
                                        <Typography variant="subtitle2" fontWeight={600} fontSize={{ xs: '0.7rem', md: '0.8rem' }}>
                                            Last Visited
                                        </Typography>
                                    </TableCell>
                                    <TableCell sx={{ py: 1 }}>
                                        <Typography variant="subtitle2" fontWeight={600} fontSize={{ xs: '0.7rem', md: '0.8rem' }}>
                                            Ownership
                                        </Typography>
                                    </TableCell>
                                    <TableCell align="right" sx={{ py: 1 }}>
                                        <Typography variant="subtitle2" fontWeight={600} fontSize={{ xs: '0.7rem', md: '0.8rem' }}>
                                            Actions
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {trees.map((tree) => (
                                    <TableRow key={tree.treeId} sx={{ '&:hover': { backgroundColor: 'action.hover' } }}>
                                        <TableCell sx={{py: 0.5}}>
                                            <Typography
                                                variant="subtitle2"
                                                fontWeight={600}
                                                fontSize="0.8rem"
                                                sx={{
                                                    cursor: 'pointer',
                                                    color: 'primary.main',
                                                    '&:hover': {
                                                        textDecoration: 'underline'
                                                    }
                                                }}
                                                onClick={() => handleOpenTree(tree.treeId)}
                                            >
                                                {tree.treeId.slice(0, 8) + '...'}
                                            </Typography>

                                        </TableCell>
                                        <TableCell sx={{ py: 0.5 }}>
                                            <Box>
                                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                    <Typography 
                                                        variant="subtitle2" 
                                                        fontWeight={600} 
                                                        fontSize="0.8rem"
                                                        sx={{
                                                            cursor: 'pointer',
                                                            color: 'primary.main',
                                                            '&:hover': {
                                                                textDecoration: 'underline'
                                                            }
                                                        }}
                                                        onClick={() => handleOpenTree(tree.treeId)}
                                                    >
                                                        {(tree.title?.trim() ? tree.title : 'Untitled')}
                                                    </Typography>
                                                    <Chip
                                                        sx={{
                                                            px: "3px",
                                                            backgroundColor: "primary.main",
                                                            color: "#fff",
                                                            fontSize: "0.6rem",
                                                            height: 16,
                                                            ml: 1
                                                        }}
                                                        size="small"
                                                        label={`${tree.nodeCount}`}
                                                    />
                                                </Box>
                                                <Typography
                                                    color="textSecondary"
                                                    sx={{
                                                        fontSize: "0.7rem",
                                                    }}
                                                >
                                                    Created: {formatDate(tree.createdAt)}
                                                </Typography>
                                            </Box>
                                        </TableCell>
                                        <TableCell sx={{ py: 0.5 }}>
                                            <Typography color="textSecondary" variant="subtitle2" fontWeight={400} fontSize="0.75rem">
                                                {formatDate(tree.lastVisited)}
                                            </Typography>
                                        </TableCell>
                                        <TableCell sx={{ py: 0.5 }}>
                                            <Chip
                                                sx={{
                                                    px: "4px",
                                                    backgroundColor: getOwnershipColor(tree.owner),
                                                    color: "#fff",
                                                    fontSize: "0.65rem",
                                                    height: 20
                                                }}
                                                size="small"
                                                label={getOwnershipLabel(tree.owner)}
                                            />
                                        </TableCell>
                                        <TableCell align="right" sx={{ py: 0.5 }}>
                                            <Tooltip title="Remove from history">
                                                <IconButton
                                                    size="small"
                                                    onClick={() => handleRemoveFromHistory(tree.treeId)}
                                                    disabled={removingTreeId === tree.treeId}
                                                    color="error"
                                                    sx={{ p: 0.5 }}
                                                >
                                                    {removingTreeId === tree.treeId ? (
                                                        <CircularProgress size={14}/>
                                                    ) : (
                                                        <RemoveIcon fontSize="small"/>
                                                    )}
                                                </IconButton>
                                            </Tooltip>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Box>
                )}
            </DashboardCard>
        </Box>
    );
}; 