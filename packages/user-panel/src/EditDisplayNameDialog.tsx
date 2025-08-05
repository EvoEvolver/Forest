// EditDisplayNameDialog.tsx
import React from 'react';
import {
    Alert,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    TextField,
} from '@mui/material';

interface EditDisplayNameDialogProps {
    open: boolean;
    onClose: () => void;
    displayName: string;
    onDisplayNameChange: (name: string) => void;
    onUpdate: () => void;
    isUpdating: boolean;
    updateError: string | null;
    updateSuccess: boolean;
}

export const EditDisplayNameDialog: React.FC<EditDisplayNameDialogProps> = ({
                                                                                open,
                                                                                onClose,
                                                                                displayName,
                                                                                onDisplayNameChange,
                                                                                onUpdate,
                                                                                isUpdating,
                                                                                updateError,
                                                                                updateSuccess
                                                                            }) => {
    return (
        <Dialog
            open={open}
    onClose={onClose}
    maxWidth="sm"
    fullWidth
    >
    <DialogTitle>Edit Display Name</DialogTitle>
    <DialogContent>
    <TextField
        autoFocus
    margin="dense"
    label="Display Name"
    type="text"
    fullWidth
    variant="outlined"
    value={displayName}
    onChange={(e) => onDisplayNameChange(e.target.value)}
    disabled={isUpdating}
    sx={{mt: 2}}
    />
    {updateError && (
        <Alert severity="error" sx={{mt: 2}}>
        {updateError}
        </Alert>
    )}
    {updateSuccess && (
        <Alert severity="success" sx={{mt: 2}}>
        Display name updated successfully! Refreshing...
        </Alert>
    )}
    </DialogContent>
    <DialogActions>
    <Button
        onClick={onClose}
    disabled={isUpdating}
        >
        Cancel
        </Button>
        <Button
    onClick={onUpdate}
    variant="contained"
    disabled={isUpdating || !displayName.trim()}
    startIcon={isUpdating ? <CircularProgress size={16}/> : null}
            >
            {isUpdating ? 'Updating...' : 'Update'}
            </Button>
            </DialogActions>
            </Dialog>
);
};