import {Node, TreeData} from './entities';
import {atom, WritableAtom} from 'jotai'

export const selectedTreeIdAtom = atom<string>("")
export const treesMapAtom = atom<Record<string, TreeData>>({})

export const selectedTreeAtom = atom((get) => {
        const treeId = get(selectedTreeIdAtom)
        if (!treeId) {
            if (Object.keys(get(treesMapAtom)).length === 0)
                return null
            return get(treesMapAtom)[Object.keys(get(treesMapAtom))[0]]
        }
        return get(treesMapAtom)[treeId]
    }, (get, set, newTreeId: string) => {
        set(selectedTreeIdAtom, newTreeId)
    }
)

export const selectedNodeIdAtom = atom("")

function setDefaultAncestors(newNode: Node, currTree: TreeData, set: <Value, Args extends unknown[], Result>(atom: WritableAtom<Value, Args, Result>, ...args: Args) => Result) {
    const parents = []
    let oneParent = newNode.parent
    while (oneParent) {
        parents.push(oneParent)
        oneParent = currTree.nodeDict[oneParent].parent
    }
    set(ancestorStackAtom, parents)
}

export const selectedNodeAtom = atom(
    (get) => {
        const currTree = get(selectedTreeAtom)
        if (!currTree)
            return null
        const selectedNodeId = get(selectedNodeIdAtom)
        if (!selectedNodeId){
            // iterate the values of the nodeDict and return the first one with no parent
            for (let key in currTree.nodeDict){
                if (!currTree.nodeDict[key].parent){
                    return currTree.nodeDict[key]
                }
            }
        }
        return currTree.nodeDict[selectedNodeId]
    },
    (get, set, newSelectedNodeId: string) => {
        if (get(selectedNodeIdAtom) === newSelectedNodeId)
            return
        const currTree = get(selectedTreeAtom)
        if (!currTree)
            return
        const currentSelected = currTree.nodeDict[get(selectedNodeIdAtom)]
        const newNode = currTree.nodeDict[newSelectedNodeId];
        if (!currentSelected) {
            set(selectedNodeIdAtom, newSelectedNodeId)
            setDefaultAncestors(newNode, currTree, set);
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
            setDefaultAncestors(newNode, currTree, set);
        }
    }
)

export const ancestorStackAtom = atom<string[]>([])

export const ancestorStackNodesAtom = atom<Node[]>((get) => {
    const ancestorStack = get(ancestorStackAtom)
    const currTree = get(selectedTreeAtom)
    return ancestorStack.map((id) => currTree.nodeDict[id])
})

export const listOfNodesForViewAtom = atom<Node[]>((get) => {
    const node = get(selectedNodeAtom)
    if (!node) return []

    const tree = get(selectedTreeAtom)

    const parentNode = tree.nodeDict[node.parent];

    if (!parentNode || parentNode.children.length === 0) {
        return [node]; // If there's no parent or no siblings, return an empty array
    }

    const lastSelectedParent = get(ancestorStackAtom)[0]
    // Find the parent of the given node
    let selectedParentNode
    if (node.parent === lastSelectedParent) {
        selectedParentNode = parentNode;
    } else {
        // check whether the selectedParent is the other parent of the node
        for (const otherParentId of node.other_parents) {
            if (otherParentId === lastSelectedParent) {
                selectedParentNode = tree.nodeDict[otherParentId];
                break;
            }
        }
    }
    if (!selectedParentNode) {
        selectedParentNode = parentNode;
    }

    return selectedParentNode.children.map((id) => tree.nodeDict[id]);
})

export const currNodeChildrenAtom = atom<Node[]>((get) => {
    const currNode = get(selectedNodeAtom)
    if (!currNode) return []
    const currTree = get(selectedTreeAtom)
    return currNode.children.map((i: string) => currTree.nodeDict[i]) as Node[];
})

export const currNodeAncestorsAtom = atom<Node[]>((get) => {
        const currNode = get(selectedNodeAtom)
        if (!currNode) return []
        const currTree = get(selectedTreeAtom)
        const ancestors = []
        let parent = currTree.nodeDict[currNode.parent]
        while (parent) {
            ancestors.push(parent)
            parent = currTree.nodeDict[parent.parent]
        }
        return ancestors
    }
)


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