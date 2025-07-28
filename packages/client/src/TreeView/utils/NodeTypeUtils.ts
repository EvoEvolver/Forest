/**
 * Node type validation utilities for drag and drop operations
 */

import { TreeM } from '@forest/schema';

/**
 * Checks if a node type can be dropped as a child of another node type
 */
export const canDropAsChild = async (
    treeM: TreeM,
    draggedNodeTypeName: string,
    targetNodeTypeName: string
): Promise<boolean> => {
    try {
        const targetNodeType = await treeM.supportedNodesTypes(targetNodeTypeName);
        const allowedChildTypes = targetNodeType.allowedChildrenTypes;
        return allowedChildTypes.includes(draggedNodeTypeName);
    } catch (error) {
        console.warn('Error checking child compatibility:', error);
        return false;
    }
};

/**
 * Checks if a node type can be dropped as a sibling of another node type
 * (i.e., they can both be children of the same parent)
 */
export const canDropAsSibling = async (
    treeM: TreeM,
    draggedNodeTypeName: string,
    parentNodeTypeName: string
): Promise<boolean> => {
    try {
        const parentNodeType = await treeM.supportedNodesTypes(parentNodeTypeName);
        const allowedChildTypes = parentNodeType.allowedChildrenTypes;
        return allowedChildTypes.includes(draggedNodeTypeName);
    } catch (error) {
        console.warn('Error checking sibling compatibility:', error);
        return false;
    }
};

/**
 * Validates drop compatibility for a drag operation
 */
export const validateDropCompatibility = async (
    treeM: TreeM,
    draggedNodeId: string,
    targetNodeId: string,
    dropPosition: 'top' | 'bottom' | 'center'
): Promise<{ isValid: boolean; reason?: string }> => {
    try {
        const draggedNodeM = treeM.getNode(draggedNodeId);
        const targetNodeM = treeM.getNode(targetNodeId);
        
        if (!draggedNodeM || !targetNodeM) {
            return { isValid: false, reason: 'Node not found' };
        }
        
        const draggedNodeTypeName = draggedNodeM.nodeTypeName();
        
        if (dropPosition === 'center') {
            // Dropping as child
            const targetNodeTypeName = targetNodeM.nodeTypeName();
            const isValid = await canDropAsChild(treeM, draggedNodeTypeName, targetNodeTypeName);
            
            if (!isValid) {
                return {
                    isValid: false,
                    reason: `Cannot drop ${draggedNodeTypeName} into ${targetNodeTypeName}`
                };
            }
        } else {
            // Dropping as sibling
            const targetParentId = targetNodeM.ymap.get('parent');
            if (!targetParentId) {
                return { isValid: false, reason: 'Target has no parent' };
            }
            
            const parentNodeM = treeM.getNode(targetParentId);
            if (!parentNodeM) {
                return { isValid: false, reason: 'Parent node not found' };
            }
            
            const parentNodeTypeName = parentNodeM.nodeTypeName();
            const isValid = await canDropAsSibling(treeM, draggedNodeTypeName, parentNodeTypeName);
            
            if (!isValid) {
                return {
                    isValid: false,
                    reason: `Cannot drop ${draggedNodeTypeName} as sibling in ${parentNodeTypeName}`
                };
            }
        }
        
        return { isValid: true };
    } catch (error) {
        console.warn('Error validating drop compatibility:', error);
        return { isValid: false, reason: 'Validation error' };
    }
};

/**
 * Gets the allowed child types for a given node type
 */
export const getAllowedChildTypes = async (
    treeM: TreeM,
    nodeTypeName: string
): Promise<string[]> => {
    try {
        const nodeType = await treeM.supportedNodesTypes(nodeTypeName);
        return nodeType.allowedChildrenTypes;
    } catch (error) {
        console.warn('Error getting allowed child types:', error);
        return [];
    }
};