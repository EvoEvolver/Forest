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
        const [dragOver, setDragOver] = React.useState<'top' | 'bottom' | 'center' | null>(null);
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
            e.dataTransfer.setData('text/plain', itemId);
            e.dataTransfer.effectAllowed = 'move';
            setIsDragging(true);
        };

        const handleDragEnd = () => {
            setIsDragging(false);
        };

        const handleDragOver = (e: React.DragEvent) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            
            const rect = e.currentTarget.getBoundingClientRect();
            const y = e.clientY - rect.top;
            const height = rect.height;
            
            if (y < height / 3) {
                setDragOver('top');
            } else if (y > (height * 2) / 3) {
                setDragOver('bottom');
            } else {
                setDragOver('center');
            }
        };

        const handleDragLeave = () => {
            setDragOver(null);
        };

        const setNodePosition = useSetAtom(setNodePositionAtom);
        const moveNodeToSubtree = useSetAtom(moveNodeToSubtreeAtom);
        const tree = useAtomValue(treeAtom);
        const selectedNode = useAtomValue(selectedNodeAtom);
        
        // Check if this item is currently selected
        const isSelected = selectedNode && selectedNode.id === itemId;

        const handleDrop = (e: React.DragEvent) => {
            e.preventDefault();
            const draggedItemId = e.dataTransfer.getData('text/plain');
            
            if (draggedItemId === itemId) {
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
                    const isCrossSubtree = currentParentId !== targetParentId;
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
                    borderRadius: isSelected ? 1 : 0,
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
                }}
            >
                <TreeItem2Content 
                    {...contentProps}
                    style={{
                        backgroundColor: dragOver === 'center' ? 'rgba(0, 0, 0, 0.04)' : 'transparent',
                        opacity: isDragging ? 0.5 : 1,
                        transition: 'opacity 0.2s ease',
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


