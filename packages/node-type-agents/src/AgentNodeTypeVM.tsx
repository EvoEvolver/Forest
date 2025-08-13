import {NodeTypeVM} from "@forest/schema/src/nodeTypeVM";
import {NodeVM} from "@forest/schema";
import React from "react";
import {ChatComponent} from "./ChatComponent";
import {agentSessionState} from "./sessionState";
import {
    Box,
    Button,
    FormControlLabel,
    Link,
    List,
    ListItem,
    ListItemText,
    Stack,
    Switch,
    Typography
} from "@mui/material";
import * as Y from "yjs";
import CollaborativeEditor from "./CodeEditor";
import {markdown} from "@codemirror/lang-markdown";
import {AgentDescriptionText, AgentNodeTypeM, AgentPromptText, TodoMode} from "./AgentNode";

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

function AgentTool1Component({node}: { node: NodeVM }) {
    const [todoMode, setTodoMode] = React.useState(false);

    React.useEffect(() => {
        const yMap = node.ydata.get(TodoMode) as unknown as Y.Map<boolean>;
        if (yMap) {
            setTodoMode(yMap.get('enabled') || false);

            const observer = () => {
                setTodoMode(yMap.get('enabled') || false);
            };

            yMap.observe(observer);
            return () => yMap.unobserve(observer);
        }
    }, [node.ydata]);

    const handleTodoModeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const yMap = node.ydata.get(TodoMode) as unknown as Y.Map<boolean>;
        yMap.set('enabled', event.target.checked);
    };

    return (
        <Box sx={{width: "100%", height: "100%", display: "flex", flexDirection: "column"}}>
            <Box sx={{mb: 2}}>
                <FormControlLabel
                    control={
                        <Switch
                            checked={todoMode}
                            onChange={handleTodoModeChange}
                        />
                    }
                    label="Todo Mode"
                />
            </Box>
            <Box sx={{flex: 1, minHeight: 0, mb: 2}}>
                <Typography variant="h6" sx={{mb: 1}}>Agent Context</Typography>
                <Box sx={{height: "calc(100% - 32px)", border: "1px solid #ddd", borderRadius: 1}}>
                    <CollaborativeEditor yText={node.ydata.get(AgentPromptText)} langExtension={markdown}/>
                </Box>
            </Box>
            <Box sx={{flex: 1, minHeight: 0}}>
                <Typography variant="h6" sx={{mb: 1}}>Description</Typography>
                <Box sx={{height: "calc(100% - 32px)", border: "1px solid #ddd", borderRadius: 1}}>
                    <CollaborativeEditor yText={node.ydata.get(AgentDescriptionText)} langExtension={markdown}/>
                </Box>
            </Box>
        </Box>
    );
}

function AgentTool2Component() {
    const handleStop = () => {
        agentSessionState.stopFlag = true;
    };

    const handleReset = () => {
        agentSessionState.clearState();
    };

    return (
        <>
            <Box sx={{mb: 2}}>
                <Stack direction="row" spacing={1}>
                    <Button
                        variant="contained"
                        color="error"
                        onClick={handleStop}
                    >
                        Stop
                    </Button>
                    <Button
                        variant="outlined"
                        color="warning"
                        onClick={handleReset}
                    >
                        Reset
                    </Button>
                </Stack>
            </Box>
            <AgentFilesComponent/>
        </>
    );
}

export class AgentNodeTypeVM extends NodeTypeVM {
    static render(node: NodeVM): React.ReactNode {
        if (!node.ydata.has(AgentPromptText)) {
            AgentNodeTypeM.ydataInitialize(node.nodeM);
        }
        return <>
            <ChatComponent node={node}/>
        </>
    }

    static renderTool1(node: NodeVM): React.ReactNode {
        if (!node.ydata.has(AgentDescriptionText)) {
            AgentNodeTypeM.ydataInitialize(node.nodeM);
        }
        return <AgentTool1Component node={node}/>;
    }

    static renderTool2(node: NodeVM): React.ReactNode {
        if (!node.ydata.has(AgentPromptText)) {
            AgentNodeTypeM.ydataInitialize(node.nodeM);
        }
        return <AgentTool2Component/>;
    }
}