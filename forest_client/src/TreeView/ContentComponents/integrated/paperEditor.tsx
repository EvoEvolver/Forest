import React from "react";
import TiptapEditor from "../editor";
import {AiChat} from "../chat/aiChat";
import {TodoApp} from "../todoList";


export const PaperEditorMain = (props) => {
    return <>
        <TiptapEditor label="paperEditor"/>
    </>
}

const tabs = {"content": `<PaperEditorMain/>`}
const tools = [{"Operations": "<PaperEditorSide1/>"}, {"AI assistant": "<PaperEditorSide2/>"}]

export const PaperEditorSide1 = (props) => {
    return <>
        <TodoApp/>
    </>
}


export const PaperEditorSide2 = (props) => {
    return <>
        <AiChat/>
    </>
}