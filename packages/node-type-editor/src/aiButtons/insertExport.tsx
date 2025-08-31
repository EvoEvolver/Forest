import * as React from "react";
import {useState} from "react";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import AddIcon from '@mui/icons-material/Add';
import CircularProgress from "@mui/material/CircularProgress";
import {NodeVM} from "@forest/schema";
import {EditorNodeTypeM} from "..";
import {stageThisVersion} from "@forest/schema/src/stageService";
import {useAtomValue} from "jotai";
import {authTokenAtom} from "@forest/user-system/src/authStates";
import {getEditorContentExceptExports, generateExportParagraphByNode, updateExportContent} from "../editor/Extensions/exportHelpers";
import {ModifyConfirmation} from "./ModifyConfirmation";

export const InsertExportButton: React.FC<{ node: NodeVM }> = ({node}) => {
    const [loading, setLoading] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [currentExportContent, setCurrentExportContent] = useState<string | null>(null);
    const [summaryContent, setSummaryContent] = useState<string | null>(null);
    const authToken = useAtomValue(authTokenAtom);

    const handleClick = async () => {
        setLoading(true);
        try {
            await stageThisVersion(node.nodeM, "Before inserting export");
            
            // Get all content from the editor except export divs
            const allContent = getEditorContentExceptExports(node.nodeM);
            const currentContent = EditorNodeTypeM.getEditorContent(node.nodeM);
            
            // Check if export div already exists
            const exportMatch = currentContent.match(/<div[^>]*class="export"[^>]*>([\s\S]*?)<\/div>/i);
            const existingExportContent = exportMatch ? exportMatch[1].trim() : "";
            
            if (exportMatch) {
                // Export already exists, just generate and show confirmation
                const summary = await generateExportParagraphByNode(node.nodeM, authToken);
                setCurrentExportContent(existingExportContent);
                setSummaryContent(summary);
                setDialogOpen(true);
            } else {
                // No export exists, create one and generate content
                const summary = await generateExportParagraphByNode(node.nodeM, authToken);
                const newContent = currentContent + '<div class="export"> </div>';
                EditorNodeTypeM.setEditorContent(node.nodeM, newContent);
                
                // Now update the empty export with generated content
                await updateExportContent(node, summary, allContent);
            }
        } catch (e) {
            alert(e);
        } finally {
            setLoading(false);
        }
    };
    
    const handleCloseDialog = () => {
        setDialogOpen(false);
        setCurrentExportContent(null);
        setSummaryContent(null);
    };

    const handleAccept = async (modifiedContent: string) => {
        try {
            const allContent = getEditorContentExceptExports(node.nodeM);
            await updateExportContent(node, modifiedContent, allContent);
        } catch (e) {
            alert(e);
        }
        handleCloseDialog();
    };

    return (
        <>
            <Card
                sx={{
                    cursor: loading ? 'default' : 'pointer',
                    boxShadow: 3,
                    '&:hover': {
                        boxShadow: loading ? 3 : 6,
                        transform: loading ? 'none' : 'translateY(-2px)'
                    },
                    transition: 'all 0.2s ease-in-out',
                    margin: "10px 0",
                    borderRadius: "10px",
                    opacity: loading ? 0.6 : 1
                }}
                onClick={loading ? undefined : handleClick}
            >
                <CardContent sx={{display: 'flex', alignItems: 'center', gap: 2}}>
                    {loading ? <CircularProgress size={24} color="primary"/> : <AddIcon color="primary"/>}
                    <div>
                        <Typography variant="body1" component="div">
                            {loading ? 'Generating export...' : 'Write and export'}
                        </Typography>
                    </div>
                </CardContent>
            </Card>
            <ModifyConfirmation
                open={dialogOpen}
                onClose={handleCloseDialog}
                onAccept={handleAccept}
                dialogTitle="Review Export Content"
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
        </>
    );
};