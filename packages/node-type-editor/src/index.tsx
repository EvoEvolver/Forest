import {AiChat} from "@forest/node-components/src/chat/aiChat";
import {TodoApp} from "@forest/node-components/src/todoList";
import {NodeType, NodeVM} from "@forest/schema"
import React from "react";
import TiptapEditor from "./editor";

interface EditorNodeData {

}

export class EditorNodeType extends NodeType {

    allowReshape = true

    allowAddingChildren = true

    allowEditTitle = true

    render(node: NodeVM): React.ReactNode {
        return <>
            <TiptapEditor label="paperEditor"/>
        </>
    }

    renderTool1(node: NodeVM): React.ReactNode {
        return <>
            <TodoApp/>
        </>
    }

    renderTool2(node: NodeVM): React.ReactNode {
        return <>
            <AiChat/>
        </>
    }

    renderPrompt(node: NodeVM): string {
        return ""
    }

    ydataInitialize(node: NodeVM) {
    }
}