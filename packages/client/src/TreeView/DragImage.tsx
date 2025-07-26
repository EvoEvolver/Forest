import React from 'react';
import { useTheme } from '@mui/system';
import { NodeVM } from '@forest/schema';
import { useAtomValue } from 'jotai';

interface DragImageProps {
    node: NodeVM;
    onDragEnd: () => void;
}

export const DragImage: React.FC<DragImageProps> = ({ node, onDragEnd }) => {
    const theme = useTheme();
    const nodeTitle = useAtomValue(node.title);

    React.useEffect(() => {
        const handleDragEnd = () => {
            console.log("DragImage dragend");
            onDragEnd();
        };

        // Add global drag end listener
        document.addEventListener('dragend', handleDragEnd);
        
        return () => {
            document.removeEventListener('dragend', handleDragEnd);
        };
    }, [onDragEnd]);

    return (
        <div
            style={{
                position: 'fixed',
                top: -9999,
                left: -9999,
                background: theme.palette.background.paper,
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '13px',
                fontWeight: 400,
                color: theme.palette.text.primary,
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                opacity: 0.8,
                zIndex: 10000,
                whiteSpace: 'nowrap',
                fontFamily: 'inherit',
                maxWidth: '300px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                pointerEvents: 'none'
            }}
        >
            {nodeTitle || 'Untitled Node'}
        </div>
    );
};