import {NodeM, NodeVM} from "@forest/schema";
import React, {useState} from "react";
import * as Y from "yjs";
import {Box, Link, TextField, Typography} from "@mui/material";
import axios from "axios";
import {Action, ActionableNodeType} from "./ActionableNodeType";
import {AgentSessionState} from "./sessionState";
import {ToolResponseMessage} from "@forest/agent-chat/src/AgentMessageTypes";
import {NodeTypeVM} from "@forest/schema/src/nodeTypeVM";

// @ts-ignore
const WORKER_URL = import.meta.env.VITE_WORKER_URL || "https://worker.treer.ai";

// Separate component for URL configuration
const UrlConfig: React.FC<{ node: NodeVM }> = ({node}) => {
    const [url, setUrl] = useState<string>(
        node.ydata.get(KnowledgeNodeUrl)?.toString() || ""
    );

    const handleUrlChange = (value: string) => {
        setUrl(value);
        const yText = node.ydata.get(KnowledgeNodeUrl) as Y.Text;
        if (yText) {
            yText.delete(0, yText.length);
            yText.insert(0, value);
        }
    };

    return (
        <Box sx={{width: "100%", height: "100%"}}>
            <Box sx={{mb: 2}}>
                <TextField
                    fullWidth
                    label="URL"
                    value={url}
                    onChange={(e) => handleUrlChange(e.target.value)}
                    placeholder="https://treer.ai/?id=..."
                    size="small"
                />
            </Box>
        </Box>
    );
};

const KnowledgeNodeUrl = "KnowledgeNodeUrl"

export class KnowledgeNodeTypeM extends ActionableNodeType {
    static actions(node: NodeM): Action[] {
        return [{
            label: "Search " + node.title(),
            description: "Search the knowledge source for information by asking a question.",
            parameter: {
                "question": {
                    "type": "string",
                    "description": "The question to ask the knowledge source."
                }
            }
        }];
    }

    static async executeAction(node: NodeM, label: string, parameters: Record<string, any>, callerNode: NodeM, agentSessionState: AgentSessionState): Promise<any> {
        const question = parameters["question"];
        const result = await KnowledgeNodeTypeM.search(node, {question});

        // Create a knowledge response message
        const knowledgeResponseMessage = new ToolResponseMessage({
            toolName: node.title(),
            response: result,
            author: node.title(),
        });
        agentSessionState.addMessage(callerNode, knowledgeResponseMessage);

        return knowledgeResponseMessage;
    }

    static displayName = "Knowledge"
    static allowReshape = true
    static allowAddingChildren = false
    static allowEditTitle = true
    static allowedChildrenTypes = []

    static renderPrompt(node: NodeM): string {
        return `
Title: Search from knowledge source ${node.title()}
Description: Ask question from the knowledge source.
Parameter: "question" (string): The question to ask the knowledge source.`
    }


    static async search(node: NodeM, {question}: { question: string }): Promise<string> {
        const treeUrl = node.ydata().get(KnowledgeNodeUrl)?.toString();

        if (!treeUrl) {
            throw new Error("No URL configured for this knowledge node");
        }

        if (!question.trim()) {
            throw new Error("Question cannot be empty");
        }

        try {
            const response = await axios.post(WORKER_URL + '/search_and_answer', {
                question: question,
                treeUrl: treeUrl
            });

            return response.data;
        } catch (error: any) {
            throw new Error(`Failed to search knowledge source: ${error.message}`);
        }
    }

    static ydataInitialize(node: NodeM) {
        const ydata = node.ydata();
        if (!ydata.has(KnowledgeNodeUrl)) {
            ydata.set(KnowledgeNodeUrl, new Y.Text());
        }
    }

    static urlYText(node: NodeM): Y.Text {
        return node.ydata().get(KnowledgeNodeUrl) as Y.Text;
    }
}

export class KnowledgeNodeTypeVM extends NodeTypeVM {
    static render(node: NodeVM): React.ReactNode {
        const url = node.ydata.get(KnowledgeNodeUrl)?.toString() || "";

        return (
            <Box sx={{display: "flex", flexDirection: "column", height: "100%", p: 2}}>
                {url ? (
                    <Box>
                        <Typography variant="subtitle2" gutterBottom>
                            Knowledge Source:
                        </Typography>
                        <Link
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            sx={{
                                display: "block",
                                wordBreak: "break-all",
                                textDecoration: "none",
                                "&:hover": {
                                    textDecoration: "underline"
                                }
                            }}
                        >
                            {url}
                        </Link>
                    </Box>
                ) : (
                    <Typography variant="body2" color="text.secondary">
                        No URL configured. Use the tool panel to add a URL.
                    </Typography>
                )}
            </Box>
        );
    }

    static renderTool1(node: NodeVM): React.ReactNode {
        return <UrlConfig node={node}/>;
    }

    static renderTool2(node: NodeVM): React.ReactNode {
        return <></>;
    }
}