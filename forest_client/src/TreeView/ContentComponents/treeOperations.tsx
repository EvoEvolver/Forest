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