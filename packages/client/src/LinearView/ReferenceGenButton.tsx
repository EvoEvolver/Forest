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
import {NodeJson, NodeM} from "@forest/schema";
import {EditorNodeTypeM} from '@forest/node-type-editor/src';
import {v4 as uuidv4} from "uuid";

interface ReferenceGenButtonProps {
    getHtml: () => string;
    rootNode: NodeM
}

export default function ReferenceGenButton({getHtml, rootNode}: ReferenceGenButtonProps) {
    const [open, setOpen] = useState(false);
    const [citations, setCitations] = useState<Array<{ title: string, citation: string }>>([]);
    const [loading, setLoading] = useState(false);

    const handleGenerateCitations = async () => {
        setOpen(true);
        setLoading(true);
        setCitations([]);

        try {
            const content = getHtml();
            const result = await generateCitationsFromHTML(content);

            // Deduplicate citations based on title and citation content
            const uniqueCitations = new Map<string, { title: string, citation: string }>();

            for (const item of result) {
                // Create a key based on normalized title and citation content
                const normalizedTitle = item.title.trim().toLowerCase();
                const normalizedCitation = item.citation.replace(/<[^>]*>/g, '').trim().toLowerCase(); // Remove HTML tags
                const key = `${normalizedTitle}::${normalizedCitation}`;

                // Only add if we haven't seen this exact citation before
                if (!uniqueCitations.has(key)) {
                    uniqueCitations.set(key, item);
                }
            }

            const deduplicatedResult = Array.from(uniqueCitations.values());
            console.log('result', deduplicatedResult);
            setCitations(deduplicatedResult);
        } catch (error) {
            console.error('Error generating citations:', error);
            setCitations([]);
        } finally {
            setLoading(false);
        }
    };

    const rootM = rootNode

    const addToReferences = async () => {
        try {
            const treeM = rootM.treeM;

            // Check if "References" node already exists
            let referenceNodeM = null;
            const lastChildren = treeM.getChildren(rootM).slice(-1)[0];
            if (lastChildren && lastChildren.title() === "References") {
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
            }

            // Generate HTML content for references using titles
            const citationsHtml = citations.map((item) =>
                `<p><strong>${item.title}</strong>: ${item.citation}</p>`
            ).join('\n');

            // Set the content
            try {
                EditorNodeTypeM.setEditorContent(referenceNodeM, citationsHtml);
            } catch (e) {
                alert(e)
            }
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