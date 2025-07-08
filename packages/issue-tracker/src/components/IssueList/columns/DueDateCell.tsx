import React from 'react';

interface DueDateCellProps {
    value?: string;
}

const DueDateCell: React.FC<DueDateCellProps> = ({value}) => {
    if (!value) {
        return <span style={{color: '#999', fontSize: '0.8rem'}}>No due date</span>;
    }
    const dueDate = new Date(value);
    const now = new Date();
    const isOverdue = dueDate < now;
    const isUpcoming = dueDate > now && dueDate.getTime() - now.getTime() < 24 * 60 * 60 * 1000;
    return (
        <span
            style={{
                color: isOverdue ? '#d32f2f' : isUpcoming ? '#ed6c02' : '#666',
                fontSize: '0.75rem',
                fontWeight: isOverdue || isUpcoming ? 'bold' : 'normal',
            }}
        >
      {dueDate.toLocaleDateString()} {dueDate.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
    </span>
    );
};

export default DueDateCell; 