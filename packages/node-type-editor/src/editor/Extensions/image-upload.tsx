import {mergeAttributes, Node, nodeInputRule} from '@tiptap/core';
import {NodeViewWrapper, ReactNodeViewRenderer} from '@tiptap/react';
import {NodeSelection, Plugin} from '@tiptap/pm/state';
import React, {useCallback, useState} from 'react';
import {Box, CircularProgress, IconButton, Typography} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import RetryIcon from '@mui/icons-material/Refresh';

// Declare commands interface
declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        imageUpload: {
            insertImageUpload: (options: { src?: string; alt?: string; uploading?: boolean }) => ReturnType;
        };
    }
}

interface ImageUploadOptions {
    HTMLAttributes: Record<string, any>;
    uploadUrl: string;
    maxFileSize: number;
    allowedTypes: string[];
}

interface ImageUploadAttributes {
    src: string;
    alt: string;
    uploading: boolean;
    error: string;
    uploadProgress: number;
}

// Image upload component
const ImageUploadComponent = ({node, updateAttributes, deleteNode}) => {
    const {src, alt, uploading, error, uploadProgress} = node.attrs;
    const [dragOver, setDragOver] = useState(false);
    const [lastFile, setLastFile] = useState<File | null>(null);

    const handleRetry = useCallback(async () => {
        if (error) {
            // Try to get file from different sources
            let fileToRetry = lastFile;

            // If no file in state, try to get from DOM
            if (!fileToRetry) {
                const nodeElement = document.querySelector(`[data-type="image-upload"]`);
                if (nodeElement && (nodeElement as any).__uploadFile) {
                    fileToRetry = (nodeElement as any).__uploadFile;
                    console.log('📁 Retrieved file from DOM for retry');
                }
            }

            if (fileToRetry) {
                console.log('🔄 Retrying upload with file:', fileToRetry.name);
                setLastFile(fileToRetry); // Ensure it's stored in state
                await uploadImage(fileToRetry, updateAttributes);
            } else {
                console.error('❌ No file available for retry');
                updateAttributes({
                    error: 'No file available for retry. Please try uploading again.',
                    uploading: false
                });
            }
        }
    }, [error, lastFile, updateAttributes]);

    const handleDelete = useCallback(() => {
        deleteNode();
    }, [deleteNode]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
    }, []);

    const handleDrop = useCallback(async (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);

        const files = Array.from(e.dataTransfer.files);
        const imageFile = files.find(file => file.type.startsWith('image/'));

        if (imageFile) {
            setLastFile(imageFile);
            await uploadImage(imageFile, updateAttributes);
        }
    }, [updateAttributes]);

    // Store file reference when upload starts (for paste events)
    const handleUploadStart = useCallback((file: File) => {
        setLastFile(file);
    }, []);

    // If image is successfully uploaded, show the image
    if (src && !uploading && !error) {
        return (
            <NodeViewWrapper
                as="span"
                style={{
                    display: 'inline-block',
                    position: 'relative',
                    verticalAlign: 'baseline'
                }}
            >
                <img
                    src={src}
                    alt={alt || 'Uploaded image'}
                    style={{
                        maxWidth: '100%',
                        height: 'auto',
                        borderRadius: '4px',
                        verticalAlign: 'baseline',
                        display: 'inline-block'
                    }}
                    onLoad={() => {
                        // Ensure cursor positioning works after image loads
                        const selection = window.getSelection();
                        if (selection && selection.rangeCount > 0) {
                            // Force a repaint to fix cursor positioning
                            const range = selection.getRangeAt(0);
                            selection.removeAllRanges();
                            selection.addRange(range);
                        }
                    }}
                />
                <IconButton
                    className="delete-button"
                    size="small"
                    onClick={handleDelete}
                    sx={{
                        position: 'absolute',
                        top: 4,
                        right: 4,
                        backgroundColor: 'rgba(0, 0, 0, 0.6)',
                        color: 'white',
                        opacity: 0,
                        transition: 'opacity 0.2s',
                        width: 20,
                        height: 20,
                        minWidth: 20,
                        '&:hover': {
                            backgroundColor: 'rgba(0, 0, 0, 0.8)',
                            opacity: 1,
                        },
                        '.image-wrapper:hover &': {
                            opacity: 1,
                        }
                    }}
                >
                    <DeleteIcon sx={{fontSize: 14}}/>
                </IconButton>
            </NodeViewWrapper>
        );
    }

    // Show upload progress or error state
    return (
        <NodeViewWrapper
            as="span"
            style={{
                display: 'inline-block',
                verticalAlign: 'baseline'
            }}
        >
            <Box
                sx={{
                    border: dragOver ? '2px dashed #1976d2' : '2px dashed #ccc',
                    borderRadius: 2,
                    p: 2,
                    textAlign: 'center',
                    backgroundColor: dragOver ? 'rgba(25, 118, 210, 0.1)' : 'rgba(0, 0, 0, 0.02)',
                    minHeight: uploading || error ? 60 : 80,
                    minWidth: 200,
                    display: 'inline-flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s',
                    cursor: 'pointer',
                    verticalAlign: 'baseline'
                }}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                {uploading && (
                    <>
                        {uploadProgress > 0 ? (
                            <Box sx={{position: 'relative', display: 'inline-flex', mb: 1}}>
                                <CircularProgress
                                    variant="determinate"
                                    value={uploadProgress}
                                    size={24}
                                />
                                <Box
                                    sx={{
                                        top: 0,
                                        left: 0,
                                        bottom: 0,
                                        right: 0,
                                        position: 'absolute',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <Typography variant="caption" sx={{fontSize: '8px', fontWeight: 'bold'}}>
                                        {`${Math.round(uploadProgress)}`}
                                    </Typography>
                                </Box>
                            </Box>
                        ) : (
                            <CircularProgress size={24} sx={{mb: 1}}/>
                        )}
                        <Typography variant="caption" color="text.secondary">
                            {uploadProgress > 0
                                ? `Uploading ${Math.round(uploadProgress)}%`
                                : 'Starting upload...'
                            }
                        </Typography>
                    </>
                )}

                {error && (
                    <>
                        <Typography variant="caption" color="error" sx={{mb: 1, maxWidth: 180}}>
                            {error}
                        </Typography>
                        <Box sx={{display: 'flex', gap: 0.5}}>
                            <IconButton onClick={handleRetry} color="primary" size="small">
                                <RetryIcon fontSize="small"/>
                            </IconButton>
                            <IconButton onClick={handleDelete} color="error" size="small">
                                <DeleteIcon fontSize="small"/>
                            </IconButton>
                        </Box>
                    </>
                )}

                {!uploading && !error && (
                    <Typography variant="caption" color="text.secondary" sx={{maxWidth: 180, lineHeight: 1.2}}>
                        Drop image here or paste from clipboard
                    </Typography>
                )}
            </Box>
        </NodeViewWrapper>
    );
};

// Upload function
export const uploadImage = async (file: File, updateAttributes: (attrs: Partial<ImageUploadAttributes>) => void) => {
    console.log('🚀 Starting image upload for file:', file.name, file.type, file.size);
    console.log('🔧 updateAttributes function type:', typeof updateAttributes);

    // Validate file type
    if (!file.type.startsWith('image/')) {
        console.error('❌ Invalid file type:', file.type);
        updateAttributes({error: 'Please select an image file', uploading: false});
        return;
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
        console.error('❌ File too large:', file.size);
        updateAttributes({error: 'File size must be less than 10MB', uploading: false});
        return;
    }

    console.log('📝 Setting uploading state to true');
    updateAttributes({uploading: true, error: null, uploadProgress: 0});

    try {
        const formData = new FormData();
        formData.append('image', file);

        // Get correct API URL
        const currentPort = (process.env.NODE_ENV || 'development') == 'development' ? "29999" : window.location.port;
        const httpUrl = `${window.location.protocol}//${location.hostname}:${currentPort}`;
        const uploadUrl = `${httpUrl}/api/images/upload`;

        console.log('📤 Sending upload request to:', uploadUrl);
        console.log('📦 FormData prepared, file appended as "image"');

        // Use XMLHttpRequest for progress tracking
        const response = await new Promise<Response>((resolve, reject) => {
            const xhr = new XMLHttpRequest();

            xhr.upload.addEventListener('progress', (event) => {
                if (event.lengthComputable) {
                    const progress = (event.loaded / event.total) * 100;
                    console.log(`📊 Upload progress: ${progress.toFixed(1)}%`);
                    updateAttributes({uploadProgress: progress});
                }
            });

            xhr.addEventListener('load', () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    const response = new Response(xhr.responseText, {
                        status: xhr.status,
                        statusText: xhr.statusText
                    });
                    resolve(response);
                } else {
                    reject(new Error(`HTTP ${xhr.status}: ${xhr.statusText}`));
                }
            });

            xhr.addEventListener('error', () => {
                reject(new Error('Network error'));
            });

            xhr.open('POST', uploadUrl);
            xhr.send(formData);
        });

        console.log('📨 Upload response received, status:', response.status);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({error: 'Unknown error'}));
            console.error('Upload failed with error:', errorData);
            throw new Error(errorData.error || `Upload failed with status ${response.status}`);
        }

        const result = await response.json();
        console.log('Upload result:', result);

        if (result.success) {
            console.log('Upload successful, validating image URL:', result.url);

            // Validate that the image URL is accessible
            try {
                console.log('🔍 Validating image accessibility...');
                const imageResponse = await fetch(result.url, {method: 'HEAD'});

                if (imageResponse.ok) {
                    console.log('✅ Image URL is accessible');
                    updateAttributes({
                        src: result.url,
                        alt: result.originalName || file.name,
                        uploading: false,
                        error: null,
                        uploadProgress: 100
                    });
                } else {
                    console.error('❌ Image URL not accessible, status:', imageResponse.status);
                    throw new Error(`Image not accessible (status: ${imageResponse.status}). Please check MinIO permissions.`);
                }
            } catch (imageError: any) {
                console.error('❌ Error validating image URL:', imageError);
                updateAttributes({
                    error: `Upload completed but image not accessible: ${imageError.message}`,
                    uploading: false,
                    uploadProgress: 0
                });
            }
        } else {
            throw new Error(result.error || 'Upload failed');
        }
    } catch (error: any) {
        console.error('Upload error:', error);
        updateAttributes({
            error: error.message || 'Upload failed. Please check your connection and try again.',
            uploading: false,
            uploadProgress: 0
        });
    }
};

// TipTap extension
export const ImageUploadExtension = Node.create<ImageUploadOptions>({
    name: 'imageUpload',

    addOptions() {
        return {
            HTMLAttributes: {},
            uploadUrl: '/api/images/upload',
            maxFileSize: 10 * 1024 * 1024, // 10MB
            allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
        };
    },

    group: 'inline',

    inline: true,

    draggable: true,

    selectable: true,

    atom: true,

    addAttributes() {
        return {
            src: {
                default: null,
            },
            alt: {
                default: null,
            },
            uploading: {
                default: false,
            },
            error: {
                default: null,
            },
            uploadProgress: {
                default: 0,
            },
        };
    },

    parseHTML() {
        return [
            {
                tag: 'span[data-type="image-upload"]',
            },
            {
                tag: 'img[src]',
                getAttrs: (element) => {
                    const src = (element as HTMLImageElement).getAttribute('src');
                    const alt = (element as HTMLImageElement).getAttribute('alt');
                    return src ? {src, alt, uploading: false, error: null} : false;
                },
            },
        ];
    },

    renderHTML({HTMLAttributes, node}) {
        // If the image is uploaded successfully, render as img tag
        if (node.attrs.src && !node.attrs.uploading && !node.attrs.error) {
            return ['img', mergeAttributes(HTMLAttributes, {
                src: node.attrs.src,
                alt: node.attrs.alt || 'Uploaded image',
                style: 'max-width: 100%; height: auto; border-radius: 4px; vertical-align: baseline;'
            })];
        }
        // Otherwise render as placeholder span
        return ['span', mergeAttributes({'data-type': 'image-upload'}, HTMLAttributes)];
    },

    addNodeView() {
        return ReactNodeViewRenderer(ImageUploadComponent);
    },

    addCommands() {
        return {
            insertImageUpload: (options) => ({commands}) => {
                return commands.insertContent({
                    type: this.name,
                    attrs: options,
                });
            },
        };
    },

    addInputRules() {
        return [
            nodeInputRule({
                find: /!\[(.+|:?)]\((\S+)(?:(?:\s+)["'](\S+)["'])?\)/,
                type: this.type,
                getAttributes: (match) => {
                    const [, alt, src] = match;
                    return {src, alt};
                },
            }),
        ];
    },

    // Handle paste events and improve cursor navigation
    addProseMirrorPlugins() {
        const extension = this;
        return [
            // Keyboard navigation plugin for better cursor handling
            new Plugin({
                props: {
                    handleKeyDown: (view, event) => {
                        // Handle arrow keys around images for better navigation
                        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
                            const {state} = view;
                            const {selection} = state;

                            // Check if we're at the edge of an image node
                            const $pos = event.key === 'ArrowLeft' ? selection.$from : selection.$to;
                            const nodePos = event.key === 'ArrowLeft' ? $pos.pos - 1 : $pos.pos;
                            const nodeAtPos = state.doc.nodeAt(nodePos);

                            if (nodeAtPos && nodeAtPos.type === extension.type) {
                                // We're next to an image, let the default behavior handle it
                                return false;
                            }
                        }

                        // Handle delete key to prevent accidental image deletion
                        if (event.key === 'Delete' || event.key === 'Backspace') {
                            const {state} = view;
                            const {selection} = state;

                            if (selection.empty && selection instanceof NodeSelection) {
                                const node = selection.node;
                                if (node.type === extension.type && node.attrs.src) {
                                    // Prevent accidental deletion of images, require explicit delete button click
                                    event.preventDefault();
                                    return true;
                                }
                            }
                        }

                        return false;
                    },
                },
            }),
        ];
    },
});