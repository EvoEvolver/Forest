import {Node} from '../entities';
import {Atom, atom, PrimitiveAtom, WritableAtom} from 'jotai'
import * as Y from 'yjs'
import {Array as YArray, Map as YMap, Text as YText} from 'yjs'
import {YDocAtom} from "./YjsConnection";

export interface TreeAtomData {
    metadata: {}
    nodeDict: Record<string, Atom<Node>>
}

export const treeAtom = atom(
    {
        metadata: {},
        nodeDict: {}
    } as TreeAtomData | null)

function yjsNodeToJsonNodeAtom(yjsMapNode: YMap<any>): PrimitiveAtom<Node> {
    const node: Node = {
        id: yjsMapNode.get("id"),
        title: yjsMapNode.get("title").toJSON(),
        parent: yjsMapNode.get("parent"),
        other_parents: yjsMapNode.get("other_parents"),
        tabs: yjsMapNode.get("tabs"),
        children: yjsMapNode.get("children").toJSON(),
        ydata: yjsMapNode.get("ydata"),
        data: yjsMapNode.get("data"),
        tools: yjsMapNode.get("tools"),
        ymapForNode: yjsMapNode,
    }
    yjsMapNode.get("children").observe((e => {
        console.log("children changed", e.target.toJSON())
        node.children = e.target.toJSON()
    }))
    yjsMapNode.get("title").observe((e => {
        node.title = e.target.toJSON()
    }))
    return atom(node)
}

export const addNewNodeAtom = atom(null, (get, set, props: {parentId: string, tabs, tools}) => {
    const currTree = get(treeAtom)
    if (!currTree)
        return
    const nodeDict = currTree.nodeDict
    const parentNode = get(nodeDict[props.parentId])
    const yArrayChildren = parentNode.ymapForNode.get("children")
    const newNode = {
        id: crypto.randomUUID(),
        title: new YText("new node"),
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
    yArrayChildren.push([newNode.id])
})

export const addNodeToTreeAtom = atom(null, (get, set, yjsMapNode: YMap<any>) => {
    const currTree = get(treeAtom)
    if (!currTree)
        return
    const nodeDict = currTree.nodeDict
    const nodeId = yjsMapNode.get("id")
    let nodeAtom: Node = yjsNodeToJsonNodeAtom(yjsMapNode)
    set(treeAtom, {
        ...currTree,
        nodeDict: {
            ...nodeDict,
            [nodeId]: nodeAtom
        }
    })
    console.log("addNodeToTree", nodeDict)
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
    }
    else {
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
        if (!selectedNodeId){
            // iterate the values of the nodeDict and return the first one with no parent
            for (let key in currTree.nodeDict){
                if (!getNodeById(key, get).parent){
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
        //console.log(currentSelected.id, "s", get(lastSelectedNodeIdAtom), "haha", newSelectedNodeId)
        const newNode = getNodeById(newSelectedNodeId, get)
        if (!currentSelected) {
            set(selectedNodeIdAtom, newSelectedNodeId)
            setDefaultAncestors(newNode, currTree, get, set);
            return
        }
        const inChildren = currentSelected.children.indexOf(newSelectedNodeId) > -1;
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
        }else {
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

    if (!parentNode || parentNode.children.length === 0) {
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

    return selectedParentNode.children.map((id) => get(tree.nodeDict[id]));
})


export const setToNodeChildrenAtom = atom(null, (get, set, nodeid) => {
    set(selectedNodeIdAtom, nodeid)
    const currNode = get(selectedNodeAtom)
    if (!currNode || currNode.children.length == 0) return
    set(selectedNodeAtom, currNode.children[0])
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