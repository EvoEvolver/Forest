import {NodeM, NodeVM} from "@forest/schema";
import React, {useState} from "react";
import CollaborativeEditor from "./CodeEditor";
import {python} from "@codemirror/lang-python";
import {markdown} from "@codemirror/lang-markdown";
import * as Y from "yjs";
import {Box, Button, Paper, TextField, Typography, Dialog, DialogTitle, DialogContent, DialogActions} from "@mui/material";
import axios from "axios";
import {Action, ActionableNodeType} from "./ActionableNodeType";
import {AgentSessionState, agentSessionState} from "./sessionState";
import {CodeInterpreterModifyButton, CodeInterpreterGenerateButton} from "./CodeButtons/CodeInterpreterModifyButton";
import {json as jsonLang} from "@codemirror/lang-json";
import {ToolCallingMessage, ToolResponseMessage} from "@forest/agent-chat/src/AgentMessageTypes";

// Configuration component for endpoint URL and description
const CodeInterpreterTool1Component: React.FC<{ node: NodeVM }> = ({node}) => {
    return (
        <Box sx={{width: "100%", height: "100%", display: "flex", flexDirection: "column"}}>

            <Box>
                <Box sx={{width: "100%"}}>
                    <Typography variant="h6" sx={{mb: 1}}>Description</Typography>
                    <Box sx={{height: "calc(100% - 32px)", border: "1px solid #ddd", borderRadius: 1}}>
                        <CollaborativeEditor yText={node.ydata.get(CodeInterpreterDescriptionText)}
                                             langExtension={markdown}/>
                    </Box>
                </Box>
                <Box sx={{width: "100%"}}>
                    <Typography variant="h6" sx={{mb: 1}}>Parameters (JSON)</Typography>
                    <Box sx={{height: "calc(100% - 32px)", border: "1px solid #ddd", borderRadius: 1}}>
                        <CollaborativeEditor yText={node.ydata.get(CodeInterpreterParameterText)}
                                             langExtension={jsonLang}/>
                    </Box>
                </Box>
            </Box>
        </Box>
    );
};

const CodeInterpreterTool2Component: React.FC<{ node: NodeVM }> = ({node}) => {
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
    return <Box sx={{mb: 2}}>
        <TextField
            fullWidth
            label="Endpoint URL"
            value={endpointUrl}
            onChange={(e) => handleEndpointChange(e.target.value)}
            placeholder="http://localhost:8000/interpret"
            size="small"
        />
        <CodeInterpreterGenerateButton node={node}/>
        <CodeInterpreterModifyButton node={node}/>
    </Box>
}

const CodeInterpreterCodeText = "CodeInterpreterCodeText"
const CodeInterpreterEndpointUrl = "CodeInterpreterEndpointUrl"
const CodeInterpreterDescriptionText = "CodeInterpreterDescriptionText"
const CodeInterpreterParameterText = "CodeInterpreterParameterText"

export class CodeInterpreterNodeType extends ActionableNodeType {
    displayName = "Code Interpreter"
    allowReshape = true
    allowAddingChildren = false
    allowEditTitle = true
    allowedChildrenTypes = []

    render(node: NodeVM): React.ReactNode {
        const [result, setResult] = useState<string>("");
        const [loading, setLoading] = useState<boolean>(false);
        const [parameterDialogOpen, setParameterDialogOpen] = useState<boolean>(false);
        const [parameterValues, setParameterValues] = useState<Record<string, any>>({});
        const [parameterSchema, setParameterSchema] = useState<Record<string, any>>({});


        const runCode = async () => {
            const code = node.ydata.get(CodeInterpreterCodeText)?.toString() || "";
            const url = this.endpointUrlYText(node.nodeM)?.toString().trim();
            const parametersText = node.ydata.get(CodeInterpreterParameterText)?.toString() || "";

            if (!url) {
                setResult("Error: Please set an endpoint URL");
                return;
            }

            if (!code.trim()) {
                setResult("Error: No code to execute");
                return;
            }

            // Validate parameters JSON
            let parametersObj: Record<string, any> = {};
            if (parametersText.trim()) {
                try {
                    parametersObj = JSON.parse(parametersText);
                    if (typeof parametersObj !== 'object' || parametersObj === null || Array.isArray(parametersObj)) {
                        throw new Error("Parameters must be a JSON object");
                    }
                } catch (error) {
                    alert("Error: Parameters field contains invalid JSON. Please fix the JSON format before running code.");
                    return;
                }

                // If parameters object has at least one key, show parameter input dialog
                if (Object.keys(parametersObj).length > 0) {
                    setParameterSchema(parametersObj);
                    // Initialize parameter values based on schema defaults
                    const initialValues: Record<string, any> = {};
                    Object.keys(parametersObj).forEach(key => {
                        const param = parametersObj[key];
                        initialValues[key] = param.default !== undefined ? param.default : "";
                    });
                    setParameterValues(initialValues);
                    setParameterDialogOpen(true);
                    return;
                }
            }

            // Execute code without parameters
            await executeCodeWithParameters({});
        };

        const executeCodeWithParameters = async (parameters: Record<string, any>) => {
            const code = node.ydata.get(CodeInterpreterCodeText)?.toString() || "";
            const url = this.endpointUrlYText(node.nodeM)?.toString().trim();

            setLoading(true);
            try {
                const response = await axios.post(url, {
                    code,
                    parameters: Object.keys(parameters).length > 0 ? parameters : undefined
                });
                setResult(JSON.stringify(response.data["result"], null, 2));
            } catch (error: any) {
                setResult(`Error: ${error.message}`);
            } finally {
                setLoading(false);
            }
        };

        const handleParameterDialogSubmit = async () => {
            setParameterDialogOpen(false);
            await executeCodeWithParameters(parameterValues);
        };


        return (
            <Box sx={{display: "flex", flexDirection: "column", height: "100%"}}>

                <Box sx={{flex: 1, mb: 2, border: 1, borderColor: "divider"}}>
                    <CollaborativeEditor
                        yText={node.ydata.get(CodeInterpreterCodeText)}
                        langExtension={python}
                    />
                </Box>
                <Box sx={{mb: 2}}>
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
                    <Paper sx={{p: 2, maxHeight: 200, overflow: "auto"}}>
                        <Typography variant="subtitle2" gutterBottom>
                            Result:
                        </Typography>
                        <Typography variant="body2" component="pre" sx={{fontFamily: "monospace"}}>
                            {result}
                        </Typography>
                    </Paper>
                )}

                <Dialog open={parameterDialogOpen} onClose={() => setParameterDialogOpen(false)} maxWidth="md" fullWidth>
                    <DialogTitle>Enter Parameters</DialogTitle>
                    <DialogContent>
                        <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                            Please provide values for the following parameters:
                        </Typography>
                        {Object.keys(parameterSchema).map((paramKey) => {
                            const param = parameterSchema[paramKey];
                            return (
                                <Box key={paramKey} sx={{ mb: 2 }}>
                                    <TextField
                                        fullWidth
                                        label={paramKey}
                                        value={parameterValues[paramKey] || ""}
                                        onChange={(e) => setParameterValues(prev => ({
                                            ...prev,
                                            [paramKey]: e.target.value
                                        }))}
                                        placeholder={param.description || `Enter ${paramKey}`}
                                        helperText={
                                            <>
                                                Type: {param.type || "string"}
                                                {param.description && <><br/>{param.description}</>}
                                                {param.default !== undefined && <><br/>Default: {JSON.stringify(param.default)}</>}
                                                {param.required && <><br/>Required: Yes</>}
                                            </>
                                        }
                                        required={param.required}
                                        multiline={param.type === "object" || param.type === "array"}
                                        rows={param.type === "object" || param.type === "array" ? 3 : 1}
                                    />
                                </Box>
                            );
                        })}
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setParameterDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleParameterDialogSubmit} variant="contained" disabled={loading}>
                            {loading ? "Running..." : "Run Code"}
                        </Button>
                    </DialogActions>
                </Dialog>
            </Box>
        );
    }

    renderTool1(node: NodeVM): React.ReactNode {
        return <CodeInterpreterTool1Component node={node}/>;
    }

    renderTool2(node: NodeVM): React.ReactNode {
        return <>
            <CodeInterpreterTool2Component node={node}/>
        </>;
    }

    ydataInitialize(node: NodeM) {
        const ydata = node.ydata();
        if (!ydata.has(CodeInterpreterCodeText)) {
            ydata.set(CodeInterpreterCodeText, new Y.Text());
        }
        if (!ydata.has(CodeInterpreterEndpointUrl)) {
            ydata.set(CodeInterpreterEndpointUrl, new Y.Text());
        }
        if (!ydata.has(CodeInterpreterDescriptionText)) {
            ydata.set(CodeInterpreterDescriptionText, new Y.Text());
        }
        if (!ydata.has(CodeInterpreterParameterText)) {
            ydata.set(CodeInterpreterParameterText, new Y.Text());
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

    descriptionYText(node: NodeM): Y.Text {
        return node.ydata().get(CodeInterpreterDescriptionText) as Y.Text;
    }

    parameterYText(node: NodeM): Y.Text {
        return node.ydata().get(CodeInterpreterParameterText) as Y.Text;
    }

    renderPrompt(node: NodeM): string {
        return this.descriptionYText(node).toJSON();
    }

    actions(node: NodeM): Action[] {
        const description = this.descriptionYText(node).toString();
        const parametersText = this.parameterYText(node).toString();
        
        // Parse parameters from the ydata
        let parameters: Record<string, any> = {
        };
        
        if (parametersText.trim()) {
            try {
                const parametersObj = JSON.parse(parametersText);
                if (typeof parametersObj === 'object' && parametersObj !== null && !Array.isArray(parametersObj)) {
                    // Merge the parsed parameters with the default code parameter
                    parameters = {...parametersObj };
                }
            } catch (error) {
                // If parameters are invalid JSON, just use the default code parameter
            }
        }

        return [{
            label: "Run " + node.title(),
            description: description || "Execute Python code in the interpreter",
            parameter: parameters
        }];
    }

    async executeAction(node: NodeM, label: string, parameters: Record<string, any>, callerNode: NodeM, agentSessionState: AgentSessionState): Promise<any> {
        const code = this.codeYText(node).toString();
        const url = this.endpointUrlYText(node)?.toString().trim();
        console.log(code, url, parameters);

        if (!url) {
            throw new Error("No endpoint URL configured for code interpreter");
        }

        if (!code?.trim()) {
            throw new Error("No code provided to execute");
        }

        // Extract all parameters except 'code' to pass as execution parameters
        const executionParameters: Record<string, any> = {};
        Object.keys(parameters).forEach(key => {
            if (key !== 'code') {
                executionParameters[key] = parameters[key];
            }
        });

        try {
            const requestBody: any = { code };
            if (Object.keys(executionParameters).length > 0) {
                requestBody.parameters = executionParameters;
            }
            agentSessionState.addMessage(callerNode, new ToolCallingMessage({
                toolName: node.title(),
                parameters: executionParameters,
                author: node.title(),
            }));
            
            const response = await axios.post(url, requestBody);
            const result =  response.data["result"];
            agentSessionState.addMessage(callerNode, new ToolResponseMessage({
                toolName: node.title(),
                response: result,
                author: node.title(),
            }));

        } catch (error: any) {
            throw new Error(`Code execution failed: ${error.message}`);
        }
    }
}