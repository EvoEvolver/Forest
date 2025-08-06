import React, { useState } from 'react';
import { Button, Dialog, DialogTitle, DialogContent, DialogActions, Typography, CircularProgress, Box, RadioGroup, FormControlLabel, Radio, FormControl, FormLabel } from '@mui/material';
import {NodeM} from "@forest/schema";
import {EditorNodeType} from '@forest/node-type-editor/src';
import {useAtomValue} from "jotai";
import {treeAtom} from "../TreeState/TreeState";

interface ReferenceIndexButtonProps {
    nodes: Array<{node: NodeM, level: number}>
}

interface ContentChange {
    node: NodeM;
    originalContent: string;
    newContent: string;
    nodeTitle: string;
}

export default function ReferenceIndexButton({ nodes }: ReferenceIndexButtonProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [style, setStyle] = useState<'index' | 'apa'>('index');
    const [confirmationOpen, setConfirmationOpen] = useState(false);
    const [currentChange, setCurrentChange] = useState<ContentChange | null>(null);
    const [pendingChanges, setPendingChanges] = useState<ContentChange[]>([]);
    const [currentChangeIndex, setCurrentChangeIndex] = useState(0);
    const editorNodeType = new EditorNodeType();
    const treeVM = useAtomValue(treeAtom)

    // Function to get cached citation data or fetch from server
    const getCitationData = async (url: string): Promise<any> => {
        const CACHE_KEY_PREFIX = 'zotero_response_';
        const CACHE_EXPIRY_HOURS = 2400;
        
        // Check cache first
        try {
            const cacheKey = `${CACHE_KEY_PREFIX}${btoa(url)}`;
            const cached = localStorage.getItem(cacheKey);
            
            if (cached) {
                const { responseData, timestamp } = JSON.parse(cached);
                const now = Date.now();
                const expiryTime = timestamp + (CACHE_EXPIRY_HOURS * 60 * 60 * 1000);
                
                if (now <= expiryTime) {
                    return responseData[0];
                } else {
                    localStorage.removeItem(cacheKey);
                }
            }
        } catch (error) {
            console.warn('Error reading from cache:', error);
        }

        // Fetch from server if not cached
        try {
            const response = await fetch('https://zotero-matter.up.railway.app/web', {
                method: 'POST',
                headers: {
                    'Content-Type': 'text/plain'
                },
                body: url
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (!data || !Array.isArray(data) || data.length === 0) {
                throw new Error('No citation data found');
            }

            // Cache the response
            try {
                const cacheKey = `${CACHE_KEY_PREFIX}${btoa(url)}`;
                const cacheData = {
                    responseData: data,
                    timestamp: Date.now()
                };
                localStorage.setItem(cacheKey, JSON.stringify(cacheData));
            } catch (error) {
                console.warn('Error writing to cache:', error);
            }

            return data[0];
        } catch (error) {
            console.error('Error fetching citation data:', error);
            return null;
        }
    };

    // Format APA in-text citation
    const formatAPAInText = (item: any): string => {
        const { creators = [], date = '', title = '' } = item;
        
        if (creators.length === 0) {
            const year = date ? new Date(date).getFullYear() : 'n.d.';
            const shortTitle = title.length > 20 ? title.substring(0, 20) + '...' : title;
            return `${shortTitle}, ${year}`;
        }
        
        const year = date ? new Date(date).getFullYear() : 'n.d.';
        
        if (creators.length === 1) {
            const author = creators[0];
            return `${author.lastName}, ${year}`;
        } else if (creators.length === 2) {
            const author1 = creators[0];
            const author2 = creators[1];
            return `${author1.lastName} & ${author2.lastName}, ${year}`;
        } else {
            const firstAuthor = creators[0];
            return `${firstAuthor.lastName} et al., ${year}`;
        }
    };

    // Create identity key for citation based on title and author
    const getCitationIdentity = (item: any): string => {
        const { creators = [], title = '' } = item;
        
        // Use first author's last name + title as identity
        let authorPart = '';
        if (creators.length > 0) {
            authorPart = creators[0].lastName || '';
        }
        
        // Clean and truncate title for identity
        const titlePart = title.replace(/[^\w\s]/g, '').substring(0, 50);
        
        return `${authorPart}::${titlePart}`.toLowerCase();
    };

    const processReferences = async () => {
        setLoading(true);
        try {
            let linkIndex = 1;
            const citationMap = new Map<string, { index: number; citation: string }>();
            const changes: ContentChange[] = [];
            
            for (const {node} of nodes) {
                // Skip nodes with children (headers only)
                const children = node.children().toJSON()
                const childrenValue = Array.isArray(children) ? children : [];
                if (childrenValue.length > 0) continue;
                
                // Get current content
                const currentContent = editorNodeType.getEditorContent(node);
                
                // Parse and replace links
                const parser = new DOMParser();
                const doc = parser.parseFromString(currentContent, 'text/html');
                const links = doc.querySelectorAll('a[href]');
                
                let hasChanges = false;
                
                for (const link of links) {
                    const href = link.getAttribute('href')?.trim();
                    if (href && (href.startsWith('http://') || href.startsWith('https://'))) {
                        if (style === 'index') {
                            // Get citation data to determine identity
                            const citationData = await getCitationData(href);
                            if (citationData) {
                                const identity = getCitationIdentity(citationData);
                                
                                // Check if we've seen this citation before
                                if (citationMap.has(identity)) {
                                    // Reuse existing index
                                    const existingIndex = citationMap.get(identity)!.index;
                                    link.textContent = `${existingIndex}`;
                                } else {
                                    // New citation, assign new index
                                    citationMap.set(identity, { 
                                        index: linkIndex, 
                                        citation: formatAPAInText(citationData) 
                                    });
                                    link.textContent = `${linkIndex}`;
                                    linkIndex++;
                                }
                            } else {
                                // Fallback for failed citations
                                link.textContent = `${linkIndex}`;
                                linkIndex++;
                            }
                        } else if (style === 'apa') {
                            const citationData = await getCitationData(href);
                            if (citationData) {
                                const identity = getCitationIdentity(citationData);
                                
                                // For APA, we can reuse the same formatted citation
                                if (citationMap.has(identity)) {
                                    const existingCitation = citationMap.get(identity)!.citation;
                                    link.textContent = existingCitation;
                                } else {
                                    const formattedCitation = formatAPAInText(citationData);
                                    citationMap.set(identity, { 
                                        index: linkIndex, 
                                        citation: formattedCitation 
                                    });
                                    link.textContent = formattedCitation;
                                    linkIndex++; // Still increment for potential mixed usage
                                }
                            } else {
                                link.textContent = `Source, n.d.`;
                            }
                        }
                        hasChanges = true;
                    }
                }
                
                // Store changes for confirmation only if content actually changed
                if (hasChanges) {
                    const newContent = doc.body.innerHTML;
                    
                    // Only add to changes if the content is actually different
                    if (newContent.trim() !== currentContent.trim()) {
                        changes.push({
                            node,
                            originalContent: currentContent,
                            newContent,
                            nodeTitle: node.title()
                        });
                    }
                }
            }
            
            // Show confirmation dialog one by one if there are changes
            if (changes.length > 0) {
                setPendingChanges(changes);
                setCurrentChangeIndex(0);
                setCurrentChange(changes[0]);
                setConfirmationOpen(true);
            } else {
                // No changes detected - show user feedback
                alert('No changes were made. The document may already have the selected citation format or contain no links to convert.');
            }
            
        } catch (error) {
            console.error('Error processing references:', error);
        } finally {
            setLoading(false);
            setOpen(false);
        }
    };

    const applyCurrentChange = () => {
        try {
            if (currentChange) {
                editorNodeType.setEditorContent(currentChange.node, currentChange.newContent);
            }
            
            // Move to next change or close if done
            const nextIndex = currentChangeIndex + 1;
            if (nextIndex < pendingChanges.length) {
                setCurrentChangeIndex(nextIndex);
                setCurrentChange(pendingChanges[nextIndex]);
            } else {
                // All changes processed
                setConfirmationOpen(false);
                setPendingChanges([]);
                setCurrentChange(null);
                setCurrentChangeIndex(0);
            }
        } catch (error) {
            console.error('Error applying change:', error);
        }
    };

    const skipCurrentChange = () => {
        // Move to next change or close if done
        const nextIndex = currentChangeIndex + 1;
        if (nextIndex < pendingChanges.length) {
            setCurrentChangeIndex(nextIndex);
            setCurrentChange(pendingChanges[nextIndex]);
        } else {
            // All changes processed
            setConfirmationOpen(false);
            setPendingChanges([]);
            setCurrentChange(null);
            setCurrentChangeIndex(0);
        }
    };

    const cancelAllChanges = () => {
        setConfirmationOpen(false);
        setPendingChanges([]);
        setCurrentChange(null);
        setCurrentChangeIndex(0);
    };

    const handleClose = () => {
        setOpen(false);
    };

    return (
        <>
            <Button 
                variant="outlined" 
                onClick={() => setOpen(true)}
                size="small"
                sx={{ mb: 2 }}
            >
                Reference Index
            </Button>

            <Dialog 
                open={open} 
                onClose={handleClose}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>Convert Links to In-Text Citations</DialogTitle>
                <DialogContent>
                    {loading ? (
                        <Box display="flex" justifyContent="center" alignItems="center" p={3}>
                            <CircularProgress />
                            <Typography variant="body2" sx={{ ml: 2 }}>
                                Processing references...
                            </Typography>
                        </Box>
                    ) : (
                        <Box>
                            <FormControl component="fieldset" sx={{ mb: 3 }}>
                                <FormLabel component="legend">Select citation style:</FormLabel>
                                <RadioGroup
                                    value={style}
                                    onChange={(e) => setStyle(e.target.value as 'index' | 'apa')}
                                >
                                    <FormControlLabel 
                                        value="index" 
                                        control={<Radio />} 
                                        label="Numbered references ([1], [2], [3])" 
                                    />
                                    <FormControlLabel 
                                        value="apa" 
                                        control={<Radio />} 
                                        label="APA style ((Smith, 2023), (Jones & Brown, 2022))" 
                                    />
                                </RadioGroup>
                            </FormControl>
                            
                            <Typography variant="body2" color="text.secondary">
                                This will replace all links in the document with the selected citation format.
                                {style === 'apa' && ' Note: APA citations will fetch author and year information from each URL.'}
                            </Typography>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleClose}>Cancel</Button>
                    <Button onClick={processReferences} variant="contained" disabled={loading}>
                        {style === 'index' ? 'Convert to Numbers' : 'Convert to APA'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Confirmation Dialog - One by One */}
            <Dialog 
                open={confirmationOpen} 
                onClose={cancelAllChanges}
                maxWidth="lg"
                fullWidth
            >
                <DialogTitle>
                    Confirm Change ({currentChangeIndex + 1} of {pendingChanges.length})
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                        Review this change before applying it. The left column shows the original content, and the right column shows the content after applying {style === 'index' ? 'numbered' : 'APA'} citations.
                    </Typography>
                    
                    {currentChange && (
                        <Box sx={{ mb: 4 }}>
                            <Typography variant="h6" sx={{ mb: 2 }}>
                                {currentChange.nodeTitle}
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 2 }}>
                                <Box sx={{ flex: 1 }}>
                                    <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
                                        Before:
                                    </Typography>
                                    <Box 
                                        sx={{ 
                                            border: 1, 
                                            borderColor: 'divider', 
                                            borderRadius: 1, 
                                            p: 2, 
                                            maxHeight: 300, 
                                            overflow: 'auto',
                                            backgroundColor: 'grey.50'
                                        }}
                                        dangerouslySetInnerHTML={{ __html: currentChange.originalContent }}
                                    />
                                </Box>
                                <Box sx={{ flex: 1 }}>
                                    <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
                                        After:
                                    </Typography>
                                    <Box 
                                        sx={{ 
                                            border: 1, 
                                            borderColor: 'divider', 
                                            borderRadius: 1, 
                                            p: 2, 
                                            maxHeight: 300, 
                                            overflow: 'auto',
                                            backgroundColor: 'success.light',
                                            color: 'success.contrastText'
                                        }}
                                        dangerouslySetInnerHTML={{ __html: currentChange.newContent }}
                                    />
                                </Box>
                            </Box>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={cancelAllChanges}>Cancel All</Button>
                    <Button onClick={skipCurrentChange}>Skip This</Button>
                    <Button onClick={applyCurrentChange} variant="contained" color="primary">
                        Apply This Change
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}