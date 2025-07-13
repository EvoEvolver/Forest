import {AiChat} from "@forest/node-components/src/chat/aiChat";
import {TodoApp} from "@forest/node-components/src/todoList";
import {NodeM, NodeType, NodeVM} from "@forest/schema"
import React from "react";
import TiptapEditor from "./editor";
import { Tabs, Tab, Box } from '@mui/material';
import IssueList from "@forest/issue-tracker/src/components/IssueList/IssueList";
import {treeId} from "@forest/client/src/appState";

interface EditorNodeData {
}

export class EditorNodeType extends NodeType {
    allowReshape = true
    allowAddingChildren = true
    allowEditTitle = true

    render(node: NodeVM): React.ReactNode {
        return <>
            <TiptapEditor label="paperEditor"/>
        </>
    }

    renderTool1(node: NodeVM): React.ReactNode {
        return <TabPanel node={node}/>
    }

    renderTool2(node: NodeVM): React.ReactNode {
        return <>
            <AiChat/>
        </>
    }

    renderPrompt(node: NodeM): string {
        return ""
    }

    ydataInitialize(node: NodeVM) {
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