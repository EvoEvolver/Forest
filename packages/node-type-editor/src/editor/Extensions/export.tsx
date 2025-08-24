import {mergeAttributes, Node} from '@tiptap/core'
import {NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer} from '@tiptap/react'
import React, {useContext, useState} from 'react'
import {useTheme} from '@mui/material/styles'
import {thisNodeContext} from "@forest/client";
import {NodeM, NodeVM} from "@forest/schema";
import {EditorNodeTypeM} from "../..";
import {stageThisVersion} from "@forest/schema/src/stageService";
import {useAtomValue} from "jotai";
import {authTokenAtom} from "@forest/user-system/src/authStates";
import {NormalMessage} from "@forest/agent-chat/src/MessageTypes";
import {fetchChatResponse} from "@forest/agent-chat/src/llm";
import CircularProgress from "@mui/material/CircularProgress";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import UpdateIcon from '@mui/icons-material/Update';
import DeleteIcon from '@mui/icons-material/Delete';
import DescriptionIcon from '@mui/icons-material/Description';
import {ModifyConfirmation} from "../../aiButtons/ModifyConfirmation";

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        export: {
            insertExport: (options?: {}) => ReturnType
        }
    }
}

const ExportNodeView = ({deleteNode}: any) => {
    const node: NodeVM = useContext(thisNodeContext)
    const theme = useTheme();
    const [loading, setLoading] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [currentExportContent, setCurrentExportContent] = useState<string | null>(null);
    const [summaryContent, setSummaryContent] = useState<string | null>(null);
    const authToken = useAtomValue(authTokenAtom);

    const handleUpdateExport = async () => {
        setLoading(true);
        try {
            // Get all content from the editor except export divs
            const allContent = getEditorContentExceptExports(node.nodeM);
            const currentContent = EditorNodeTypeM.getEditorContent(node.nodeM);

            // Extract current export div content
            const exportMatch = currentContent.match(/<div[^>]*class="export"[^>]*>([\s\S]*?)<\/div>/i);
            const existingExportContent = exportMatch ? exportMatch[1].trim() : "";

            const summary = await generateExportSummary(allContent, existingExportContent, authToken);

            // If there's existing content, show confirmation dialog
            if (existingExportContent && existingExportContent.length > 0) {
                setCurrentExportContent(existingExportContent);
                setSummaryContent(summary);
                setDialogOpen(true);
            } else {
                // No existing content, update directly
                await updateExportContent(summary);
            }
        } catch (e) {
            alert(e);
        } finally {
            setLoading(false);
        }
    };

    const updateExportContent = async (summary: string) => {
        await stageThisVersion(node.nodeM, "Before export update");

        const currentContent = EditorNodeTypeM.getEditorContent(node.nodeM);

        // Update only the export div content, keeping the rest of the node content
        const updatedContent = currentContent.replace(
            /<div([^>]*class="export"[^>]*)>([\s\S]*?)<\/div>/i,
            `<div$1>${summary}</div>`
        );

        EditorNodeTypeM.setEditorContent(node.nodeM, updatedContent);
    };

    const handleDeleteNode = () => {
        if (deleteNode) {
            deleteNode();
        }
    };

    const handleCloseDialog = () => {
        setDialogOpen(false);
        setCurrentExportContent(null);
        setSummaryContent(null);
    };

    const handleAccept = async (modifiedContent: string) => {
        try {
            await updateExportContent(modifiedContent);
        } catch (e) {
            alert(e);
        }
        handleCloseDialog();
    };

    return (
        <NodeViewWrapper className="export-node">
            <Card
                sx={{
                    margin: "16px 0",
                    border: `1px solid ${theme.palette.primary.light}`,
                    borderRadius: "12px",
                    boxShadow: theme.shadows[0],
                    transition: "all 0.2s ease-in-out",
                    "&:hover": {
                        borderColor: theme.palette.primary.main,
                        boxShadow: theme.shadows[4],
                    }
                }}
            >
                <Box
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "8px 16px",
                        backgroundColor: theme.palette.background.paper,
                        borderBottom: `1px solid #e9ecef`,
                        borderTopLeftRadius: "12px",
                        borderTopRightRadius: "12px",
                    }}
                >
                    <Box sx={{display: "flex", alignItems: "center", gap: 1}}>
                        <DescriptionIcon color="primary" fontSize="small"/>
                        <Typography variant="body2" fontWeight="medium" color="text.secondary">
                            Export to linear
                        </Typography>
                    </Box>
                    <Box sx={{display: "flex", alignItems: "center", gap: 0.5}}>
                        <Button
                            size="small"
                            variant="outlined"
                            startIcon={loading ? <CircularProgress size={16}/> : <UpdateIcon/>}
                            onClick={handleUpdateExport}
                            disabled={loading}
                            sx={{
                                textTransform: "none",
                                fontSize: "0.75rem",
                                minWidth: "auto",
                                padding: "4px 8px"
                            }}
                        >
                            Update
                        </Button>
                        <IconButton
                            size="small"
                            onClick={handleDeleteNode}
                            sx={{
                                color: theme.palette.error.main,
                                "&:hover": {
                                    backgroundColor: theme.palette.error.light,
                                    color: theme.palette.common.white
                                }
                            }}
                        >
                            <DeleteIcon fontSize="small"/>
                        </IconButton>
                    </Box>
                </Box>
                <CardContent sx={{padding: "16px !important"}}>
                    <NodeViewContent className="export-content"/>
                </CardContent>
            </Card>
            <ModifyConfirmation
                open={dialogOpen}
                onClose={handleCloseDialog}
                onAccept={handleAccept}
                dialogTitle="Review Export Update"
                comparisonContent={{
                    original: {
                        title: "Current Export Content",
                        content: currentExportContent ?? ""
                    },
                    modified: {
                        title: "Generated Summary",
                        content: summaryContent ?? ""
                    }
                }}
            />
        </NodeViewWrapper>
    )
}

function getEditorContentExceptExports(currentNode: NodeM): string {
    // Get content from all editor nodes and filter out export divs
    let allContent = "";
    const content = EditorNodeTypeM.getEditorContent(currentNode);
    // Remove export div content using regex
    const contentWithoutExports = content.replace(/<div[^>]*class="export"[^>]*>[\s\S]*?<\/div>/gi, '');
    if (contentWithoutExports.trim()) {
        allContent += contentWithoutExports + "\n\n";
    }
    return allContent.trim();
}

async function generateExportSummary(allContent: string, currentContent: string, authToken: string): Promise<string> {
    const prompt = `
You are a professional writer. Your task is to write well-written paragraph(s) based on the raw content provided.

<raw_content>
${allContent}
</raw_content>

<current_paragraphs>
${currentContent}
</current_paragraphs>

Please write a paragraph based on the raw content. You must:
- If the current paragraph is not empty, don't make unnecessary changes. You are encouraged to keep the original contents as much as possible.
- If there is a mismatch between the current paragraphs and the raw content, make paragraphs align with the raw content.
- You should not drop any key information in the raw content.
- Be written in a clear, professional style

<output_format>
You should only return the HTML content of the paragraph without any additional text or formatting.
You should keep the links in the original content and put them in a proper place.
</output_format>
`;

    const message = new NormalMessage({
        content: prompt,
        author: "user",
        role: "user",
    });

    return await fetchChatResponse([message.toJson() as any], "gpt-4.1", authToken);
}

export interface ExportOptions {
    HTMLAttributes: {
        [key: string]: any
    }
}

export const ExportExtension = Node.create<ExportOptions>({
    name: 'export',

    group: 'block',

    atom: false,

    content: 'block*',

    addOptions() {
        return {
            HTMLAttributes: {
                class: 'export',
            },
        }
    },

    parseHTML() {
        return [
            {
                tag: 'div[class~="export"]',
            },
        ]
    },

    renderHTML({HTMLAttributes}) {
        return ['div', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0]
    },

    addNodeView() {
        return ReactNodeViewRenderer(ExportNodeView, {
            as: 'div',
        })
    },

    addCommands() {
        return {
            insertExport: (options = {}) => ({commands}) => {
                return commands.insertContent({
                    type: this.name,
                    content: [{
                        type: 'paragraph',
                        content: [{type: 'text', text: '   '}],
                    },],
                })
            },
        }
    },
})

export default ExportExtension