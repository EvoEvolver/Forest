import React, {useEffect} from 'react';
import {UncontrolledTreeEnvironment, StaticTreeDataProvider, Tree} from 'react-complex-tree';
import 'react-complex-tree/lib/style-modern.css';
import {atom, useAtom, useAtomValue, useSetAtom} from "jotai";
import {
    jumpToNodeAtom,
    scrollToNodeAtom,
    selectedNodeAtom,
    setNodePositionAtom,
    treeAtom
} from "../TreeState/TreeState";
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
            return {}
        }
        
        const items: Record<string, any> = {
            // Virtual root that contains the actual root node
            'virtual-root': {
                index: 'virtual-root',
                data: 'Root',
                children: [root.id],
                isFolder: true
            }
        }
        
        // Add all nodes including the actual root
        const addNode = (nodeVM: NodeVM): void => {
            const nodeId = nodeVM.id
            const children_ids = get(nodeVM.children)
            const children = children_ids.map((childId) => {
                const childrenNodeAtom = tree.nodeDict[childId]
                if (!childrenNodeAtom) {
                    return null
                }
                return get(childrenNodeAtom)
            }).filter((child) => {
                return child != null
            })

            // Add current node
            items[nodeId] = {
                index: nodeId,
                data: get(nodeVM.title) || "(Untitled)",
                children: children.map(child => child.id),
                isFolder: children.length > 0
            }
            
            // Recursively add children
            for (const child of children) {
                addNode(child)
            }
        }
        
        addNode(root)
        return items
    }
)

const selectedItemAtom = atom((get) => {
    const selectedNode = get(selectedNodeAtom)
    return [selectedNode.id]
})

const expandedItemsAtom = atom<string[]>([])

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

export const NavigatorLayer = () => {
    const navigatorItems = useAtomValue(NavigatorItemsAtom)
    console.log("navigatorItems", navigatorItems)
    const tree = useAtomValue(treeAtom)
    const [expandedItems, setExpandedItems] = useAtom(expandedItemsAtom)
    const selectedItems = useAtomValue(selectedItemAtom)
    const [selectedNode,] = useAtom(selectedNodeAtom)
    const jumpToNode = useSetAtom(jumpToNodeAtom)
    const scrollToNode = useSetAtom(scrollToNodeAtom)
    const setNodePosition = useSetAtom(setNodePositionAtom)
    
    useEffect(() => {
        const currId = selectedNode.id
        const parentIds = getAncestorIds(selectedNode)
        setExpandedItems((oldExpandedItems: string[]) => {
            return [...new Set([currId, ...parentIds, ...oldExpandedItems])]
        })
    }, [selectedNode, setExpandedItems]);


    return (
        <>
            <UncontrolledTreeEnvironment
                dataProvider={new StaticTreeDataProvider(navigatorItems, (item, data) => ({ ...item, data }))}
                getItemTitle={(item) => item.data}
                viewState={{
                    'navigator-tree': {
                        expandedItems: [...expandedItems, 'virtual-root'], // Always expand virtual root
                        selectedItems,
                    }
                }}
                onSelectItems={(items) => {
                    if (items.length > 0) {
                        const newItemId = String(items[0])
                        // Don't select the virtual root
                        if (newItemId !== 'virtual-root') {
                            jumpToNode(newItemId)
                            if (scrollToNode) {
                                setTimeout(() => {
                                    scrollToNode(newItemId)
                                }, 100)
                            }
                        }
                    }
                }}
                onExpandItem={(item) => {
                    if (String(item) !== 'virtual-root') {
                        setExpandedItems(prev => [...prev, String(item)])
                    }
                }}
                onCollapseItem={(item) => {
                    if (String(item) !== 'virtual-root') {
                        setExpandedItems(prev => prev.filter(id => id !== String(item)))
                    }
                }}
                onDrop={(items, target) => {
                    if (items.length > 0 && target) {
                        
                        const draggedItemId = String(items[0].index || items[0])
                        let targetItemId: string
                        
                        console.log('Drop event:', { items, target, draggedItemId })
                        console.log('Target properties:', Object.keys(target))
                        console.log('Target object full:', target)
                        console.log('Available navigatorItems keys:', Object.keys(navigatorItems))
                        
                        // Don't allow dropping virtual root
                        if (draggedItemId === 'virtual-root') {
                            console.log('Cannot drag virtual root')
                            return
                        }
                        
                        // Get target item based on target type
                        if (target.targetType === 'between-items') {
                            // For between-items, get the original children order from tree metadata
                            const parentItemId = String((target as any).parentItem)
                            const childIndex = (target as any).childIndex
                            
                            console.log('Between-items drop:', { parentItemId, childIndex })
                            
                            // Don't allow dropping on virtual root
                            if (parentItemId === 'virtual-root') {
                                console.log('Cannot drop on virtual root')
                                return
                            }
                            
                            // Get the real parent node from tree metadata
                            const parentNodeAtom = tree.nodeDict[parentItemId]
                            if (!parentNodeAtom) {
                                console.log('Parent node not found in tree:', parentItemId)
                                return
                            }
                            
                            // Access the parent node directly from the tree
                            let realChildren: string[] = []
                            try {
                                // Try to get children from the tree's internal structure
                                const parentNodeM = tree.treeM.getNode(parentItemId)
                                if (parentNodeM) {
                                    realChildren = parentNodeM.ymap.get('children').toJSON()
                                }
                            } catch (error) {
                                console.log('Error accessing tree metadata:', error)
                                return
                            }
                            
                            console.log('Real parent children from tree metadata:', realChildren)
                            
                            // Construct virtual list: [A, B, A', C, D] where A' is the dragged item at target position
                            const virtualList = [...realChildren]
                            virtualList.splice(childIndex, 0, draggedItemId + '_copy')
                            console.log('Virtual list with copy:', virtualList, 'childIndex:', childIndex)
                            
                            const linePosition = (target as any).linePosition
                            console.log('linePosition:', linePosition)
                            
                            if (linePosition === 'bottom') {
                                // Place after the item before the copy (childIndex - 1)
                                if (childIndex > 0) {
                                    const targetIndex = childIndex - 1
                                    targetItemId = String(virtualList[targetIndex])
                                    if (targetItemId.endsWith('_copy')) {
                                        targetItemId = targetItemId.replace('_copy', '')
                                    }
                                    console.log('linePosition bottom: place after', targetItemId, 'at virtual index', targetIndex)
                                } else {
                                    console.log('Cannot place before first item')
                                    return
                                }
                            } else { // linePosition === 'top'
                                // Place before the item after the copy (childIndex + 1)
                                if (childIndex + 1 < virtualList.length) {
                                    const targetIndex = childIndex + 1
                                    targetItemId = String(virtualList[targetIndex])
                                    if (targetItemId.endsWith('_copy')) {
                                        targetItemId = targetItemId.replace('_copy', '')
                                    }
                                    console.log('linePosition top: place before', targetItemId, 'at virtual index', targetIndex)
                                } else {
                                    console.log('Cannot place after last item')
                                    return
                                }
                            }
                        } else if (target.targetType === 'item') {
                            targetItemId = String((target as any).targetItem)
                        } else {
                            console.log('Unknown target type:', target.targetType)
                            return
                        }
                        
                        // Don't allow dropping on virtual root
                        if (targetItemId === 'virtual-root') {
                            console.log('Cannot drop on virtual root')
                            return
                        }
                        
                        // Validate that both nodes exist in navigatorItems
                        if (!navigatorItems[draggedItemId]) {
                            console.log('Dragged item not found in navigatorItems:', draggedItemId)
                            return
                        }
                        
                        if (!navigatorItems[targetItemId]) {
                            console.log('Target item not found in navigatorItems:', targetItemId)
                            return
                        }
                        
                        console.log('Parsed IDs:', { draggedItemId, targetItemId })
                        
                        // Check if target is the dragged item itself (no movement needed)
                        if (targetItemId === draggedItemId) {
                            console.log('Target is same as dragged item, no movement needed')
                            return
                        }
                        
                        // Calculate shift based on linePosition
                        let shift = 0
                        if (target.targetType === 'between-items') {
                            const linePosition = (target as any).linePosition
                            if (linePosition === 'bottom') {
                                // Place after the target item
                                shift = 1
                            } else { // linePosition === 'top'
                                // Place before the target item
                                shift = 0
                            }
                            console.log('linePosition:', linePosition, 'shift:', shift)
                        } else if (target.targetType === 'item') {
                            // Dropping on an item means making it a child (shift = 0)
                            shift = 0
                        }
                        
                        console.log('Calling setNodePosition with:', {
                            nodeId: draggedItemId,
                            targetId: targetItemId,
                            shift: shift
                        })
                        
                        try {
                            setNodePosition({
                                nodeId: draggedItemId,
                                targetId: targetItemId,
                                shift: shift
                            })
                        } catch (error) {
                            console.error('Error in setNodePosition:', error)
                        }
                    }
                }}
                canDragAndDrop={true}
                canReorderItems={true}
                canDropOnFolder={true}
            >
                <Tree 
                    treeId="navigator-tree" 
                    rootItem="virtual-root"
                    treeLabel="Navigator"
                />
            </UncontrolledTreeEnvironment>
        </>
    );
};



