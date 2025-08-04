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
import {useTheme} from '@mui/material/styles';
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
    const theme = useTheme();
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
                    bgcolor: theme.palette.background.paper,
                    borderBottom: `1px solid ${theme.palette.divider}`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    p: 3,
                }}
            >
                <Box sx={{display: 'flex', alignItems: 'center', gap: 2}}>
                    <Typography variant="h6" sx={{fontWeight: 600, color: theme.palette.text.primary}}>
                        {isCreatingNew ? 'Create Issue' : (isEditing ? 'Edit Issue' : 'Issue Details')}
                    </Typography>
                    {!isCreatingNew && (
                        <Chip
                            label={issueId}
                            size="small"
                            sx={{
                                bgcolor: theme.palette.primary.light + '20',
                                color: theme.palette.primary.main,
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
                                        color: theme.palette.error.main,
                                        '&:hover': {
                                            bgcolor: theme.palette.error.light + '20',
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