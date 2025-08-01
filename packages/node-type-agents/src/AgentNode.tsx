import {NodeM, NodeType, NodeVM} from "@forest/schema";
import React from "react";
import CollaborativeEditor from "./CodeEditor";
import {markdown} from "@codemirror/lang-markdown";
import * as Y from "yjs";
import {ChatComponent} from "./ChatComponent";
import {Box, List, ListItem, ListItemText, Typography, Link, Button, Stack} from "@mui/material";
import {agentSessionState} from "./sessionState";

const AgentPromptText = "AgentPromptText"

function AgentFilesComponent() {
    const [files, setFiles] = React.useState(agentSessionState.files);
    
    const handleRefresh = () => {
        setFiles([...agentSessionState.files]);
    };

    return (
        <Box sx={{width: "100%", height: "100%", padding: 2}}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="h6">
                    Agent Files
                </Typography>
                <Button variant="outlined" size="small" onClick={handleRefresh}>
                    Refresh
                </Button>
            </Stack>
            {files.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                    No files available
                </Typography>
            ) : (
                <List>
                    {files.map((file, index) => (
                        <ListItem key={index} sx={{ pl: 0 }}>
                            <ListItemText
                                primary={
                                    <Link 
                                        href={file.fileUrl} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        sx={{ wordBreak: "break-all" }}
                                    >
                                        {file.fileUrl}
                                    </Link>
                                }
                                secondary={file.fileDescription}
                            />
                        </ListItem>
                    ))}
                </List>
            )}
        </Box>
    );
}

export class AgentNodeType extends NodeType {
    displayName = "Agent"
    allowReshape = true
    allowAddingChildren = true
    allowEditTitle = true
    allowedChildrenTypes = ["AgentNodeType", "AgentToolNodeType", "MCPNodeType", "CodeInterpreterNodeType", "KnowledgeNodeType"]

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
        return <AgentFilesComponent />;
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

