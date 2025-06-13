import React, {useEffect} from 'react';
import {RichTreeView} from '@mui/x-tree-view/RichTreeView';
import {atom, useAtom, useAtomValue, useSetAtom, useStore} from "jotai";
import {
    jumpToNodeAtom,
    lastSelectedNodeBeforeJumpIdAtom,
    scrollToNodeAtom,
    selectedNodeAtom,
    treeAtom
} from "../TreeState/TreeState";
import {Node} from '../TreeState/entities';
import {useTreeViewApiRef} from "@mui/x-tree-view";
import {Button} from "@mui/material";
import UnfoldLessIcon from '@mui/icons-material/UnfoldLess';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

export const NavigatorItemsAtom = atom((get) => {
        const tree = get(treeAtom)
        let root: Node
        if (tree.metadata.rootId) {
            // if rootId is set, use it to find the root node
            root = get(tree.nodeDict[tree.metadata.rootId])
        } else {
            console.error("No rootId set in tree metadata, trying to find root node by parent == null. This may imply a bug.")
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
            const children = children_ids.map((childId) => get(tree.nodeDict[childId]))

            item.children = children.map((child) => {
                return {
                    id: child.id,
                    label: get(child.title),
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

const letterLimit = 15
const beforeJumpNodeTitleAtom = atom((get) => {
    const currTree = get(treeAtom)
    const lastSelectedNodeBeforeJumpId = get(lastSelectedNodeBeforeJumpIdAtom)
    if (lastSelectedNodeBeforeJumpId == "") {
        return ""
    }
    const title = get(get(currTree.nodeDict[lastSelectedNodeBeforeJumpId]).title)
    if (title.length > letterLimit) {
        return title.slice(0, letterLimit) + "..."
    }
    return title
})

const expandedItemsAtom = atom([])

function getAncestorIds(get, node, nodeDict) {
    const ancestors = []
    let currNode = node
    while (currNode.parent !== null) {
        currNode = get(nodeDict[currNode.parent])
        ancestors.push(currNode.id)
    }
    return ancestors.reverse()
}

export const NavigatorButtons = () => {
    const beforeJumpNodeTitle = useAtomValue(beforeJumpNodeTitleAtom)
    const [selectedNode, setSelectedNode] = useAtom(selectedNodeAtom)
    const lastSelectedNodeBeforeJumpId = useAtomValue(lastSelectedNodeBeforeJumpIdAtom)
    const [, setExpandedItems] = useAtom(expandedItemsAtom)
    const jumpToNode = useSetAtom(jumpToNodeAtom)
    const store = useStore()

    const handleGoBack = () => {
        jumpToNode(lastSelectedNodeBeforeJumpId)
    }
    const handleFold = () => {
        const ancestors = getAncestorIds(store.get, selectedNode, store.get(treeAtom).nodeDict)
        setExpandedItems((oldExpandedItems) => {
            return [selectedNode.id, ...ancestors]
        })
    }

    return <>
        <Button variant="contained" onClick={handleFold}><UnfoldLessIcon/></Button>
        {lastSelectedNodeBeforeJumpId != "" && lastSelectedNodeBeforeJumpId != selectedNode.id &&
            <Button variant="contained" onClick={handleGoBack}><ArrowBackIcon/>{beforeJumpNodeTitle}</Button>}
    </>;
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
        setExpandedItems((oldExpandedItems) => {
            return [...new Set([currId, ...oldExpandedItems])]
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



