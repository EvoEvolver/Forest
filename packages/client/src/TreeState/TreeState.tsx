import {atom, PrimitiveAtom} from 'jotai'
import {YjsProviderAtom} from "./YjsConnection";
import {RESET} from 'jotai/utils';
import {v4 as uuidv4} from 'uuid';
import {updateChildrenCountAtom} from "./childrenCount";
import {treeId} from "../appState";
import {NodeJson, NodeM, TreeM, TreeVM} from "@forest/schema"
import {supportedNodeTypes} from "@forest/node-types";

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
        treeVM.supportedNodesTypes = supportedNodeTypes
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
    const newNodeM = NodeM.fromNodeJson(newNodeJson)
    treeM.insertNode(newNodeM, props.parentId, props.positionId)

    set(updateChildrenCountAtom, {});
})


export const selectedNodeIdAtom = atom("")

export const scrollToNodeAtom = atom(null, (get, set, nodeId: string) => {
    const nodeElement = document.querySelector(`#node-${nodeId}`);
    if (nodeElement) {
        nodeElement.scrollIntoView({behavior: 'instant', block: 'start'});
    }
})

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




