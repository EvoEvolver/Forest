import {NodeM, NodeType, NodeVM} from "@forest/schema"
import React from "react";
import TiptapEditor, {makeEditor} from "./editor";
import {XmlFragment} from "yjs";
import {BottomUpButton} from "./aiButtons/buttomUp";
import {TopDownButton} from "./aiButtons/topDown";
import {ParentToSummaryButton} from "./aiButtons/parentToSummary";
import {ModifyButton} from "./aiButtons/modifyButton";
import {useAtomValue} from "jotai";

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
        const editor = makeEditor(this.getYxml(node), null, true, null, null, null);
        const htmlContent = editor.getHTML();
        editor.destroy()
        return htmlContent;
    }

    setEditorContent(node: NodeM, htmlContent: string) {
        const editor = makeEditor(this.getYxml(node), null, true, null, null, null);
        try {
            editor.commands.setContent(htmlContent);
        } catch (e) {
            console.warn("Error setting content", htmlContent);
            throw e;
        } finally {
            editor.destroy()
        }
    }

    static validateEditorContent(htmlContent: string) {
        const editor = makeEditor(null, null, true, null, null, null);
        try {
            editor.commands.setContent(htmlContent);
        } catch (e) {
            editor.destroy()
            return false
        }
        editor.destroy()
        return true
    }

    renderTool1(node: NodeVM): React.ReactNode {

    }

    renderTool2(node: NodeVM): React.ReactNode {
        return <EditorTools node={node}/>
    }

    renderPrompt(node: NodeM): string {
        return ""
    }

    ydataInitialize(node: NodeM) {
    }
}

function EditorTools({node}: { node: NodeVM }) {
    const children = useAtomValue(node.children)
    return <>
        <ModifyButton node={node}/>
        {children.length === 0 && <ParentToSummaryButton node={node}/>}
        {children.length === 0 && <TopDownButton node={node}/>}
        {children.length !== 0 && <BottomUpButton node={node}/>}
    </>
}