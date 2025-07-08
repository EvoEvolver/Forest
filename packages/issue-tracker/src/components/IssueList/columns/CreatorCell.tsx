import React from 'react';

interface CreatorCellProps {
    value: { username?: string; userId?: string };
}

const CreatorCell: React.FC<CreatorCellProps> = ({value}) => (
    <span>{value?.username || value?.userId}</span>
);

export default CreatorCell; 