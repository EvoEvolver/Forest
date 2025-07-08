import React from 'react';
import {IconButton, Tooltip} from '@mui/material';
import {Delete as DeleteIcon, Edit as EditIcon} from '@mui/icons-material';
import type {Issue} from '../../../types/Issue.ts';

interface ActionsCellProps {
    row: Issue;
    onEdit: (issue: Issue) => void;
    onDelete: (issueId: string) => void;
}

const ActionsCell: React.FC<ActionsCellProps> = ({row, onEdit, onDelete}) => (
    <>
        <Tooltip title="Edit">
            <IconButton size="small" onClick={() => onEdit(row)} sx={{p: 0.5}}>
                <EditIcon fontSize="small"/>
            </IconButton>
        </Tooltip>
        <Tooltip title="Delete">
            <IconButton size="small" onClick={() => onDelete(row.issueId)} sx={{p: 0.5}}>
                <DeleteIcon fontSize="small"/>
            </IconButton>
        </Tooltip>
    </>
);

export default ActionsCell; 