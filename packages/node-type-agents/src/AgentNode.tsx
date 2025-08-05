import {NodeM, NodeVM} from "@forest/schema";
import React from "react";
import CollaborativeEditor from "./CodeEditor";
import {markdown} from "@codemirror/lang-markdown";
import * as Y from "yjs";
import {ChatComponent} from "./ChatComponent";
import {Box, Button, Link, List, ListItem, ListItemText, Stack, Typography} from "@mui/material";
import {AgentSessionState, agentSessionState} from "./sessionState";
import {Action, ActionableNodeType} from "./ActionableNodeType";
import {invokeAgent} from "./agents";
import {AgentCallingMessage, AgentResponseMessage} from "@forest/agent-chat/src/AgentMessageTypes";
import {NormalMessage} from "@forest/agent-chat/src/MessageTypes";

const AgentPromptText = "AgentPromptText"

function AgentFilesComponent() {
    const [files, setFiles] = React.useState(agentSessionState.files);

    const handleRefresh = () => {
        setFiles([...agentSessionState.files]);
    };

    return (
        <Box sx={{width: "100%", height: "100%", padding: 2}}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{mb: 2}}>
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
                        <ListItem key={index} sx={{pl: 0}}>
                            <ListItemText
                                primary={
                                    <Link
                                        href={file.fileUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        sx={{wordBreak: "break-all"}}
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

export class AgentNodeType extends ActionableNodeType {

    displayName = "Agent"
    allowReshape = true
    allowAddingChildren = true
    allowEditTitle = true
    allowedChildrenTypes = ["AgentNodeType", "AgentToolNodeType", "CodeInterpreterNodeType", "KnowledgeNodeType", "MongoDataGridNodeType"]


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
        return <AgentFilesComponent/>;
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

    actions(node: NodeM): Action[] {
        return [{
            label: "Ask agent " + node.title(),
            description: "Ask the agent a question or give it a command.",
            parameter: {
                "query": {
                    "type": "string",
                    "description": "The question or command to ask the agent."
                }
            }
        }];
    }

    async executeAction(node: NodeM, label: string, parameters: Record<string, any>, callerNode: NodeM, agentSessionState: AgentSessionState): Promise<any> {
        const agentCallingMessage = new AgentCallingMessage({
            author: callerNode.title(),
            agentName: node.title(),
            message: parameters.query,
        });
        agentSessionState.addMessage(callerNode, agentCallingMessage);

        const messageToAgent = new NormalMessage({
            content: parameters.query,
            author: callerNode.title(),
            role: "user",
        })

        const agentReply = await invokeAgent(node, [messageToAgent])

        if (agentReply.type === 'tool_response') {
            return;
        }

        const agentResponseMessage = new AgentResponseMessage({
            author: node.title(),
            result: agentReply,
            agentName: node.title(),
        });
        agentSessionState.addMessage(callerNode, agentResponseMessage);
    }
}

