import React, {useState} from 'react';
import {
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    FormControlLabel,
    Radio,
    RadioGroup,
    TextField,
    Typography
} from '@mui/material';
import {NodeM} from "@forest/schema";
import {EditorNodeTypeM} from '@forest/node-type-editor/src';
import {generateAPACitation} from "./generateReferences";
import {extractExportContent} from '@forest/node-type-editor/src/editor/Extensions/exportHelpers';

interface ReferenceGenButtonProps {
    rootNode: NodeM;
    nodes: { node: NodeM; level: number; }[];
}


export async function generateCitationsFromHTML(
    html: string, 
    onProgress?: (current: number, total: number, errorCount: number) => void
): Promise<Array<{ title: string, citation: string, hasError?: boolean, originalLink?: string }>> {
    // Parse HTML to find all <a> tags
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const links = doc.querySelectorAll('a[href]');
    const results: Array<{ title: string, citation: string, hasError?: boolean, originalLink?: string }> = [];
    let errorCount = 0;
    const maxErrors = 10;

    // Process each link one by one
    for (let i = 0; i < links.length; i++) {
        // Stop if we've hit the error limit
        if (errorCount >= maxErrors) {
            console.warn(`Stopping citation generation after ${maxErrors} errors`);
            break;
        }

        const link = links[i];
        const href = link.getAttribute('href')?.trim();
        const title = link.innerHTML.trim();

        if (!href || !title) continue;

        // Skip non-http(s) URLs
        if (!href.startsWith('http://') && !href.startsWith('https://')) {
            continue;
        }

        try {
            const citation = await generateAPACitation(href);
            results.push({title, citation, hasError: false, originalLink: href});
        } catch (error) {
            errorCount++;
            console.warn(`Failed to generate citation for ${href}:`, error);
            
            // Add entry with error message and mark as error
            results.push({
                title,
                citation: `Error generating citation for: ${href}`,
                hasError: true,
                originalLink: href
            });
        }

        // Call progress callback if provided
        if (onProgress) {
            onProgress(i + 1, links.length, errorCount);
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
    const [citations, setCitations] = useState<Array<{ title: string, citation: string, hasError?: boolean, originalLink?: string }>>([]);
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: 0, errorCount: 0, phase: '' });
    const [fixPanelOpen, setFixPanelOpen] = useState(false);
    const [citationToFix, setCitationToFix] = useState<{ title: string, citation: string, hasError?: boolean, originalLink?: string } | null>(null);
    const [bibTeX, setBibTeX] = useState('');
    const [fixMethod, setFixMethod] = useState<'bibtex' | 'url'>('url');
    const [newUrl, setNewUrl] = useState('');

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
            const content = await getHtml((current, total, errorCount) => {
                setProgress({ current: current, total: total, errorCount: errorCount, phase: 'nodes' });
            });
            
            const result = await generateCitationsFromHTML(content, (current, total, errorCount) => {
                setProgress({ current, total, errorCount, phase: 'citations' });
            });

            // Deduplicate citations based on title and citation content
            const uniqueCitations = new Map<string, { title: string, citation: string, hasError?: boolean, originalLink?: string }>();

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

    const handleFixCitation = async () => {
        if (!citationToFix) return;
        if (fixMethod === 'bibtex' && !bibTeX.trim()) return;
        if (fixMethod === 'url' && !newUrl.trim()) return;

        const oldLink = citationToFix.originalLink;
        if (!oldLink) return;

        let newLinkWithBib: string;

        try {
            if (fixMethod === 'bibtex') {
                // Create new link with BibTeX parameter
                const bibTexTrimmed = bibTeX.trim();
                const url = new URL(oldLink);
                url.searchParams.set('bib', encodeURIComponent(bibTexTrimmed));
                newLinkWithBib = url.toString();
            } else {
                // Use the new URL provided by user
                newLinkWithBib = newUrl.trim();
            }

            // Replace the link in all node contents
            const treeM = rootNode.treeM;
            if (treeM) {
                for (const {node} of nodes) {
                    try {
                        const currentContent = EditorNodeTypeM.getEditorContent(node);

                        // Parse HTML to find and replace the specific link
                        const parser = new DOMParser();
                        const doc = parser.parseFromString(currentContent, 'text/html');
                        const links = doc.querySelectorAll('a[href]');
                        let contentChanged = false;

                        for (const link of links) {
                            const href = link.getAttribute('href');
                            if (href && href === oldLink) {
                                link.setAttribute('href', newLinkWithBib);
                                contentChanged = true;
                            }
                        }

                        if (contentChanged) {
                            const updatedContent = doc.body.innerHTML;
                            console.log("oldLink", oldLink)
                            console.log("newLinkWithBib", newLinkWithBib)
                            console.log('Updated content:', updatedContent);
                            EditorNodeTypeM.setEditorContent(node, updatedContent);
                        }
                    } catch (error) {
                        console.warn(`Error updating content for node ${node.id}:`, error);
                    }
                }
            }

            // Try to generate new citation from the link with BibTeX
            try {
                const newCitation = await generateAPACitation(newLinkWithBib);
                
                // Update the citation in the list
                setCitations(prevCitations => 
                    prevCitations.map(citation => 
                        citation === citationToFix 
                            ? {
                                ...citation,
                                citation: newCitation,
                                hasError: false,
                                originalLink: newLinkWithBib
                            }
                            : citation
                    )
                );
            } catch (citationError) {
                // If citation generation still fails, show success message for the fix attempt
                const successMessage = fixMethod === 'bibtex' 
                    ? `Citation fixed with BibTeX metadata: ${citationToFix.title}`
                    : `Citation fixed with new URL: ${citationToFix.title}`;
                    
                setCitations(prevCitations => 
                    prevCitations.map(citation => 
                        citation === citationToFix 
                            ? {
                                ...citation,
                                citation: successMessage,
                                hasError: false,
                                originalLink: newLinkWithBib
                            }
                            : citation
                    )
                );
            }

            // Close the fix panel and reset form
            setFixPanelOpen(false);
            setCitationToFix(null);
            setBibTeX('');
            setNewUrl('');
            
        } catch (error) {
            console.error('Error fixing citation:', error);
            
            // Show error but still indicate fix was attempted
            setCitations(prevCitations => 
                prevCitations.map(citation => 
                    citation === citationToFix 
                        ? {
                            ...citation,
                            citation: `Error fixing citation: ${error}`,
                            hasError: true,
                            originalLink: oldLink
                        }
                        : citation
                )
            );
            
            // Close the fix panel and reset form
            setFixPanelOpen(false);
            setCitationToFix(null);
            setBibTeX('');
            setNewUrl('');
        }
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
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                            <Typography variant="body2" sx={{ 
                                                color: 'error.main', 
                                                fontWeight: 'bold',
                                                display: 'flex',
                                                alignItems: 'center'
                                            }}>
                                                ⚠️ Citation Error
                                            </Typography>
                                            <Button 
                                                size="small" 
                                                variant="outlined" 
                                                color="error"
                                                onClick={() => {
                                                    setCitationToFix(item);
                                                    setBibTeX('');
                                                    setNewUrl('');
                                                    setFixMethod('url');
                                                    setFixPanelOpen(true);
                                                }}
                                            >
                                                Fix
                                            </Button>
                                        </Box>
                                    )}
                                    <Typography variant="body2"
                                                dangerouslySetInnerHTML={{__html: "<span>" + item.title + ": </span>" + item.citation}}/>
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

            {/* Fix Citation Panel */}
            <Dialog
                open={fixPanelOpen}
                onClose={() => setFixPanelOpen(false)}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>Fix Citation Error</DialogTitle>
                <DialogContent>
                    {citationToFix && (
                        <Box>
                            <Typography variant="body2" sx={{ mb: 2 }}>
                                <strong>Citation Title:</strong> {citationToFix.title}
                            </Typography>
                            <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
                                <strong>Problematic Link:</strong> <a href={citationToFix.originalLink} target="_blank" rel="noopener noreferrer" style={{color: 'inherit'}}>{citationToFix.originalLink}</a>
                            </Typography>
                            <Typography variant="body2" sx={{ mb: 3, color: 'error.main' }}>
                                <strong>Error:</strong> {citationToFix.citation}
                            </Typography>
                            
                            <Typography variant="h6" sx={{ mb: 2 }}>
                                Choose Fix Method
                            </Typography>
                            
                            <FormControl component="fieldset" sx={{ mb: 3 }}>
                                <RadioGroup
                                    value={fixMethod}
                                    onChange={(e) => setFixMethod(e.target.value as 'bibtex' | 'url')}
                                >
                                    <FormControlLabel 
                                        value="url" 
                                        control={<Radio />} 
                                        label="Replace with New URL (Recommended)" 
                                    />
                                    <FormControlLabel 
                                        value="bibtex" 
                                        control={<Radio />} 
                                        label="Fix with BibTeX Entry" 
                                    />
                                </RadioGroup>
                            </FormControl>

                            {fixMethod === 'bibtex' ? (
                                <>
                                    <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
                                        Copy and paste a BibTeX entry for this reference. 
                                        The BibTeX will be added to the link as metadata.
                                    </Typography>
                                    
                                    <TextField
                                        fullWidth
                                        multiline
                                        rows={8}
                                        label="BibTeX Entry"
                                        value={bibTeX}
                                        onChange={(e) => setBibTeX(e.target.value)}
                                        placeholder={`@article{example2024,
  title={Example Article Title},
  author={Author, First},
  journal={Journal Name},
  year={2024},
  volume={1},
  pages={1-10}
}`}
                                        sx={{ mb: 2, fontFamily: 'monospace' }}
                                    />
                                    <Typography variant="body2" color="text.secondary">
                                        The citation will use this BibTeX information instead of trying to fetch it from the URL.
                                    </Typography>
                                </>
                            ) : (
                                <>
                                    <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
                                        Enter a new URL to replace the problematic link. 
                                        <strong>Recommended:</strong> Use links from Semantic Scholar for better citation generation.
                                    </Typography>
                                    
                                    <TextField
                                        fullWidth
                                        label="New URL"
                                        value={newUrl}
                                        onChange={(e) => setNewUrl(e.target.value)}
                                        placeholder="https://www.semanticscholar.org/paper/..."
                                        sx={{ mb: 2 }}
                                    />
                                    <Typography variant="body2" color="text.secondary">
                                        💡 <strong>Tip:</strong> Search for your paper on{' '}
                                        <a href="https://www.semanticscholar.org/" target="_blank" rel="noopener noreferrer" style={{color: 'inherit'}}>
                                            semanticscholar.org
                                        </a>{' '}
                                        and use that link for the most reliable citation generation.
                                    </Typography>
                                </>
                            )}
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setFixPanelOpen(false)}>Cancel</Button>
                    <Button 
                        variant="contained" 
                        onClick={handleFixCitation}
                        disabled={fixMethod === 'bibtex' ? !bibTeX.trim() : !newUrl.trim()}
                    >
                        Fix Citation
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}