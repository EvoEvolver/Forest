import {NodeM, NodeType, NodeVM} from "@forest/schema";
import React, {useState} from "react";
import CollaborativeEditor from "./CodeEditor";
import {python} from "@codemirror/lang-python";
import * as Y from "yjs";
import {Box, Button, TextField, Typography, Paper} from "@mui/material";
import axios from "axios";

// Separate component for endpoint URL configuration
const EndpointUrlConfig: React.FC<{ node: NodeVM }> = ({ node }) => {
    const [endpointUrl, setEndpointUrl] = useState<string>(
        node.ydata.get(CodeInterpreterEndpointUrl)?.toString() || ""
    );

    const handleEndpointChange = (value: string) => {
        setEndpointUrl(value);
        const yText = node.ydata.get(CodeInterpreterEndpointUrl) as Y.Text;
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
                    label="Endpoint URL"
                    value={endpointUrl}
                    onChange={(e) => handleEndpointChange(e.target.value)}
                    placeholder="http://localhost:8000/interpret"
                    size="small"
                />
            </Box>
        </Box>
    );
};

const CodeInterpreterCodeText = "CodeInterpreterCodeText"
const CodeInterpreterEndpointUrl = "CodeInterpreterEndpointUrl"

export class CodeInterpreterNodeType extends NodeType {
    displayName = "Code Interpreter"
    allowReshape = true
    allowAddingChildren = false
    allowEditTitle = true
    allowedChildrenTypes = []

    render(node: NodeVM): React.ReactNode {
        const [result, setResult] = useState<string>("");
        const [loading, setLoading] = useState<boolean>(false);


        const runCode = async () => {
            const code = node.ydata.get(CodeInterpreterCodeText)?.toString() || "";
            const url = this.endpointUrlYText(node.nodeM)?.toString().trim();
            console.log("url", url);
            
            if (!url) {
                setResult("Error: Please set an endpoint URL");
                return;
            }
            
            if (!code.trim()) {
                setResult("Error: No code to execute");
                return;
            }

            setLoading(true);
            try {
                const response = await axios.post(url, { code });
                setResult(JSON.stringify(response.data["result"], null, 2));
            } catch (error: any) {
                setResult(`Error: ${error.message}`);
            } finally {
                setLoading(false);
            }
        };



        return (
            <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
                <Box sx={{ flex: 1, mb: 2, border: 1, borderColor: "divider" }}>
                    <CollaborativeEditor 
                        yText={node.ydata.get(CodeInterpreterCodeText)} 
                        langExtension={python}
                    />
                </Box>
                <Box sx={{ mb: 2 }}>
                    <Button 
                        variant="contained" 
                        onClick={runCode} 
                        disabled={loading}
                        fullWidth
                    >
                        {loading ? "Running..." : "Run Code"}
                    </Button>
                </Box>
                
                {result && (
                    <Paper sx={{ p: 2, maxHeight: 200, overflow: "auto" }}>
                        <Typography variant="subtitle2" gutterBottom>
                            Result:
                        </Typography>
                        <Typography variant="body2" component="pre" sx={{ fontFamily: "monospace" }}>
                            {result}
                        </Typography>
                    </Paper>
                )}
            </Box>
        );
    }

    renderTool1(node: NodeVM): React.ReactNode {
        return <EndpointUrlConfig node={node} />;
    }

    renderTool2(node: NodeVM): React.ReactNode {
        return <></>;
    }

    renderPrompt(node: NodeM): string {
        return "";
    }

    ydataInitialize(node: NodeM) {
        const ydata = node.ydata();
        if (!ydata.has(CodeInterpreterCodeText)) {
            ydata.set(CodeInterpreterCodeText, new Y.Text());
        }
        if (!ydata.has(CodeInterpreterEndpointUrl)) {
            ydata.set(CodeInterpreterEndpointUrl, new Y.Text());
        }
    }

    vdataInitialize(node: NodeVM) {
    }

    codeYText(node: NodeM): Y.Text {
        return node.ydata().get(CodeInterpreterCodeText) as Y.Text;
    }

    endpointUrlYText(node: NodeM): Y.Text {
        return node.ydata().get(CodeInterpreterEndpointUrl) as Y.Text;
    }
}