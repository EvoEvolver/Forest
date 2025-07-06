import React from "react";
import {NodeType, NodeVM} from "@forest/schema"

interface ReaderNodeData {
    htmlContent: string
}

export class ReaderNodeType extends NodeType {
    render(node: NodeVM): React.ReactNode {
        const htmlContent = node.data.content
        return <>
            <span dangerouslySetInnerHTML={{__html: htmlContent}}/>
        </>
    }

    renderTool1(node: NodeVM): React.ReactNode {
        return <>
        </>
    }

    renderTool2(node: NodeVM): React.ReactNode {
        return <>
        </>
    }

    renderPrompt(node: NodeVM): string {
        return ""
    }

    ydataInitialize(node: NodeVM) {
    }
}