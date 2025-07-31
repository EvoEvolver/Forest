import {NodeM, NodeType, NodeVM} from "@forest/schema";
import React, {useState} from "react";
import * as Y from "yjs";
import {Box, TextField, Typography, Link} from "@mui/material";
import axios from "axios";

// Separate component for URL configuration
const UrlConfig: React.FC<{ node: NodeVM }> = ({ node }) => {
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
        <Box sx={{ width: "100%", height: "100%" }}>
            <Box sx={{ mb: 2 }}>
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

export class KnowledgeNodeType extends NodeType {
    displayName = "Knowledge"
    allowReshape = true
    allowAddingChildren = false
    allowEditTitle = true
    allowedChildrenTypes = []

    render(node: NodeVM): React.ReactNode {
        const url = node.ydata.get(KnowledgeNodeUrl)?.toString() || "";

        return (
            <Box sx={{ display: "flex", flexDirection: "column", height: "100%", p: 2 }}>
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

    renderTool1(node: NodeVM): React.ReactNode {
        return <UrlConfig node={node} />;
    }

    renderTool2(node: NodeVM): React.ReactNode {
        return <></>;
    }

    renderPrompt(node: NodeM): string {
        return `
Title: Search from knowledge source ${node.title()}
Description: Ask question from the knowledge source.
Parameter: "question" (string): The question to ask the knowledge source.`
    }


    static async search(node: NodeM, {question}: {question: string}): Promise<string> {
        const treeUrl = node.ydata().get(KnowledgeNodeUrl)?.toString();
        
        if (!treeUrl) {
            throw new Error("No URL configured for this knowledge node");
        }
        
        if (!question.trim()) {
            throw new Error("Question cannot be empty");
        }

        try {
            const response = await axios.post('https://worker.treer.ai/search_and_answer', {
                question: question,
                treeUrl: treeUrl
            });
            
            return response.data;
        } catch (error: any) {
            throw new Error(`Failed to search knowledge source: ${error.message}`);
        }
    }

    ydataInitialize(node: NodeM) {
        const ydata = node.ydata();
        if (!ydata.has(KnowledgeNodeUrl)) {
            ydata.set(KnowledgeNodeUrl, new Y.Text());
        }
    }

    vdataInitialize(node: NodeVM) {
    }

    urlYText(node: NodeM): Y.Text {
        return node.ydata().get(KnowledgeNodeUrl) as Y.Text;
    }
}