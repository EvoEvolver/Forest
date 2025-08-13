import React, { useState } from "react";
import { NodeM, NodeVM } from "@forest/schema";
import { NodeTypeVM } from "@forest/schema/src/nodeTypeVM";
import { NodeTypeM } from "@forest/schema/src/nodeTypeM";
import { Box, TextField, Button, Typography, Alert } from "@mui/material";
import * as Y from "yjs";

export const EmbedUrlText = "EmbedUrlText";

interface EmbeddedNodeData {
    embedUrl: string;
}

export class EmbeddedNodeTypeVM extends NodeTypeVM {
    static render(node: NodeVM): React.ReactNode {
        if (!node.ydata.has(EmbedUrlText)) {
            EmbeddedNodeTypeM.ydataInitialize(node.nodeM);
        }
        
        const yText = node.ydata.get(EmbedUrlText) as Y.Text;
        const embedUrl = yText ? yText.toJSON() : '';

        if (!embedUrl) {
            return (
                <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    height: '300px',
                    border: '2px dashed #ccc',
                    borderRadius: 2,
                    color: '#666'
                }}>
                    <Typography variant="body1">
                        Please enter an embed URL in the tools panel to display content
                    </Typography>
                </Box>
            );
        }

        return (
            <Box sx={{ width: '100%', height: '500px' }}>
                <iframe
                    src={embedUrl}
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    allowFullScreen
                    style={{
                        border: 'none',
                        borderRadius: '8px'
                    }}
                    title="Embedded Content"
                />
            </Box>
        );
    }

    static renderTool1(node: NodeVM): React.ReactNode {
        if (!node.ydata.has(EmbedUrlText)) {
            EmbeddedNodeTypeM.ydataInitialize(node.nodeM);
        }
        return <EmbeddedTool1Component node={node} />;
    }

    static renderTool2(node: NodeVM): React.ReactNode {
        if (!node.ydata.has(EmbedUrlText)) {
            EmbeddedNodeTypeM.ydataInitialize(node.nodeM);
        }
        
        const yText = node.ydata.get(EmbedUrlText) as Y.Text;
        const embedUrl = yText ? yText.toJSON() : '';
        
        if (!embedUrl) {
            return null;
        }

        return (
            <Box sx={{ p: 2 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>
                    Embed Information
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Current URL:
                </Typography>
                <Typography variant="body2" sx={{ 
                    wordBreak: 'break-all', 
                    p: 1, 
                    bgcolor: 'grey.100', 
                    borderRadius: 1,
                    fontSize: '0.8rem'
                }}>
                    {embedUrl}
                </Typography>
            </Box>
        );
    }
}

function EmbeddedTool1Component({ node }: { node: NodeVM }) {
    const [url, setUrl] = useState('');
    const [error, setError] = useState('');

    React.useEffect(() => {
        if (!node.ydata.has(EmbedUrlText)) {
            EmbeddedNodeTypeM.ydataInitialize(node.nodeM);
        }
        
        const yText = node.ydata.get(EmbedUrlText) as Y.Text;
        setUrl(yText.toJSON());

        const observer = () => {
            setUrl(yText.toJSON());
        };

        yText.observe(observer);
        return () => yText.unobserve(observer);
    }, [node.ydata, node.nodeM]);

    const extractUrlFromIframe = (input: string): string => {
        // Check if input looks like an iframe tag
        if (input.trim().toLowerCase().startsWith('<iframe') && input.includes('src=')) {
            const srcMatch = input.match(/src=["']([^"']+)["']/i);
            if (srcMatch) {
                return srcMatch[1];
            }
        }
        return input.trim();
    };

    const validateUrl = (inputUrl: string): boolean => {
        try {
            new URL(inputUrl);
            return true;
        } catch {
            return false;
        }
    };

    const processEmbedUrl = (inputUrl: string): string => {
        // First extract URL from iframe if needed
        const extractedUrl = extractUrlFromIframe(inputUrl);
        // Handle Google Docs/Slides/Sheets embed conversion
        if (extractedUrl.includes('docs.google.com')) {
            // Check if it's already an embed URL (contains 'embed' or 'pubembed')
            if (extractedUrl.includes('/embed') || extractedUrl.includes('pubembed')) {
                // Already an embed URL, return as is
                return extractedUrl;
            }
            
            if (extractedUrl.includes('/presentation/')) {
                // Convert Google Slides view URL to embed URL
                const match = extractedUrl.match(/\/presentation\/d\/([a-zA-Z0-9-_]+)/);
                if (match) {
                    return `https://docs.google.com/presentation/d/${match[1]}/embed?start=false&loop=false&delayms=3000`;
                }
            } else if (extractedUrl.includes('/document/')) {
                // Convert Google Docs view URL to embed URL
                const match = extractedUrl.match(/\/document\/d\/([a-zA-Z0-9-_]+)/);
                if (match) {
                    return `https://docs.google.com/document/d/${match[1]}/embed`;
                }
            } else if (extractedUrl.includes('/spreadsheets/')) {
                // Convert Google Sheets view URL to embed URL
                const match = extractedUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
                if (match) {
                    return `https://docs.google.com/spreadsheets/d/${match[1]}/embed`;
                }
            }
        }
        
        // Handle YouTube URLs
        if (extractedUrl.includes('youtube.com/watch') || extractedUrl.includes('youtu.be/')) {
            let videoId = '';
            if (extractedUrl.includes('youtube.com/watch')) {
                const match = extractedUrl.match(/[?&]v=([^&]+)/);
                videoId = match ? match[1] : '';
            } else if (extractedUrl.includes('youtu.be/')) {
                const match = extractedUrl.match(/youtu\.be\/([^?]+)/);
                videoId = match ? match[1] : '';
            }
            if (videoId) {
                return `https://www.youtube.com/embed/${videoId}`;
            }
        }
        
        return extractedUrl;
    };

    const handleUpdateUrl = () => {
        setError('');
        
        if (!url.trim()) {
            setError('Please enter a URL or iframe code');
            return;
        }

        // First extract URL from iframe if needed, then validate
        const extractedUrl = extractUrlFromIframe(url.trim());
        
        if (!validateUrl(extractedUrl)) {
            setError('Please enter a valid URL or iframe code');
            return;
        }

        const processedUrl = processEmbedUrl(url.trim());
        const yText = node.ydata.get(EmbedUrlText) as Y.Text;
        
        // Clear and set new URL
        yText.delete(0, yText.length);
        yText.insert(0, processedUrl);
    };

    const handleClearUrl = () => {
        setUrl('');
        setError('');
        
        const yText = node.ydata.get(EmbedUrlText) as Y.Text;
        yText.delete(0, yText.length);
    };

    return (
        <Box sx={{ width: "100%", height: "100%", p: 2 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
                Embed Content
            </Typography>
            
            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}
            
            <Box sx={{ mb: 2 }}>
                <TextField
                    fullWidth
                    label="Embed URL or iframe Code"
                    placeholder="URL: https://docs.google.com/presentation/d/... or full iframe: <iframe src=...></iframe>"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    multiline
                    rows={3}
                    sx={{ mb: 2 }}
                />
                
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                        variant="contained"
                        onClick={handleUpdateUrl}
                        disabled={!url.trim()}
                    >
                        Update Embed
                    </Button>
                    <Button
                        variant="outlined"
                        onClick={handleClearUrl}
                        disabled={!url.trim()}
                    >
                        Clear
                    </Button>
                </Box>
            </Box>
            
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                Supported formats:
            </Typography>
            <Typography variant="body2" color="text.secondary" component="div">
                • Google Slides, Docs, Sheets (view or embed URLs)
                <br />
                • YouTube videos (watch or embed URLs)
                <br />
                • Complete iframe code (will extract src URL)
                <br />
                • Any iframe-embeddable content
            </Typography>
        </Box>
    );
}

export class EmbeddedNodeTypeM extends NodeTypeM {
    static displayName = "Embedded";
    static allowReshape = true;
    static allowAddingChildren = false;
    static allowEditTitle = true;

    static ydataInitialize(node: NodeM) {
        const ydata = node.ydata();
        if (!ydata.has(EmbedUrlText)) {
            // @ts-ignore
            ydata.set(EmbedUrlText, new Y.Text());
        }
    }

    static embedUrlYText(node: NodeM): Y.Text {
        // @ts-ignore
        return node.ydata().get(EmbedUrlText) as Y.Text;
    }

    renderPrompt(node: NodeM): string {
        const data: EmbeddedNodeData = node.data();
        const embedUrl = data.embedUrl;
        if (embedUrl) {
            return `Embedded content from: ${embedUrl}`;
        }
        return "Embedded content (no URL set)";
    }
}