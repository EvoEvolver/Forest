import React from 'react';
import {Box, Paper, TextField, Typography,} from '@mui/material';
import {Comment as CommentIcon,} from '@mui/icons-material';
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
                                                               }) => {
    return (
        <Box sx={{p: 3, overflow: 'auto', flex: 1}}>
            {/* Title */}
            <Box sx={{mb: 3}}>
                {isEditing ? (
                    <TextField
                        fullWidth
                        label="Title"
                        value={editData.title || ''}
                        onChange={(e) => onEditDataChange({title: e.target.value})}
                        variant="outlined"
                    />
                ) : (
                    <Typography variant="h5" sx={{fontWeight: 600, color: '#24292f', mb: 1}}>
                        {issue.title}
                    </Typography>
                )}
            </Box>

            {/* Description */}
            <Box sx={{mb: 3}}>
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
                            bgcolor: '#f8f9fa',
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
            <CommentSection
                issue={issue}
                newComment={newComment}
                loading={loading}
                onNewCommentChange={onNewCommentChange}
                onAddComment={onAddComment}
                canAddComment={canAddComment}
            />
        </Box>
    );
};

export default IssueDetailContent; 