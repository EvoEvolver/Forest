import React, { useState } from 'react';
import {
    Box,
    Button,
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
import { NodeM } from "@forest/schema";
import { EditorNodeTypeM } from '@forest/node-type-editor/src';
import { generateAPACitation } from "./generateReferences";

interface FixCitationDialogProps {
    open: boolean;
    onClose: () => void;
    citationToFix: { title: string, citation: string, hasError?: boolean, originalLink?: string, sourceNode?: NodeM } | null;
    onCitationFixed: (fixedCitation: { title: string, citation: string, hasError?: boolean, originalLink?: string, sourceNode?: NodeM }) => void;
}

export default function FixCitationDialog({ open, onClose, citationToFix, onCitationFixed }: FixCitationDialogProps) {
    const [bibTeX, setBibTeX] = useState('');
    const [fixMethod, setFixMethod] = useState<'bibtex' | 'url'>('url');
    const [newUrl, setNewUrl] = useState('');

    const handleFixCitation = async () => {
        if (!citationToFix) return;
        if (fixMethod === 'bibtex' && !bibTeX.trim()) return;
        if (fixMethod === 'url' && !newUrl.trim()) return;


        const oldLink = citationToFix.originalLink.trim();
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

            // Replace the link only in the specific source node
            if (citationToFix.sourceNode) {
                try {
                    const currentContent = EditorNodeTypeM.getEditorContent(citationToFix.sourceNode);

                    // Parse HTML to find and replace the specific link
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(currentContent, 'text/html');
                    const links = doc.querySelectorAll('a[href]');
                    let contentChanged = false;

                    for (const link of links) {
                        const href = link.getAttribute('href').trim();
                        if (href && (href === oldLink)) {
                            link.setAttribute('href', newLinkWithBib);
                            contentChanged = true;
                        }
                    }
                    console.log("oldLink", oldLink)
                    console.log("newLinkWithBib", newLinkWithBib)
                    console.log('contentChanged:', contentChanged);
                    if (contentChanged) {
                        const updatedContent = doc.body.innerHTML;
                        EditorNodeTypeM.setEditorContent(citationToFix.sourceNode, updatedContent);
                    }
                } catch (error) {
                    console.warn(`Error updating content for node ${citationToFix.sourceNode.id}:`, error);
                }
            }

            // Try to generate new citation from the link with BibTeX
            try {
                const newCitation = await generateAPACitation(newLinkWithBib);
                
                // Create fixed citation object
                const fixedCitation = {
                    ...citationToFix,
                    citation: newCitation,
                    hasError: false,
                    originalLink: newLinkWithBib
                };

                onCitationFixed(fixedCitation);
            } catch (citationError) {
                // If citation generation still fails, show success message for the fix attempt
                const successMessage = fixMethod === 'bibtex' 
                    ? `Citation fixed with BibTeX metadata: ${citationToFix.title}`
                    : `Citation fixed with new URL: ${citationToFix.title}`;
                    
                const fixedCitation = {
                    ...citationToFix,
                    citation: successMessage,
                    hasError: false,
                    originalLink: newLinkWithBib
                };

                onCitationFixed(fixedCitation);
            }

            // Close the fix panel and reset form
            handleClose();
            
        } catch (error) {
            console.error('Error fixing citation:', error);
            
            // Show error but still indicate fix was attempted
            const fixedCitation = {
                ...citationToFix,
                citation: `Error fixing citation: ${error}`,
                hasError: true,
                originalLink: oldLink
            };

            onCitationFixed(fixedCitation);
            
            // Close the fix panel and reset form
            handleClose();
        }
    };

    const handleClose = () => {
        setBibTeX('');
        setNewUrl('');
        setFixMethod('url');
        onClose();
    };

    return (
        <Dialog
            open={open}
            onClose={handleClose}
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
                        <Typography variant="body2" sx={{ mb: 3, color: 'text.secondary' }}>
                            {citationToFix.citation}
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
                <Button onClick={handleClose}>Cancel</Button>
                <Button 
                    variant="contained" 
                    onClick={handleFixCitation}
                    disabled={fixMethod === 'bibtex' ? !bibTeX.trim() : !newUrl.trim()}
                >
                    Fix Citation
                </Button>
            </DialogActions>
        </Dialog>
    );
}