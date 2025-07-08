import React from 'react';
import AssigneeManager from '../../AssigneeManager.tsx';

interface AssigneesCellProps {
    value: any[];
}

const AssigneesCell: React.FC<AssigneesCellProps> = ({value}) => (
    <AssigneeManager
        assignees={value || []}
        variant="list"
        maxDisplay={3}
        showTitle={false}
    />
);

export default AssigneesCell; 