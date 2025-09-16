import React, {useState} from 'react';
import {Button, Dialog, DialogTitle, DialogContent, DialogActions, Box} from '@mui/material';
import {NodeM} from '@forest/schema';
import {EditorNodeTypeM} from '@forest/node-type-editor/src';
import {extractExportContent} from '@forest/node-type-editor/src/editor/Extensions/exportHelpers';

// Helper function to check if content has export divs
export const hasExportContent = (htmlContent: string): boolean => {
    return extractExportContent(htmlContent).trim().length > 0;
};

// Function to count words in HTML content
const countWordsInHtml = (htmlContent: string): number => {
    // Create a temporary div element to parse HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;

    // Get text content (strips HTML tags)
    const textContent = tempDiv.textContent || tempDiv.innerText || '';

    // Split by whitespace and filter out empty strings
    const words = textContent.trim().split(/\s+/).filter(word => word.length > 0);

    return words.length;
};

// Function to get total word count from all nodes
const getTotalWordCount = (nodes: { node: NodeM; level: number; }[]): number => {
    let totalWords = 0;

    nodes.forEach(({node}) => {
        const fullContent = EditorNodeTypeM.getEditorContent(node);
        const treeM = node.treeM;
        const children = treeM.getChildren(node);
        const isTerminal = children.length === 0;

        let contentToCount = '';

        if (isTerminal) {
            // Terminal node: if has export, count only export; otherwise count everything
            if (hasExportContent(fullContent)) {
                contentToCount = extractExportContent(fullContent);
            } else {
                contentToCount = fullContent;
            }
        } else {
            // Non-terminal node: count only export content if it exists
            const exportContent = extractExportContent(fullContent);
            contentToCount = exportContent || '';
        }

        if (contentToCount.trim()) {
            totalWords += countWordsInHtml(contentToCount);
        }
    });

    return totalWords;
};

interface WordCountButtonProps {
    nodes: { node: NodeM; level: number; }[];
}

export default function WordCountButton({ nodes }: WordCountButtonProps) {
    const [wordCountDialogOpen, setWordCountDialogOpen] = useState(false);
    const [wordCount, setWordCount] = useState(0);

    const handleWordCount = () => {
        const count = getTotalWordCount(nodes);
        setWordCount(count);
        setWordCountDialogOpen(true);
    };

    return (
        <>
            <Button
                onClick={handleWordCount}
                size="small"
                variant="outlined"
                sx={{mb: 2}}
            >
                Word Count
            </Button>

            <Dialog
                open={wordCountDialogOpen}
                onClose={() => setWordCountDialogOpen(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>Document Word Count</DialogTitle>
                <DialogContent>
                    <Box sx={{py: 2, textAlign: 'center'}}>
                        <Box sx={{fontSize: '2rem', fontWeight: 'bold', color: 'primary.main'}}>
                            {wordCount.toLocaleString()}
                        </Box>
                        <Box sx={{mt: 1, color: 'text.secondary'}}>
                            {wordCount === 1 ? 'word' : 'words'} in document
                        </Box>
                        <Box sx={{mt: 2, color: 'text.secondary'}}>
                            Approximately {(wordCount / 800).toFixed(1)} pages
                            <br/>
                            (800 words per page)
                        </Box>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setWordCountDialogOpen(false)} color="primary">
                        Close
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}