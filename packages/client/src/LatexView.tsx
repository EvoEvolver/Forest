import React from 'react';
import { Box, Typography, Paper, Divider } from '@mui/material';
import { useAtomValue } from 'jotai';
import { treeAtom, listOfNodesForViewAtom } from './TreeState/TreeState';
import Latex from "react-latex-next";
import 'katex/dist/katex.min.css';

const LatexView = () => {
    const tree = useAtomValue(treeAtom);
    const nodes = useAtomValue(listOfNodesForViewAtom);

    const renderDocumentStructure = () => {
        if (!tree || !tree.metadata?.rootId) {
            return (
                <Box>
                    <Typography variant="h5" gutterBottom>
                        No Tree Available
                    </Typography>
                    <Typography>No tree data available.</Typography>
                </Box>
            );
        }

        return (
            <Box>
                <Typography variant="h4" gutterBottom align="center">
                    Tree Structure Export
                </Typography>
                <Typography variant="subtitle1" color="text.secondary" align="center" gutterBottom>
                    Forest App • {new Date().toLocaleDateString()}
                </Typography>
                <Divider sx={{ my: 3 }} />
                
                {nodes.map((node, index) => {
                    const titleAtom = node.title;
                    const title = useAtomValue(titleAtom) || 'Untitled';
                    
                    // Extract content from tabs
                    let content = '';
                    if (node.tabs && typeof node.tabs === 'object') {
                        Object.values(node.tabs).forEach((tab: any) => {
                            if (tab && tab.content) {
                                const textContent = tab.content.replace(/<[^>]*>/g, ' ').trim();
                                if (textContent) {
                                    content += textContent + '\n\n';
                                }
                            }
                        });
                    }

                    return (
                        <Box key={index} sx={{ mb: 4 }}>
                            <Typography variant="h5" gutterBottom>
                                {title}
                            </Typography>
                            {content.trim() && (
                                <Box sx={{ 
                                    pl: 2, 
                                    borderLeft: '2px solid #e0e0e0',
                                    '& .katex': { fontSize: '1.1em' }
                                }}>
                                    {content.split('\n\n').map((paragraph, pIndex) => {
                                        const trimmedPara = paragraph.trim();
                                        if (!trimmedPara) return null;
                                        
                                        // Check if paragraph contains LaTeX math (simple heuristic)
                                        const hasLatex = /\$.*\$|\\\(.*\\\)|\\\[.*\\\]|\\begin\{.*\}/.test(trimmedPara);
                                        
                                        return (
                                            <Typography 
                                                key={pIndex} 
                                                paragraph 
                                                sx={{ lineHeight: 1.6 }}
                                            >
                                                {hasLatex ? (
                                                    <Latex>{trimmedPara}</Latex>
                                                ) : (
                                                    trimmedPara
                                                )}
                                            </Typography>
                                        );
                                    })}
                                </Box>
                            )}
                        </Box>
                    );
                })}
            </Box>
        );
    };

    return (
        <Box sx={{ 
            width: '100%', 
            height: '100%', 
            padding: '24px',
            backgroundColor: '#fafafa',
            overflow: 'auto'
        }}>
            <Paper sx={{ 
                padding: '32px', 
                minHeight: 'calc(100% - 48px)',
                backgroundColor: 'white',
                lineHeight: 1.5
            }}>
                {renderDocumentStructure()}
            </Paper>
        </Box>
    );
};

export default LatexView;