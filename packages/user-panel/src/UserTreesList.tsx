import React, {useEffect, useState, useRef, useCallback} from 'react';
import {useAtomValue} from 'jotai';
import type {GridColDef, GridRenderCellParams} from '@mui/x-data-grid';
import {DataGrid, GridFooterContainer, GridPagination} from '@mui/x-data-grid';
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    IconButton,
    Popover,
    Tooltip,
    Typography
} from '@mui/material';
import {Delete as DeleteIcon, Refresh as RefreshIcon, Add as AddIcon} from '@mui/icons-material';
import {authTokenAtom, userAtom} from '@forest/user-system/src/authStates';
import DashboardCard from './DashboardCard';
import {TreeJson} from '@forest/schema';
import MiniFlowView from './MiniFlowView';
import { TreeCreationDialog } from './TreeCreationDialog';
import {httpUrl} from "@forest/schema/src/config";

interface UserTree {
    treeId: string;
    title: string;
    createdAt: string;
    lastAccessed: string;
    nodeCount: number;
}


export const UserTreesList = ({}) => {
    const [trees, setTrees] = useState<UserTree[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [deletingTreeId, setDeletingTreeId] = useState<string | null>(null);
    const [createTreeDialogOpen, setCreateTreeDialogOpen] = useState(false);
    const [paginationModel, setPaginationModel] = useState({
        page: 0,
        pageSize: 25,
    });
    
    // Hover preview state
    const [previewState, setPreviewState] = useState<{
        treeId: string | null;
        treeData: TreeJson | null;
        anchorEl: HTMLElement | null;
        isOpen: boolean;
    }>({
        treeId: null,
        treeData: null,
        anchorEl: null,
        isOpen: false
    });
    const [loadingTreeData, setLoadingTreeData] = useState(false);
    const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isOverPopoverRef = useRef<boolean>(false);

    const authToken = useAtomValue(authTokenAtom);
    const user = useAtomValue(userAtom);



    const handleCreateTreeClick = () => {
        setCreateTreeDialogOpen(true);
    };

    const handleCloseCreateTreeDialog = () => {
        setCreateTreeDialogOpen(false);
    };

    const fetchTreeData = useCallback(async (treeId: string): Promise<TreeJson | null> => {
        if (!authToken) {
            return null;
        }

        try {
            setLoadingTreeData(true);
            const url = `${httpUrl}/api/trees/${treeId}`;
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                console.error('Failed to fetch tree data:', response.status);
                return null;
            }

            const data = await response.json();
            return data.tree || data || null;
        } catch (err) {
            console.error('Error fetching tree data:', err);
            return null;
        } finally {
            setLoadingTreeData(false);
        }
    }, [authToken]);

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

            setTrees(prevTrees => prevTrees.filter(tree => tree.treeId !== treeId));

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

    const showPreview = useCallback(async (element: HTMLElement, treeId: string) => {
        // Clear any pending hide timeout when showing
        if (hideTimeoutRef.current) {
            clearTimeout(hideTimeoutRef.current);
            hideTimeoutRef.current = null;
        }

        const treeData = await fetchTreeData(treeId);
        if (treeData) {
            setPreviewState({
                treeId,
                treeData,
                anchorEl: element,
                isOpen: true
            });
        }
    }, [fetchTreeData]);

    const hidePreview = useCallback(() => {
        // Only hide if not over popover
        if (!isOverPopoverRef.current) {
            setPreviewState({
                treeId: null,
                treeData: null,
                anchorEl: null,
                isOpen: false
            });
        }
    }, []);

    const handleRowHover = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
        const rowElement = event.currentTarget;
        const treeId = rowElement.getAttribute('data-id');
        
        if (!treeId) return;

        // Clear any existing timeout
        if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
        }

        // Show preview after delay
        hoverTimeoutRef.current = setTimeout(() => {
            showPreview(rowElement, treeId);
        }, 1000); // Increased delay to 1000ms
    }, [showPreview]);

    const handleRowLeave = useCallback(() => {
        // Clear hover timeout
        if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
            hoverTimeoutRef.current = null;
        }
        
        // Clear any existing hide timeout
        if (hideTimeoutRef.current) {
            clearTimeout(hideTimeoutRef.current);
        }
        
        // Hide preview after a short delay (to allow moving to popover)
        hideTimeoutRef.current = setTimeout(() => {
            hidePreview();
        }, 300);
    }, [hidePreview]);

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

    // Custom footer component with Create New Tree button and pagination
    const CustomFooter = () => (
        <GridFooterContainer>
            <Box sx={{display: 'flex', alignItems: 'center', flex: 1}}>
                <Button
                    startIcon={<AddIcon/>}
                    variant="contained"
                    size="small"
                    sx={{
                        textTransform: 'none',
                        fontSize: '0.875rem',
                        px: 2,
                        py: 0.5,
                        mb: '5px'
                    }}
                    onClick={() => {
                        if (authToken) {
                            setCreateTreeDialogOpen(true);
                        } else {
                            window.open('/', '_blank');
                        }
                    }}
                >
                    New Tree
                </Button>
                <Tooltip title="Refresh">
                    <IconButton size="small" onClick={fetchUserTrees} sx={{marginLeft: 1}}>
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
                <Tooltip title="Delete Tree">
                    <IconButton
                        size="small"
                        onClick={() => handleDeleteTree(params.row.treeId)}
                        disabled={deletingTreeId === params.row.treeId}
                        color="error"
                        sx={{p: 0.5}}
                    >
                        {deletingTreeId === params.row.treeId ? (
                            <CircularProgress size={14}/>
                        ) : (
                            <DeleteIcon fontSize="small"/>
                        )}
                    </IconButton>
                </Tooltip>
            ),
        },
    ];

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

    // Cleanup timeouts on unmount
    useEffect(() => {
        return () => {
            if (hoverTimeoutRef.current) {
                clearTimeout(hoverTimeoutRef.current);
            }
            if (hideTimeoutRef.current) {
                clearTimeout(hideTimeoutRef.current);
            }
        };
    }, []);

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
            <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
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
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <DashboardCard
                title={`My Trees (${trees.length})`}
                sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}
            >
                {trees.length === 0 ? (
                    <Box sx={{display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1}}>
                        <Typography variant="body2" color="text.secondary" textAlign="center" py={3} fontSize={{ xs: '0.7rem', md: '0.8rem' }}>
                            You haven't created any trees yet. Click the + button below to get started!
                        </Typography>
                        <Button
                            variant="contained"
                            onClick={handleCreateTreeClick}
                            startIcon={<AddIcon />}
                            size="small"
                            sx={{fontSize: { xs: '0.65rem', md: '0.75rem' }, py: 0.5, px: 1}}
                        >
                            Create New Tree
                        </Button>
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
                        slotProps={{
                            row: {
                                onMouseEnter: handleRowHover,
                                onMouseLeave: handleRowLeave,
                            }
                        }}
                        initialState={{
                            sorting: {
                                sortModel: [{ field: 'lastAccessed', sort: 'desc' }],
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

            <TreeCreationDialog 
                open={createTreeDialogOpen}
                onClose={handleCloseCreateTreeDialog}
            />

            {/* Tree Preview Popover */}
            {previewState.isOpen && previewState.treeData && (
                <Popover
                    open={true}
                    anchorEl={previewState.anchorEl}
                    onClose={hidePreview}
                    anchorOrigin={{
                        vertical: 'bottom',
                        horizontal: 'right',
                    }}
                    transformOrigin={{
                        vertical: -10,
                        horizontal: 'center',
                    }}
                    sx={{
                        pointerEvents: 'none',
                        '& .MuiPopover-paper': {
                            pointerEvents: 'auto',
                            marginLeft: '20px',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                            borderRadius: '8px',
                            overflow: 'visible',
                        }
                    }}
                    disableRestoreFocus
                    disableScrollLock
                >
                    <Box 
                        sx={{ position: 'relative' }}
                        onMouseEnter={() => {
                            isOverPopoverRef.current = true;
                            // Clear any pending hide timeout
                            if (hideTimeoutRef.current) {
                                clearTimeout(hideTimeoutRef.current);
                                hideTimeoutRef.current = null;
                            }
                        }}
                        onMouseLeave={() => {
                            isOverPopoverRef.current = false;
                            // Hide the preview when leaving popover
                            hidePreview();
                        }}
                    >
                        {loadingTreeData ? (
                            <Box 
                                sx={{ 
                                    width: 400, 
                                    height: 300, 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center',
                                    backgroundColor: '#fafafa',
                                }}
                            >
                                <CircularProgress size={30} />
                            </Box>
                        ) : (
                            <MiniFlowView treeData={previewState.treeData} width={400} height={300} />
                        )}
                    </Box>
                </Popover>
            )}
        </Box>
    );
};