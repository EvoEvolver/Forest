import React, {useState} from 'react';
import {
    Box,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    IconButton,
    Typography,
} from '@mui/material';
import {
    Cancel as CancelIcon,
    Check as CheckIcon,
    Close as CloseIcon,
    Delete as DeleteIcon,
    Edit as EditIcon,
    Save as SaveIcon,
} from '@mui/icons-material';

interface IssueDetailHeaderProps {
    issueId: string;
    isEditing: boolean;
    loading: boolean;
    onStartEdit: () => void;
    onSaveEdit: () => void;
    onCancelEdit: () => void;
    onClose: () => void;
    onDelete?: () => void;
    isCreatingNew?: boolean;
    canDelete?: boolean; // Whether current user can delete this issue
}

const IssueDetailHeader: React.FC<IssueDetailHeaderProps> = ({
                                                                 issueId,
                                                                 isEditing,
                                                                 loading,
                                                                 onStartEdit,
                                                                 onSaveEdit,
                                                                 onCancelEdit,
                                                                 onClose,
                                                                 onDelete,
                                                                 isCreatingNew = false,
                                                                 canDelete = false,
                                                             }) => {
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

    const handleDeleteClick = () => {
        setDeleteConfirmOpen(true);
    };

    const handleDeleteConfirm = () => {
        setDeleteConfirmOpen(false);
        onDelete?.();
    };

    const handleDeleteCancel = () => {
        setDeleteConfirmOpen(false);
    };

    return (
        <>
            <DialogTitle
                sx={{
                    bgcolor: '#f6f8fa',
                    borderBottom: '1px solid #d1d9e0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    p: 3,
                }}
            >
                <Box sx={{display: 'flex', alignItems: 'center', gap: 2}}>
                    <Typography variant="h6" sx={{fontWeight: 600, color: '#24292f'}}>
                        {isCreatingNew ? 'Create Issue' : (isEditing ? 'Edit Issue' : 'Issue Details')}
                    </Typography>
                    {!isCreatingNew && (
                        <Chip
                            label={issueId}
                            size="small"
                            sx={{
                                bgcolor: '#e3f2fd',
                                color: '#1976d2',
                                fontFamily: 'monospace',
                            }}
                        />
                    )}
                </Box>
                <Box sx={{display: 'flex', gap: 1}}>
                    {isCreatingNew ? (
                        // Create Issue mode: only show create and close buttons
                        <>
                            <IconButton onClick={onSaveEdit} size="small" disabled={loading}>
                                <CheckIcon/>
                            </IconButton>
                            <IconButton onClick={onClose} size="small">
                                <CloseIcon/>
                            </IconButton>
                        </>
                    ) : !isEditing ? (
                        // View mode: show edit, delete, and close buttons
                        <>
                            <IconButton onClick={onStartEdit} size="small">
                                <EditIcon/>
                            </IconButton>
                            {canDelete && (
                                <IconButton
                                    onClick={handleDeleteClick}
                                    size="small"
                                    sx={{
                                        color: '#d32f2f',
                                        '&:hover': {
                                            bgcolor: '#ffebee',
                                        }
                                    }}
                                >
                                    <DeleteIcon/>
                                </IconButton>
                            )}
                            <IconButton onClick={onClose} size="small">
                                <CloseIcon/>
                            </IconButton>
                        </>
                    ) : (
                        // Edit mode: show save, cancel, and close buttons
                        <>
                            <IconButton onClick={onSaveEdit} size="small" disabled={loading}>
                                <SaveIcon/>
                            </IconButton>
                            <IconButton onClick={onCancelEdit} size="small">
                                <CancelIcon/>
                            </IconButton>
                            <IconButton onClick={onClose} size="small">
                                <CloseIcon/>
                            </IconButton>
                        </>
                    )}
                </Box>
            </DialogTitle>

            {/* Delete Confirmation Dialog */}
            <Dialog
                open={deleteConfirmOpen}
                onClose={handleDeleteCancel}
                aria-labelledby="delete-dialog-title"
                aria-describedby="delete-dialog-description"
            >
                <DialogContent>
                    <DialogContentText id="delete-dialog-description">
                        Are you sure you want to delete this issue? This action cannot be undone.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleDeleteCancel} color="primary">
                        Cancel
                    </Button>
                    <Button
                        onClick={handleDeleteConfirm}
                        color="error"
                        variant="contained"
                        autoFocus
                    >
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default IssueDetailHeader; 