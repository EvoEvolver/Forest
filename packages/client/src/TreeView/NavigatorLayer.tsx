import React, {useEffect, forwardRef} from 'react';
import {RichTreeView} from '@mui/x-tree-view/RichTreeView';
import {useTreeItem2} from '@mui/x-tree-view';
import {TreeItem2Content, TreeItem2IconContainer, TreeItem2Root, TreeItem2GroupTransition} from '@mui/x-tree-view';
import type {UseTreeItem2Parameters} from '@mui/x-tree-view';
import {Box, IconButton} from '@mui/material';
import {DragIndicator, ExpandMore, ChevronRight} from '@mui/icons-material';
import {atom, useAtom, useAtomValue, useSetAtom} from "jotai";
import {
    jumpToNodeAtom,
    scrollToNodeAtom,
    selectedNodeAtom,
    setNodePositionAtom,
    moveNodeToSubtreeAtom,
    treeAtom
} from "../TreeState/TreeState";
import {useTreeViewApiRef} from "@mui/x-tree-view";
import {NodeM, NodeVM} from '@forest/schema';
import {useDragContext} from './DragContext';

export const NavigatorItemsAtom = atom((get) => {
        const tree = get(treeAtom)
        get(tree.viewCommitNumberAtom)
        let root: NodeVM
        if (get(tree.metadata).rootId) {
            // if rootId is set, use it to find the root node
            root = get(tree.nodeDict[get(tree.metadata).rootId])
        } else {
            console.error("No rootId set in tree metadata. This may imply a bug.")
        }
        if (!root) {
            return []
        }
        let children_list = []
        const itemTree = [{
            id: root.id,
            label: get(root.title),
            children: children_list,
        }]
        // iterate itemTree to add children
        const addChildren = (item: any) => {
            const node = get(tree.nodeDict[item.id])
            const children_ids = get(node.children)
            const children = children_ids.map((childId) => {
                const childrenNodeAtom = tree.nodeDict[childId]
                if (!childrenNodeAtom) {
                    return null
                }
                return get(childrenNodeAtom)
            }).filter((child) => {
                return child != null
            })

            item.children = children.map((child) => {
                return {
                    id: child.id,
                    label: get(child.title) || "(Untitled)",
                    children: [],
                }
            })
            for (const child of item.children) {
                addChildren(child)
            }
        }
        addChildren(itemTree[0])
        return itemTree
    }
)

const selectedItemAtom = atom((get) => {
    const selectedNode = get(selectedNodeAtom)
    if (!selectedNode || !selectedNode.id) {
        return []
    }
    return [selectedNode.id]
})

const expandedItemsAtom = atom([])

function getAncestorIds(node: NodeVM){
    if (!node || !node.nodeM) {
        return []
    }
    const ancestorIds = []
    let nodeM = node.nodeM
    const treeM = nodeM.treeM;
    while(true){
        const parent: NodeM | undefined = treeM.getParent(nodeM)
        if (!parent) {
            break;
        }
        ancestorIds.push(parent.id)
        nodeM = parent
    }
    return ancestorIds;
}

// Custom Tree Item component with drag handle
const CustomTreeItem = forwardRef<HTMLLIElement, UseTreeItem2Parameters>(
    (props, ref) => {
        const { id, itemId, label, disabled, children } = props;
        const [dragOver, setDragOver] = React.useState<'top' | 'bottom' | 'center' | 'invalid' | null>(null);
        const [isDragging, setIsDragging] = React.useState(false);
        
        const {
            getRootProps,
            getContentProps,
            getIconContainerProps,
            getLabelProps,
            getGroupTransitionProps,
            status,
        } = useTreeItem2({ id, itemId, children, label, disabled, rootRef: ref });

        const expandIcon = status.expanded ? <ExpandMore /> : <ChevronRight />;

        const handleDragStart = (e: React.DragEvent) => {
            setTimeout(() => { // wait for the node to change, otherwise will cause bug
                setIsDragging(true);
            }, 50);
            setDraggedNodeId(itemId); // Set DragContext state for chat functionality
            e.dataTransfer.effectAllowed = 'copyMove'; // Match TreeView implementation
            e.dataTransfer.setData('nodeId', itemId); // Primary data for chat compatibility
            e.dataTransfer.setData('text/plain', itemId); // Fallback for NavigatorLayer internal use
            currentDraggedItemId = itemId; // Set global state
            
            // Create a drag image that matches TreeView styling
            const dragImageEl = document.createElement('div');
            dragImageEl.style.cssText = `
                background: white;
                border: 1px solid rgba(0, 0, 0, 0.12);
                border-radius: 6px;
                padding: 6px 12px;
                font-size: 13px;
                font-weight: 400;
                color: rgba(0, 0, 0, 0.87);
                box-shadow: 0 2px 8px rgba(0,0,0,0.2);
                opacity: 0.8;
                white-space: nowrap;
                font-family: inherit;
                max-width: 300px;
                overflow: hidden;
                text-overflow: ellipsis;
                pointer-events: none;
            `;
            dragImageEl.textContent = label as string || 'Untitled Node';
            
            // Temporarily add to DOM, set as drag image, then remove
            document.body.appendChild(dragImageEl);
            e.dataTransfer.setDragImage(dragImageEl, -15, 14);
            setTimeout(() => document.body.removeChild(dragImageEl), 0);
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
            
            const rect = e.currentTarget.getBoundingClientRect();
            const y = e.clientY - rect.top;
            const height = rect.height;
            
            const draggedItemId = currentDraggedItemId; // Use global state instead of getData
            
            // Determine drop position
            let dropPosition: 'top' | 'bottom' | 'center';
            if (y < height / 3) {
                dropPosition = 'top';
            } else if (y > (height * 2) / 3) {
                dropPosition = 'bottom';
            } else {
                dropPosition = 'center';
            }
            
            // Check compatibility for all drop positions
            if (draggedItemId && draggedItemId !== itemId) {
                
                try {
                    const draggedNodeM = tree.treeM.getNode(draggedItemId);
                    const targetNodeM = tree.treeM.getNode(itemId);
                    const draggedNodeTypeName = draggedNodeM.nodeTypeName();
                    
                    let isValid = true;
                    
                    if (dropPosition === 'center') {
                        // Dropping as child - check if target allows this child type
                        const targetNodeTypeName = targetNodeM.nodeTypeName();
                        const targetNodeType = await tree.treeM.supportedNodesTypes(targetNodeTypeName);
                        const allowedChildTypes = targetNodeType.allowedChildrenTypes;
                        isValid = allowedChildTypes.includes(draggedNodeTypeName);
                    } else {
                        // Dropping as sibling (top/bottom) - check if parent allows this child type
                        const targetParentId = targetNodeM.ymap.get('parent');
                        if (targetParentId) {
                            const parentNodeM = tree.treeM.getNode(targetParentId);
                            const parentNodeTypeName = parentNodeM.nodeTypeName();
                            const parentNodeType = await tree.treeM.supportedNodesTypes(parentNodeTypeName);
                            const allowedChildTypes = parentNodeType.allowedChildrenTypes;
                            isValid = allowedChildTypes.includes(draggedNodeTypeName);
                        }
                    }
                    
                    if (isValid) {
                        setDragOver(dropPosition);
                    } else {
                        setDragOver('invalid');
                    }
                } catch (error) {
                    console.warn('Error checking drag compatibility:', error);
                    setDragOver(dropPosition); // Fallback to allow drop, let handleDrop decide
                }
            } else {
                setDragOver(dropPosition);
            }
        };

        const handleDragLeave = (e: React.DragEvent) => {
            e.stopPropagation(); // Prevent event bubbling to parent nodes
            setDragOver(null);
        };

        const setNodePosition = useSetAtom(setNodePositionAtom);
        const moveNodeToSubtree = useSetAtom(moveNodeToSubtreeAtom);
        const tree = useAtomValue(treeAtom);
        const selectedNode = useAtomValue(selectedNodeAtom);
        const { setDraggedNodeId } = useDragContext();
        
        // Check if this item is currently selected
        const isSelected = selectedNode && selectedNode.id === itemId;

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
                    
                    // Check if target node allows this node type as child
                    const draggedNodeM = tree.treeM.getNode(draggedItemId);
                    const targetNodeM = tree.treeM.getNode(itemId);
                    
                    const draggedNodeTypeName = draggedNodeM.nodeTypeName();
                    const targetNodeTypeName = targetNodeM.nodeTypeName();
                    
                    // Get target node type to check allowed children types
                    const targetNodeType = await tree.treeM.supportedNodesTypes(targetNodeTypeName);
                    const allowedChildTypes = targetNodeType.allowedChildrenTypes;
                    
                    if (!allowedChildTypes.includes(draggedNodeTypeName)) {
                        console.warn(`Cannot drop ${draggedNodeTypeName} into ${targetNodeTypeName}. Allowed types: ${allowedChildTypes.join(', ')}`);
                        setDragOver(null);
                        return;
                    }
                    
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
                    
                    // Check if parent allows this node type as child (for cross-subtree moves)
                    const isCrossSubtree = currentParentId !== targetParentId;
                    if (isCrossSubtree && targetParentId) {
                        const draggedNodeTypeName = draggedNodeM.nodeTypeName();
                        const parentNodeM = tree.treeM.getNode(targetParentId);
                        const parentNodeTypeName = parentNodeM.nodeTypeName();
                        const parentNodeType = await tree.treeM.supportedNodesTypes(parentNodeTypeName);
                        const allowedChildTypes = parentNodeType.allowedChildrenTypes;
                        
                        if (!allowedChildTypes.includes(draggedNodeTypeName)) {
                            console.warn(`Cannot drop ${draggedNodeTypeName} as sibling in ${parentNodeTypeName}. Allowed types: ${allowedChildTypes.join(', ')}`);
                            setDragOver(null);
                            return;
                        }
                    }
                    
                    const shift = dragOver === 'bottom' ? 1 : 0;
                    
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
                            '&:hover': { opacity: 1 },
                            cursor: isDragging ? 'grabbing' : 'grab',
                        }}
                        draggable
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                    >
                        <DragIndicator fontSize="small" />
                    </IconButton>
                </TreeItem2Content>
                
                {children && <TreeItem2GroupTransition {...getGroupTransitionProps()} />}
            </TreeItem2Root>
        );
    }
);

CustomTreeItem.displayName = 'CustomTreeItem';

// Global state to track the currently dragged item
let currentDraggedItemId: string | null = null;

export const NavigatorLayer = () => {
    const navigatorItems = useAtomValue(NavigatorItemsAtom)
    const [expandedItems, setExpandedItems] = useAtom(expandedItemsAtom)
    const selectedItems = useAtomValue(selectedItemAtom)
    const [selectedNode,] = useAtom(selectedNodeAtom)
    const apiRef = useTreeViewApiRef();
    const jumpToNode = useSetAtom(jumpToNodeAtom)
    const scrollToNode = useSetAtom(scrollToNodeAtom)
    
    useEffect(() => {
        if (!selectedNode || !selectedNode.id) {
            return;
        }
        const currId = selectedNode.id
        const parentIds = getAncestorIds(selectedNode)
        setExpandedItems((oldExpandedItems) => {
            return [...new Set([currId, ...parentIds, ...oldExpandedItems])]
        })
        const itemDom = apiRef.current?.getItemDOMElement(selectedNode.id)
        if (itemDom) {
            itemDom.scrollIntoView({behavior: "smooth", inline: "center", block: "nearest"})
        }
    }, [selectedNode]);

    const handleExpandedItemsChange = (_event: React.SyntheticEvent, itemIds: string[]) => {
        setExpandedItems(itemIds)
    };

    const handleNewSelectedItemChange = (_event: React.SyntheticEvent, selection: any) => {
        // Handle different possible formats
        let itemId: string | null = null;
        if (typeof selection === 'string') {
            itemId = selection;
        } else if (Array.isArray(selection) && selection.length > 0) {
            itemId = selection[0];
        }
        
        if (itemId) {
            jumpToNode(itemId)
            if (scrollToNode) {
                setTimeout(() => {
                    scrollToNode(itemId)
                }, 100)
            }
        }
    }

    return (
        <>
            <RichTreeView
                items={navigatorItems}
                selectedItems={selectedItems}
                expandedItems={expandedItems}
                apiRef={apiRef}
                onExpandedItemsChange={handleExpandedItemsChange}
                onSelectedItemsChange={handleNewSelectedItemChange}
                slots={{
                    item: CustomTreeItem
                }}
            />
        </>
    );
};


