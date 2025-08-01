import React, {useEffect, useState} from 'react';
import {useAtomValue} from 'jotai';
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    IconButton,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Tooltip,
    Typography
} from '@mui/material';
import {Delete as DeleteIcon, Refresh as RefreshIcon} from '@mui/icons-material';
import {v4 as uuidv4} from 'uuid';
import {authTokenAtom, userAtom} from '@forest/user-system/src/authStates';
const currentPort = (process.env.NODE_ENV || 'development') == 'development' ? "29999" : window.location.port;
const httpUrl = `${window.location.protocol}//${location.hostname}:${currentPort}`
import DashboardCard from './DashboardCard';
import {NodeJson, TreeJson, TreeMetadata} from '@forest/schema';
import {supportedNodeTypes} from '@forest/node-types';

interface UserTree {
    treeId: string;
    title: string;
    createdAt: string;
    lastAccessed: string;
    nodeCount: number;
}

interface NodeTypeForDisplay {
    name: string;
    displayName: string;
}

export const UserTreesList = ({}) => {
    const [trees, setTrees] = useState<UserTree[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [deletingTreeId, setDeletingTreeId] = useState<string | null>(null);
    const [createTreeDialogOpen, setCreateTreeDialogOpen] = useState(false);
    const [availableNodeTypes, setAvailableNodeTypes] = useState<NodeTypeForDisplay[]>([]);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [pendingDeleteTreeId, setPendingDeleteTreeId] = useState<string | null>(null);

    const authToken = useAtomValue(authTokenAtom);
    const user = useAtomValue(userAtom);

    // Load available node types
    useEffect(() => {
        const loadNodeTypes = async () => {
            const nodeTypeNames = [
                "EditorNodeType",
                "AgentNodeType"
            ];
            
            const promises = nodeTypeNames.map(async (typeName) => {
                try {
                    const nodeType = await supportedNodeTypes(typeName);
                    return {
                        name: typeName,
                        displayName: nodeType?.displayName || typeName
                    };
                } catch (error) {
                    console.warn(`Failed to load node type ${typeName}:`, error);
                    return null;
                }
            });
            
            const nodeTypes = await Promise.all(promises);
            setAvailableNodeTypes(nodeTypes.filter(type => type !== null) as NodeTypeForDisplay[]);
        };
        
        loadNodeTypes();
    }, []);

    const handleApiResponse = async (response: Response, errorContext: string) => {
        if (!response.ok) {
            const status = response.status;
            if (status === 401) throw new Error("AUTHENTICATION_FAILED");
            if (status === 403) throw new Error("PERMISSION_DENIED");
            throw new Error(`HTTP_ERROR_${status}`);
        }

        const data = await response.json();
        if (data.error) throw new Error(data.error);
        return data;
    };

    const handleCreateTree = async (nodeTypeName: string = "EditorNodeType") => {
        const nodeId = uuidv4()
        const newRootJson: NodeJson = {
            title: "Root",
            children: [],
            id: nodeId,
            parent: null,
            data: {},
            nodeTypeName: nodeTypeName
        }
        const newTreeMetadata: TreeMetadata = {
            rootId: newRootJson.id
        }
        const newTreeJson: TreeJson = {
            nodeDict: {
                [nodeId]: newRootJson
            },
            metadata: newTreeMetadata
        }

        try {
            const data = await handleApiResponse(
                await fetch(httpUrl + "/api/createTree", {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${authToken}`,
                    },
                    body: JSON.stringify({"tree": newTreeJson})
                }),
                "create tree"
            );
            if (!data.tree_id) throw new Error("No tree_id returned from server");
            window.location.href = `${window.location.origin}/?id=${data.tree_id}`;

        } catch (error) {
            console.error("Error creating tree:", error);
            throw error;
        }
    };

    const handleCreateTreeClick = () => {
        if (availableNodeTypes.length === 1) {
            handleCreateTree(availableNodeTypes[0].name);
            return;
        }
        
        setCreateTreeDialogOpen(true);
    };

    const handleCloseCreateTreeDialog = () => {
        setCreateTreeDialogOpen(false);
    };

    const handleSelectNodeType = (nodeTypeName: string) => {
        handleCreateTree(nodeTypeName);
        handleCloseCreateTreeDialog();
    };

    const fetchUserTrees = async () => {
        // Don't fetch if not authenticated
        if (!authToken || !user) {
            setLoading(false);
            setError('Please log in to view your trees');
            return;
        }
        
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

    const handleDeleteTreeClick = (treeId: string) => {
        setPendingDeleteTreeId(treeId);
        setDeleteDialogOpen(true);
    };

    const handleDeleteTree = async (treeId: string) => {
        if (!authToken) {
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

            setTrees(prevTrees => prevTrees.filter(tree => tree.treeId !== treeId));

        } catch (err) {
            console.error('Error deleting tree:', err);
            setError(`Failed to delete tree: ${err instanceof Error ? err.message : 'Unknown error'}`);
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

    const getNodeCountColor = (count: number) => {
        if (count >= 50) return "error.main";
        if (count >= 20) return "warning.main";
        if (count >= 10) return "secondary.main";
        return "primary.main";
    };

    const getNodeCountLabel = (count: number) => {
        if (count >= 50) return "Large";
        if (count >= 20) return "Medium";
        if (count >= 10) return "Small";
        return "Tiny";
    };

    useEffect(() => {
        // Only fetch if we have both auth token and user
        if (authToken && user) {
            fetchUserTrees();
        } else {
            // Set initial state for unauthenticated users
            setLoading(false);
            setTrees([]);
            if (!authToken && !user) {
                setError('Please log in to view your trees');
            }
        }
    }, [authToken, user]);

    if (loading) {
        return (
            <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <DashboardCard title="My Trees">
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
                <DashboardCard title="My Trees">
                    <Alert severity="error" sx={{m: 1}}>
                        {error}
                        <Button size="small" onClick={fetchUserTrees} sx={{ml: 1}}>
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
                title={`My Trees (${trees.length})`}
                action={
                    <Box sx={{display: 'flex', gap: 1, alignItems: 'center'}}>
                        <Button
                            variant="contained"
                            onClick={handleCreateTreeClick}
                            size="small"
                            sx={{fontSize: { xs: '0.65rem', md: '0.75rem' }, py: 0.5, px: 1}}
                        >
                            Create New Tree
                        </Button>
                        <Tooltip title="Refresh">
                            <IconButton size="small" onClick={fetchUserTrees}>
                                <RefreshIcon fontSize="small"/>
                            </IconButton>
                        </Tooltip>
                    </Box>
                }
                sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}
            >
                {trees.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" textAlign="center" py={3} fontSize={{ xs: '0.7rem', md: '0.8rem' }}>
                        You haven't created any trees yet. Click "Create new tree" to get started!
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
                            aria-label="user trees table"
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
                                    <TableCell sx={{py: 1}}>
                                        <Typography variant="subtitle2" fontWeight={600} fontSize={{ xs: '0.7rem', md: '0.8rem' }}>
                                            Details
                                        </Typography>
                                    </TableCell>
                                    <TableCell sx={{py: 1}}>
                                        <Typography variant="subtitle2" fontWeight={600} fontSize={{ xs: '0.7rem', md: '0.8rem' }}>
                                            Last Accessed
                                        </Typography>
                                    </TableCell>
                                    <TableCell sx={{py: 1}}>
                                        <Typography variant="subtitle2" fontWeight={600} fontSize={{ xs: '0.7rem', md: '0.8rem' }}>
                                            Size
                                        </Typography>
                                    </TableCell>
                                    <TableCell align="right" sx={{py: 1}}>
                                        <Typography variant="subtitle2" fontWeight={600} fontSize={{ xs: '0.7rem', md: '0.8rem' }}>
                                            Actions
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {trees.map((tree) => (
                                    <TableRow key={tree.treeId} sx={{'&:hover': {backgroundColor: 'action.hover'}}}>
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
                                                {tree.treeId!==null?tree.treeId.slice(0, 8) + '...':"No ID"}
                                            </Typography>

                                        </TableCell>
                                        <TableCell sx={{py: 0.5}}>
                                            <Box>
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
                                        <TableCell sx={{py: 0.5}}>
                                            <Typography color="textSecondary" variant="subtitle2" fontWeight={400}
                                                        fontSize="0.75rem">
                                                {formatDate(tree.lastAccessed)}
                                            </Typography>
                                        </TableCell>
                                        <TableCell sx={{py: 0.5}}>
                                            <Chip
                                                sx={{
                                                    px: "4px",
                                                    backgroundColor: getNodeCountColor(tree.nodeCount),
                                                    color: "#fff",
                                                    fontSize: "0.65rem",
                                                    height: 20
                                                }}
                                                size="small"
                                                label={`${getNodeCountLabel(tree.nodeCount)} (${tree.nodeCount})`}
                                            />
                                        </TableCell>
                                        <TableCell align="right" sx={{py: 0.5}}>
                                            <Tooltip title="Delete Tree">
                                                <IconButton
                                                    size="small"
                                                    onClick={() => handleDeleteTreeClick(tree.treeId)}
                                                    disabled={deletingTreeId === tree.treeId}
                                                    color="error"
                                                    sx={{p: 0.5}}
                                                >
                                                    {deletingTreeId === tree.treeId ? (
                                                        <CircularProgress size={14}/>
                                                    ) : (
                                                        <DeleteIcon fontSize="small"/>
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
            
            {/* Dialog for choosing root node type */}
            <Dialog
                open={createTreeDialogOpen}
                onClose={handleCloseCreateTreeDialog}
            >
                <DialogTitle>Choose Root Node Type</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Select the type of root node for your new tree:
                    </DialogContentText>
                    {availableNodeTypes.map((type) => (
                        <Button
                            key={type.name}
                            fullWidth
                            variant="outlined"
                            onClick={() => handleSelectNodeType(type.name)}
                            sx={{ mb: 1, justifyContent: 'flex-start' }}
                        >
                            {type.displayName}
                        </Button>
                    ))}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseCreateTreeDialog} color="primary">
                        Cancel
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog
                open={deleteDialogOpen}
                onClose={() => setDeleteDialogOpen(false)}
            >
                <DialogTitle>Confirm Delete</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Are you sure you want to delete this tree? This action cannot be undone.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteDialogOpen(false)} color="primary">
                        Cancel
                    </Button>
                    <Button
                        onClick={() => {
                            if (pendingDeleteTreeId) {
                                handleDeleteTree(pendingDeleteTreeId);
                            }
                            setDeleteDialogOpen(false);
                            setPendingDeleteTreeId(null);
                        }}
                        color="error"
                        variant="contained"
                    >
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};