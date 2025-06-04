import {Node} from '../entities';
import {Atom, atom, PrimitiveAtom, WritableAtom} from 'jotai'
import {Array as YArray, Map as YMap, Text as YText} from 'yjs'
import {YDocAtom} from "./YjsConnection";
import { RESET } from 'jotai/utils';

export interface TreeAtomData {
    metadata: {}
    nodeDict: Record<string, Atom<Node>>
}

export const treeAtom = atom(
    {
        metadata: {
        },
        nodeDict: {}
    } as TreeAtomData | null)

export const setTreeMetadataAtom = atom(null, (get, set, metadata: Record<string, any>) => {
    const currTree = get(treeAtom)
    if (!currTree)
        return
    set(treeAtom, {
        ...currTree,
        metadata: {
            ...currTree.metadata,
            ...metadata
        }
    })
})

function yjsNodeToJsonNode(yjsMapNode: YMap<any>): Node {

    //const titleAtom = atom(yjsMapNode.get("title").toJSON())
    const childrenAtom = getYjsBindedAtom(yjsMapNode, "children")
    const titleAtom = atom(yjsMapNode.get("title"))
    const node: Node = {
        id: yjsMapNode.get("id"),
        title: titleAtom,
        parent: yjsMapNode.get("parent"),
        other_parents: yjsMapNode.get("other_parents"),
        tabs: yjsMapNode.get("tabs"),
        children: childrenAtom,
        ydata: yjsMapNode.get("ydata"),
        data: yjsMapNode.get("data"),
        tools: yjsMapNode.get("tools"),
        ymapForNode: yjsMapNode,
    }
    return node
}

function getYjsBindedAtom(yjsMapNode: YMap<any>, key: string): PrimitiveAtom<any> {
    const yjsValue = yjsMapNode.get(key)
    // check if yjsValue has a toJSON method, if not, return a simple atom
    let yjsAtom: PrimitiveAtom<any>;
    if (typeof yjsValue.toJSON === 'function') {
        yjsAtom = atom(yjsValue.toJSON())
    }
    else {
        console.warn(`Yjs value for key "${key}" does not have a toJSON method, using a simple atom instead.`);
    }
    yjsAtom.onMount = (set) => {
        const observeFunc = (ymapEvent) => {
            set(yjsValue.toJSON())
        }
        yjsValue.observe(observeFunc)
        set(yjsValue.toJSON())
        return () => {
            yjsValue.unobserve(observeFunc)
        }
    }
    return yjsAtom
}

function yjsNodeToJsonNodeAtom(yjsMapNode: YMap<any>): PrimitiveAtom<Node> {
    const node: Node = yjsNodeToJsonNode(yjsMapNode)
    const nodeAtom = atom(node)
    nodeAtom.onMount = (set) => {
        const observeFunc = (ymapEvent) => {
            ymapEvent.changes.keys.forEach((change, key) => {
                if (change.action !== 'update') {
                    throw Error(`Property "${key}" was ${change.action}, which is not supported.`)
                }
            })
            const newNode: Node = yjsNodeToJsonNode(yjsMapNode)
            set(newNode)
        }
        yjsMapNode.observe(observeFunc)
        const newNode: Node = yjsNodeToJsonNode(yjsMapNode)
        set(newNode)
        return () => {
            yjsMapNode.unobserve(observeFunc)
        }
    }
    return nodeAtom
}

export const deleteNodeAtom = atom(null, (get, set, props: {nodeId: string}) => {
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
    const yArrayChildren = parentNode.ymapForNode.get("children")
    const Idx = yArrayChildren.toJSON().indexOf(props.nodeId)
    if (Idx === -1) {
        console.warn(`Node with id ${props.nodeId} not found in parent with id ${parentId}`)
        return
    }
    // remove the node from the parent's children
    yArrayChildren.delete(Idx, 1)
    // delete the node from the nodeDict
    set(nodeToRemoveAtom, RESET)
    delete nodeDict[props.nodeId]
    set(treeAtom, {
        ...currTree,
        nodeDict: {
            ...nodeDict
        }
    })
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
})

/*
* This atom is used to set the position of a node in the tree.
* The position is determined by the targetId and the shift value.
* The targetId is the id of the node that the current node should be moved relative to.
* The shift value is the number of positions to move the current node.
*/
export const setNodePositionAtom = atom(null, (get, set, props: { nodeId: string, targetId: string, shift: number }) => {
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
    const yArrayChildren = parentNode.ymapForNode.get("children")

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


export const addNewNodeAtom = atom(null, (get, set, props: { parentId: string, positionId: string, tabs, tools }) => {
    const currTree = get(treeAtom)
    if (!currTree)
        return
    const nodeDict = currTree.nodeDict
    const parentNodeAtom = nodeDict[props.parentId]
    const parentNode = get(parentNodeAtom)
    const yArrayChildren = parentNode.ymapForNode.get("children")
    const newNode = {
        id: crypto.randomUUID(),
        title: "new node",//new YText("new node"),
        parent: props.parentId,
        other_parents: [],
        tabs: props.tabs,
        children: new YArray(),
        ydata: new YMap(),
        data: {},
        tools: props.tools,
    }
    const nodeDictyMap: YMap<YMap<any>> = get(YDocAtom).getMap("nodeDict")
    const ymapForNode = new YMap()
    for (let key in newNode) {
        ymapForNode.set(key, newNode[key])
    }
    nodeDictyMap.set(newNode.id, ymapForNode)

    // find the position of the node with positionId in yArrayChildren
    let positionIdx = -1
    if (props.positionId) {
        positionIdx = get(parentNode.children).indexOf(props.positionId) + 1
        if (positionIdx === -1) {
            console.warn(`Position ID ${props.positionId} not found in parent with id ${props.parentId}`)
            positionIdx = yArrayChildren.length // append to the end
        }
    } else {
        positionIdx = yArrayChildren.length // append to the end
    }
    yArrayChildren.insert(positionIdx, [newNode.id])
})

export const addNodeToTreeAtom = atom(null, (get, set, yjsMapNode: YMap<any>) => {
    const currTree = get(treeAtom)
    if (!currTree)
        return
    const nodeDict = currTree.nodeDict
    const nodeId = yjsMapNode.get("id")
    let nodeAtom: PrimitiveAtom<Node> = yjsNodeToJsonNodeAtom(yjsMapNode)
    set(treeAtom, {
        ...currTree,
        nodeDict: {
            ...nodeDict,
            [nodeId]: nodeAtom
        }
    })
})

export const deleteNodeFromTreeAtom = atom(null, (get, set, nodeId: string) => {
    const currTree = get(treeAtom)
    if (!currTree)
        return
    const nodeDict = currTree.nodeDict
    delete nodeDict[nodeId]
    set(treeAtom, {
        ...currTree,
        nodeDict: {
            ...nodeDict
        }
    })
})


export const selectedNodeIdAtom = atom("")

function getNodeById(nodeId, get): Node {
    const currTree = get(treeAtom)
    if (!currTree)
        return null
    let nodeAtom = currTree.nodeDict[nodeId]
    if (!nodeAtom)
        return null
    return get(nodeAtom)
}

function setDefaultAncestors(newNode: Node, currTree: TreeAtomData, get, set: <Value, Args extends unknown[], Result>(atom: WritableAtom<Value, Args, Result>, ...args: Args) => Result) {
    const parents = []
    let oneParent = newNode.parent
    while (oneParent) {
        parents.push(oneParent)
        oneParent = getNodeById(oneParent, get).parent
    }
    set(ancestorStackAtom, parents)
}


const nodesIdBeforeJumpAtom = atom<string[]>([])

export const lastSelectedNodeBeforeJumpIdAtom = atom("")

export const jumpToNodeAtom = atom(null, (get, set, nodeid) => {
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
        set(selectedNodeIdAtom, nodeid)
        return
    } else {
        nodesIdBeforeJump.push(get(selectedNodeIdAtom))
        set(lastSelectedNodeBeforeJumpIdAtom, currSelectedNodeId)
        set(selectedNodeIdAtom, nodeid)
        return
    }

})

export const selectedNodeAtom = atom(
    (get) => {
        const currTree = get(treeAtom)
        if (!currTree || Object.keys(currTree.nodeDict).length === 0)
            return null
        const selectedNodeId = get(selectedNodeIdAtom)
        if (!selectedNodeId) {
            // iterate the values of the nodeDict and return the first one with no parent
            for (let key in currTree.nodeDict) {
                if (!getNodeById(key, get).parent) {
                    return get(currTree.nodeDict[key])
                }
            }
        }
        return get(currTree.nodeDict[selectedNodeId])
    },
    (get, set, newSelectedNodeId: string) => {
        if (get(selectedNodeIdAtom) === newSelectedNodeId)
            return
        const currTree = get(treeAtom)
        if (!currTree)
            return
        const currentSelected = getNodeById(get(selectedNodeIdAtom), get)
        const newNode = getNodeById(newSelectedNodeId, get)
        if (!currentSelected) {
            set(selectedNodeIdAtom, newSelectedNodeId)
            setDefaultAncestors(newNode, currTree, get, set);
            return
        }
        const inChildren = get(currentSelected.children).indexOf(newSelectedNodeId) > -1;
        const ancestorStack = get(ancestorStackAtom)

        set(selectedNodeIdAtom, newSelectedNodeId)

        if (inChildren) {
            set(ancestorStackAtom, [currentSelected.id, ...ancestorStack])
            return
        }

        let matched_ancestor = null;
        for (let ancestor of ancestorStack) {
            if (ancestor == newNode.parent) {
                matched_ancestor = ancestor;
                break
            }
            for (let other_parent of newNode.other_parents) {
                if (other_parent === ancestor) {
                    matched_ancestor = ancestor;
                    break
                }
            }
        }

        if (matched_ancestor) {
            set(ancestorStackAtom, ancestorStack.slice(ancestorStack.indexOf(matched_ancestor)))
        } else {
            setDefaultAncestors(newNode, currTree, get, set);
        }
    }
)

export const ancestorStackAtom = atom<string[]>([])

export const ancestorStackNodesAtom = atom<Node[]>((get) => {
    const ancestorStack = get(ancestorStackAtom)
    const currTree = get(treeAtom)
    return ancestorStack.map((id) => get(currTree.nodeDict[id]))
})

export const listOfNodesForViewAtom = atom<Node[]>((get) => {
    const currNode = get(selectedNodeAtom)
    if (!currNode) return []

    const tree = get(treeAtom)

    const parentNodeAtom = tree.nodeDict[currNode.parent]

    if (!parentNodeAtom) {
        return [currNode]; // If there's no parent, return the node itself
    }
    const parentNode = get(parentNodeAtom)

    if (!parentNode || get(parentNode.children).length === 0) {
        return [currNode]; // If there's no parent or no siblings, return an empty array
    }

    const lastSelectedParent = get(ancestorStackAtom)[0]
    // Find the parent of the given node
    let selectedParentNode
    if (currNode.parent === lastSelectedParent) {
        selectedParentNode = parentNode;
    } else {
        // check whether the selectedParent is the other parent of the node
        for (const otherParentId of currNode.other_parents) {
            if (otherParentId === lastSelectedParent) {
                selectedParentNode = tree.nodeDict[otherParentId];
                break;
            }
        }
    }
    if (!selectedParentNode) {
        selectedParentNode = parentNode;
    }

    return get(selectedParentNode.children).map((id) => get(tree.nodeDict[id]));
})


export const setToNodeChildrenAtom = atom(null, (get, set, nodeid) => {
    set(selectedNodeIdAtom, nodeid)
    const currNode = get(selectedNodeAtom)
    if (!currNode || get(currNode.children).length == 0) return
    set(selectedNodeAtom, get(currNode.children)[0])
})


export const setToNodeParentAtom = atom(null, (get, set, nodeid) => {
    set(selectedNodeIdAtom, nodeid)
    const currNode = get(selectedNodeAtom)
    if (!currNode || !currNode.parent) return
    const lastSelectedParent = get(ancestorStackAtom)[0]
    if (currNode.parent !== lastSelectedParent) {
        if (currNode.other_parents.indexOf(lastSelectedParent) > -1) {
            set(selectedNodeAtom, lastSelectedParent)
            return
        }
    }
    set(selectedNodeAtom, currNode.parent)
})


export const darkModeAtom = atom(false)


/*** Authentication related atoms ***/

// Authentication related atoms
export interface User {
    id: string
    email: string
    [key: string]: any
}

// User authentication state
export const userAtom = atom<User | null>(null)

// Auth token (JWT from Supabase)
export const authTokenAtom = atom<string | null>(null)

// Authentication status
export const isAuthenticatedAtom = atom((get) => {
    const user = get(userAtom)
    const token = get(authTokenAtom)
    return user !== null && token !== null
})

// Supabase client atom (will be initialized in App.tsx)
export const supabaseClientAtom = atom<any>(null)

// Auth modal open state
export const authModalOpenAtom = atom(false)

// User permissions (draft)
export interface UserPermissions {
    canUseAI: boolean
    canUploadFiles: boolean
    maxFileSize: number // in MB
    // Future permissions can be added here
    [key: string]: any
}

export const userPermissionsAtom = atom<UserPermissions>({
    canUseAI: false,
    canUploadFiles: false,
    maxFileSize: 0
})