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
import {NodeM} from "@forest/schema";
import {EditorNodeTypeM} from '@forest/node-type-editor/src';
import {generateMLACitation} from "./generateReferences";
import {extractExportContent} from '@forest/node-type-editor/src/editor/Extensions/exportHelpers';

interface ReferenceGenButtonProps {
    rootNode: NodeM;
    nodes: { node: NodeM; level: number; }[];
}

export async function generateCitationsFromHTML(html: string): Promise<Array<{ title: string, citation: string }>> {
    // Parse HTML to find all <a> tags
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const links = doc.querySelectorAll('a[href]');
    const results: Array<{ title: string, citation: string }> = [];

    // Process each link
    for (const link of links) {
        const href = link.getAttribute('href').trim();
        const title = link.innerHTML.trim();

        if (!href || !title) continue;

        try {
            // Skip non-http(s) URLs
            if (!href.startsWith('http://') && !href.startsWith('https://')) {
                continue;
            }

            const citation = await generateMLACitation(href);
            results.push({title, citation});
        } catch (error) {
            console.warn(`Failed to generate citation for ${href}:`, error);
            // Add entry with error message
            results.push({
                title,
                citation: `Error generating citation for: ${href}`
            });
        }
    }

    return results;
}

// Helper function to check if content has export divs
const hasExportContent = (htmlContent: string): boolean => {
    return extractExportContent(htmlContent).trim().length > 0;
};

// Helper function to check if a node is terminal (has no children)
const isTerminalNode = (node: NodeM, treeM: any): boolean => {
    const children = treeM.getChildren(node);
    return children.length === 0;
};

export default function ReferenceGenButton({rootNode, nodes}: ReferenceGenButtonProps) {
    const [open, setOpen] = useState(false);
    const [citations, setCitations] = useState<Array<{ title: string, citation: string }>>([]);
    const [loading, setLoading] = useState(false);

    const getHtml = () => {
        if (!nodes) return '';
        
        const treeM = rootNode.treeM;
        if (!treeM) return '';

        return nodes.map(({node}) => {
            try {
                const fullContent = EditorNodeTypeM.getEditorContent(node);
                const isTerminal = isTerminalNode(node, treeM);

                if (isTerminal) {
                    // Terminal node: if has export, show only export; otherwise show everything
                    if (hasExportContent(fullContent)) {
                        return extractExportContent(fullContent);
                    } else {
                        return fullContent;
                    }
                } else {
                    // Non-terminal node: show only export content if it exists
                    return extractExportContent(fullContent);
                }
            } catch (error) {
                console.warn('Error generating HTML for node:', error);
                return '';
            }
        }).filter(html => html.length > 0).join('\n\n');
    };

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
                referenceNodeM = NodeM.newNode("References", rootNode.id, "EditorNodeType", treeM)
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