/**
 * Custom tree item component for NavigatorLayer with drag and drop functionality
 */

import React, {forwardRef} from 'react';
import type {UseTreeItem2Parameters} from '@mui/x-tree-view';
import {
    TreeItem2Content,
    TreeItem2GroupTransition,
    TreeItem2IconContainer,
    TreeItem2Root,
    useTreeItem2
} from '@mui/x-tree-view';
import {Box, IconButton} from '@mui/material';
import {ChevronRight, DragIndicator, ExpandMore} from '@mui/icons-material';
import {useAtomValue, useSetAtom} from "jotai";
import {moveNodeToSubtreeAtom, selectedNodeAtom, setNodePositionAtom, treeAtom} from "../../TreeState/TreeState";
import {useDragContext} from '../DragContext';
import {calculateDropPosition, setupDragData, setupDragImage} from '../utils/DragUtils';
import {validateDropCompatibility} from '../utils/NodeTypeUtils';

// Global state to track the currently dragged item
let currentDraggedItemId: string | null = null;

export const CustomTreeItem = forwardRef<HTMLLIElement, UseTreeItem2Parameters>(
    (props, ref) => {
        const {id, itemId, label, disabled, children} = props;
        const [dragOver, setDragOver] = React.useState<'top' | 'bottom' | 'center' | 'invalid' | null>(null);
        const [isDragging, setIsDragging] = React.useState(false);

        const {
            getRootProps,
            getContentProps,
            getIconContainerProps,
            getLabelProps,
            getGroupTransitionProps,
            status,
        } = useTreeItem2({id, itemId, children, label, disabled, rootRef: ref});

        const expandIcon = status.expanded ? <ExpandMore/> : <ChevronRight/>;

        const setNodePosition = useSetAtom(setNodePositionAtom);
        const moveNodeToSubtree = useSetAtom(moveNodeToSubtreeAtom);
        const tree = useAtomValue(treeAtom);
        const selectedNode = useAtomValue(selectedNodeAtom);
        const {setDraggedNodeId} = useDragContext();

        // Check if this item is currently selected
        const isSelected = selectedNode && selectedNode.id === itemId;

        const handleDragStart = (e: React.DragEvent) => {
            setTimeout(() => { // wait for the node to change, otherwise will cause bug
                setIsDragging(true);
            }, 50);
            setDraggedNodeId(itemId); // Set DragContext state for chat functionality
            setupDragData(e, itemId);
            currentDraggedItemId = itemId; // Set global state

            // Create drag image
            setupDragImage(e, label as string);
        };

        const handleDragEnd = () => {
            setIsDragging(false);
            currentDraggedItemId = null; // Clear global state
            setDraggedNodeId(null); // Clear DragContext state
        };

        const handleDragOver = async (e: React.DragEvent) => {
            e.preventDefault();
            e.stopPropagation(); // Prevent event bubbling to parent nodes
            e.dataTransfer.dropEffect = 'move';

            const draggedItemId = currentDraggedItemId; // Use global state instead of getData

            if (!draggedItemId || draggedItemId === itemId) {
                return;
            }

            const dropPosition = calculateDropPosition(e, true);

            // Validate drop compatibility
            const validation = await validateDropCompatibility(
                tree.treeM,
                draggedItemId,
                itemId,
                dropPosition
            );

            if (validation.isValid) {
                setDragOver(dropPosition);
            } else {
                setDragOver('invalid');
                if (validation.reason) {
                    console.warn(validation.reason);
                }
            }
        };

        const handleDragLeave = (e: React.DragEvent) => {
            e.stopPropagation(); // Prevent event bubbling to parent nodes
            setDragOver(null);
        };

        const handleDrop = async (e: React.DragEvent) => {
            e.preventDefault();
            e.stopPropagation(); // Prevent event bubbling to parent nodes
            const draggedItemId = e.dataTransfer.getData('text/plain');

            if (draggedItemId === itemId) {
                setDragOver(null);
                return;
            }

            // Don't allow drop if dragOver state is invalid
            if (dragOver === 'invalid') {
                setDragOver(null);
                return;
            }

            try {
                // Get current parent information
                const draggedNodeM = tree.treeM.getNode(draggedItemId);
                const targetNodeM = tree.treeM.getNode(itemId);
                const currentParentId = draggedNodeM.ymap.get('parent');
                const targetParentId = targetNodeM.ymap.get('parent');

                if (dragOver === 'center') {
                    // Drop as child of target node
                    const isCrossSubtree = currentParentId !== itemId;

                    if (isCrossSubtree) {
                        // Move to different parent
                        moveNodeToSubtree({
                            nodeId: draggedItemId,
                            newParentId: itemId,
                            targetId: draggedItemId, // Will be handled specially
                            shift: 0
                        });
                    }
                } else {
                    // Drop as sibling (top or bottom)
                    const shift = dragOver === 'bottom' ? 1 : 0;
                    const isCrossSubtree = currentParentId !== targetParentId;

                    if (isCrossSubtree) {
                        // Move to different parent
                        moveNodeToSubtree({
                            nodeId: draggedItemId,
                            newParentId: targetParentId,
                            targetId: itemId,
                            shift: shift
                        });
                    } else {
                        // Same parent - reorder siblings
                        setNodePosition({
                            nodeId: draggedItemId,
                            targetId: itemId,
                            shift: shift
                        });
                    }
                }

                console.log('Drop successful:', {
                    draggedItemId,
                    targetItemId: itemId,
                    position: dragOver,
                    isCrossSubtree: currentParentId !== (dragOver === 'center' ? itemId : targetParentId)
                });
            } catch (error) {
                console.error('Error in drop operation:', error);
            }

            setDragOver(null);
        };

        const rootProps = getRootProps();
        const contentProps = getContentProps();

        return (
            <TreeItem2Root
                {...rootProps}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                sx={{
                    position: 'relative',
                    // Selected node styling
                    backgroundColor: isSelected ? 'rgba(25, 118, 210, 0.08)' : 'transparent',
                    boxShadow: isSelected ? '0 2px 8px rgba(25, 118, 210, 0.15)' : 'none',
                    borderRadius: (isSelected || dragOver === 'invalid' || dragOver === 'center') ? 1 : 0,
                    transition: 'all 0.2s ease-in-out',
                    // Left blue bar for selected item
                    borderLeft: isSelected ? '4px solid #1976d2' : '4px solid transparent',
                    paddingLeft: 0.5,
                    marginLeft: -0.5,
                    // Drag indicators
                    '&::before': dragOver === 'top' ? {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: '2px',
                        backgroundColor: 'primary.main',
                        zIndex: 1000,
                    } : {},
                    '&::after': dragOver === 'bottom' ? {
                        content: '""',
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: '2px',
                        backgroundColor: 'primary.main',
                        zIndex: 1000,
                    } : {},
                    // Drop indicators - border around entire item
                    border: dragOver === 'invalid' ? '2px dashed #f44336' :
                        dragOver === 'center' ? '2px solid rgba(25, 118, 210, 0.3)' : 'none',
                }}
            >
                <TreeItem2Content
                    {...contentProps}
                    style={{
                        backgroundColor: dragOver === 'center' ? 'rgba(25, 118, 210, 0.08)' :
                            dragOver === 'invalid' ? 'rgba(244, 67, 54, 0.08)' : 'transparent',
                        opacity: isDragging ? 0.5 : 1,
                        transition: 'opacity 0.2s ease, background-color 0.2s ease',
                    }}
                >
                    <TreeItem2IconContainer {...getIconContainerProps()}>
                        {status.expandable && expandIcon}
                    </TreeItem2IconContainer>

                    <Box
                        {...getLabelProps()}
                        sx={{
                            flexGrow: 1,
                            display: 'flex',
                            alignItems: 'center',
                            fontWeight: isSelected ? 600 : 400,
                            color: isSelected ? 'primary.main' : 'inherit',
                            transition: 'all 0.2s ease-in-out',
                        }}
                    >
                        {label}
                    </Box>

                    <IconButton
                        size="small"
                        sx={{
                            opacity: 0.6,
                            '&:hover': {opacity: 1},
                            cursor: isDragging ? 'grabbing' : 'grab',
                        }}
                        draggable
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                    >
                        <DragIndicator fontSize="small"/>
                    </IconButton>
                </TreeItem2Content>

                {children && <TreeItem2GroupTransition {...getGroupTransitionProps()} />}
            </TreeItem2Root>
        );
    }
);

CustomTreeItem.displayName = 'CustomTreeItem';