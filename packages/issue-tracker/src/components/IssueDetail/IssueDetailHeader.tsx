import React from 'react';
import {Box, Chip, DialogTitle, IconButton, Typography,} from '@mui/material';
import {Cancel as CancelIcon, Close as CloseIcon, Edit as EditIcon, Save as SaveIcon,} from '@mui/icons-material';

interface IssueDetailHeaderProps {
    issueId: string;
    isEditing: boolean;
    loading: boolean;
    onStartEdit: () => void;
    onSaveEdit: () => void;
    onCancelEdit: () => void;
    onClose: () => void;
}

const IssueDetailHeader: React.FC<IssueDetailHeaderProps> = ({
                                                                 issueId,
                                                                 isEditing,
                                                                 loading,
                                                                 onStartEdit,
                                                                 onSaveEdit,
                                                                 onCancelEdit,
                                                                 onClose,
                                                             }) => {
    return (
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
                    {isEditing ? 'Edit Issue' : 'Issue Details'}
                </Typography>
                <Chip
                    label={issueId}
                    size="small"
                    sx={{
                        bgcolor: '#e3f2fd',
                        color: '#1976d2',
                        fontFamily: 'monospace',
                    }}
                />
            </Box>
            <Box sx={{display: 'flex', gap: 1}}>
                {!isEditing ? (
                    <IconButton onClick={onStartEdit} size="small">
                        <EditIcon/>
                    </IconButton>
                ) : (
                    <>
                        <IconButton onClick={onSaveEdit} size="small" disabled={loading}>
                            <SaveIcon/>
                        </IconButton>
                        <IconButton onClick={onCancelEdit} size="small">
                            <CancelIcon/>
                        </IconButton>
                    </>
                )}
                <IconButton onClick={onClose} size="small">
                    <CloseIcon/>
                </IconButton>
            </Box>
        </DialogTitle>
    );
};

export default IssueDetailHeader; 