import {AiChat} from "@forest/node-components/src/chat/aiChat";
import {TodoApp} from "@forest/node-components/src/todoList";
import {NodeM, NodeType, NodeVM} from "@forest/schema"
import React, {useEffect} from "react";
import TiptapEditor, {makeEditor} from "./editor";
import { Tabs, Tab, Box } from '@mui/material';
import IssueList from "@forest/issue-tracker/src/components/IssueList/IssueList";
import {treeId} from "@forest/client/src/appState";
import {XmlFragment} from "yjs";
import {BottomUpButton} from "./buttomUp";
import {TopDownButton} from "./topDown";

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
        return <TabPanel node={node}/>
    }

    renderTool2(node: NodeVM): React.ReactNode {
        return <>
            <BottomUpButton node={node}/>
            <TopDownButton node={node}/>
        </>
    }

    renderPrompt(node: NodeM): string {
        return ""
    }

    ydataInitialize(node: NodeM) {
    }
}

function TabPanel({node}:{node: NodeVM}) {
    const [value, setValue] = React.useState(0);

    const handleChange = (event: React.SyntheticEvent, newValue: number) => {
        setValue(newValue);
    };
    return (
        <Box sx={{ width: '100%' }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs value={value} onChange={handleChange}>
                    <Tab label="Issues" />
                    <Tab label="Todos" />
                </Tabs>
            </Box>
            <Box sx={{ p: 2 }}>
                {value === 0 && <IssueList simple={true} treeId={treeId} nodeId={node.id}/>}
                {value === 1 && <TodoApp node={node}/>}
            </Box>
        </Box>
    );
}