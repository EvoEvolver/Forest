import React, {useEffect} from 'react';
import {RichTreeView} from '@mui/x-tree-view/RichTreeView';
import {useAtom, useAtomValue, useSetAtom} from "jotai";
import {
    jumpToNodeAtom,
    scrollToNodeAtom,
    selectedNodeAtom
} from "../TreeState/TreeState";
import {useTreeViewApiRef} from "@mui/x-tree-view";
import {NavigatorItemsAtom, selectedItemAtom, expandedItemsAtom, getAncestorIds} from './atoms/NavigatorAtoms';
import {CustomTreeItem} from './components/CustomTreeItem';


export const NavigatorLayer = () => {
    const navigatorItems = useAtomValue(NavigatorItemsAtom)
    const [expandedItems, setExpandedItems] = useAtom(expandedItemsAtom)
    const selectedItems = useAtomValue(selectedItemAtom)
    const [selectedNode,] = useAtom(selectedNodeAtom)
    const apiRef = useTreeViewApiRef();
    const jumpToNode = useSetAtom(jumpToNodeAtom)
    const scrollToNode = useSetAtom(scrollToNodeAtom)
    
    useEffect(() => {
        if (!selectedNode || !selectedNode.id) {
            return;
        }
        const currId = selectedNode.id
        const parentIds = getAncestorIds(selectedNode)
        setExpandedItems((oldExpandedItems) => {
            return [...new Set([currId, ...parentIds, ...oldExpandedItems])]
        })
        const itemDom = apiRef.current?.getItemDOMElement(selectedNode.id)
        if (itemDom) {
            itemDom.scrollIntoView({behavior: "smooth", inline: "center", block: "nearest"})
        }
    }, [selectedNode]);

    const handleExpandedItemsChange = (_event: React.SyntheticEvent, itemIds: string[]) => {
        setExpandedItems(itemIds)
    };

    const handleNewSelectedItemChange = (_event: React.SyntheticEvent, selection: any) => {
        // Handle different possible formats
        let itemId: string | null = null;
        if (typeof selection === 'string') {
            itemId = selection;
        } else if (Array.isArray(selection) && selection.length > 0) {
            itemId = selection[0];
        }
        
        if (itemId) {
            jumpToNode(itemId)
            if (scrollToNode) {
                setTimeout(() => {
                    scrollToNode(itemId)
                }, 100)
            }
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
                slots={{
                    item: CustomTreeItem
                }}
            />
        </>
    );
};


