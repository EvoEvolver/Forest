import * as React from "react";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import TextField from "@mui/material/TextField";
import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import {NodeM, NodeVM} from "@forest/schema";
import {EditorNodeType} from "..";
import {stageThisVersion} from "@forest/schema/src/stageService";
import {useAtomValue} from "jotai";
import {authTokenAtom} from "@forest/user-system/src/authStates";
import {NormalMessage} from "@forest/agent-chat/src/MessageTypes";
import {fetchChatResponse} from "@forest/agent-chat/src/llm";
import {Card} from "@mui/material";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import EditIcon from '@mui/icons-material/Edit';
import {ModifyConfirmation} from "./ModifyConfirmation";

export const ModifyButton: React.FC<{ node: NodeVM}> = ({node}) => {
    const [loading, setLoading] = React.useState(false);
    const [dialogOpen, setDialogOpen] = React.useState(false);
    const [prompt, setPrompt] = React.useState("");
    const [originalContent, setOriginalContent] = React.useState<string | null>(null);
    const [revisedContent, setRevisedContent] = React.useState<string | null>(null);
    const [reviewDialogOpen, setReviewDialogOpen] = React.useState(false);

    const defaultTemplate = `You are a professional editor. 
The user wants to modify the following content based on their specific request. 

The content to edit is children section of the parent section below.
<parent_content>
\${parentContent}
</parent_content>

The content to edit is
<original_content>
\${originalContent}
</original_content>

The request is
<user_request>
\${userPrompt}
</user_request>

Please modify the <original_content> according to <user_request>. Use the <parent_content> for additional context when making modifications. Maintain the overall structure and formatting style unless the user specifically asks to change it.

<output_format>
You should only return the HTML content of the modified text without any additional text or formatting.
Preserve any existing HTML tags and structure unless a modification is specifically requested.
If there are any annotations in the original text, you should keep them unless the user asks to remove them.
</output_format>`;
    
    const [customTemplate, setCustomTemplate] = React.useState<string>(
        localStorage.getItem('modifyButtonTemplate') || defaultTemplate
    );
    const [accordionExpanded, setAccordionExpanded] = React.useState(false);
    const authToken = useAtomValue(authTokenAtom);

    const handleClick = () => {
        setDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setDialogOpen(false);
        setPrompt("");
    };

    const handleTemplateChange = (newTemplate: string) => {
        setCustomTemplate(newTemplate);
        localStorage.setItem('modifyButtonTemplate', newTemplate);
    };

    const handleResetTemplate = () => {
        setCustomTemplate(defaultTemplate);
        localStorage.setItem('modifyButtonTemplate', defaultTemplate);
    };

    const isTemplateModified = customTemplate !== defaultTemplate;

    const handleModify = async () => {
        if (!prompt.trim()) return;
        
        setLoading(true);
        try {
            const editorNodeType = await node.nodeM.treeM.supportedNodesTypes("EditorNodeType") as EditorNodeType;
            const original = editorNodeType.getEditorContent(node.nodeM);
            const revised = await getModifiedContent(node.nodeM, prompt, authToken, customTemplate);

            setOriginalContent(original);
            setRevisedContent(revised);
            setDialogOpen(false);
            setReviewDialogOpen(true);
        } finally {
            setLoading(false);
        }
    };

    const handleCloseReviewDialog = () => {
        setReviewDialogOpen(false);
        setOriginalContent(null);
        setRevisedContent(null);
        setPrompt("");
    };

    const handleAccept = async (modifiedContent: string) => {
        await stageThisVersion(node, "Before LLM modification");
        const editorNodeType = await node.nodeM.treeM.supportedNodesTypes("EditorNodeType") as EditorNodeType;
        editorNodeType.setEditorContent(node.nodeM, modifiedContent);
        handleCloseReviewDialog();
    };

    return (
        <>
            <Card
                sx={{
                    cursor: 'pointer',
                    boxShadow: 3,
                    '&:hover': {
                        boxShadow: 6,
                        transform: 'translateY(-2px)'
                    },
                    transition: 'all 0.2s ease-in-out',
                    margin: "10px 0",
                    borderRadius: "10px"
                }}
                onClick={handleClick}
            >
                <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <EditIcon color="primary" />
                    <div>
                        <Typography variant="body1" component="div">
                            Modify with AI
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                            Use AI to modify the content based on your prompt
                        </Typography>
                    </div>
                </CardContent>
            </Card>

            <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
                <DialogTitle>Modify Content with AI</DialogTitle>
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
                        placeholder="e.g., Make this more concise, Add more details about..., Rewrite in a formal tone..."
                        sx={{ mb: 2 }}
                    />
                    
                    <Accordion 
                        expanded={accordionExpanded} 
                        onChange={() => setAccordionExpanded(!accordionExpanded)}
                    >
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Typography variant="h6">Custom Prompt Template</Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                <Typography variant="body2" color="textSecondary">
                                    Edit the AI prompt template. Use ${'${parentContent}'}, ${'${originalContent}'} and ${'${userPrompt}'} as placeholders.
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
                                placeholder="Enter your custom template with ${'${parentContent}'}, ${'${originalContent}'} and ${'${userPrompt}'} placeholders"
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
                        {loading ? <CircularProgress size={20} /> : "Modify"}
                    </Button>
                </DialogActions>
            </Dialog>

            <ModifyConfirmation
                open={reviewDialogOpen}
                onClose={handleCloseReviewDialog}
                onAccept={handleAccept}
                dialogTitle="Review Changes"
                comparisonContent={{
                    original: {
                        title: "Original",
                        content: originalContent ?? ""
                    },
                    modified: {
                        title: "Modified",
                        content: revisedContent ?? ""
                    }
                }}
            />
        </>
    );
};

async function getModifiedContent(node: NodeM, userPrompt: string, authToken: string, customTemplate?: string): Promise<string> {
    const treeM = node.treeM;
    const editorNodeType = await treeM.supportedNodesTypes("EditorNodeType") as EditorNodeType;
    const originalContent = editorNodeType.getEditorContent(node);
    
    const parent = treeM.getParent(node);
    const parentContent = parent && parent.nodeTypeName() === "EditorNodeType"
        ? editorNodeType.getEditorContent(parent)
        : "No parent node available.";

    const prompt = customTemplate
        .replace(/\${originalContent}/g, originalContent)
        .replace(/\${userPrompt}/g, userPrompt)
        .replace(/\${parentContent}/g, parentContent);

    const message = new NormalMessage(
        {
            content: prompt,
            author: "user",
            role: "user",
        }
    );
    
    return await fetchChatResponse([message.toJson() as any], "gpt-4.1", authToken);
}