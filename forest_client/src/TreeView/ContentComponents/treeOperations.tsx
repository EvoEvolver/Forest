import React, {useContext} from "react";
import {addNewNodeAtom, deleteNodeAtom} from "../../TreeState/TreeState";
import {useAtomValue, useSetAtom} from "jotai";
import {thisNodeContext} from "../NodeContentTab";


export const AddChildrenButton = ({tabs, tools}) => {
    const parent = useContext(thisNodeContext);
    const addNewNode = useSetAtom(addNewNodeAtom)
    const parentId = parent.id;
    const positionId = null
    return <>
        <button onClick={()=>addNewNode({parentId, positionId, tabs: tabs || {}, tools: tools || [{},{}]})}>Add children</button>
    </>
}


export const AddSiblingButton = ({tabs, tools}) => {
    const node = useContext(thisNodeContext);
    const parentId = node.parent;
    const addNewNode = useSetAtom(addNewNodeAtom)
    const positionId = node.id;
    if (!parentId) {
        return <></>
    }
    return <>
        <button onClick={()=>addNewNode({parentId, positionId, tabs: tabs || {}, tools: tools || [{},{}]})}>Add sibling</button>
    </>
}

import { setNodePositionAtom } from "../../TreeState/TreeState";

export const MoveNodeButtons = () => {
    const node = useContext(thisNodeContext);
    const setNodePosition = useSetAtom(setNodePositionAtom);

    const moveUp = () => {
        setNodePosition({
            nodeId: node.id,
            targetId: node.id,
            shift: -1 // Move up by 1 position
        });
    };

    const moveDown = () => {
        setNodePosition({
            nodeId: node.id,
            targetId: node.id,
            shift: 1 // Move down by 1 position
        });
    };

    // Don't show move buttons for root node
    if (node.parent === null) {
        return null;
    }

    return (
        <div className="move-node-buttons">
            <button
                onClick={moveUp}
                aria-label="Move node up"
            >
                ↑ Move Up
            </button>
            <button
                onClick={moveDown}
                aria-label="Move node down"
            >
                ↓ Move Down
            </button>
        </div>
    );
};


export const DeleteNodeButton = () => {
    const node = useContext(thisNodeContext);
    const nodeChildren = useAtomValue(node.children)
    const deleteNode = useSetAtom(deleteNodeAtom)
    const handleDelete = () => {
        if (nodeChildren.length === 0) {
            deleteNode({nodeId: node.id})
        }
        else {
            alert("Cannot delete node with children. Please delete children first.")
        }
    }
    return <>
        <button
            onClick={handleDelete}
            disabled={nodeChildren.length > 0 || node.parent === null}
        >
            Delete this node
        </button>
    </>
}