import {NodeM, NodeType} from "@forest/schema"
import React from "react";

interface EditorNodeData {

}

class EditorNode extends NodeType {
    render(node: NodeM<EditorNodeData>): React.ReactNode {
        return super.render(node);
    }

    renderTool1(node: NodeM<any>): React.ReactNode {
    }

    renderTool2(node: NodeM<any>): React.ReactNode {
    }

    renderPrompt(node: NodeM<EditorNodeData>): string {
        return super.renderPrompt(node);
    }

    ydataInitialize(node: NodeM<any>) {
        super.ydataInitialize(node);
    }

}