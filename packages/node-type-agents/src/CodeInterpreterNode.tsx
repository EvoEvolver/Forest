import {NodeM, NodeVM} from "@forest/schema";
import React, {useState} from "react";
import CollaborativeEditor from "./CodeEditor";
import {python} from "@codemirror/lang-python";
import {markdown} from "@codemirror/lang-markdown";
import * as Y from "yjs";
import {Box, Button, TextField, Typography, Paper, Dialog, DialogTitle, DialogContent, DialogActions, Card, CardContent, CircularProgress, Accordion, AccordionSummary, AccordionDetails} from "@mui/material";
import axios from "axios";
import {Action, ActionableNodeType} from "./ActionableNodeType";
import {AgentSessionState} from "./sessionState";
import EditIcon from '@mui/icons-material/Edit';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {useAtomValue} from "jotai";
import {authTokenAtom} from "@forest/user-system/src/authStates";
import {NormalMessage} from "@forest/agent-chat/src/MessageTypes";
import {fetchChatResponse} from "@forest/agent-chat/src/llm";
import {stageThisVersion} from "@forest/schema/src/stageService";
import pRetry from 'p-retry';

// Configuration component for endpoint URL and description
const CodeInterpreterTool1Component: React.FC<{ node: NodeVM }> = ({ node }) => {
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
        <Box sx={{width: "100%", height: "100%", display: "flex", flexDirection: "column"}}>
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
            <Box sx={{flex: 1, minHeight: 0}}>
                <Typography variant="h6" sx={{mb: 1}}>Description</Typography>
                <Box sx={{height: "calc(100% - 32px)", border: "1px solid #ddd", borderRadius: 1}}>
                    <CollaborativeEditor yText={node.ydata.get(CodeInterpreterDescriptionText)} langExtension={markdown}/>
                </Box>
            </Box>
        </Box>
    );
};

const CodeInterpreterCodeText = "CodeInterpreterCodeText"
const CodeInterpreterEndpointUrl = "CodeInterpreterEndpointUrl"
const CodeInterpreterDescriptionText = "CodeInterpreterDescriptionText"

// Code Interpreter Modify Button Component
const CodeInterpreterModifyButton: React.FC<{ node: NodeVM }> = ({ node }) => {
    const [loading, setLoading] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [prompt, setPrompt] = useState("");
    const [accordionExpanded, setAccordionExpanded] = useState(false);
    const authToken = useAtomValue(authTokenAtom);

    const defaultTemplate = `You are a professional Python code editor.
The user wants to modify the following Python code based on their specific request.

The current code is:
<original_code>
\${originalCode}
</original_code>

The request is:
<user_request>
\${userPrompt}
</user_request>

Please modify the code according to the user request. 
Maintain good Python coding practices and ensure the code remains functional.
If there are parameters for the code, you should load the JSON of it from sys.argv[1] and parse it with pydantic.

<output_format>
Return only the Python code without any additional text, comments, or formatting markers.
Do not include code block markers like \`\`\`python.
Just return the raw Python code.
</output_format>`;

    const [customTemplate, setCustomTemplate] = useState<string>(
        localStorage.getItem('codeInterpreterModifyTemplate') || defaultTemplate
    );

    const handleClick = () => {
        setDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setDialogOpen(false);
        setPrompt("");
    };

    const handleTemplateChange = (newTemplate: string) => {
        setCustomTemplate(newTemplate);
        localStorage.setItem('codeInterpreterModifyTemplate', newTemplate);
    };

    const handleResetTemplate = () => {
        setCustomTemplate(defaultTemplate);
        localStorage.setItem('codeInterpreterModifyTemplate', defaultTemplate);
    };

    const isTemplateModified = customTemplate !== defaultTemplate;

    const handleModify = async () => {
        if (!prompt.trim()) return;

        setLoading(true);
        try {
            const originalCode = node.ydata.get(CodeInterpreterCodeText)?.toString() || "";
            const modifiedCode = await getModifiedCode(originalCode, prompt, authToken, customTemplate);
            
            // Stage current version before modification
            await stageThisVersion(node, "Before AI code modification");
            
            // Update the code
            const yText = node.ydata.get(CodeInterpreterCodeText) as Y.Text;
            if (yText) {
                yText.delete(0, yText.length);
                yText.insert(0, modifiedCode);
            }
            
            handleCloseDialog();
        } catch (error) {
            alert("Error modifying code: " + (error instanceof Error ? error.message : String(error)));
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Card
                sx={{
                    cursor: 'pointer',
                    boxShadow: 2,
                    '&:hover': {
                        boxShadow: 4,
                        transform: 'translateY(-1px)'
                    },
                    transition: 'all 0.2s ease-in-out',
                    mb: 2,
                    borderRadius: 2
                }}
                onClick={handleClick}
            >
                <CardContent sx={{display: 'flex', alignItems: 'center', gap: 2, py: 1.5}}>
                    <EditIcon color="primary" fontSize="small"/>
                    <div>
                        <Typography variant="body2" component="div">
                            Modify Code with AI
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                            Use AI to modify your Python code
                        </Typography>
                    </div>
                </CardContent>
            </Card>

            <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
                <DialogTitle>Modify Python Code with AI</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Enter your modification prompt"
                        fullWidth
                        multiline
                        rows={4}
                        variant="outlined"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="e.g., Add error handling, Optimize this function, Add docstrings, Convert to async..."
                        sx={{mb: 2}}
                    />

                    <Accordion
                        expanded={accordionExpanded}
                        onChange={() => setAccordionExpanded(!accordionExpanded)}
                    >
                        <AccordionSummary expandIcon={<ExpandMoreIcon/>}>
                            <Typography variant="h6">Custom Prompt Template</Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: '16px'
                            }}>
                                <Typography variant="body2" color="textSecondary">
                                    Edit the AI prompt template. Use ${'${originalCode}'} and ${'${userPrompt}'} as placeholders.
                                </Typography>
                                {isTemplateModified && (
                                    <Button
                                        size="small"
                                        onClick={handleResetTemplate}
                                        color="secondary"
                                    >
                                        Reset to Original
                                    </Button>
                                )}
                            </div>
                            <TextField
                                fullWidth
                                multiline
                                rows={12}
                                variant="outlined"
                                value={customTemplate}
                                onChange={(e) => handleTemplateChange(e.target.value)}
                                placeholder="Enter your custom template with ${'${originalCode}'} and ${'${userPrompt}'} placeholders"
                            />
                        </AccordionDetails>
                    </Accordion>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog}>Cancel</Button>
                    <Button
                        onClick={handleModify}
                        color="primary"
                        disabled={!prompt.trim() || loading}
                    >
                        {loading ? <CircularProgress size={20}/> : "Modify"}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

async function getModifiedCode(originalCode: string, userPrompt: string, authToken: string, customTemplate: string): Promise<string> {
    const prompt = customTemplate
        .replace(/\${originalCode}/g, originalCode)
        .replace(/\${userPrompt}/g, userPrompt);

    const message = new NormalMessage({
        content: prompt,
        author: "user",
        role: "user",
    });

    return await pRetry(async () => {
        const response = await fetchChatResponse([message.toJson() as any], "gpt-4.1", authToken);
        
        // Basic validation - ensure we got back code-like content
        if (!response || response.trim().length === 0) {
            throw new Error('Empty response from AI');
        }
        
        return response.trim();
    }, {
        retries: 3,
        onFailedAttempt: (error) => {
            console.warn(`Code modification failed on attempt ${error.attemptNumber}:`, error.message);
        }
    });
}

export class CodeInterpreterNodeType extends ActionableNodeType {
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
        return <CodeInterpreterTool1Component node={node} />;
    }

    renderTool2(node: NodeVM): React.ReactNode {
        return <>
            <CodeInterpreterModifyButton node={node} />
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

    renderPrompt(node: NodeM): string {
        return this.descriptionYText(node).toJSON();
    }

    actions(node: NodeM): Action[] {
        return [{
            label: "Execute code in " + node.title(),
            description: this.descriptionYText(node).toJSON(),
            parameter: {
                "code": {
                    "type": "string",
                    "description": "The Python code to execute in the interpreter."
                }
            }
        }];
    }

    async executeAction(node: NodeM, label: string, parameters: Record<string, any>, callerNode: NodeM, agentSessionState: AgentSessionState): Promise<any> {
        const code = parameters.code;
        const url = this.endpointUrlYText(node)?.toString().trim();
        
        if (!url) {
            throw new Error("No endpoint URL configured for code interpreter");
        }
        
        if (!code?.trim()) {
            throw new Error("No code provided to execute");
        }

        try {
            const response = await axios.post(url, { code });
            return response.data["result"];
        } catch (error: any) {
            throw new Error(`Code execution failed: ${error.message}`);
        }
    }
}