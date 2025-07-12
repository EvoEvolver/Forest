import React from 'react';
import AssigneeManager from '../../AssigneeManager';

interface AssigneesCellProps {
    value: any[];
    treeId?: string;
}

const AssigneesCell: React.FC<AssigneesCellProps> = ({value, treeId}) => (
    <AssigneeManager
        assignees={value || []}
        variant="list"
        maxDisplay={3}
        showTitle={false}
        treeId={treeId || ''}
    />
);

export default AssigneesCell; 