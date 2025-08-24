import React, {useState} from "react";
import {NodeVM} from "@forest/schema";
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Button,
    Card,
    CardContent,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    TextField,
    Typography
} from "@mui/material";
import EditIcon from '@mui/icons-material/Edit';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {useAtomValue} from "jotai";
import {authTokenAtom} from "@forest/user-system/src/authStates";
import {NormalMessage} from "@forest/agent-chat/src/MessageTypes";
import {fetchChatResponse} from "@forest/agent-chat/src/llm";
import {stageThisVersion} from "@forest/schema/src/stageService";
import pRetry from 'p-retry';
import * as Y from "yjs";

const CodeInterpreterCodeText = "CodeInterpreterCodeText";
const CodeInterpreterDescriptionText = "CodeInterpreterDescriptionText";
const CodeInterpreterParameterText = "CodeInterpreterParameterText";

// Generate Description and Parameters Button Component
export const CodeInterpreterGenerateButton: React.FC<{ node: NodeVM }> = ({node}) => {
    const [loading, setLoading] = useState(false);
    const authToken = useAtomValue(authTokenAtom);

    const handleGenerate = async () => {
        setLoading(true);
        try {
            const code = node.ydata.get(CodeInterpreterCodeText)?.toString() || "";
            
            if (!code.trim()) {
                alert("No code available to analyze");
                return;
            }

            const result = await generateDescriptionAndParameters(code, authToken);

            // Stage current version before modification
            await stageThisVersion(node.nodeM, "Before AI description/parameters generation");

            // Update the description
            const descriptionYText = node.ydata.get(CodeInterpreterDescriptionText) as Y.Text;
            if (descriptionYText) {
                descriptionYText.delete(0, descriptionYText.length);
                descriptionYText.insert(0, result.description);
            }

            // Update the parameters
            const parametersYText = node.ydata.get(CodeInterpreterParameterText) as Y.Text;
            if (parametersYText) {
                parametersYText.delete(0, parametersYText.length);
                parametersYText.insert(0, result.parameters);
            }

        } catch (error) {
            alert("Error generating description and parameters: " + (error instanceof Error ? error.message : String(error)));
        } finally {
            setLoading(false);
        }
    };

    return (
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
            onClick={handleGenerate}
        >
            <CardContent sx={{display: 'flex', alignItems: 'center', gap: 2, py: 1.5}}>
                {loading ? <CircularProgress size={20} color="primary" /> : <AutoAwesomeIcon color="primary" fontSize="small"/>}
                <div>
                    <Typography variant="body2" component="div">
                        Generate Description & Parameters
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                        Use AI to generate description and parameters from code
                    </Typography>
                </div>
            </CardContent>
        </Card>
    );
};

// Code Interpreter Modify Button Component
export const CodeInterpreterModifyButton: React.FC<{ node: NodeVM }> = ({node}) => {
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

The code description is:
<description>
\${description}
</description>

The parameters specification is:
<parameters>
\${parameters}
</parameters>

The request is:
<user_request>
\${userPrompt}
</user_request>

Please modify the code according to the user request. 
Maintain good Python coding practices and ensure the code remains functional.
If the code should take parameters, you must load the parameters by param=json.loads(sys.argv[1]) and validate it with pydantic V2.
Use the description and parameters context to better understand the code's purpose and expected inputs.

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
            const description = node.ydata.get(CodeInterpreterDescriptionText)?.toString() || "No description available";
            const parameters = node.ydata.get(CodeInterpreterParameterText)?.toString() || "{}";
            const modifiedCode = await getModifiedCode(originalCode, prompt, description, parameters, authToken, customTemplate);

            // Stage current version before modification
            await stageThisVersion(node.nodeM, "Before AI code modification");

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
                                    Edit the AI prompt template. Use ${'${originalCode}'}, ${'${userPrompt}'}, ${'${description}'}, and ${'${parameters}'} as
                                    placeholders.
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
                                placeholder="Enter your custom template with ${'${originalCode}'}, ${'${userPrompt}'}, ${'${description}'}, and ${'${parameters}'} placeholders"
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

async function getModifiedCode(originalCode: string, userPrompt: string, description: string, parameters: string, authToken: string, customTemplate: string): Promise<string> {
    const prompt = customTemplate
        .replace(/\${originalCode}/g, originalCode)
        .replace(/\${userPrompt}/g, userPrompt)
        .replace(/\${description}/g, description)
        .replace(/\${parameters}/g, parameters);

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

async function generateDescriptionAndParameters(code: string, authToken: string): Promise<{description: string, parameters: string}> {
    const prompt = `You are analyzing Python code to generate a description and parameters specification.

Analyze the following Python code:
<code>
${code}
</code>

Provide:
1. A clear, concise description of what this code does
2. JSON schema for any parameters the code expects (if any)
3. Use existing description if it is already present in the code comments or docstrings

Return your response in the following JSON format:
{
  "description": "Brief description of what the code does",
  "parameters": {
    "parameter_name": {
      "type": "string|number|boolean|object|array",
      "description": "Description of what this parameter does",
      "required": true|false,
      "default": "default_value_if_any"
    }
  }
}

If the code doesn't expect any parameters, return an empty object for parameters.
Only return the JSON, no additional text.`;

    const message = new NormalMessage({
        content: prompt,
        author: "user",
        role: "user",
    });

    return await pRetry(async () => {
        const response = await fetchChatResponse([message.toJson() as any], "gpt-4.1", authToken);
        
        if (!response || response.trim().length === 0) {
            throw new Error('Empty response from AI');
        }

        try {
            const result = JSON.parse(response.trim());
            return {
                description: result.description || "",
                parameters: JSON.stringify(result.parameters || {}, null, 2)
            };
        } catch (parseError) {
            throw new Error('Invalid JSON response from AI');
        }
    }, {
        retries: 3,
        onFailedAttempt: (error) => {
            console.warn(`Description generation failed on attempt ${error.attemptNumber}:`, error.message);
        }
    });
}