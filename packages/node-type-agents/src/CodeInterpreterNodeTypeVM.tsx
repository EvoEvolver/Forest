// Configuration component for endpoint URL and description
import React, {useState} from "react";
import {NodeVM} from "@forest/schema";
import * as Y from "yjs";
import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Paper,
    TextField,
    Typography
} from "@mui/material";
import {CodeInterpreterGenerateButton, CodeInterpreterModifyButton} from "./CodeButtons/CodeInterpreterModifyButton";
import {NodeTypeVM} from "@forest/schema/src/nodeTypeVM";
import axios from "axios";
import CollaborativeEditor from "./CodeEditor";
import {python} from "@codemirror/lang-python";
import {markdown} from "@codemirror/lang-markdown";
import {json as jsonLang} from "@codemirror/lang-json";
import {
    CodeInterpreterCodeText,
    CodeInterpreterDescriptionText,
    CodeInterpreterEndpointUrl,
    CodeInterpreterNodeTypeM,
    CodeInterpreterParameterText
} from "./CodeInterpreterNode";

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

export class CodeInterpreterNodeTypeVM extends NodeTypeVM {
    static render(node: NodeVM): React.ReactNode {
        const [result, setResult] = useState<string>("");
        const [loading, setLoading] = useState<boolean>(false);
        const [parameterDialogOpen, setParameterDialogOpen] = useState<boolean>(false);
        const [parameterValues, setParameterValues] = useState<Record<string, any>>({});
        const [parameterSchema, setParameterSchema] = useState<Record<string, any>>({});


        const runCode = async () => {
            const code = node.ydata.get(CodeInterpreterCodeText)?.toString() || "";
            const url = CodeInterpreterNodeTypeM.endpointUrlYText(node.nodeM)?.toString().trim();
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
            const url = CodeInterpreterNodeTypeM.endpointUrlYText(node.nodeM)?.toString().trim();

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

                <Dialog open={parameterDialogOpen} onClose={() => setParameterDialogOpen(false)} maxWidth="md"
                        fullWidth>
                    <DialogTitle>Enter Parameters</DialogTitle>
                    <DialogContent>
                        <Typography variant="body2" color="textSecondary" sx={{mb: 2}}>
                            Please provide values for the following parameters:
                        </Typography>
                        {Object.keys(parameterSchema).map((paramKey) => {
                            const param = parameterSchema[paramKey];
                            return (
                                <Box key={paramKey} sx={{mb: 2}}>
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
                                                {param.default !== undefined && <>
                                                    <br/>Default: {JSON.stringify(param.default)}</>}
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

    static renderTool1(node: NodeVM): React.ReactNode {
        return <CodeInterpreterTool1Component node={node}/>;
    }

    static renderTool2(node: NodeVM): React.ReactNode {
        return <>
            <CodeInterpreterTool2Component node={node}/>
        </>;
    }
}