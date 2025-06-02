import React from "react";
import ProseMirrorEditor from "../editor";
import {AddChildrenButton, DeleteNodeButton} from "../treeOperations";


export const PaperEditorMain = (props) => {
    return <>
        <ProseMirrorEditor label="paperEditor"/>
    </>
}

export const PaperEditorSide = (props) => {
    return <>
        <AddChildrenButton tabs={{"content": `<PaperEditorMain/>`}} tools={[{"Operations":"<PaperEditorSide/>"},{}]}/>
        <DeleteNodeButton/>
    </>
}