import React from 'react';
import {Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Typography} from '@mui/material';
import {DataGrid, GridColDef, GridRenderCellParams} from '@mui/x-data-grid';
import {NodeM, NodeVM} from '@forest/schema';
import {httpUrl} from '@forest/schema/src/config';
import {useAtomValue} from 'jotai';
import {treeAtom} from '../TreeState/TreeState';
import {contentEditableContext} from "@forest/schema/src/viewContext";
import {stageThisVersion} from "@forest/schema/src/stageService";

interface StageVersionDialogProps {
    open: boolean;
    onClose: () => void;
    node: NodeVM;
}

interface Snapshot {
    treeId: string;
    nodeId: string;
    authorId: string;
    tag: string | null;
    data: any;
    date: string;
}

export const StageVersionDialog = ({open, onClose, node}: StageVersionDialogProps) => {
    const [tagName, setTagName] = React.useState('');
    const [loading, setLoading] = React.useState(false);
    const [previewNodeVM, setPreviewNodeVM] = React.useState<NodeVM | null>(null);
    const [previewLoading, setPreviewLoading] = React.useState(false);
    const [snapshots, setSnapshots] = React.useState<Snapshot[]>([]);
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
            const response = await fetch(`${httpUrl}/api/nodeSnapshot?treeId=${node.treeVM.treeM.id()}&nodeId=${node.id}`);

            if (!response.ok) {
                throw new Error('Failed to fetch snapshots');
            }

            const data = await response.json();
            console.log('response', data);
            setSnapshots(data.snapshots || []);
        } catch (error) {
            console.error('Failed to fetch existing snapshots:', error);
            setSnapshots([]);
        } finally {
            setLoading(false);
        }
    };

    const handlePreview = async (snapshot: Snapshot) => {
        try {
            setPreviewLoading(true);
            setPreviewNodeVM(null);

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


    const handleSubmit = async () => {
        await stageThisVersion(node, tagName.trim()).then(fetchExistingSnapshots)
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
                    label="Description"
                    type="text"
                    fullWidth
                    variant="outlined"
                    value={tagName}
                    onChange={(e) => setTagName(e.target.value)}
                    placeholder="A description of this version"
                    onKeyUp={(e) => {
                        if (e.key === 'Enter') {
                            handleSubmit();
                        }
                    }}
                />

                {snapshots.length > 0 && (
                    <Box mt={2}>
                        <Typography variant="body2" color="textSecondary" gutterBottom>
                            Existing versions:
                        </Typography>
                        <div style={{height: 300, width: '100%'}}>
                            <DataGrid
                                rows={snapshots.map((s, i) => ({...s, id: i})) as Snapshot[]}
                                columns={[
                                    {
                                        field: 'tag',
                                        headerName: 'Description',
                                        flex: 1,
                                        valueGetter: (params: GridRenderCellParams<Snapshot>) => params || 'No description',
                                    },
                                    {
                                        field: 'date',
                                        headerName: 'Date',
                                        flex: 1,
                                        valueGetter: (params: GridRenderCellParams<Snapshot>) => new Date(params).toLocaleString(),
                                    },
                                    {
                                        field: 'preview',
                                        headerName: 'Preview',
                                        sortable: false,
                                        filterable: false,
                                        renderCell: (params: GridRenderCellParams<Snapshot>) => (
                                            <Button size="small" onClick={() => handlePreview(params.row)}>
                                                Preview
                                            </Button>
                                        ),
                                        width: 120
                                    }
                                ] as GridColDef<Snapshot>[]}
                                initialState={{
                                    pagination: {paginationModel: {pageSize: 5, page: 0}}
                                }}
                                pageSizeOptions={[5]}
                                disableRowSelectionOnClick
                            />
                        </div>
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
                    <Box mt={2} sx={{border: '1px solid #ddd', borderRadius: 1, p: 2}}>
                        <contentEditableContext.Provider value={false}>
                            {previewNodeVM.nodeTypeVM.render(previewNodeVM)}
                        </contentEditableContext.Provider>
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
                >
                    Stage Version
                </Button>
            </DialogActions>
        </Dialog>
    );
};

