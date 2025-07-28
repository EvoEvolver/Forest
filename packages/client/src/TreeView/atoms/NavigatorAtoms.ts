/**
 * Atoms and state management for NavigatorLayer component
 */

import { atom } from "jotai";
import { selectedNodeAtom, treeAtom } from "../../TreeState/TreeState";
import { NodeVM } from '@forest/schema';

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
});

export const selectedItemAtom = atom((get) => {
    const selectedNode = get(selectedNodeAtom)
    if (!selectedNode || !selectedNode.id) {
        return []
    }
    return [selectedNode.id]
});

export const expandedItemsAtom = atom([]);

/**
 * Helper function to get ancestor IDs for a node
 */
export function getAncestorIds(node: NodeVM): string[] {
    if (!node || !node.nodeM) {
        return []
    }
    const ancestorIds = []
    let nodeM = node.nodeM
    const treeM = nodeM.treeM;
    while(true){
        const parent = treeM.getParent(nodeM)
        if (!parent) {
            break;
        }
        ancestorIds.push(parent.id)
        nodeM = parent
    }
    return ancestorIds;
}