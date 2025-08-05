import React, {useState} from 'react';
import {
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Typography
} from '@mui/material';
import {generateCitationsFromHTML} from './generateReferences';
import {NodeJson, NodeM, NodeVM} from "@forest/schema";
import {EditorNodeType} from '@forest/node-type-editor/src';
import {useAtomValue} from "jotai";
import {v4 as uuidv4} from "uuid";

interface ReferenceGenButtonProps {
    getHtml: () => string;
    rootNode: NodeVM
}

export default function ReferenceGenButton({getHtml, rootNode}: ReferenceGenButtonProps) {
    const [open, setOpen] = useState(false);
    const [citations, setCitations] = useState<Array<{ title: string, citation: string }>>([]);
    const [loading, setLoading] = useState(false);
    const rootChildren = useAtomValue(rootNode.children) as string[];

    const handleGenerateCitations = async () => {
        setOpen(true);
        setLoading(true);
        setCitations([]);

        try {
            const content = getHtml();
            const result = await generateCitationsFromHTML(content);

            console.log('result', result);
            setCitations(result);
        } catch (error) {
            console.error('Error generating citations:', error);
            setCitations([]);
        } finally {
            setLoading(false);
        }
    };

    const rootM = rootNode.nodeM;

    const addToReferences = async () => {
        try {
            const treeM = rootM.treeM;

            // Check if "References" node already exists
            let referenceNodeM = null;
            const lastChildren = treeM.getChildren(rootM).slice(-1)[0];
            if(lastChildren && lastChildren.title() === "References") {
                referenceNodeM = lastChildren
            }

            // Create "References" node if it doesn't exist
            if (!referenceNodeM) {
                const newNodeJson: NodeJson = {
                    id: uuidv4(),
                    title: "References",
                    parent: rootNode.id,
                    children: [],
                    data: {},
                    nodeTypeName: "EditorNodeType",
                };
                referenceNodeM = NodeM.fromNodeJson(newNodeJson, treeM);
                treeM.insertNode(referenceNodeM, rootNode.id, null);

                // Initialize the editor content
                const editorNodeType = await treeM.supportedNodesTypes("EditorNodeType") as EditorNodeType;
                editorNodeType.ydataInitialize(referenceNodeM);
            }

            // Generate HTML content for references
            const citationsHtml = citations.map((item, index) =>
                `<p><strong>[${index + 1}]</strong> ${item.citation}</p>`
            ).join('\n');

            // Set the content
            const editorNodeType = await treeM.supportedNodesTypes("EditorNodeType") as EditorNodeType;
            editorNodeType.setEditorContent(referenceNodeM, citationsHtml);

            // Close dialog
            setOpen(false);
            setCitations([]);

        } catch (error) {
            console.error('Error adding to references:', error);
        }
    };

    const handleClose = () => {
        setOpen(false);
        setCitations([]);
    };

    return (
        <>
            <Button
                variant="outlined"
                onClick={handleGenerateCitations}
                size="small"
                sx={{mb: 2}}
            >
                Generate Citations
            </Button>

            <Dialog
                open={open}
                onClose={handleClose}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>Generated Citations</DialogTitle>
                <DialogContent>
                    {loading ? (
                        <Box display="flex" justifyContent="center" alignItems="center" p={3}>
                            <CircularProgress/>
                            <Typography variant="body2" sx={{ml: 2}}>
                                Generating citations...
                            </Typography>
                        </Box>
                    ) : citations.length > 0 ? (
                        <Box>
                            {citations.map((item, index) => (
                                <Box key={index} sx={{mb: 3}}>
                                    <Typography variant="body2"
                                                dangerouslySetInnerHTML={{__html: "<span>" + item.title + ": <span/>" + item.citation}}/>
                                </Box>
                            ))}
                        </Box>
                    ) : (
                        <Typography variant="body2" color="text.secondary">
                            No links found in the content or all citations failed to generate.
                        </Typography>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleClose}>Close</Button>
                    {citations.length > 0 && (
                        <Button onClick={addToReferences} variant="contained">
                            Add to References
                        </Button>
                    )}
                </DialogActions>
            </Dialog>
        </>
    );
}