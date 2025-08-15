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
        return null;
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
        const trimmedInput = input.trim();
        
        // Check if input looks like HTML (contains < and >)
        if (trimmedInput.includes('<') && trimmedInput.includes('>')) {
            try {
                // Use DOMParser to parse the HTML
                const parser = new DOMParser();
                const doc = parser.parseFromString(trimmedInput, 'text/html');
                
                // Look for iframe elements
                const iframes = doc.querySelectorAll('iframe');
                console.log(iframes[0]);
                if (iframes.length > 0) {
                    const src = iframes[0].getAttribute('src');
                    console.log(src);
                    if (src) {
                        return src;
                    }
                }
                
                // If no iframe found, check for other embeddable elements
                const embeddableElements = doc.querySelectorAll('embed, object, video');
                for (const element of embeddableElements) {
                    const src = element.getAttribute('src') || element.getAttribute('data');
                    if (src) {
                        return src;
                    }
                }
                
                // Check for error in parsing
                const parserError = doc.querySelector('parsererror');
                if (parserError) {
                    console.warn('HTML parsing failed, falling back to regex');
                    // Fallback to regex for malformed HTML
                    const srcMatch = trimmedInput.match(/src\s*=\s*["']([^"']+)["']/i);
                    if (srcMatch) {
                        return srcMatch[1];
                    }
                }
            } catch (error) {
                console.warn('DOMParser failed, falling back to regex:', error);
                // Fallback to regex if DOMParser fails
                const srcMatch = trimmedInput.match(/src\s*=\s*["']([^"']+)["']/i);
                if (srcMatch) {
                    return srcMatch[1];
                }
            }
        }
        
        return trimmedInput;
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
        return extractedUrl;
    };

    const handleUpdateUrl = () => {
        setError('');
        
        if (!url.trim()) {
            setError('Please enter a URL or HTML embed code');
            return;
        }

        // First extract URL from iframe if needed, then validate
        const extractedUrl = extractUrlFromIframe(url.trim());
        
        if (!validateUrl(extractedUrl)) {
            setError('Please enter a valid URL or HTML embed code');
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
                    label="Embed URL or HTML Code"
                    placeholder="URL: https://docs.google.com/presentation/d/... or full HTML: <iframe src=...></iframe>"
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
                • Complete HTML embed code (iframe, embed, object, video tags)
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