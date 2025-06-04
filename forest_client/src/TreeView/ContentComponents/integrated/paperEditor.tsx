import React from "react";
import TiptapEditor from "../editor";
import {
    AddChildrenButton,
    AddSiblingButton,
    DeleteNodeButton,
    GetNodeUrlButton,
    MoveNodeButtons
} from "../treeOperations";
import {AiChat} from "../chat/aiChat";


export const PaperEditorMain = (props) => {
    return <>
        <TiptapEditor label="paperEditor"/>
    </>
}

const tabs = {"content": `<PaperEditorMain/>`}
const tools=[{"Operations":"<PaperEditorSide1/>"},{"AI assistant": "<PaperEditorSide2/>"}]

export const PaperEditorSide1 = (props) => {
    return <>
        <AddChildrenButton tabs={tabs} tools={tools}/>
        <DeleteNodeButton/><AddSiblingButton tabs={tabs} tools={tools}/>
        <MoveNodeButtons/><GetNodeUrlButton/>
    </>
}


export const PaperEditorSide2 = (props) => {
    return <>
        <AiChat/>
    </>
}