import React, {useContext} from "react";
import {addNewNodeAtom} from "../../TreeState/TreeState";
import {useSetAtom} from "jotai";
import {thisNodeContext} from "../NodeContentTab";


export const addChildrenButton = ({tabs, tools}) => {
    const parent = useContext(thisNodeContext);
    const addNewNode = useSetAtom(addNewNodeAtom)
    const parentId = parent.id;
    return <>
        <button onClick={()=>addNewNode({parentId, tabs: tabs || {}, tools: tools || [{},{}]})}>Add children</button>
    </>
}