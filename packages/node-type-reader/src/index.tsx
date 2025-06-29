import React from "react";
import {NodeType, NodeVM} from "@forest/schema"

interface ReaderNodeData {

}

export class ReaderNodeType extends NodeType {
    render(node: NodeVM): React.ReactNode {
        const html = ""
        return <>
            <span dangerouslySetInnerHTML={{__html: html}}/>
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