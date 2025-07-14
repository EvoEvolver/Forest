import {NodeM, NodeType, NodeVM} from "@forest/schema";
import React from "react";
import CollaborativeEditor from "./CodeEditor";
import {markdown} from "@codemirror/lang-markdown";
import * as Y from "yjs";
import {ChatComponent} from "./ChatComponent";

const AgentPromptText = "AgentPromptText"

export class AgentNodeType extends NodeType {
    allowReshape = true
    allowAddingChildren = true
    allowEditTitle = true

    render(node: NodeVM): React.ReactNode {
        return <>
            <ChatComponent node={node}/>
        </>
    }

    renderTool1(node: NodeVM): React.ReactNode {
        return <>
            <h1>Agent context</h1>
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
        if (!ydata.has(AgentPromptText)) {
            // @ts-ignore
            ydata.set(AgentPromptText, new Y.Text())
        }
    }

    agentPromptYText(node: NodeVM): Y.Text {
        // @ts-ignore
        return node.ydata.get(AgentPromptText) as Y.Text
    }
}

