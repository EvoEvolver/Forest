import React, { useState } from 'react';
import { Button, Dialog, DialogTitle, DialogContent, DialogActions, Typography, CircularProgress, Box } from '@mui/material';
import {NodeVM} from "@forest/schema";
import {EditorNodeType} from '@forest/node-type-editor/src';

interface ReferenceIndexButtonProps {
    nodes: Array<{node: NodeVM, level: number}>
}

export default function ReferenceIndexButton({ nodes }: ReferenceIndexButtonProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const editorNodeType = new EditorNodeType();

    const processReferences = async () => {
        setLoading(true);
        try {
            let linkIndex = 1;
            for (const {node} of nodes) {
                // Skip nodes with children (headers only)
                const children = node.children as any;
                const childrenValue = Array.isArray(children) ? children : [];
                if (childrenValue.length > 0) continue;
                
                // Get current content
                const currentContent = editorNodeType.getEditorContent(node.nodeM);
                
                // Parse and replace links
                const parser = new DOMParser();
                const doc = parser.parseFromString(currentContent, 'text/html');
                const links = doc.querySelectorAll('a[href]');
                
                let hasChanges = false;
                for (const link of links) {
                    const href = link.getAttribute('href').trim();
                    if (href && (href.startsWith('http://') || href.startsWith('https://'))) {
                        link.textContent = `${linkIndex}`;
                        linkIndex++;
                        hasChanges = true;
                    }
                }
                
                // Update content if there were changes
                if (hasChanges) {
                    const newContent = doc.body.innerHTML;
                    editorNodeType.setEditorContent(node.nodeM, newContent);
                }
            }
            
        } catch (error) {
            console.error('Error processing references:', error);
        } finally {
            setLoading(false);
            setOpen(false);
        }
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
                <DialogTitle>Convert Links to Reference Numbers</DialogTitle>
                <DialogContent>
                    {loading ? (
                        <Box display="flex" justifyContent="center" alignItems="center" p={3}>
                            <CircularProgress />
                            <Typography variant="body2" sx={{ ml: 2 }}>
                                Processing references...
                            </Typography>
                        </Box>
                    ) : (
                        <Typography variant="body2" color="text.secondary">
                            This will replace all links in the document with numbered references [1], [2], [3], etc.
                        </Typography>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleClose}>Cancel</Button>
                    <Button onClick={processReferences} variant="contained" disabled={loading}>
                        Convert to Numbers
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}