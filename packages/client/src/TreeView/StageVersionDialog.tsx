import React from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Button,
    Typography,
    Chip,
    Box
} from '@mui/material';
import { NodeVM, NodeM } from '@forest/schema';
import { httpUrl, treeId } from '../appState';
import { userAtom } from '@forest/user-system/src/authStates';
import { useAtomValue } from 'jotai';
import { treeAtom } from '../TreeState/TreeState';
import { MiddleContents } from './TreeView';

interface StageVersionDialogProps {
    open: boolean;
    onClose: () => void;
    node: NodeVM;
}

interface Snapshot {
    treeId: string;
    nodeId: string;
    authorId: string;
    tag: string;
    data: any;
    date: string;
}

export const StageVersionDialog = ({ open, onClose, node }: StageVersionDialogProps) => {
    const [tagName, setTagName] = React.useState('');
    const [existingTags, setExistingTags] = React.useState<string[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [previewNodeVM, setPreviewNodeVM] = React.useState<NodeVM | null>(null);
    const [previewLoading, setPreviewLoading] = React.useState(false);
    const user = useAtomValue(userAtom);
    const tree = useAtomValue(treeAtom);

    // Fetch existing snapshots when dialog opens
    React.useEffect(() => {
        if (open && node?.id) {
            fetchExistingSnapshots();
        }
    }, [open, node?.id]);

    const fetchExistingSnapshots = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${httpUrl}/api/nodeSnapshot?treeId=${treeId}&nodeId=${node.id}`);
            
            if (!response.ok) {
                throw new Error('Failed to fetch snapshots');
            }
            
            const data = await response.json();
            const tags = data.snapshots?.map((snapshot: Snapshot) => snapshot.tag) || [];
            setExistingTags(tags);
        } catch (error) {
            console.error('Failed to fetch existing snapshots:', error);
            setExistingTags([]);
        } finally {
            setLoading(false);
        }
    };

    const handleChipClick = async (tag: string) => {
        try {
            setPreviewLoading(true);
            setPreviewNodeVM(null);
            
            // Find the snapshot with this tag
            const response = await fetch(`${httpUrl}/api/nodeSnapshot?treeId=${treeId}&nodeId=${node.id}`);
            if (!response.ok) {
                throw new Error('Failed to fetch snapshots');
            }
            
            const data = await response.json();
            const snapshot = data.snapshots?.find((s: Snapshot) => s.tag === tag);
            
            if (!snapshot) {
                throw new Error('Snapshot not found');
            }

            // Create NodeM from snapshot data (now it's a plain object)
            const nodeM = NodeM.fromSnapshot(snapshot.data);
            
            // Create NodeVM from NodeM
            const nodeVM = await NodeVM.create(nodeM, tree);
            
            setPreviewNodeVM(nodeVM);
        } catch (error) {
            console.error('Failed to load snapshot preview:', error);
        } finally {
            setPreviewLoading(false);
        }
    };

    const stageThisVersion = async (tag: string) => {
        try {
            // Helper function to safely serialize data, handling circular references
            const safeStringify = (obj: any): any => {
                const seen = new WeakSet();
                return JSON.parse(JSON.stringify(obj, (key, value) => {
                    if (typeof value === 'object' && value !== null) {
                        if (seen.has(value)) {
                            return '[Circular Reference]';
                        }
                        seen.add(value);
                    }
                    return value;
                }));
            };

            // Create a simple serializable object from the node data
            const nodeData = node.nodeM.getSnapshot()
            
            const requestBody = {
                treeId: treeId,
                nodeId: node.id,
                authorId: user?.id || "admin",
                tag: tag,
                data: nodeData
            };
            
            console.log('Saving snapshot for node:', node.id, 'with tag:', tag);
            const response = await fetch(httpUrl + '/api/nodeSnapshot', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to save snapshot');
            }

            console.log('Snapshot saved successfully');
            // Refresh the existing tags after saving
            await fetchExistingSnapshots();
            handleClose();
        } catch (error) {
            console.error('Failed to save snapshot:', error);
            // You might want to show an error notification to the user here
        }
    };

    const handleSubmit = () => {
        if (tagName.trim()) {
            stageThisVersion(tagName.trim());
        }
    };

    const handleClose = () => {
        setTagName('');
        setPreviewNodeVM(null);
        onClose();
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
            <DialogTitle>Stage Version</DialogTitle>
            <DialogContent>
                <TextField
                    autoFocus
                    margin="dense"
                    label="Tag Name"
                    type="text"
                    fullWidth
                    variant="outlined"
                    value={tagName}
                    onChange={(e) => setTagName(e.target.value)}
                    placeholder="Enter a tag name for this version"
                    onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                            handleSubmit();
                        }
                    }}
                />
                
                {existingTags.length > 0 && (
                    <Box mt={2}>
                        <Typography variant="body2" color="textSecondary" gutterBottom>
                            Existing versions (click to preview):
                        </Typography>
                        <Box display="flex" flexWrap="wrap" gap={1}>
                            {existingTags.map((tag, index) => (
                                <Chip
                                    key={index}
                                    label={tag}
                                    size="small"
                                    variant="outlined"
                                    color="primary"
                                    onClick={() => handleChipClick(tag)}
                                    clickable
                                />
                            ))}
                        </Box>
                    </Box>
                )}
                
                {loading && (
                    <Box mt={2}>
                        <Typography variant="body2" color="textSecondary">
                            Loading existing versions...
                        </Typography>
                    </Box>
                )}

                {previewLoading && (
                    <Box mt={2}>
                        <Typography variant="body2" color="textSecondary">
                            Loading preview...
                        </Typography>
                    </Box>
                )}

                {previewNodeVM && (
                    <Box mt={2} sx={{ border: '1px solid #ddd', borderRadius: 1, p: 2 }}>
                        <Typography variant="h6" gutterBottom>
                            Preview:
                        </Typography>
                        {previewNodeVM.nodeType.render(previewNodeVM)}
                    </Box>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose} color="primary">
                    Cancel
                </Button>
                <Button 
                    onClick={handleSubmit} 
                    color="primary" 
                    variant="contained"
                    disabled={!tagName.trim()}
                >
                    Stage Version
                </Button>
            </DialogActions>
        </Dialog>
    );
}; 