import {useAtomValue, useSetAtom} from "jotai";
import {addNewNodeAtom, deleteNodeAtom, markedNodesAtom, toggleMarkedNodeAtom, treeAtom} from "../TreeState/TreeState";
import {useTheme} from "@mui/system";
import {
    Alert,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    IconButton,
    ListItemText,
    Menu,
    MenuItem,
    Snackbar,
    Tooltip,
    Box,
    Typography,
    LinearProgress
} from "@mui/material";
import React, {useEffect, useState} from "react";
import ArchiveIcon from '@mui/icons-material/Archive';
import TagIcon from '@mui/icons-material/Tag';
import InsertLinkIcon from '@mui/icons-material/InsertLink';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import ImageIcon from '@mui/icons-material/Image';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CloseIcon from '@mui/icons-material/Close';
import {NodeVM} from "@forest/schema";
import {StageVersionDialog} from "./StageVersionDialog";
import Slide from '@mui/material/Slide';
import {Portal} from '@mui/material';

interface childTypesForDisplay {
    "name": string,
    "displayName": string,
}

export const HoverSidePanel = (props: { node: NodeVM, isVisible: boolean, isDragging?: boolean}) => {
    const theme = useTheme()
    const node = props.node;
    const addNewNode = useSetAtom(addNewNodeAtom)
    const deleteNode = useSetAtom(deleteNodeAtom)
    const tree = useAtomValue(treeAtom)
    const nodeChildren = useAtomValue(node.children)
    const markedNodes = useAtomValue(markedNodesAtom)
    const toggleMarkedNode = useSetAtom(toggleMarkedNodeAtom)
    const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
    const [availableTypesForDisplay, setAvailableTypesForDisplay] = React.useState<childTypesForDisplay[]>([]);

    // Stage version dialog state
    const [stageDialogOpen, setStageDialogOpen] = React.useState(false);
    // Confirmation dialog state for delete
    const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
    const [pendingDeleteNodeId, setPendingDeleteNodeId] = React.useState<string | null>(null);

    // Snackbar state for copy link
    const [copySuccess, setCopySuccess] = React.useState(false);
    
    // Image upload dialog state
    const [imageUploadOpen, setImageUploadOpen] = React.useState(false);
    const [uploadProgress, setUploadProgress] = React.useState(0);
    const [uploading, setUploading] = React.useState(false);
    const [uploadedBytes, setUploadedBytes] = React.useState(0);
    const [totalBytes, setTotalBytes] = React.useState(0);
    const [dragOver, setDragOver] = React.useState(false);

    const availableTypeNames = node.nodeType.allowedChildrenTypes


    useEffect(() => {
        const fetchTypes = async () => {
            const promises = availableTypeNames.map(async (typeName) => {
                const nodeType = await node.treeVM.treeM.supportedNodesTypes(typeName);
                return {
                    name: typeName,
                    displayName: nodeType.displayName
                };
            });
            const availableTypes = await Promise.all(promises);
            setAvailableTypesForDisplay(availableTypes);
        };
        fetchTypes();
    }, [availableTypeNames, node.treeVM]);


    const handleClose = () => {
        setAnchorEl(null);
    };

    const handleAdd = (nodeTypeName: string) => {
        addNewNode({
            parentId: node.id,
            positionId: null,
            nodeTypeName
        });
        handleClose();
    };

    const archiveNode = () => {
        node.data['archived'] = true;
        node.commitDataChange()
    }

    const unarchiveNode = () => {
        node.data['archived'] = false;
        node.commitDataChange()
    }

    const handleStageVersion = () => {
        setStageDialogOpen(true);
    };

    const deleteNodeHandler = () => {
        setPendingDeleteNodeId(node.id);
        setDeleteDialogOpen(true);
    };

    const copyNodeLink = () => {
        let currentUrl = window.location.href;
        currentUrl = currentUrl.split('?')[0];
        const nodeUrl = `${currentUrl}?id=${tree.treeM.id()}&n=${node.id}`;

        if (navigator.clipboard) {
            navigator.clipboard.writeText(nodeUrl);
            setCopySuccess(true);
        } else {
            setCopySuccess(true); // Still show snackbar, but maybe with a different message if needed
        }
    };

    const handleToggleMarked = () => {
        toggleMarkedNode(node.id);
    };

    const handleInsertImage = () => {
        setImageUploadOpen(true);
    };

    const handleCloseImageUpload = () => {
        if (!uploading) {
            setImageUploadOpen(false);
            setUploadProgress(0);
            setUploadedBytes(0);
            setTotalBytes(0);
        }
    };

    const uploadImageToEditor = async (file: File) => {
        setUploading(true);
        setTotalBytes(file.size);
        setUploadedBytes(0);
        setUploadProgress(0);

        try {
            const formData = new FormData();
            formData.append('image', file);

            // Get correct API URL
            const currentPort = (process.env.NODE_ENV || 'development') == 'development' ? "29999" : window.location.port;
            const httpUrl = `${window.location.protocol}//${location.hostname}:${currentPort}`;
            const uploadUrl = `${httpUrl}/api/images/upload`;

            // Use XMLHttpRequest for progress tracking
            const response = await new Promise<Response>((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                
                xhr.upload.addEventListener('progress', (event) => {
                    if (event.lengthComputable) {
                        const progress = (event.loaded / event.total) * 100;
                        setUploadProgress(progress);
                        setUploadedBytes(event.loaded);
                    }
                });

                xhr.addEventListener('load', () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        // Create a Response-like object
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

            const result = await response.json();

            if (result.success) {
                // Insert image at the end of the editor content
                const editor = node.vdata["tiptap_editor_ydatapaperEditor"];
                if (editor && editor.commands) {
                    // Move cursor to end of document
                    editor.commands.focus('end');
                    // Insert image
                    editor.commands.setImage({
                        src: result.url,
                        alt: result.originalName
                    });
                }
                
                // Close dialog after successful upload
                setTimeout(() => {
                    handleCloseImageUpload();
                }, 1000);
            } else {
                throw new Error(result.error || 'Upload failed');
            }
        } catch (error: any) {
            console.error('Upload error:', error);
            alert(`Upload failed: ${error.message}`);
        } finally {
            setUploading(false);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);

        const files = Array.from(e.dataTransfer.files);
        const imageFile = files.find(file => file.type.startsWith('image/'));

        if (imageFile) {
            uploadImageToEditor(imageFile);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && file.type.startsWith('image/')) {
            uploadImageToEditor(file);
        }
        // Reset input
        e.target.value = '';
    };


    const isMarked = markedNodes.has(node.id);

    if (!props.isVisible) return null;

    return (
        <>
            <div
                style={{
                    position: 'absolute',
                    right: '-48px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    backgroundColor: theme.palette.background.paper,
                    borderRadius: '12px',
                    padding: '8px 4px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    border: `1px solid ${theme.palette.divider}`,
                    zIndex: 9999,
                    minWidth: '48px'
                }}
            >

                {/* Stage Version */}
                <Tooltip title="Stage Version" placement="left">
                    <IconButton
                        size="small"
                        onClick={handleStageVersion}
                        sx={{
                            color: theme.palette.info.main
                        }}
                    >
                        <TagIcon fontSize="small"/>
                    </IconButton>
                </Tooltip>

                {/* Archive/Unarchive */}
                {node.nodeType.allowReshape && <Tooltip title={node.data['archived'] ? "Unarchive" : "Archive"} placement="left">
                    <IconButton
                        size="small"
                        onClick={node.data['archived'] ? unarchiveNode : archiveNode}
                        sx={{
                            color: theme.palette.info.main
                        }}
                    >
                        <ArchiveIcon fontSize="small"/>
                    </IconButton>
                </Tooltip>}

                {/* Copy Node Link */}
                <Tooltip title="Copy Node Link" placement="left">
                    <IconButton
                        size="small"
                        onClick={copyNodeLink}
                        sx={{
                            color: theme.palette.info.main,
                            '&:hover': {backgroundColor: theme.palette.secondary.light + '20'}
                        }}
                    >
                        <InsertLinkIcon fontSize="small"/>
                    </IconButton>
                </Tooltip>

                {/* Toggle Marked */}
                <Tooltip title={isMarked ? "Unmark Node" : "Select Node"} placement="left">
                    <IconButton
                        size="small"
                        onClick={handleToggleMarked}
                        sx={{
                            color: theme.palette.info.main
                        }}
                    >
                        {isMarked ? <CheckBoxIcon fontSize="small"/> : <CheckBoxOutlineBlankIcon fontSize="small"/>}
                    </IconButton>
                </Tooltip>

                {/* Insert Image - Only show for EditorNodeType */}
                {node.nodeM.nodeTypeName() === 'EditorNodeType' && (
                    <Tooltip title="Insert Image" placement="left">
                        <IconButton
                            size="small"
                            onClick={handleInsertImage}
                            sx={{
                                color: theme.palette.info.main,
                                '&:hover': {backgroundColor: theme.palette.secondary.light + '20'}
                            }}
                        >
                            <ImageIcon fontSize="small"/>
                        </IconButton>
                    </Tooltip>
                )}

                {/* Delete Node */}
                {node.nodeType.allowReshape && nodeChildren.length === 0 && (
                    <Tooltip title="Delete Node" placement="left">
                        <IconButton
                            size="small"
                            onClick={deleteNodeHandler}
                            disabled={nodeChildren.length > 0 || node.parent === null}
                            sx={{
                                color: theme.palette.info.main,
                                '&:disabled': {color: theme.palette.action.disabled}
                            }}
                        >
                            <DeleteIcon fontSize="small"/>
                        </IconButton>
                    </Tooltip>
                )}
            </div>

            {/* Add Children Menu */}
            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleClose}
                anchorOrigin={{vertical: 'top', horizontal: 'left'}}
                transformOrigin={{vertical: 'top', horizontal: 'right'}}
            >
                {availableTypesForDisplay.map((type) => (
                    <MenuItem
                        key={type.name}
                        onClick={() => handleAdd(type.name)}
                    >
                        <ListItemText>{type.displayName}</ListItemText>
                    </MenuItem>
                ))}
            </Menu>

            {/* Delete Confirmation Dialog */}
            <Dialog
                open={deleteDialogOpen}
                onClose={() => setDeleteDialogOpen(false)}
            >
                <DialogTitle>Confirm Delete</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Are you sure you want to delete this node? This action cannot be undone.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteDialogOpen(false)} color="primary">
                        Cancel
                    </Button>
                    <Button
                        onClick={() => {
                            if (pendingDeleteNodeId) {
                                deleteNode({nodeId: pendingDeleteNodeId});
                            }
                            setDeleteDialogOpen(false);
                            setPendingDeleteNodeId(null);
                        }}
                        color="error"
                        variant="contained"
                    >
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Snackbar for copy link */}
            <Snackbar
                open={copySuccess}
                autoHideDuration={1000}
                onClose={() => setCopySuccess(false)}
                anchorOrigin={{vertical: 'bottom', horizontal: 'center'}}
                TransitionComponent={Slide}
            >
                <Alert onClose={() => setCopySuccess(false)} severity="success" sx={{width: '100%'}}>
                    Node URL copied to clipboard!
                </Alert>
            </Snackbar>

            {/* Stage Version Dialog */}
            <StageVersionDialog
                open={stageDialogOpen}
                onClose={() => setStageDialogOpen(false)}
                node={node}
            />

            {/* Image Upload Dialog - Use Portal to prevent it from being unmounted when sidebar disappears */}
            <Portal>
                <Dialog
                    open={imageUploadOpen}
                    onClose={handleCloseImageUpload}
                    maxWidth="sm"
                    fullWidth
                >
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CloudUploadIcon />
                    Upload Image
                    <Box sx={{ flexGrow: 1 }} />
                    {!uploading && (
                        <IconButton onClick={handleCloseImageUpload} size="small">
                            <CloseIcon />
                        </IconButton>
                    )}
                </DialogTitle>
                <DialogContent>
                    <Box
                        sx={{
                            border: dragOver ? '2px dashed #1976d2' : '2px dashed #ccc',
                            borderRadius: 2,
                            p: 4,
                            textAlign: 'center',
                            backgroundColor: dragOver ? 'rgba(25, 118, 210, 0.1)' : 'rgba(0, 0, 0, 0.02)',
                            minHeight: 200,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s',
                            cursor: uploading ? 'not-allowed' : 'pointer',
                            position: 'relative'
                        }}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => {
                            if (!uploading) {
                                document.getElementById('image-file-input')?.click();
                            }
                        }}
                    >
                        <input
                            id="image-file-input"
                            type="file"
                            accept="image/*"
                            onChange={handleFileSelect}
                            style={{ display: 'none' }}
                            disabled={uploading}
                        />
                        
                        {uploading ? (
                            <>
                                <Box sx={{ width: '100%', mb: 2 }}>
                                    <LinearProgress 
                                        variant="determinate" 
                                        value={uploadProgress} 
                                        sx={{ height: 8, borderRadius: 4 }}
                                    />
                                </Box>
                                <Typography variant="h6" color="primary" sx={{ mb: 1 }}>
                                    Uploading...
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    {uploadedBytes > 0 && totalBytes > 0 
                                        ? `${Math.round((uploadedBytes / totalBytes) * 100)}% - ${(uploadedBytes / 1024).toFixed(1)}KB / ${(totalBytes / 1024).toFixed(1)}KB`
                                        : 'Preparing upload...'
                                    }
                                </Typography>
                            </>
                        ) : (
                            <>
                                <CloudUploadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                                <Typography variant="h6" sx={{ mb: 1 }}>
                                    Drop image here or click to select
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Supports JPG, PNG, GIF, WebP (max 10MB)
                                </Typography>
                            </>
                        )}
                    </Box>
                </DialogContent>
                {!uploading && (
                    <DialogActions>
                        <Button onClick={handleCloseImageUpload}>
                            Cancel
                        </Button>
                    </DialogActions>
                )}
                </Dialog>
            </Portal>
        </>
    );
};