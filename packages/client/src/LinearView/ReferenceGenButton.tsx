import React, {useState} from 'react';
import {
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    Snackbar,
    Typography
} from '@mui/material';
import { Edit } from '@mui/icons-material';
import {NodeM} from "@forest/schema";
import {EditorNodeTypeM} from '@forest/node-type-editor/src';
import {extractExportContent} from '@forest/node-type-editor/src/editor/Extensions/exportHelpers';
import FixCitationDialog from './FixCitationDialog';

import {CitationResult, generateCitationsFromHTML} from "./generateReferences";

interface ReferenceGenButtonProps {
    rootNode: NodeM;
    nodes: { node: NodeM; level: number; }[];
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
    const [citations, setCitations] = useState<CitationResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: 0, errorCount: 0, phase: '' });
    const [fixPanelOpen, setFixPanelOpen] = useState(false);
    const [citationToFix, setCitationToFix] = useState<CitationResult | null>(null);
    const [snackbarOpen, setSnackbarOpen] = useState(false);

    const getHtml = async (
        onProgress?: (current: number, total: number, errorCount: number) => void
    ) => {
        if (!nodes) return '';
        
        const treeM = rootNode.treeM;
        if (!treeM) return '';

        const htmlResults: string[] = [];
        let errorCount = 0;
        const maxErrors = 10;

        // Process each node one by one
        for (let i = 0; i < nodes.length; i++) {
            // Stop if we've hit the error limit
            if (errorCount >= maxErrors) {
                console.warn(`Stopping HTML generation after ${maxErrors} errors`);
                break;
            }

            const {node} = nodes[i];
            
            try {
                const fullContent = EditorNodeTypeM.getEditorContent(node);
                const isTerminal = isTerminalNode(node, treeM);

                let htmlContent = '';
                if (isTerminal) {
                    // Terminal node: if has export, show only export; otherwise show everything
                    if (hasExportContent(fullContent)) {
                        htmlContent = extractExportContent(fullContent);
                    } else {
                        htmlContent = fullContent;
                    }
                } else {
                    // Non-terminal node: show only export content if it exists
                    htmlContent = extractExportContent(fullContent);
                }

                if (htmlContent.length > 0) {
                    htmlResults.push(htmlContent);
                }
            } catch (error) {
                errorCount++;
                console.warn('Error generating HTML for node:', error);
            }

            // Call progress callback if provided
            if (onProgress) {
                onProgress(i + 1, nodes.length, errorCount);
            }
        }

        return htmlResults.join('\n\n');
    };

    const handleGenerateCitations = async () => {
        setOpen(true);
        setLoading(true);
        setCitations([]);
        setProgress({ current: 0, total: 0, errorCount: 0, phase: '' });

        try {
            if (!nodes) return;
            
            const treeM = rootNode.treeM;
            if (!treeM) return;

            const allCitations: CitationResult[] = [];
            let processedNodes = 0;
            let errorCount = 0;
            const maxErrors = 10;

            // Process each node individually to track source
            for (const {node} of nodes) {
                if (errorCount >= maxErrors) {
                    console.warn(`Stopping citation generation after ${maxErrors} errors`);
                    break;
                }

                try {
                    const fullContent = EditorNodeTypeM.getEditorContent(node);
                    const isTerminal = isTerminalNode(node, treeM);

                    let htmlContent = '';
                    if (isTerminal) {
                        if (hasExportContent(fullContent)) {
                            htmlContent = extractExportContent(fullContent);
                        } else {
                            htmlContent = fullContent;
                        }
                    } else {
                        htmlContent = extractExportContent(fullContent);
                    }

                    if (htmlContent.length > 0) {
                        const nodeCitations = await generateCitationsFromHTML(htmlContent);
                        // Add source node to each citation
                        nodeCitations.forEach(citation => {
                            citation.sourceNode = node;
                            allCitations.push(citation);
                        });
                    }
                } catch (error) {
                    errorCount++;
                    console.warn('Error generating citations for node:', error);
                }

                processedNodes++;
                setProgress({ current: processedNodes, total: nodes.length, errorCount, phase: 'citations' });
            }

            // Deduplicate citations based on URL identity (same as ReferenceIndexButton)
            const uniqueCitations = new Map<string, CitationResult>();

            for (const item of allCitations) {
                // Use the original URL as the primary key for deduplication
                const key = item.originalLink || `${item.title}::${item.citation}`;

                // Only add if we haven't seen this URL before
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

    const copyToClipboard = async () => {
        try {
            // Generate text content for references
            const citationsText = citations.map((item) =>
                `${item.title}: ${item.citation.replace(/<[^>]*>/g, '')}`
            ).join('\n\n');

            // Copy to clipboard
            await navigator.clipboard.writeText(citationsText);
            
            // Show success snackbar
            setSnackbarOpen(true);
        } catch (error) {
            console.error('Error copying to clipboard:', error);
        }
    };

    const handleClose = () => {
        setOpen(false);
        setCitations([]);
    };

    const handleCitationFixed = (fixedCitation: CitationResult) => {
        setCitations(prevCitations => 
            prevCitations.map(citation => 
                citation === citationToFix ? fixedCitation : citation
            )
        );
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
                        <Box display="flex" flexDirection="column" alignItems="center" p={3}>
                            <CircularProgress/>
                            <Typography variant="body2" sx={{mt: 2}}>
                                {progress.phase === 'nodes' ? 'Processing nodes...' : 
                                 progress.phase === 'citations' ? 'Generating citations...' : 
                                 'Generating citations...'}
                            </Typography>
                            {progress.total > 0 && (
                                <Typography variant="body2" sx={{mt: 1}} color="text.secondary">
                                    {progress.phase === 'nodes' ? 'Nodes: ' : 'Citations: '}
                                    {progress.current}/{progress.total}
                                    {progress.errorCount > 0 && ` (${progress.errorCount} errors)`}
                                    {progress.errorCount >= 10 && ' - Stopped due to too many errors'}
                                </Typography>
                            )}
                        </Box>
                    ) : citations.length > 0 ? (
                        <Box>
                            {citations.map((item, index) => (
                                <Box key={index} sx={{
                                    mb: 3, 
                                    p: 2, 
                                    borderRadius: 1,
                                    bgcolor: 'background.default',
                                    border: item.hasError ? '1px solid' : 'none',
                                    borderColor: item.hasError ? 'error.main' : 'transparent'
                                }}>
                                    {item.hasError && (
                                        <Typography variant="body2" sx={{ 
                                            color: 'error.main', 
                                            fontWeight: 'bold',
                                            display: 'flex',
                                            alignItems: 'center',
                                            mb: 1
                                        }}>
                                            ⚠️ Citation Error
                                        </Typography>
                                    )}
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
                                        <Typography variant="body2" sx={{ flex: 1 }}
                                                    dangerouslySetInnerHTML={{__html: "<span>" + item.title + ": </span>" + item.citation}}/>
                                        <IconButton 
                                            size="small" 
                                            color={item.hasError ? "error" : "primary"}
                                            sx={{ flexShrink: 0, mt: -0.5 }}
                                            onClick={() => {
                                                setCitationToFix(item);
                                                setFixPanelOpen(true);
                                            }}
                                        >
                                            <Edit />
                                        </IconButton>
                                    </Box>
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
                        <Button onClick={copyToClipboard} variant="contained">
                            Add to Clipboard
                        </Button>
                    )}
                </DialogActions>
            </Dialog>

            <FixCitationDialog
                open={fixPanelOpen}
                onClose={() => setFixPanelOpen(false)}
                citationToFix={citationToFix}
                onCitationFixed={handleCitationFixed}
            />

            {/* Success Snackbar */}
            <Snackbar
                open={snackbarOpen}
                autoHideDuration={3000}
                onClose={() => setSnackbarOpen(false)}
                message="Citations copied to clipboard!"
            />
        </>
    );
}