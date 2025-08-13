/**
 * DragButton component for TreeView nodes
 */

import React from 'react';
import {IconButton, Tooltip} from '@mui/material';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import {NodeVM} from "@forest/schema";

interface DragButtonProps {
    node: NodeVM;
    isVisible: boolean;
    handleDragStart: (e: React.DragEvent) => void;
    isDragging: boolean;
    handleDragEnd: () => void;
}

export const DragButton = ({node, isVisible, handleDragStart, isDragging, handleDragEnd}: DragButtonProps) => {
    if (!isVisible || !node.nodeType.allowReshape) return null;

    return (
        <Tooltip title={isDragging ? "" : "Drag to Reorder"} placement="left">
            <IconButton
                size="small"
                draggable={true}
                onDragStart={handleDragStart}
                onDragEnd={() => {
                    console.log("DragEnd")
                    handleDragEnd()
                }}
                sx={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    width: 28,
                    height: 28,
                    color: 'rgba(128, 128, 128, 0.8)',
                    cursor: 'move',
                    zIndex: 10,
                    opacity: isDragging ? 0.5 : 1,
                    transition: 'opacity 0.1s ease',
                    '&:hover': {
                        backgroundColor: 'rgba(128, 128, 128, 0.1)',
                        color: 'rgba(128, 128, 128, 1)',
                    }
                }}
            >
                <DragIndicatorIcon fontSize="small"/>
            </IconButton>
        </Tooltip>
    );
};