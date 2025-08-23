import {NodeM, NodeVM} from "@forest/schema"
import React from "react";
import TiptapEditor, {makeSimpleEditor} from "./editor";
import {Map as YMap, XmlFragment} from "yjs";
import {BottomUpButton} from "./aiButtons/buttomUp";
import {TopDownDecomposeButton} from "./aiButtons/topDownDecompose";
import {ParentToSummaryButton} from "./aiButtons/parentToSummary";
import {ModifyButton} from "./aiButtons/modifyButton";
import {useAtomValue} from "jotai";
import {NodeTypeM} from "@forest/schema/src/nodeTypeM";
import {NodeTypeVM} from "@forest/schema/src/nodeTypeVM";
import {TopDownMatchingButton} from "./aiButtons/topDownMatching";
import {WritingAssistant} from "./aiChat/WritingAssistant";
import {Box} from "@mui/material";

const EditorXmlFragment = "ydatapaperEditor"

export class EditorNodeTypeM extends NodeTypeM {
    static displayName = "Editor"
    static allowReshape = true
    static allowAddingChildren = true
    static allowEditTitle = true
    static allowedChildrenTypes = ["EditorNodeType"]

    static getYxml(node: NodeM): XmlFragment {
        if (!node.ydata().has(EditorXmlFragment)) {
            EditorNodeTypeM.ydataInitialize(node);
        }
        let yXML: XmlFragment = node.ydata().get(EditorXmlFragment) as unknown as XmlFragment;
        return yXML;
    }

    static getEditorContent(node: NodeM): string {
        const editor = makeSimpleEditor(EditorNodeTypeM.getYxml(node));
        const htmlContent = editor.getHTML();
        editor.destroy()
        return htmlContent;
    }

    static setEditorContent(node: NodeM, htmlContent: string) {
        const editor = makeSimpleEditor(EditorNodeTypeM.getYxml(node));
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
        const editor = makeSimpleEditor(null);
        try {
            editor.commands.setContent(htmlContent);
        } catch (e) {
            editor.destroy()
            return false
        }
        editor.destroy()
        return true
    }

    static renderPrompt(node: NodeM): string {
        return ""
    }

    static ydataInitialize(node: NodeM) {
        const ydata = new YMap()
        const yXML = new XmlFragment();
        ydata.set(EditorXmlFragment, yXML);
        node.ymap.set("ydata", ydata);
        //console.log("Initialized ydata for EditorNodeTypeM", node.id, node.ymap.get("ydata"))
    }
}

export class EditorNodeTypeVM extends NodeTypeVM {

    static oneTool = true

    static render(node: NodeVM): React.ReactNode {
        return <EditorMainView node={node}/>
    }

    static renderTool(node: NodeVM): React.ReactNode {
        return <EditorTools node={node}/>
    }
}

function EditorMainView({node}: { node: NodeVM }) {
    const yXML = EditorNodeTypeM.getYxml(node.nodeM)
    return <>
        <TiptapEditor yXML={yXML} node={node}/>
    </>
}


function EditorTools({node}: { node: NodeVM }) {
    const children = useAtomValue(node.children)
    return <>
        <Box>
            <WritingAssistant selectedNode={node}/>
        </Box>
        <Box>
            {false && <ModifyButton node={node}/>}
            {false && children.length === 0 && <ParentToSummaryButton node={node}/>}
            {false && children.length === 0 && <TopDownDecomposeButton node={node}/>}
            {children.length !== 0 && <BottomUpButton node={node}/>}
            {children.length !== 0 && <TopDownMatchingButton node={node}/>}
        </Box>
    </>
}