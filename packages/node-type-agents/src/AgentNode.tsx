import {NodeM, NodeType, NodeVM} from "@forest/schema";
import React from "react";
import CollaborativeEditor from "./CodeEditor";
import {markdown} from "@codemirror/lang-markdown";
import * as Y from "yjs";
import {ChatComponent} from "./ChatComponent";
import {Box} from "@mui/material";

const AgentPromptText = "AgentPromptText"

export class AgentNodeType extends NodeType {
    displayName = "Agent"
    allowReshape = true
    allowAddingChildren = true
    allowEditTitle = true
    allowedChildrenTypes = ["AgentNodeType", "AgentToolNodeType", "CodeInterpreterNodeType", "EditorNodeType"]

    render(node: NodeVM): React.ReactNode {
        return <>
            <ChatComponent node={node}/>
        </>
    }

    renderTool1(node: NodeVM): React.ReactNode {
        return <Box sx={{width: "100%", height: "100%"}}>
            <h1>Agent context</h1>
            <CollaborativeEditor yText={node.ydata.get(AgentPromptText)} langExtension={markdown}/>
        </Box>
    }

    renderTool2(node: NodeVM): React.ReactNode {
        return <>
        </>
    }

    renderPrompt(node: NodeM): string {
        return ""
    }

    ydataInitialize(node: NodeM) {
        const ydata = node.ydata()
        if (!ydata.has(AgentPromptText)) {
            // @ts-ignore
            ydata.set(AgentPromptText, new Y.Text())
        }
    }

    vdataInitialize(node: NodeVM) {
    }

    agentPromptYText(node: NodeM): Y.Text {
        // @ts-ignore
        return node.ydata().get(AgentPromptText) as Y.Text
    }
}

