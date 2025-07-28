/**
 * Custom hooks for drag and drop handling in TreeView components
 */

import { useState } from 'react';
import { useSetAtom, useAtomValue } from "jotai";
import { setNodePositionAtom, moveNodeToSubtreeAtom, treeAtom } from "../../TreeState/TreeState";
import { useDragContext } from '../DragContext';
import { setupDragImage, setupDragData, calculateDropPosition, getDraggedNodeId } from '../utils/DragUtils';
import { validateDropCompatibility } from '../utils/NodeTypeUtils';

/**
 * Hook for handling drag operations in TreeView components
 */
export const useTreeViewDrag = (nodeId: string, nodeTitle: string, parentId?: string) => {
    const [isDragging, setIsDragging] = useState(false);
    const { setDraggedNodeId } = useDragContext();

    const handleDragStart = (e: React.DragEvent) => {
        setTimeout(() => { // wait for the node to change, otherwise will cause bug
            setIsDragging(true);
        }, 50);
        setDraggedNodeId(nodeId);
        setupDragData(e, nodeId, parentId);
        setupDragImage(e, nodeTitle);
    };

    const handleDragEnd = () => {
        setIsDragging(false);
        setDraggedNodeId(null);
    };

    return {
        isDragging,
        handleDragStart,
        handleDragEnd
    };
};

/**
 * Hook for handling drop operations in TreeView components
 */
export const useTreeViewDrop = (targetNodeId: string) => {
    const [dragOver, setDragOver] = useState<'top' | 'bottom' | 'center' | 'invalid' | null>(null);
    const setNodePosition = useSetAtom(setNodePositionAtom);
    const moveNodeToSubtree = useSetAtom(moveNodeToSubtreeAtom);
    const tree = useAtomValue(treeAtom);

    const handleDragOver = async (e: React.DragEvent, allowCenter: boolean = false) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';

        const draggedNodeId = getDraggedNodeId(e);
        if (!draggedNodeId || draggedNodeId === targetNodeId) {
            return;
        }

        const dropPosition = calculateDropPosition(e, allowCenter);
        
        // Validate drop compatibility for NavigatorLayer (when allowCenter is true)
        if (allowCenter) {
            const validation = await validateDropCompatibility(
                tree.treeM,
                draggedNodeId,
                targetNodeId,
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
        } else {
            // Simple position-based drop for TreeView
            setDragOver(dropPosition);
        }
    };

    const handleDragLeave = (e: React.DragEvent) => {
        if (e.stopPropagation) {
            e.stopPropagation(); // Prevent event bubbling for NavigatorLayer
        }
        setDragOver(null);
    };

    const handleDrop = async (e: React.DragEvent, allowCrossSubtree: boolean = false) => {
        e.preventDefault();
        if (e.stopPropagation) {
            e.stopPropagation(); // Prevent event bubbling for NavigatorLayer
        }
        
        const draggedNodeId = getDraggedNodeId(e);
        if (!draggedNodeId || draggedNodeId === targetNodeId) {
            setDragOver(null);
            return;
        }

        // Don't allow drop if dragOver state is invalid
        if (dragOver === 'invalid') {
            setDragOver(null);
            return;
        }

        try {
            if (allowCrossSubtree && dragOver) {
                // NavigatorLayer logic - handle cross-subtree moves
                const draggedNodeM = tree.treeM.getNode(draggedNodeId);
                const targetNodeM = tree.treeM.getNode(targetNodeId);
                const currentParentId = draggedNodeM.ymap.get('parent');
                const targetParentId = targetNodeM.ymap.get('parent');

                if (dragOver === 'center') {
                    // Drop as child of target node
                    const isCrossSubtree = currentParentId !== targetNodeId;
                    
                    if (isCrossSubtree) {
                        moveNodeToSubtree({
                            nodeId: draggedNodeId,
                            newParentId: targetNodeId,
                            targetId: draggedNodeId,
                            shift: 0
                        });
                    }
                } else {
                    // Drop as sibling (top or bottom)
                    const shift = dragOver === 'bottom' ? 1 : 0;
                    const isCrossSubtree = currentParentId !== targetParentId;
                    
                    if (isCrossSubtree) {
                        moveNodeToSubtree({
                            nodeId: draggedNodeId,
                            newParentId: targetParentId,
                            targetId: targetNodeId,
                            shift: shift
                        });
                    } else {
                        setNodePosition({
                            nodeId: draggedNodeId,
                            targetId: targetNodeId,
                            shift: shift
                        });
                    }
                }
            } else {
                // TreeView logic - simple reordering within same parent
                const draggedParentId = e.dataTransfer.getData('parentId');
                const targetNode = tree.treeM.getNode(targetNodeId);
                const targetParentId = targetNode.ymap.get('parent');

                // Only allow reordering within the same parent
                if (draggedParentId !== (targetParentId || '')) {
                    setDragOver(null);
                    return;
                }

                const shift = dragOver === 'bottom' ? 1 : 0;
                setNodePosition({
                    nodeId: draggedNodeId,
                    targetId: targetNodeId,
                    shift: shift
                });
            }

            console.log('Drop successful:', { 
                draggedNodeId, 
                targetNodeId, 
                position: dragOver 
            });
        } catch (error) {
            console.error('Error in drop operation:', error);
        }
        
        setDragOver(null);
    };

    return {
        dragOver,
        handleDragOver,
        handleDragLeave,
        handleDrop
    };
};