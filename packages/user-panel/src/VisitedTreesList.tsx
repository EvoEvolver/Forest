import React, {useEffect, useState} from 'react';
import {useAtomValue} from 'jotai';
import type {GridColDef, GridRenderCellParams} from '@mui/x-data-grid';
import {DataGrid, GridFooterContainer, GridPagination} from '@mui/x-data-grid';
import {Alert, Box, Button, Chip, CircularProgress, IconButton, Tooltip, Typography} from '@mui/material';
import {Refresh as RefreshIcon, RemoveCircleOutline as RemoveIcon} from '@mui/icons-material';
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
    owner: string; // Now contains username instead of user ID
}

export const VisitedTreesList = () => {
    const [trees, setTrees] = useState<VisitedTree[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [removingTreeId, setRemovingTreeId] = useState<string | null>(null);
    const [paginationModel, setPaginationModel] = useState({
        page: 0,
        pageSize: 25,
    });

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

    // Custom footer component with Refresh button and pagination
    const CustomFooter = () => (
        <GridFooterContainer>
            <Box sx={{display: 'flex', alignItems: 'center', flex: 1}}>
                <Tooltip title="Refresh">
                    <IconButton size="small" onClick={fetchVisitedTrees} sx={{marginLeft: 1}}>
                        <RefreshIcon fontSize="small"/>
                    </IconButton>
                </Tooltip>
                <Box sx={{flex: 1}}/>
                <GridPagination/>
            </Box>
        </GridFooterContainer>
    );

    // Define columns for DataGrid
    const columns: GridColDef[] = [
        {
            field: 'treeId',
            headerName: 'Tree ID',
            width: 120,
            minWidth: 120,
            align: 'center',
            headerAlign: 'center',
            renderCell: (params: GridRenderCellParams) => (
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
                    onClick={() => handleOpenTree(params.value)}
                >
                    {params.value !== null ? params.value.slice(0, 8) + '...' : "No ID"}
                </Typography>
            ),
        },
        {
            field: 'title',
            headerName: 'Title',
            width: 200,
            minWidth: 200,
            flex: 1,
            align: 'center',
            headerAlign: 'center',
            renderCell: (params: GridRenderCellParams) => (
                <Box sx={{textAlign: 'center'}}>
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
                        onClick={() => handleOpenTree(params.row.treeId)}
                    >
                        {params.value?.trim() ? params.value : 'Untitled'}
                    </Typography>
                </Box>
            ),
        },
        {
            field: 'createdAt',
            headerName: 'Created',
            width: 140,
            minWidth: 140,
            align: 'center',
            headerAlign: 'center',
            renderCell: (params: GridRenderCellParams) => (
                <Typography color="textSecondary" variant="subtitle2" fontWeight={400} fontSize="0.75rem">
                    {formatDate(params.value)}
                </Typography>
            ),
        },
        {
            field: 'lastAccessed',
            headerName: 'Last Accessed',
            width: 140,
            minWidth: 140,
            align: 'center',
            headerAlign: 'center',
            renderCell: (params: GridRenderCellParams) => (
                <Typography color="textSecondary" variant="subtitle2" fontWeight={400} fontSize="0.75rem">
                    {formatDate(params.value)}
                </Typography>
            ),
        },
        {
            field: 'nodeCount',
            headerName: 'Size',
            width: 120,
            minWidth: 120,
            align: 'center',
            headerAlign: 'center',
            renderCell: (params: GridRenderCellParams) => (
                <Chip
                    sx={{
                        px: "4px",
                        backgroundColor: getNodeCountColor(params.value),
                        color: "#fff",
                        fontSize: "0.65rem",
                        height: 20
                    }}
                    size="small"
                    label={`${getNodeCountLabel(params.value)} (${params.value})`}
                />
            ),
        },
        {
            field: 'actions',
            headerName: 'Actions',
            width: 80,
            minWidth: 80,
            sortable: false,
            disableColumnMenu: true,
            align: 'center',
            headerAlign: 'center',
            renderCell: (params: GridRenderCellParams) => (
                <Tooltip title="Remove from history">
                    <IconButton
                        size="small"
                        onClick={() => handleRemoveFromHistory(params.row.treeId)}
                        disabled={removingTreeId === params.row.treeId}
                        color="error"
                        sx={{p: 0.5}}
                    >
                        {removingTreeId === params.row.treeId ? (
                            <CircularProgress size={14}/>
                        ) : (
                            <RemoveIcon fontSize="small"/>
                        )}
                    </IconButton>
                </Tooltip>
            ),
        },
    ];

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

    // Calculate optimal page size based on viewport height
    useEffect(() => {
        const calculateOptimalPageSize = () => {
            const viewportHeight = window.innerHeight;
            const headerHeight = 64; // AppBar height
            const footerHeight = 52; // DataGrid footer height
            const rowHeight = 35; // Row height from sx prop
            const headerRowHeight = 35; // Header row height
            const padding = 40; // Some padding for safety

            const availableHeight = viewportHeight - headerHeight - footerHeight - headerRowHeight - padding;
            const maxRows = Math.floor(availableHeight / rowHeight);

            // Ensure we have at least 10 rows and at most 100 rows
            return Math.min(Math.max(maxRows, 10), 100);
        };

        const handleResize = () => {
            const newPageSize = calculateOptimalPageSize();
            setPaginationModel(prev => ({...prev, pageSize: newPageSize}));
        };

        // Set initial page size
        const newPageSize = calculateOptimalPageSize();
        setPaginationModel(prev => ({...prev, pageSize: newPageSize}));

        // Add resize listener
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    if (loading) {
        return (
            <Box sx={{height: '100%', display: 'flex', flexDirection: 'column'}}>
                <DashboardCard title="Recent Trees">
                    <Box display="flex" justifyContent="center" p={2}>
                        <CircularProgress size={20}/>
                    </Box>
                </DashboardCard>
            </Box>
        );
    }

    if (error) {
        return (
            <Box sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2
            }}>
                <DashboardCard title="Recent Trees">
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
        <Box sx={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2
        }}>
            <DashboardCard
                title={`Recent Trees (${trees.length})`}
                sx={{height: '100%', display: 'flex', flexDirection: 'column'}}
            >
                {trees.length === 0 ? (
                    <Box sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flex: 1
                    }}>
                        <Typography variant="body2" color="text.secondary" textAlign="center" py={3}
                                    fontSize={{xs: '0.7rem', md: '0.8rem'}}>
                            No visited trees yet. Start exploring to see your visit history!
                        </Typography>
                    </Box>
                ) : (
                    <DataGrid
                        rows={trees}
                        columns={columns}
                        loading={loading}
                        pageSizeOptions={[paginationModel.pageSize]}
                        paginationModel={paginationModel}
                        onPaginationModelChange={setPaginationModel}
                        getRowId={(row) => row.treeId}
                        disableRowSelectionOnClick
                        hideFooterSelectedRowCount
                        initialState={{
                            sorting: {
                                sortModel: [{field: 'lastAccessed', sort: 'desc'}],
                            },
                        }}
                        sx={{
                            width: '100%',
                            flex: 1,
                            border: 'none',
                            '& .MuiDataGrid-main': {
                                overflow: 'hidden'
                            },
                            '& .MuiDataGrid-virtualScroller': {
                                overflow: 'hidden !important'
                            },
                            '& .MuiDataGrid-virtualScrollerContent': {
                                overflow: 'hidden'
                            },
                            '& .MuiDataGrid-virtualScrollerRenderZone': {
                                overflow: 'hidden'
                            },
                            '& .MuiDataGrid-columnHeaders': {
                                backgroundColor: '#f5f5f5',
                                minHeight: '35px !important',
                                maxHeight: '35px !important',
                            },
                            '& .MuiDataGrid-columnHeader': {
                                minHeight: '35px !important',
                                maxHeight: '35px !important',
                            },
                            '& .MuiDataGrid-cell': {
                                padding: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            },
                            '& .MuiDataGrid-scrollbar': {
                                display: 'none'
                            },
                            '& .MuiDataGrid-scrollbar--vertical': {
                                display: 'none'
                            },
                            '& .MuiDataGrid-scrollbar--horizontal': {
                                display: 'none'
                            }
                        }}
                        rowHeight={35}
                        slots={{
                            footer: CustomFooter,
                        }}
                    />
                )}
            </DashboardCard>
        </Box>
    );
}; 