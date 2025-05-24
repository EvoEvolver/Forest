import React from "react";
import {addNewNodeAtom} from "../../TreeState/TreeState";
import {useSetAtom} from "jotai/index";


export const addChildrenButton = (props) => {
    const parent = props.node
    const addNewNode = useSetAtom(addNewNodeAtom)
    return <>
        <button onClick={()=>addNewNode(parent.id)}>Add children</button>
    </>
}