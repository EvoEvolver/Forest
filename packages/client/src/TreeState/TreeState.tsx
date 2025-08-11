import {atom, PrimitiveAtom} from 'jotai'
import {YjsProviderAtom} from "./YjsConnection";
import {RESET} from 'jotai/utils';
import {v4 as uuidv4} from 'uuid';
import {updateChildrenCountAtom} from "./childrenCount";
import {treeId} from "../appState";
import {NodeJson, NodeM, TreeM, TreeVM} from "@forest/schema"
import {wouldCreateCycle} from "../TreeView/utils/NodeTypeUtils";

const treeValueAtom: PrimitiveAtom<TreeVM> = atom()

export const treeAtom = atom(
    (get): TreeVM => {
        return get(treeValueAtom)
    },
    (get, set, treeM: TreeM) => {
        const currentTree = get(treeValueAtom)
        if (currentTree) {
            currentTree.deconstruct()
        }
        const treeVM = new TreeVM(treeM, get, set)
        set(treeValueAtom, treeVM)
    }
)


export const deleteNodeAtom = atom(null, (get, set, props: { nodeId: string }) => {
    const currTree = get(treeAtom)
    if (!currTree)
        return
    const nodeDict = currTree.nodeDict
    const nodeToRemoveAtom = nodeDict[props.nodeId]
    const nodeToRemove = get(nodeToRemoveAtom)
    if (get(nodeToRemove.children).length > 0) {
        return
    }
    const parentId = nodeToRemove.parent
    const parentNodeAtom = nodeDict[parentId]
    const parentNode = get(parentNodeAtom)
    const yArrayChildren = parentNode.nodeM.ymap.get("children")
    const Idx = yArrayChildren.toJSON().indexOf(props.nodeId)
    if (Idx === -1) {
        console.warn(`Node with id ${props.nodeId} not found in parent with id ${parentId}`)
        return
    }
    // remove the node from the parent's children
    yArrayChildren.delete(Idx, 1)
    // delete the node from the nodeDict
    // @ts-ignore
    set(nodeToRemoveAtom, RESET)
    currTree.deleteNode(props.nodeId)

    if (get(selectedNodeIdAtom) === props.nodeId) {
        // if the deleted node was selected, set the selectedNodeId to the parent
        const newChildrenList = yArrayChildren.toJSON()
        if (newChildrenList.length > 0) {
            // if there are still children, select the first one
            set(selectedNodeIdAtom, newChildrenList[0])
        } else {
            // if there are no children, select the parent
            set(selectedNodeIdAtom, parentId)
        }
    }

    set(updateChildrenCountAtom, {});
})


/*
* This atom is used to set the position of a node in the tree.
* The position is determined by the targetId and the shift value.
* The targetId is the id of the node that the current node should be moved relative to.
* The shift value is the number of positions to move the current node.
*/
export const setNodePositionAtom = atom(null, (get, set, props: {
    nodeId: string,
    targetId: string,
    shift: number
}) => {
    console.log(props)
    const currTree = get(treeAtom)
    if (!currTree)
        return

    const nodeDict = currTree.nodeDict
    const nodeToMoveAtom = nodeDict[props.nodeId]
    const nodeToMove = get(nodeToMoveAtom)

    // Get the parent node
    const parentId = nodeToMove.parent
    const parentNodeAtom = nodeDict[parentId]
    const parentNode = get(parentNodeAtom)
    const yArrayChildren = parentNode.nodeM.ymap.get("children")

    // Find current position of the node
    const currentIdx = get(parentNode.children).indexOf(props.nodeId)
    if (currentIdx === -1) {
        console.warn(`Node with id ${props.nodeId} not found in parent with id ${parentId}`)
        return
    }

    // Find target position
    const targetIdx = get(parentNode.children).indexOf(props.targetId)
    if (targetIdx === -1) {
        console.warn(`Target node with id ${props.targetId} not found in parent with id ${parentId}`)
        return
    }

    // Calculate new position based on target position and shift, accounting for the deletion
    let newPosition = targetIdx + props.shift - (currentIdx < targetIdx ? 1 : 0)
    // Ensure new position is within bounds
    newPosition = Math.max(0, Math.min(newPosition, yArrayChildren.length - 1))

    yArrayChildren.doc.transact(() => {
        yArrayChildren.delete(currentIdx, 1)
        yArrayChildren.insert(newPosition, [props.nodeId])
    })
    
    set(updateChildrenCountAtom, {});
})

/*
* This atom is used to move a node between different subtrees/levels.
* It can change the parent of a node and position it relative to a target sibling.
* newParentId: the id of the new parent node
* targetId: the id of the node that the current node should be moved relative to (must be child of newParentId)
* shift: 0 = before target, 1 = after target
*/
export const moveNodeToSubtreeAtom = atom(null, (get, set, props: {
    nodeId: string,
    newParentId: string,
    targetId: string,
    shift: number
}) => {
    console.log('moveNodeToSubtree:', props)
    const currTree = get(treeAtom)
    if (!currTree)
        return
    const treeM: TreeM = currTree.treeM

    const nodeDict = currTree.nodeDict
    const nodeToMoveAtom = nodeDict[props.nodeId]
    const nodeToMove = get(nodeToMoveAtom)

    if (wouldCreateCycle(treeM, props.nodeId, props.newParentId)) {
        console.warn(`Cannot move node ${props.nodeId} to ${props.newParentId}: would create a loop`)
        return
    }

    // Get the old parent node
    const oldParentId = nodeToMove.parent
    const oldParentNodeAtom = nodeDict[oldParentId]
    const oldParentNode = get(oldParentNodeAtom)
    const oldParentChildren = oldParentNode.nodeM.ymap.get("children")

    // Get the new parent node
    const newParentNodeAtom = nodeDict[props.newParentId]
    if (!newParentNodeAtom) {
        console.warn(`New parent with id ${props.newParentId} not found`)
        return
    }
    const newParentNode = get(newParentNodeAtom)
    const newParentChildren = newParentNode.nodeM.ymap.get("children")

    // Find current position in old parent
    const currentIdx = get(oldParentNode.children).indexOf(props.nodeId)
    if (currentIdx === -1) {
        console.warn(`Node with id ${props.nodeId} not found in old parent with id ${oldParentId}`)
        return
    }

    // Handle special case where target is same as node being moved (empty folder case)
    let newPosition = 0
    if (props.targetId === props.nodeId) {
        // Adding to empty folder - place at beginning
        newPosition = 0
    } else {
        // Find target position in new parent
        const targetIdx = get(newParentNode.children).indexOf(props.targetId)
        if (targetIdx === -1) {
            console.warn(`Target node with id ${props.targetId} not found in new parent with id ${props.newParentId}`)
            return
        }

        // Calculate new position based on target position and shift
        newPosition = targetIdx + props.shift
        // Ensure new position is within bounds
        newPosition = Math.max(0, Math.min(newPosition, newParentChildren.length))
    }

    // Perform the move in a transaction
    oldParentChildren.doc.transact(() => {
        // 1. Remove from old parent
        oldParentChildren.delete(currentIdx, 1)
        
        // 2. Update the node's parent reference
        nodeToMove.nodeM.ymap.set("parent", props.newParentId)
        
        // 3. Insert into new parent at calculated position
        newParentChildren.insert(newPosition, [props.nodeId])
    })
    
    set(updateChildrenCountAtom, {});
    console.log(`Moved node ${props.nodeId} from parent ${oldParentId} to parent ${props.newParentId} at position ${newPosition}`)
})


export const addNewNodeAtom = atom(null, (get, set, props: {
    parentId: string,
    positionId: string,
    nodeTypeName: string
}) => {
    const currTree = get(treeAtom)
    if (!currTree)
        return
    const treeM = currTree.treeM

    const newNodeJson: NodeJson = {
        id: uuidv4(),
        title: "",
        parent: props.parentId,
        children: [],
        data: {},
        nodeTypeName: props.nodeTypeName
    }
    const newNodeM = NodeM.fromNodeJson(newNodeJson, treeM)
    treeM.insertNode(newNodeM, props.parentId, props.positionId)

    set(updateChildrenCountAtom, {});
})


export const selectedNodeIdAtom = atom("")

// @ts-ignore
export const markedNodesAtom = atom<Set<string>>(new Set())

export const toggleMarkedNodeAtom = atom(null, (get, set, nodeId: string) => {
    const markedNodes = get(markedNodesAtom)
    const newMarkedNodes = new Set(markedNodes)
    
    if (newMarkedNodes.has(nodeId)) {
        newMarkedNodes.delete(nodeId)
    } else {
        newMarkedNodes.add(nodeId)
    }
    
    set(markedNodesAtom, newMarkedNodes)
})

export const markedNodesCountAtom = atom((get) => {
    const markedNodes = get(markedNodesAtom)
    return markedNodes.size
})

export const clearAllMarkedNodesAtom = atom(null, (get, set) => {
    set(markedNodesAtom, new Set())
})

export const scrollToNodeAtom = atom(null, (get, set, nodeId: string) => {
    const nodeElement = document.querySelector(`#node-${nodeId}`);
    if (nodeElement) {
        // Find the scrollable ancestor
        const scrollableContainer = findScrollableParent(nodeElement);

        if (scrollableContainer) {
            const offset = 200;
            const containerRect = scrollableContainer.getBoundingClientRect();
            const elementRect = nodeElement.getBoundingClientRect();
            const targetScrollTop = scrollableContainer.scrollTop + (elementRect.top - containerRect.top) - offset;

            scrollableContainer.scrollTo({
                top: targetScrollTop,
                behavior: 'instant'
            });
        }
    }
});

function findScrollableParent(element: Element): Element | null {
    let parent = element.parentElement;

    while (parent) {
        const computedStyle = window.getComputedStyle(parent);
        const overflowY = computedStyle.overflowY;

        if (overflowY === 'scroll' || overflowY === 'auto') {
            // Check if it actually has scrollable content
            if (parent.scrollHeight > parent.clientHeight) {
                return parent;
            }
        }

        parent = parent.parentElement;
    }

    return null;
}

const nodesIdBeforeJumpAtom = atom<string[]>([])

export const lastSelectedNodeBeforeJumpIdAtom = atom("")

export const jumpToNodeAtom = atom(null, (get, set, nodeid: string) => {
    const currSelectedNodeId = get(selectedNodeIdAtom)
    if (currSelectedNodeId === nodeid) {
        return
    }
    const nodesIdBeforeJump = get(nodesIdBeforeJumpAtom)
    const lastSelectedNodeId = get(lastSelectedNodeBeforeJumpIdAtom)

    if (lastSelectedNodeId === nodeid) {
        nodesIdBeforeJump.pop()
        let newLastSelectedNodeId = nodesIdBeforeJump[nodesIdBeforeJump.length - 1]
        newLastSelectedNodeId = newLastSelectedNodeId ? newLastSelectedNodeId : ""
        set(lastSelectedNodeBeforeJumpIdAtom, newLastSelectedNodeId)
        set(selectedNodeAtom, nodeid)
        return
    } else {
        nodesIdBeforeJump.push(get(selectedNodeIdAtom))
        if (nodesIdBeforeJump.length > 15) {
            nodesIdBeforeJump.shift() // keep the last 10 nodes
        }
        set(lastSelectedNodeBeforeJumpIdAtom, currSelectedNodeId)
        set(selectedNodeAtom, nodeid)
        return
    }

})

export const selectedNodeAtom = atom(
    (get) => {
        const currTree = get(treeAtom)
        const selectedNodeId = get(selectedNodeIdAtom)

        // Add dependency on reRenderFlag to ensure updates when tree structure changes
        if (currTree) {
            get(currTree.viewCommitNumberAtom)
        }

        if (!selectedNodeId) {
            return null
        }

        if (!currTree || Object.keys(currTree.nodeDict).length === 0)
            return null

        const currSelectedNodeAtom = currTree.nodeDict[selectedNodeId]
        if (currSelectedNodeAtom) {
            return get(currSelectedNodeAtom)
        } else {
            return null
        }
    },
    (get, set, newSelectedNodeId: string) => {
        if (get(selectedNodeIdAtom) === newSelectedNodeId)
            return
        const currTree = get(treeAtom)
        if (!currTree)
            return
        set(selectedNodeIdAtom, newSelectedNodeId)
        localStorage.setItem(`${treeId}_selectedNodeId`, newSelectedNodeId)
        const awareness = get(YjsProviderAtom)?.awareness
        if (awareness) {
            awareness.setLocalStateField("selectedNodeId", newSelectedNodeId)
        }
    }
)

export const currNodeParentIdAtom = atom((get) => {
    const currNode = get(selectedNodeAtom)
    if (!currNode) return null
    return currNode.parent
})


export const listOfNodesForViewAtom = atom(
    (get) => {
        const tree = get(treeAtom)
        if (!tree) {
            return []
        }
        get(tree.viewCommitNumberAtom)
        if (Object.keys(tree.nodeDict).length === 0) {
            return []; // If there are no nodes, return an empty array
        }
        const parentNodeId = get(currNodeParentIdAtom)
        if (!parentNodeId) {
            const rootNodeAtom =
                tree.nodeDict[get(tree.metadata).rootId]
            if (!rootNodeAtom) {
                return []; // If there's no root node, return an empty array
            }
            return [get(tree.nodeDict[get(tree.metadata).rootId])]; // If there's no parent, return the root
        }
        const parentNodeAtom = tree.nodeDict[parentNodeId]
        const parentNode = get(parentNodeAtom)
        return get(parentNode.children)
            .map((id) => tree.nodeDict[id])
            .filter((nodeAtom) => nodeAtom !== undefined)
            .map((nodeAtom) => get(nodeAtom))
    }
)

export const setToNodeChildrenAtom = atom(null, (get, set, nodeid) => {
    set(selectedNodeIdAtom, nodeid)
    const currNode = get(selectedNodeAtom)
    if (!currNode || get(currNode.children).length == 0) return
    const firstChild = get(currNode.children)[0]
    set(selectedNodeAtom, firstChild)
    setTimeout(() => {
        set(scrollToNodeAtom, firstChild)
    })
})


export const setToNodeParentAtom = atom(null, (get, set, nodeid) => {
    set(selectedNodeIdAtom, nodeid)
    const currNode = get(selectedNodeAtom)
    if (!currNode || !currNode.parent) return
    set(selectedNodeAtom, currNode.parent)
})




