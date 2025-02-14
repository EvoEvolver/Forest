import React, {useEffect} from 'react';
import { RichTreeView } from '@mui/x-tree-view/RichTreeView';
import {atom, useAtomValue} from "jotai/index";
import {
    ancestorStackNodesAtom,
    currNodeChildrenAtom,
    darkModeAtom, getNodeChildren,
    listOfNodesForViewAtom, selectedNodeAtom, selectedTreeAtom
} from "../TreeState";
import { Node } from '../entities';
import {useAtom} from "jotai";


export const NavigatorItemsAtom = atom((get) =>
    {
        const tree = get(selectedTreeAtom)
        const currNodeAncestors = get(ancestorStackNodesAtom)
        const selectedNode = get(selectedNodeAtom)
        let root: Node
        if (currNodeAncestors.length > 0) {
            root = currNodeAncestors[currNodeAncestors.length - 1]
        }
        else {
            root = selectedNode
        }
        let children_list = []
        const itemTree = [{
            id: root.id,
            label: root.title,
            children: children_list,
        }]
        // iterate itemTree to add children
        const addChildren = (item) => {
            const children = getNodeChildren(item.id, tree)
            item.children = children.map((child) => {
            return {
                id: child.id,
                label: child.title,
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


const expandedItemsAtom = atom((get) => {
    const selectedNode = get(selectedNodeAtom)
    return [selectedNode.id]
})

const NewNavigatorLayer = () => {
    const dark = useAtomValue(darkModeAtom)
    const currNodeChildren = useAtomValue(currNodeChildrenAtom)
    const listOfNodesForView = useAtomValue(listOfNodesForViewAtom)
    const currNodeAncestors = useAtomValue(ancestorStackNodesAtom)
    const navigatorItems = useAtomValue(NavigatorItemsAtom)
    const [expandedItems, setExpandedItems] = React.useState([]);
    const selectedItems = useAtomValue(selectedItemAtom)
    const [selectedNode, setSelectedNode] = useAtom(selectedNodeAtom)

    useEffect(() => {
        // ensure all the ancestors are expanded
        const ancestors = currNodeAncestors.map((node) => node.id)
        setExpandedItems((oldExpandedItems) => {
            return [...new Set([...oldExpandedItems, ...ancestors])]
        })
    }, [currNodeAncestors]);

    const handleExpandedItemsChange = (event, itemIds) => {
        setExpandedItems(itemIds)
    };

    const handleNewSelectedItemChange = (event, newItemId) => {
        setSelectedNode(newItemId)
    }


    return (
        <>
            <RichTreeView
                items={navigatorItems}
                selectedItems={selectedItems}
                expandedItems={expandedItems}
                onExpandedItemsChange={handleExpandedItemsChange}
                onSelectedItemsChange={handleNewSelectedItemChange}
            />
        </>
    );
};


export default NewNavigatorLayer;
