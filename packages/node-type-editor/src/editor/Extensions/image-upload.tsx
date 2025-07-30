import { Node, mergeAttributes, nodeInputRule } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import { Plugin } from '@tiptap/pm/state';
import React, { useState, useCallback } from 'react';
import { Box, CircularProgress, IconButton, Typography, Alert } from '@mui/material';
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
const ImageUploadComponent = ({ node, updateAttributes, deleteNode }) => {
  const { src, alt, uploading, error, uploadProgress } = node.attrs;
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
      <NodeViewWrapper>
        <Box 
          position="relative" 
          display="inline-block"
          sx={{
            '&:hover .delete-button': {
              opacity: 1
            }
          }}
        >
          <img 
            src={src} 
            alt={alt || 'Uploaded image'} 
            style={{ 
              maxWidth: '100%', 
              height: 'auto',
              borderRadius: '4px'
            }} 
          />
          <IconButton
            className="delete-button"
            size="small"
            onClick={handleDelete}
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              color: 'white',
              opacity: 0,
              transition: 'opacity 0.2s',
              '&:hover': {
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
              }
            }}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      </NodeViewWrapper>
    );
  }

  // Show upload progress or error state
  return (
    <NodeViewWrapper>
      <Box
        sx={{
          border: dragOver ? '2px dashed #1976d2' : '2px dashed #ccc',
          borderRadius: 2,
          p: 3,
          textAlign: 'center',
          backgroundColor: dragOver ? 'rgba(25, 118, 210, 0.1)' : 'rgba(0, 0, 0, 0.02)',
          minHeight: 120,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s',
          cursor: 'pointer'
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {uploading && (
          <>
            <CircularProgress 
              variant={uploadProgress > 0 ? "determinate" : "indeterminate"}
              value={uploadProgress}
              size={40}
              sx={{ mb: 2 }}
            />
            <Typography variant="body2" color="text.secondary">
              Uploading... {uploadProgress > 0 && `${Math.round(uploadProgress)}%`}
            </Typography>
          </>
        )}

        {error && (
          <>
            <Alert severity="error" sx={{ mb: 2, width: '100%' }}>
              {error}
            </Alert>
            <Box>
              <IconButton onClick={handleRetry} color="primary">
                <RetryIcon />
              </IconButton>
              <IconButton onClick={handleDelete} color="error">
                <DeleteIcon />
              </IconButton>
            </Box>
          </>
        )}

        {!uploading && !error && (
          <Typography variant="body2" color="text.secondary">
            Drop an image here or paste from clipboard
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
    updateAttributes({ error: 'Please select an image file', uploading: false });
    return;
  }

  // Validate file size (10MB limit)
  if (file.size > 10 * 1024 * 1024) {
    console.error('❌ File too large:', file.size);
    updateAttributes({ error: 'File size must be less than 10MB', uploading: false });
    return;
  }

  console.log('📝 Setting uploading state to true');
  updateAttributes({ uploading: true, error: null, uploadProgress: 0 });

  try {
    const formData = new FormData();
    formData.append('image', file);

    // Get correct API URL
    const currentPort = (process.env.NODE_ENV || 'development') == 'development' ? "29999" : window.location.port;
    const httpUrl = `${window.location.protocol}//${location.hostname}:${currentPort}`;
    const uploadUrl = `${httpUrl}/api/images/upload`;
    
    console.log('📤 Sending upload request to:', uploadUrl);
    console.log('📦 FormData prepared, file appended as "image"');
    
    const response = await fetch(uploadUrl, {
      method: 'POST',
      body: formData,
    });

    console.log('📨 Upload response received, status:', response.status);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
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
        const imageResponse = await fetch(result.url, { method: 'HEAD' });
        
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

  group: 'block',

  draggable: true,

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
        tag: 'div[data-type="image-upload"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes({ 'data-type': 'image-upload' }, HTMLAttributes)];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageUploadComponent);
  },

  addCommands() {
    return {
      insertImageUpload: (options) => ({ commands }) => {
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
          return { src, alt };
        },
      }),
    ];
  },

  // Handle paste events
  addProseMirrorPlugins() {
    const extension = this;
    return [
      new Plugin({
        props: {
          handlePaste: (view, event, slice) => {
            console.log('🎯 Paste event detected');
            const items = Array.from(event.clipboardData?.items || []);
            console.log('📋 Clipboard items:', items.map(item => ({ type: item.type, kind: item.kind })));
            
            for (const item of items) {
              console.log('🔍 Checking item:', item.type, item.kind);
              if (item.type.startsWith('image/')) {
                console.log('🖼️ Image found in clipboard!');
                event.preventDefault();
                
                const file = item.getAsFile();
                console.log('📁 File from clipboard:', file ? `${file.name} (${file.size} bytes)` : 'null');
                
                if (file) {
                  console.log('✅ Valid file obtained, inserting node...');
                  // Insert placeholder node at current cursor position
                  const { state, dispatch } = view;
                  const { from } = state.selection;
                  console.log('📍 Insert position:', from);
                  
                  const node = extension.type.create({ uploading: true, error: null, uploadProgress: 0 });
                  const transaction = state.tr.insert(from, node);
                  dispatch(transaction);
                  console.log('✅ Node inserted, starting upload...');

                  // Start upload immediately with improved node tracking
                  const nodePos = from;
                  console.log('🚀 Starting upload for file at position:', nodePos);
                  
                  // Store a reference to the view and position for the callback
                  const uploadCallback = (attrs: Partial<ImageUploadAttributes>) => {
                    console.log('📝 Upload callback triggered with attrs:', attrs);
                    
                    // Use a more reliable way to find and update the node
                    const currentState = view.state;
                    let targetNode = null;
                    let targetPos = -1;
                    
                    // Search for the uploading node around the original position
                    for (let pos = Math.max(0, nodePos - 5); pos <= Math.min(currentState.doc.content.size, nodePos + 5); pos++) {
                      const node = currentState.doc.nodeAt(pos);
                      if (node && node.type === extension.type && node.attrs.uploading) {
                        targetNode = node;
                        targetPos = pos;
                        break;
                      }
                    }
                    
                    if (targetNode && targetPos >= 0) {
                      console.log('✅ Found target node at position:', targetPos);
                      const tr = currentState.tr.setNodeMarkup(targetPos, undefined, {
                        ...targetNode.attrs,
                        ...attrs,
                      });
                      view.dispatch(tr);
                    } else {
                      console.log('❌ Could not find uploading node, searching entire document...');
                      
                      // Fallback: search the entire document for uploading nodes
                      let found = false;
                      currentState.doc.descendants((node, pos) => {
                        if (node.type === extension.type && node.attrs.uploading && !found) {
                          console.log('✅ Found uploading node at position:', pos);
                          const tr = currentState.tr.setNodeMarkup(pos, undefined, {
                            ...node.attrs,
                            ...attrs,
                          });
                          view.dispatch(tr);
                          found = true;
                          return false; // Stop searching
                        }
                      });
                      
                      if (!found) {
                        console.log('❌ No uploading nodes found - this should not happen');
                      }
                    }
                  };
                  
                  // Create an enhanced callback that stores the file reference
                  const enhancedCallback = (attrs: Partial<ImageUploadAttributes>) => {
                    // First store the file for retry functionality
                    const nodeDOM = view.nodeDOM(nodePos);
                    if (nodeDOM) {
                      (nodeDOM as any).__uploadFile = file;
                    }
                    
                    // Then call the original callback
                    uploadCallback(attrs);
                  };
                  
                  uploadImage(file, enhancedCallback);
                }
                return true;
              }
            }
            console.log('❌ No image found in clipboard');
            return false;
          },
        },
      }),
    ];
  },
});