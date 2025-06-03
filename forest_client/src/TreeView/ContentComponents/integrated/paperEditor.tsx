import React from "react";
import TiptapEditor from "../editor";
import {AddChildrenButton, DeleteNodeButton} from "../treeOperations";
import {AiChat} from "../chat/aiChat";


export const PaperEditorMain = (props) => {
    return <>
        <TiptapEditor label="paperEditor"/>
    </>
}

export const PaperEditorSide1 = (props) => {
    return <>
        <AddChildrenButton tabs={{"content": `<PaperEditorMain/>`}} tools={[{"Operations":"<PaperEditorSide1/>"},{"AI assistant": "<PaperEditorSide2/>"}]}/>
        <DeleteNodeButton/>
    </>
}


export const PaperEditorSide2 = (props) => {
    return <>
        <AiChat/>
    </>
}