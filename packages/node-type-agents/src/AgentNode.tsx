import {NodeM, NodeType, NodeVM} from "@forest/schema";
import React from "react";
import CollaborativeEditor from "./CodeEditor";
import {markdown} from "@codemirror/lang-markdown";
import * as Y from "yjs";

const AgentPromptText = "AgentPromptText"

export class AgentNodeType extends NodeType {
    allowReshape = true
    allowAddingChildren = true
    allowEditTitle = true

    render(node: NodeVM): React.ReactNode {

    }

    renderTool1(node: NodeVM): React.ReactNode {
        return <>
            <h1>OpenAPI spec</h1>
            <CollaborativeEditor yText={node.ydata.get(AgentPromptText)} langExtension={markdown}/>
        </>
    }

    renderTool2(node: NodeVM): React.ReactNode {
        return <>
        </>
    }

    renderPrompt(node: NodeM): string {
        return ""
    }

    ydataInitialize(node: NodeVM) {
        const ydata = node.ydata
        if(!ydata.has(AgentPromptText)){
            // @ts-ignore
            ydata.set(AgentPromptText, new Y.Text())
        }
    }
}