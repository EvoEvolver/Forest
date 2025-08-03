import {NodeM, NodeType, NodeVM} from "@forest/schema"
import React from "react";
import TiptapEditor, {makeEditor} from "./editor";
import {XmlFragment} from "yjs";
import {BottomUpButton} from "./buttomUp";
import {TopDownButton} from "./topDown";
import {ParentToSummaryButton} from "./parentToSummary";
import {ModifyButton} from "./modifyButton";

interface EditorNodeData {
}

export class EditorNodeType extends NodeType {
    displayName = "Editor"
    allowReshape = true
    allowAddingChildren = true
    allowEditTitle = true
    allowedChildrenTypes = ["EditorNodeType"]

    getYxml(node: NodeM): XmlFragment {
        const ydataKey = "ydatapaperEditor"
        let yXML: XmlFragment = node.ydata().get(ydataKey) as unknown as XmlFragment;
        if (!yXML) {
            yXML = new XmlFragment();
            // @ts-ignore
            node.ydata().set(ydataKey, yXML);
        }
        return yXML;
    }

    render(node: NodeVM): React.ReactNode {
        const yXML = this.getYxml(node.nodeM);
        return <>
            <TiptapEditor yXML={yXML} node={node}/>
        </>
    }

    getEditorContent(node: NodeM): string {
        const editor = makeEditor(this.getYxml(node), null, true, null, null);
        const htmlContent = editor.getHTML();
        return htmlContent;
    }

    setEditorContent(node: NodeM, htmlContent: string) {
        const editor = makeEditor(this.getYxml(node), null, true, null, null);
        editor.commands.setContent(htmlContent);
    }

    renderTool1(node: NodeVM): React.ReactNode {

    }

    renderTool2(node: NodeVM): React.ReactNode {
        return <>
            <ModifyButton node={node}/>
            <ParentToSummaryButton node={node}/>
            <TopDownButton node={node}/>
            <BottomUpButton node={node}/>
        </>
    }

    renderPrompt(node: NodeM): string {
        return ""
    }

    ydataInitialize(node: NodeM) {
    }
}