import React, {useEffect} from 'react';
import {RichTreeView} from '@mui/x-tree-view/RichTreeView';
import {atom, useAtom, useAtomValue, useSetAtom} from "jotai";
import {
    jumpToNodeAtom,
    lastSelectedNodeBeforeJumpIdAtom,
    scrollToNodeAtom,
    selectedNodeAtom,
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
        const addChildren = (item) => {
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

export const NavigatorLayer = () => {
    const navigatorItems = useAtomValue(NavigatorItemsAtom)
    const [expandedItems, setExpandedItems] = useAtom(expandedItemsAtom)
    const selectedItems = useAtomValue(selectedItemAtom)
    const [selectedNode,] = useAtom(selectedNodeAtom)
    const apiRef = useTreeViewApiRef();
    const jumpToNode = useSetAtom(jumpToNodeAtom)
    const scrollToNode = useSetAtom(scrollToNodeAtom)
    useEffect(() => {
        const currId = selectedNode.id
        const parentIds = getAncestorIds(selectedNode)
        setExpandedItems((oldExpandedItems) => {
            return [...new Set([currId, ...parentIds, ...oldExpandedItems])]
        })
        const itemDom = apiRef.current.getItemDOMElement(selectedNode.id)
        if (itemDom) {
            itemDom.scrollIntoView({behavior: "smooth", inline: "center", block: "nearest"})
        }
    }, [selectedNode]);

    const handleExpandedItemsChange = (event, itemIds) => {
        setExpandedItems(itemIds)
    };

    const handleNewSelectedItemChange = (event, newItemId) => {
        jumpToNode(newItemId)
        if (scrollToNode) {
            setTimeout(() => {
                scrollToNode(newItemId)
            }, 100)
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
            />
        </>
    );
};



