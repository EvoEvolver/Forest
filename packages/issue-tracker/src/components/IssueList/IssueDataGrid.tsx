import React, {useEffect, useState} from 'react';
import type {GridColDef, GridRenderCellParams} from '@mui/x-data-grid';
import {DataGrid, GridFooterContainer, GridPagination} from '@mui/x-data-grid';
import {
    Avatar,
    Box,
    Button,
    Chip,
    FormControl,
    IconButton,
    InputLabel,
    MenuItem,
    Select,
    Stack,
    Typography
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import {ArrowBack as ArrowBackIcon, Person as PersonIcon, SwapVert as SwapVertIcon} from '@mui/icons-material';
import {getUserMetadata} from "@forest/user-system/src/userMetadata";
import {useAtomValue} from "jotai";
import {userAtom} from '@forest/user-system/src/authStates';
import type {Issue} from '../../types/Issue';
import TitleCell from './columns/TitleCell';
import StatusCell from './columns/StatusCell';
import PriorityCell from './columns/PriorityCell';
import AssigneesCell from './columns/AssigneesCell';
import TagsCell from './columns/TagsCell';
import DueDateCell from './columns/DueDateCell';
import ActionsCell from './columns/ActionsCell';
import Tooltip from '@mui/material/Tooltip';

interface IssueDataGridProps {
    issues: Issue[];
    loading: boolean;
    simple?: boolean;
    onIssueSelect: (issue: Issue) => void;
    onIssueEdit: (issue: Issue) => void;
    onIssueDelete: (issueId: string) => void;
    onCreateIssue?: () => void;
    // Filter and sort props for large version
    assigneeFilter?: string;
    onAssigneeFilterChange?: (filter: string) => void;
    creatorFilter?: string;
    onCreatorFilterChange?: (filter: string) => void;
    sortBy?: string;
    onSortByChange?: (sortBy: string) => void;
    sortOrder?: 'asc' | 'desc';
    onSortOrderChange?: (order: 'asc' | 'desc') => void;
    treeId?: string;
}

const IssueDataGrid: React.FC<IssueDataGridProps> = ({
                                                         issues,
                                                         loading,
                                                         simple = true,
                                                         onIssueSelect,
                                                         onIssueEdit,
                                                         onIssueDelete,
                                                         onCreateIssue,
                                                         // Filter and sort props
                                                         assigneeFilter = 'all',
                                                         onAssigneeFilterChange,
                                                         creatorFilter = 'all',
                                                         onCreatorFilterChange,
                                                         sortBy = 'smart',
                                                         onSortByChange,
                                                         sortOrder = 'asc',
                                                         onSortOrderChange,
                                                         treeId,
                                                     }) => {
    const currentUser = useAtomValue(userAtom);
    const [treeMembers, setTreeMembers] = useState<Array<{
        userId: string,
        username: string,
        avatar?: string | null
    }>>([]);

    // Get current base URL
    const getBaseUrl = () => {
        return `${window.location.protocol}//${window.location.hostname}:${window.location.port}`;
    };

    // Handle back to tree navigation
    const handleBackToTree = () => {
        if (treeId) {
            const baseUrl = getBaseUrl();
            window.location.href = `${baseUrl}/?id=${treeId}`;
        }
    };

    // Fetch tree members for filter options
    useEffect(() => {
        const fetchTreeMembers = async () => {
            if (!treeId || simple) return;

            try {
                const response = await fetch(`${process.env.NODE_ENV === 'development' ? 'http://localhost:29999' : `${window.location.protocol}//${window.location.hostname}:${window.location.port}`}/api/tree-permission/tree/${treeId}`, {
                    credentials: 'include',
                    headers: {'Content-Type': 'application/json'},
                });
                const data = await response.json();
                const permissions = data.permissions || [];
                const userIds = permissions.map((p: any) => p.userId);

                // Fetch user details including avatars
                const userDetails = await Promise.all(userIds.map(async (id: string) => {
                    try {
                        const userMeta = await getUserMetadata(id);
                        return {
                            userId: id,
                            username: userMeta.username,
                            avatar: userMeta.avatar || null,
                        };
                    } catch (error) {
                        return {
                            userId: id,
                            username: id,
                            avatar: null,
                        };
                    }
                }));

                setTreeMembers(userDetails);
            } catch (error) {
                console.error('Failed to fetch tree members:', error);
            }
        };

        fetchTreeMembers();
    }, [treeId, simple]);

    // Filter and Sort Controls Component
    const FilterSortControls = () => {
        if (simple) return null;

        return (
            <Box sx={{p: 2, bgcolor: '#f8f9fa', borderBottom: '1px solid #e1e4e8'}}>
                <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
                    {/* Back to Tree Button */}
                    <Button
                        variant="outlined"
                        size="small"
                        startIcon={<ArrowBackIcon/>}
                        onClick={handleBackToTree}
                        sx={{
                            minWidth: 'auto',
                            '&:hover': {
                                bgcolor: '#e3f2fd'
                            }
                        }}
                    >
                        Back to Tree
                    </Button>

                    {/* Assignee Filter */}
                    <FormControl size="small" sx={{minWidth: 150}}>
                        <InputLabel>Assignee</InputLabel>
                        <Select
                            value={assigneeFilter}
                            onChange={(e) => onAssigneeFilterChange?.(e.target.value)}
                            label="Assignee"
                        >
                            <MenuItem value="all">All Assignees</MenuItem>
                            <MenuItem value="me">Assigned to Me</MenuItem>
                            {treeMembers.map((member) => (
                                <MenuItem key={member.userId} value={member.userId}>
                                    <Box sx={{display: 'flex', alignItems: 'center', gap: 1}}>
                                        <Avatar
                                            sx={{width: 20, height: 20}}
                                            src={member.avatar || undefined}
                                        >
                                            <PersonIcon fontSize="small"/>
                                        </Avatar>
                                        {member.username}
                                    </Box>
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    {/* Creator Filter */}
                    <FormControl size="small" sx={{minWidth: 150}}>
                        <InputLabel>Creator</InputLabel>
                        <Select
                            value={creatorFilter}
                            onChange={(e) => onCreatorFilterChange?.(e.target.value)}
                            label="Creator"
                        >
                            <MenuItem value="all">All Creators</MenuItem>
                            <MenuItem value="me">Created by Me</MenuItem>
                            {treeMembers.map((member) => (
                                <MenuItem key={member.userId} value={member.userId}>
                                    <Box sx={{display: 'flex', alignItems: 'center', gap: 1}}>
                                        <Avatar
                                            sx={{width: 20, height: 20}}
                                            src={member.avatar || undefined}
                                        >
                                            <PersonIcon fontSize="small"/>
                                        </Avatar>
                                        {member.username}
                                    </Box>
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    {/* Sort By */}
                    <FormControl size="small" sx={{minWidth: 150}}>
                        <InputLabel>Sort By</InputLabel>
                        <Select
                            value={sortBy}
                            onChange={(e) => onSortByChange?.(e.target.value)}
                            label="Sort By"
                        >
                            <MenuItem value="smart">Smart (My Issues First)</MenuItem>
                            <MenuItem value="deadline">Deadline</MenuItem>
                            <MenuItem value="created">Created Date</MenuItem>
                            <MenuItem value="updated">Last Updated</MenuItem>
                        </Select>
                    </FormControl>

                    {/* Sort Order */}
                    <IconButton
                        onClick={() => onSortOrderChange?.(sortOrder === 'asc' ? 'desc' : 'asc')}
                        size="small"
                        sx={{
                            bgcolor: sortOrder === 'desc' ? '#e3f2fd' : 'transparent',
                            '&:hover': {bgcolor: '#e3f2fd'}
                        }}
                    >
                        <SwapVertIcon fontSize="small"/>
                    </IconButton>

                    {/* Active Filters Display */}
                    {(assigneeFilter !== 'all' || creatorFilter !== 'all') && (
                        <Box sx={{display: 'flex', gap: 1, alignItems: 'center'}}>
                            <Typography variant="caption" color="text.secondary">Active:</Typography>
                            {assigneeFilter !== 'all' && (
                                <Chip
                                    label={`Assignee: ${assigneeFilter === 'me' ? 'Me' : treeMembers.find(m => m.userId === assigneeFilter)?.username || assigneeFilter}`}
                                    size="small"
                                    onDelete={() => onAssigneeFilterChange?.('all')}
                                    sx={{bgcolor: '#e3f2fd', color: '#1976d2'}}
                                />
                            )}
                            {creatorFilter !== 'all' && (
                                <Chip
                                    label={`Creator: ${creatorFilter === 'me' ? 'Me' : treeMembers.find(m => m.userId === creatorFilter)?.username || creatorFilter}`}
                                    size="small"
                                    onDelete={() => onCreatorFilterChange?.('all')}
                                    sx={{bgcolor: '#e3f2fd', color: '#1976d2'}}
                                />
                            )}
                        </Box>
                    )}
                </Stack>
            </Box>
        );
    };

    // Custom footer component with Create Issue button and pagination
    const CustomFooter = () => (
        <GridFooterContainer>
            <Box sx={{display: 'flex', alignItems: 'center', flex: 1}}>


                <Tooltip title="Create Issue">
                    <IconButton
                        color="primary"
                        size="small"
                        onClick={onCreateIssue}
                        sx={{marginLeft: 1}}
                    >
                        <AddIcon/>
                    </IconButton>
                </Tooltip>
                <Box sx={{flex: 1}}/>
                <GridPagination/>
            </Box>
        </GridFooterContainer>
    );

    const columns: GridColDef[] = simple ? [
        {
            field: 'title',
            headerName: 'Issue',
            minWidth: 100,
            flex: 2,
            renderCell: (params: GridRenderCellParams) => (
                <TitleCell value={params.value} row={params.row} onSelect={onIssueSelect}/>
            ),
        },
        {
            field: 'assignees',
            headerName: 'Assignees',
            minWidth: 100,
            flex: 1,
            renderCell: (params: GridRenderCellParams) => (
                <AssigneesCell value={params.value} treeId={treeId}/>
            ),
        }
    ] : [
        {
            field: 'title',
            headerName: 'Issue',
            width: 200,
            minWidth: 200,
            flex: 1,
            renderCell: (params: GridRenderCellParams) => (
                <TitleCell value={params.value} row={params.row} onSelect={onIssueSelect}/>
            ),
        },
        {
            field: 'status',
            headerName: 'Status',
            width: 100,
            minWidth: 100,
            renderCell: (params: GridRenderCellParams) => (
                <StatusCell value={params.value}/>
            ),
        },
        {
            field: 'priority',
            headerName: 'Priority',
            width: 100,
            minWidth: 100,
            renderCell: (params: GridRenderCellParams) => (
                <PriorityCell value={params.value}/>
            ),
        },
        {
            field: 'assignees',
            headerName: 'Assignees',
            width: 180,
            minWidth: 150,
            flex: 2,
            renderCell: (params: GridRenderCellParams) => (
                <AssigneesCell value={params.value} treeId={treeId}/>
            ),
        },
        {
            field: 'tags',
            headerName: 'Tags',
            width: 150,
            minWidth: 120,
            renderCell: (params: GridRenderCellParams) => (
                <TagsCell value={params.value}/>
            ),
        },
        {
            field: 'dueDate',
            headerName: 'Due Date & Time',
            width: 140,
            minWidth: 140,
            renderCell: (params: GridRenderCellParams) => (
                <DueDateCell value={params.value}/>
            ),
        },
        {
            field: 'actions',
            headerName: 'Actions',
            width: 140,
            minWidth: 140,
            sortable: false,
            disableColumnMenu: true,
            renderCell: (params: GridRenderCellParams) => (
                <ActionsCell row={params.row} onEdit={onIssueEdit} onDelete={onIssueDelete}/>
            ),
        },
    ];

    // Calculate optimal page size based on available space
    const [pageSize, setPageSize] = React.useState(() => simple ? 5 : 25);
    const [paginationModel, setPaginationModel] = React.useState({
        page: 0,
        pageSize: simple ? 5 : 25,
    });

    React.useEffect(() => {
        if (simple) {
            const newPageSize = 5;
            setPageSize(newPageSize);
            setPaginationModel(prev => ({...prev, pageSize: newPageSize}));
            return;
        }

        // For large mode, calculate based on viewport height
        const calculateOptimalPageSize = () => {
            const viewportHeight = window.innerHeight;
            const headerHeight = 64; // AppBar height
            const filterControlsHeight = 80; // Filter controls height
            const footerHeight = 52; // DataGrid footer height
            const rowHeight = 35; // Row height from sx prop
            const headerRowHeight = 35; // Header row height
            const padding = 40; // Some padding for safety

            const availableHeight = viewportHeight - headerHeight - filterControlsHeight - footerHeight - headerRowHeight - padding;
            const maxRows = Math.floor(availableHeight / rowHeight);

            // Ensure we have at least 10 rows and at most 100 rows
            return Math.min(Math.max(maxRows, 10), 100);
        };

        const handleResize = () => {
            const newPageSize = calculateOptimalPageSize();
            setPageSize(newPageSize);
            setPaginationModel(prev => ({...prev, pageSize: newPageSize}));
        };

        // Set initial page size
        const newPageSize = calculateOptimalPageSize();
        setPageSize(newPageSize);
        setPaginationModel(prev => ({...prev, pageSize: newPageSize}));

        // Add resize listener
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [simple]);

    // Dynamic pagination settings based on simple mode
    const pageSizeOptions = simple ? [5] : [pageSize];

    return (
        <Box sx={{height: '100%', display: 'flex', flexDirection: 'column'}}>
            <FilterSortControls/>
            <DataGrid
                rows={issues}
                columns={columns}
                loading={loading}
                pageSizeOptions={pageSizeOptions}
                paginationModel={paginationModel}
                onPaginationModelChange={setPaginationModel}
                getRowId={(row) => row._id}
                disableRowSelectionOnClick
                hideFooterSelectedRowCount
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
        </Box>
    );
};

export default IssueDataGrid; 