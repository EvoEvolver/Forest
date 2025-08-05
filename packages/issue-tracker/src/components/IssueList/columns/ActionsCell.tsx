import React, {useState} from 'react';
import {Button, Dialog, DialogActions, DialogContent, DialogContentText, IconButton, Tooltip} from '@mui/material';
import {Delete as DeleteIcon, Edit as EditIcon} from '@mui/icons-material';
import {useTheme} from '@mui/material/styles';
import {useAtomValue} from 'jotai';
import {userAtom} from '@forest/user-system/src/authStates';
import type {Issue} from '../../../types/Issue';

interface ActionsCellProps {
    row: Issue;
    onEdit: (issue: Issue) => void;
    onDelete: (issueId: string) => void;
}

const ActionsCell: React.FC<ActionsCellProps> = ({row, onEdit, onDelete}) => {
    const theme = useTheme();
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const currentUser = useAtomValue(userAtom);

    // Check if current user can delete this issue (only creator can delete)
    const canDelete = currentUser && row.creator.userId === currentUser.id;

    const handleDeleteClick = () => {
        setDeleteConfirmOpen(true);
    };

    const handleDeleteConfirm = () => {
        setDeleteConfirmOpen(false);
        onDelete(row._id);
    };

    const handleDeleteCancel = () => {
        setDeleteConfirmOpen(false);
    };

    return (
        <>
            <Tooltip title="Edit">
                <IconButton size="small" onClick={() => onEdit(row)} sx={{p: 0.5}}>
                    <EditIcon fontSize="small"/>
                </IconButton>
            </Tooltip>
            {canDelete && (
                <Tooltip title="Delete">
                    <IconButton
                        size="small"
                        onClick={handleDeleteClick}
                        sx={{
                            p: 0.5,
                            color: theme.palette.error.main,
                            '&:hover': {
                                bgcolor: theme.palette.error.light + '20',
                            }
                        }}
                    >
                        <DeleteIcon fontSize="small"/>
                    </IconButton>
                </Tooltip>
            )}

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

export default ActionsCell; 