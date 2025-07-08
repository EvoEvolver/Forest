import React from 'react';
import {Chip} from '@mui/material';

interface StatusCellProps {
    value: string;
}

const getStatusColor = (status: string): "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning" => {
    switch (status) {
        case 'open':
            return 'info';
        case 'in_progress':
            return 'warning';
        case 'resolved':
            return 'success';
        case 'closed':
            return 'default';
        default:
            return 'default';
    }
};

const StatusCell: React.FC<StatusCellProps> = ({value}) => (
    <Chip
        label={value}
        color={getStatusColor(value)}
        size="small"
    />
);

export default StatusCell; 