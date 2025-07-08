import React from 'react';
import type {GridColDef, GridRenderCellParams} from '@mui/x-data-grid';
import {DataGrid} from '@mui/x-data-grid';
import type {Issue} from '../../types/Issue.ts';
import TitleCell from './columns/TitleCell.tsx';
import StatusCell from './columns/StatusCell.tsx';
import PriorityCell from './columns/PriorityCell.tsx';
import AssigneesCell from './columns/AssigneesCell.tsx';
import TagsCell from './columns/TagsCell.tsx';
import DueDateCell from './columns/DueDateCell.tsx';
import ActionsCell from './columns/ActionsCell.tsx';

interface IssueDataGridProps {
    issues: Issue[];
    loading: boolean;
    simple?: boolean;
    onIssueSelect: (issue: Issue) => void;
    onIssueEdit: (issue: Issue) => void;
    onIssueDelete: (issueId: string) => void;
}

const IssueDataGrid: React.FC<IssueDataGridProps> = ({
    issues,
    loading,
    simple = true,
    onIssueSelect,
    onIssueEdit,
    onIssueDelete,
}) => {
    const columns: GridColDef[] = simple ? [
        {
            field: 'title',
            headerName: 'Title',
            width: 200,
            minWidth: 200,
            flex: 1,
            renderCell: (params: GridRenderCellParams) => (
                <TitleCell value={params.value} row={params.row} onSelect={onIssueSelect}/>
            ),
        },
        {
            field: 'assignees',
            headerName: 'Assignees',
            width: 180,
            minWidth: 150,
            renderCell: (params: GridRenderCellParams) => (
                <AssigneesCell value={params.value}/>
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
    ] : [
        {
            field: 'title',
            headerName: 'Title',
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
            pageSizeOptions={[5, 10, 25]}
            initialState={{
                pagination: {
                    paginationModel: {page: 0, pageSize: 10},
                },
            }}
            getRowId={(row) => row.issueId}
            disableRowSelectionOnClick
            sx={{
                '& .MuiDataGrid-main': {
                    overflow: 'visible'
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
            }}
            autoHeight={false}
            rowHeight={35}
            slots={{
                footer: issues.length > 20 ? undefined : () => null,
            }}
            showToolbar={!simple}
        />
    );
};

export default IssueDataGrid; 