import React from 'react';
import type {GridColDef, GridRenderCellParams} from '@mui/x-data-grid';
import {DataGrid, GridFooterContainer, GridPagination} from '@mui/x-data-grid';
import {Box, Button} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import type {Issue} from '../../types/Issue';
import TitleCell from './columns/TitleCell';
import StatusCell from './columns/StatusCell';
import PriorityCell from './columns/PriorityCell';
import AssigneesCell from './columns/AssigneesCell';
import TagsCell from './columns/TagsCell';
import DueDateCell from './columns/DueDateCell';
import ActionsCell from './columns/ActionsCell';

interface IssueDataGridProps {
    issues: Issue[];
    loading: boolean;
    simple?: boolean;
    onIssueSelect: (issue: Issue) => void;
    onIssueEdit: (issue: Issue) => void;
    onIssueDelete: (issueId: string) => void;
    onCreateIssue?: () => void;
}

const IssueDataGrid: React.FC<IssueDataGridProps> = ({
    issues,
    loading,
    simple = true,
    onIssueSelect,
    onIssueEdit,
    onIssueDelete,
    onCreateIssue,
}) => {
    // Custom footer component with Create Issue button and pagination
    const CustomFooter = () => (
        <GridFooterContainer>
            <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                <Button
                    variant="contained"
                    size="small"
                    startIcon={<AddIcon/>}
                    onClick={onCreateIssue}
                    sx={{ marginLeft: 1 }}
                >
                    Create Issue
                </Button>
                <Box sx={{ flex: 1 }} />
                <GridPagination />
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
                <AssigneesCell value={params.value}/>
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
                <AssigneesCell value={params.value}/>
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

    return (
        <DataGrid
            rows={issues}
            columns={columns}
            loading={loading}
            pageSizeOptions={[5]}
            initialState={{
                pagination: {
                    paginationModel: {page: 0, pageSize: 5}, 
                },
            }}
            getRowId={(row) => row._id}
            disableRowSelectionOnClick
            hideFooterSelectedRowCount
            sx={{
                width: '100%',
                height: '100%',
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
    );
};

export default IssueDataGrid; 