import React, {useEffect} from 'react';
import { RichTreeView } from '@mui/x-tree-view/RichTreeView';
import {atom, useAtomValue} from "jotai/index";
import {
    ancestorStackNodesAtom,
    currNodeChildrenAtom,
    darkModeAtom, getNodeChildren, lastSelectedNodeBeforeJumpIdAtom,
    listOfNodesForViewAtom, selectedNodeAtom, selectedNodeIdAtom, selectedTreeAtom
} from "../TreeState";
import { Node } from '../entities';
import {useAtom} from "jotai";
import {useTreeViewApiRef} from "@mui/x-tree-view";
import {Button, Paper} from "@mui/material";
import UnfoldLessIcon from '@mui/icons-material/UnfoldLess';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
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

const letterLimit = 10
const beforeJumpNodeTitleAtom = atom((get) => {
    const currTree = get(selectedTreeAtom)
    const lastSelectedNodeBeforeJumpId = get(lastSelectedNodeBeforeJumpIdAtom)
    if (lastSelectedNodeBeforeJumpId == "") {
        return ""
    }
    const title = currTree.nodeDict[lastSelectedNodeBeforeJumpId].title
    if(title.length > letterLimit) {
        return title.slice(0,letterLimit) + "..."
    }
    return title
})

const expandedItemsAtom = atom([])


export const NavigatorButtons = ()=>{
    const beforeJumpNodeTitle = useAtomValue(beforeJumpNodeTitleAtom)
    const [selectedNode, setSelectedNode] = useAtom(selectedNodeAtom)
    const apiRef = useTreeViewApiRef();
    const [lastSelectedNodeBeforeJumpId, setLastSelectedNodeBeforeJump] = useAtom(lastSelectedNodeBeforeJumpIdAtom)
    const currNodeAncestors = useAtomValue(ancestorStackNodesAtom)
    const [expandedItems, setExpandedItems] = useAtom(expandedItemsAtom)
    const handleGoBack = () => {
        const currId = selectedNode.id
        setSelectedNode(lastSelectedNodeBeforeJumpId)
        setLastSelectedNodeBeforeJump(currId)
    }
    const handleFold = () => {
        const ancestors = currNodeAncestors.map((node) => node.id)
        setExpandedItems((oldExpandedItems) => {
            return [selectedNode.id, ...ancestors]
        })
    }

    const buttonStyle = {
        backgroundColor: "#e1eaf3",
        color: "#000000",
        '&:hover': {
            backgroundColor: "#b4d3ee",
        },
        margin: "1px",
    }

    return <>
        <Button sx={buttonStyle} onClick={handleFold}><UnfoldLessIcon/></Button>
        {lastSelectedNodeBeforeJumpId != "" && lastSelectedNodeBeforeJumpId != selectedNode.id &&
            <Button sx={buttonStyle} onClick={handleGoBack}><ArrowBackIcon/>{beforeJumpNodeTitle}</Button>}
    </>;
}

export const NewNavigatorLayer = () => {
    const dark = useAtomValue(darkModeAtom)
    const currNodeAncestors = useAtomValue(ancestorStackNodesAtom)
    const navigatorItems = useAtomValue(NavigatorItemsAtom)
    const [expandedItems, setExpandedItems] = useAtom(expandedItemsAtom)
    const selectedItems = useAtomValue(selectedItemAtom)
    const [selectedNode, setSelectedNode] = useAtom(selectedNodeAtom)
    const apiRef = useTreeViewApiRef();
    const [lastSelectedNodeBeforeJumpId, setLastSelectedNodeBeforeJump] = useAtom(lastSelectedNodeBeforeJumpIdAtom)

    useEffect(() => {
        // ensure all the ancestors are expanded
        const ancestors = currNodeAncestors.map((node) => node.id)
        const currId = selectedNode.id
        setExpandedItems((oldExpandedItems) => {
            return [...new Set([currId, ...oldExpandedItems, ...ancestors])]
        })
        const itemDom = apiRef.current.getItemDOMElement(selectedNode.id)
        if (itemDom) {
            itemDom.scrollIntoView({behavior: "smooth", inline: "center", block: "nearest"})
        }
    }, [currNodeAncestors]);

    const handleExpandedItemsChange = (event, itemIds) => {
        setExpandedItems(itemIds)
    };

    const handleNewSelectedItemChange = (event, newItemId) => {
        const currId = selectedNode.id
        setSelectedNode(newItemId)
        setLastSelectedNodeBeforeJump(currId)
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



