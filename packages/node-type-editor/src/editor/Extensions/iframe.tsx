import {mergeAttributes, Node} from '@tiptap/core'
import {NodeViewWrapper, ReactNodeViewRenderer} from '@tiptap/react'
import React, {useCallback, useState} from 'react'
import {Box, Button, IconButton, TextField, Typography} from '@mui/material'
import FullscreenIcon from '@mui/icons-material/Fullscreen'
import WebIcon from '@mui/icons-material/Web'

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        iframe: {
            insertIframe: (options: { src?: string }) => ReturnType
        }
    }
}

export interface IframeOptions {
    allowFullscreen: boolean
    HTMLAttributes: {
        [key: string]: any
    }
}

interface IframeAttributes {
    src: string
    frameborder: number
    allowfullscreen: boolean
}

// Iframe component
const IframeComponent = ({node, updateAttributes, deleteNode}) => {
    const {src} = node.attrs
    const [url, setUrl] = useState(src || '')
    const [isEditing, setIsEditing] = useState(!src)

    const handleDelete = useCallback(() => {
        deleteNode()
    }, [deleteNode])

    const handleFullscreen = useCallback(() => {
        if (src) {
            // Open the iframe URL in a new window/tab for fullscreen experience
            window.open(src, '_blank', 'noopener,noreferrer')
        }
    }, [src])

    const handleSubmit = useCallback(() => {
        if (url.trim()) {
            // Basic URL validation
            let finalUrl = url.trim()
            if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
                finalUrl = 'https://' + finalUrl
            }

            updateAttributes({src: finalUrl})
            setIsEditing(false)
        }
    }, [url, updateAttributes])

    const handleEdit = useCallback(() => {
        setIsEditing(true)
        setUrl(src || '')
    }, [src])

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault()
            handleSubmit()
        }
        if (e.key === 'Escape') {
            e.preventDefault()
            if (src) {
                setIsEditing(false)
                setUrl(src)
            } else {
                deleteNode()
            }
        }
    }, [handleSubmit, src, deleteNode])

    // If iframe has URL and not editing, show the iframe
    if (src && !isEditing) {
        return (
            <NodeViewWrapper
                as="div"
                style={{
                    display: 'block',
                    position: 'relative',
                    width: '100%',
                    margin: '16px 0'
                }}
            >
                <Box
                    sx={{
                        position: 'relative',
                        width: '100%',
                        paddingBottom: '56.25%', // 16:9 aspect ratio
                        height: 0,
                        overflow: 'hidden',
                        borderRadius: 1,
                        border: '1px solid',
                        borderColor: 'divider',
                        '&:hover .iframe-controls': {
                            opacity: 1
                        }
                    }}
                >
                    <iframe
                        src={src}
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            border: 'none'
                        }}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                    />
                    <Box
                        className="iframe-controls"
                        sx={{
                            position: 'absolute',
                            top: 8,
                            right: 8,
                            opacity: 0,
                            transition: 'opacity 0.2s',
                            display: 'flex',
                            gap: 1
                        }}
                    >
                        <IconButton
                            size="small"
                            onClick={handleEdit}
                            sx={{
                                backgroundColor: 'rgba(0, 0, 0, 0.6)',
                                color: 'white',
                                '&:hover': {
                                    backgroundColor: 'rgba(0, 0, 0, 0.8)'
                                }
                            }}
                        >
                            <WebIcon sx={{fontSize: 16}}/>
                        </IconButton>
                        <IconButton
                            size="small"
                            onClick={handleFullscreen}
                            sx={{
                                backgroundColor: 'rgba(0, 0, 0, 0.6)',
                                color: 'white',
                                '&:hover': {
                                    backgroundColor: 'rgba(0, 0, 0, 0.8)'
                                }
                            }}
                        >
                            <FullscreenIcon sx={{fontSize: 16}}/>
                        </IconButton>
                    </Box>
                </Box>
            </NodeViewWrapper>
        )
    }

    // Show URL input interface
    return (
        <NodeViewWrapper
            as="div"
            style={{
                display: 'block',
                margin: '16px 0'
            }}
        >
            <Box
                sx={{
                    border: '2px dashed #ccc',
                    borderRadius: 2,
                    p: 3,
                    textAlign: 'center',
                    backgroundColor: 'rgba(0, 0, 0, 0.02)',
                    minHeight: 120,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 2
                }}
            >
                <WebIcon sx={{fontSize: 48, color: 'text.secondary', mb: 1}}/>
                <Typography variant="body2" color="text.secondary" sx={{mb: 2}}>
                    Enter a URL to embed
                </Typography>
                <Box sx={{width: '100%', maxWidth: 400, display: 'flex', flexDirection: 'column', gap: 2}}>
                    <TextField
                        fullWidth
                        size="small"
                        placeholder="https://example.com"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        onKeyDown={handleKeyDown}
                        autoFocus
                        variant="outlined"
                    />
                    <Box sx={{display: 'flex', gap: 1, justifyContent: 'center'}}>
                        <Button
                            variant="contained"
                            onClick={handleSubmit}
                            disabled={!url.trim()}
                            size="small"
                        >
                            Embed
                        </Button>
                        <Button
                            variant="outlined"
                            onClick={handleDelete}
                            size="small"
                        >
                            Remove
                        </Button>
                    </Box>
                </Box>
            </Box>
        </NodeViewWrapper>
    )
}

export const IframeExtension = Node.create<IframeOptions>({
    name: 'iframe',

    group: 'block',

    atom: true,

    addOptions() {
        return {
            allowFullscreen: true,
            HTMLAttributes: {
                class: 'iframe-wrapper',
            },
        }
    },

    addAttributes() {
        return {
            src: {
                default: null,
            },
            frameborder: {
                default: 0,
            },
            allowfullscreen: {
                default: this.options.allowFullscreen,
                parseHTML: () => this.options.allowFullscreen,
            },
        }
    },

    parseHTML() {
        return [
            {
                tag: 'iframe[src]',
                getAttrs: (element) => {
                    const src = (element as HTMLIFrameElement).getAttribute('src')
                    return src ? {src} : false
                },
            },
            {
                tag: 'div[data-type="iframe"]',
            },
        ]
    },

    renderHTML({HTMLAttributes, node}) {
        // If iframe has src, render as iframe
        if (node.attrs.src) {
            return ['div', this.options.HTMLAttributes, [
                'iframe',
                mergeAttributes(HTMLAttributes, {
                    src: node.attrs.src,
                    frameborder: '0',
                    allowfullscreen: this.options.allowFullscreen ? 'true' : 'false',
                    style: 'width: 100%; height: 400px; border-radius: 4px;'
                })
            ]]
        }
        // Otherwise render as placeholder div
        return ['div', mergeAttributes({'data-type': 'iframe'}, HTMLAttributes)]
    },

    addNodeView() {
        return ReactNodeViewRenderer(IframeComponent)
    },

    addCommands() {
        return {
            insertIframe: (options) => ({commands}) => {
                return commands.insertContent({
                    type: this.name,
                    attrs: options,
                })
            },
        }
    },
})

export default IframeExtension