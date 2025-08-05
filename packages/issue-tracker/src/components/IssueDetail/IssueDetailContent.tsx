import React from 'react';
import {Box, Paper, TextField, Typography,} from '@mui/material';
import {Comment as CommentIcon,} from '@mui/icons-material';
import {useTheme} from '@mui/material/styles';
import type {Issue, UpdateIssueRequest} from '../../types/Issue';
import CommentSection from './CommentSection';

interface IssueDetailContentProps {
    issue: Issue;
    isEditing: boolean;
    editData: UpdateIssueRequest;
    newComment: string;
    loading: boolean;
    onEditDataChange: (updates: Partial<UpdateIssueRequest>) => void;
    onNewCommentChange: (comment: string) => void;
    onAddComment: () => void;
    canAddComment?: boolean;
    isCreatingNew?: boolean; // Add this prop to know if we're creating a new issue
}

const IssueDetailContent: React.FC<IssueDetailContentProps> = ({
                                                                   issue,
                                                                   isEditing,
                                                                   editData,
                                                                   newComment,
                                                                   loading,
                                                                   onEditDataChange,
                                                                   onNewCommentChange,
                                                                   onAddComment,
                                                                   canAddComment = false,
                                                                   isCreatingNew = false,
                                                               }) => {
    const theme = useTheme();
    return (
        <Paper sx={{p: 0, overflow: 'auto', flex: 1}}>
            {/* Title */}
            <Box sx={{mb: 3, px: 3, pt: 3}}>
                {isEditing ? (
                    <TextField
                        fullWidth
                        label="Title"
                        value={editData.title || ''}
                        onChange={(e) => onEditDataChange({title: e.target.value})}
                        variant="outlined"
                    />
                ) : (
                    <Typography variant="h5" sx={{fontWeight: 600, color: theme.palette.text.primary, mb: 1}}>
                        {issue.title}
                    </Typography>
                )}
            </Box>

            {/* Description */}
            <Box sx={{mb: 3, px: 3}}>
                <Typography variant="h6" sx={{mb: 2, display: 'flex', alignItems: 'center', gap: 1}}>
                    <CommentIcon fontSize="small"/>
                    Description
                </Typography>
                {isEditing ? (
                    <TextField
                        fullWidth
                        multiline
                        rows={8}
                        label="Description"
                        value={editData.description || ''}
                        onChange={(e) => onEditDataChange({description: e.target.value})}
                        variant="outlined"
                    />
                ) : (
                    <Paper
                        variant="outlined"
                        sx={{
                            p: 2,
                            bgcolor: theme.palette.background.default,
                            minHeight: 100,
                        }}
                    >
                        <Typography variant="body1" sx={{whiteSpace: 'pre-wrap'}}>
                            {issue.description || 'No description provided.'}
                        </Typography>
                    </Paper>
                )}
            </Box>

            {/* Comments Section */}
            {!isCreatingNew && (
                <Box sx={{px: 3, pb: 3}}>
                    <CommentSection
                        issue={issue}
                        newComment={newComment}
                        loading={loading}
                        onNewCommentChange={onNewCommentChange}
                        onAddComment={onAddComment}
                        canAddComment={canAddComment}
                    />
                </Box>
            )}
        </Paper>
    );
};

export default IssueDetailContent; 