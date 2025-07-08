import React from 'react';

interface CreatedAtCellProps {
    value: string;
}

const CreatedAtCell: React.FC<CreatedAtCellProps> = ({value}) => (
    <span>{new Date(value).toLocaleDateString()}</span>
);

export default CreatedAtCell; 