import React from 'react';
import {Chip} from '@mui/material';

interface PriorityCellProps {
    value?: string;
}

const getPriorityColor = (priority: string): "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning" => {
    switch (priority) {
        case 'low':
            return 'success';
        case 'medium':
            return 'warning';
        case 'high':
            return 'error';
        case 'urgent':
            return 'error';
        default:
            return 'default';
    }
};

const PriorityCell: React.FC<PriorityCellProps> = ({value}) => (
    <Chip
        label={value || 'medium'}
        color={getPriorityColor(value || 'medium')}
        size="small"
    />
);

export default PriorityCell; 