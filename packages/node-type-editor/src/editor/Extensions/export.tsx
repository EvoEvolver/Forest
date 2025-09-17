import {mergeAttributes, Node} from '@tiptap/core'
import {NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer} from '@tiptap/react'
import React, {useContext, useState} from 'react'
import {useTheme} from '@mui/material/styles'
import {NodeM} from "@forest/schema";
import {useAtomValue} from "jotai";
import {authTokenAtom} from "@forest/user-system/src/authStates";
import CircularProgress from "@mui/material/CircularProgress";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import DeleteIcon from '@mui/icons-material/Delete';
import DescriptionIcon from '@mui/icons-material/Description';
import {ModifyConfirmation} from "../../aiButtons/ModifyConfirmation";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import SyncIcon from '@mui/icons-material/Sync';
import {handleUpdateExport, handleUpdatePoints, replaceNonExportContent, updateExportContent} from './exportHelpers';
import {EditorNodeTypeM} from "../..";
import {EditorContext} from "../index";

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        export: {
            insertExport: (options?: {}) => ReturnType
        }
    }
}

const ExportNodeView = ({deleteNode}: any) => {
    const editorContext = useContext(EditorContext)
    const node: NodeM | undefined = editorContext?.nodeM
    const theme = useTheme();
    const [loading, setLoading] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [promptDialogOpen, setPromptDialogOpen] = useState(false);
    const [userPrompt, setUserPrompt] = useState('');
    const [currentExportContent, setCurrentExportContent] = useState<string | null>(null);
    const [summaryContent, setSummaryContent] = useState<string | null>(null);
    const [isPointsMode, setIsPointsMode] = useState(false);
    const authToken = useAtomValue(authTokenAtom);

    const handleUpdateExportClick = async (prompt?: string) => {
        setLoading(true);
        try {
            setIsPointsMode(false);
            await handleUpdateExport(node, authToken, {
                onShowConfirmation: (currentContent, summaryContent) => {
                    setCurrentExportContent(currentContent);
                    setSummaryContent(summaryContent);
                    setDialogOpen(true);
                },
                onError: (e) => {
                    alert(e);
                },
                userPrompt: prompt
            });
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateOutlineClick = async () => {
        setLoading(true);
        try {
            setIsPointsMode(true);
            await handleUpdatePoints(node, authToken, {
                onShowConfirmation: (currentContent, summaryContent) => {
                    setCurrentExportContent(currentContent);
                    setSummaryContent(summaryContent);
                    setDialogOpen(true);
                },
                onError: (e) => {
                    alert(e);
                }
            });
        } finally {
            setLoading(false);
        }
    };

    const handlePromptDialogOpen = () => {
        setPromptDialogOpen(true);
    };

    const handlePromptDialogClose = () => {
        setPromptDialogOpen(false);
        setUserPrompt('');
    };

    const handlePromptSubmit = async () => {
        setPromptDialogOpen(false);
        await handleUpdateExportClick(userPrompt);
        setUserPrompt('');
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
            if (isPointsMode) {
                // Replace the non-export content with the key points
                await replaceNonExportContent(node, modifiedContent);
            } else {
                // Update the export content
                const allContent = node ?
                    EditorNodeTypeM.getEditorContent(node).replace(/<div[^>]*class="export"[^>]*>[\s\S]*?<\/div>/gi, '').trim() : '';
                await updateExportContent(node, modifiedContent, allContent);
            }
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
                            Export to final document
                        </Typography>
                    </Box>
                    <Box sx={{display: "flex", alignItems: "center", gap: 0.5}}>
                        <Button
                            size="small"
                            variant="outlined"
                            startIcon={loading ? <CircularProgress size={16}/> : <SyncIcon/>}
                            onClick={() => handleUpdateExportClick()}
                            disabled={loading || !editorContext}
                            sx={{
                                textTransform: "none",
                                fontSize: "0.75rem",
                                minWidth: "auto",
                                padding: "4px 8px"
                            }}
                        >
                            Generate Paragraph
                        </Button>
                        <Button
                            size="small"
                            variant="outlined"
                            startIcon={loading ? <CircularProgress size={16}/> : <SyncIcon/>}
                            onClick={handleUpdateOutlineClick}
                            disabled={loading || !editorContext}
                            sx={{
                                textTransform: "none",
                                fontSize: "0.75rem",
                                minWidth: "auto",
                                padding: "4px 8px"
                            }}
                        >
                            Generate Outline
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
            <Dialog open={promptDialogOpen} onClose={handlePromptDialogClose} maxWidth="sm" fullWidth>
                <DialogTitle>Custom Prompt</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Enter your prompt"
                        fullWidth
                        multiline
                        rows={4}
                        variant="outlined"
                        value={userPrompt}
                        onChange={(e) => setUserPrompt(e.target.value)}
                        placeholder="Enter additional instructions for generating the export content..."
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={handlePromptDialogClose}>Cancel</Button>
                    <Button onClick={handlePromptSubmit} variant="contained" disabled={!userPrompt.trim()}>
                        Generate
                    </Button>
                </DialogActions>
            </Dialog>
            <ModifyConfirmation
                open={dialogOpen}
                onClose={handleCloseDialog}
                onAccept={handleAccept}
                dialogTitle={isPointsMode ? "Review Content Replacement" : "Review Export Update"}
                comparisonContent={{
                    original: {
                        title: isPointsMode ? "Current Content" : "Current Export Content",
                        content: currentExportContent ?? ""
                    },
                    modified: {
                        title: isPointsMode ? "Generated Key Points" : "Generated Summary",
                        content: summaryContent ?? ""
                    }
                }}
            />
        </NodeViewWrapper>
    )
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
            insertExport: (options = {}) => ({commands, editor}) => {
                // Check if an export node already exists
                let exportExists = false;
                editor.state.doc.descendants((node) => {
                    if (node.type.name === 'export') {
                        exportExists = true;
                        return false; // Stop traversing
                    }
                });

                if (exportExists) {
                    return false; // Do nothing if export already exists
                }

                // Insert at the end of the document
                const docSize = editor.state.doc.content.size;
                return commands.insertContentAt(docSize, {
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