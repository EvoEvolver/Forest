import React from 'react';
import {useTheme} from '@mui/material/styles';

interface DueDateCellProps {
    value?: string;
}

const DueDateCell: React.FC<DueDateCellProps> = ({value}) => {
    const theme = useTheme();
    
    if (!value) {
        return <span style={{color: theme.palette.text.secondary, fontSize: '0.75rem'}}>No due date</span>;
    }
    
    const dueDate = new Date(value);
    const now = new Date();
    const timeDiff = dueDate.getTime() - now.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
    
    // Determine color based on days until due date
    let color = theme.palette.text.primary; // Default text color for 7+ days
    let fontWeight = 'normal';
    
    if (daysDiff < 0) {
        // Overdue - red
        color = theme.palette.error.main;
        fontWeight = 'bold';
    } else if (daysDiff <= 1) {
        // 1 day or less - red
        color = theme.palette.error.main;
        fontWeight = 'bold';
    } else if (daysDiff <= 3) {
        // 1-3 days - orange
        color = theme.palette.warning.main;
        fontWeight = 'bold';
    } else if (daysDiff <= 7) {
        // 3-7 days - yellow/amber (use info color as fallback)
        color = theme.palette.warning.light;
        fontWeight = 'bold';
    }
    // 7+ days stays black with normal weight
    
    return (
        <span
            style={{
                color: color,
                fontSize: '0.75rem',
                fontWeight: fontWeight,
            }}
        >
            {dueDate.toLocaleDateString()}
        </span>
    );
};

export default DueDateCell; 