import React from 'react';
import {Avatar, Box, Button, Paper, Stack, TextField, Typography,} from '@mui/material';
import {Comment as CommentIcon, Person as PersonIcon,} from '@mui/icons-material';
import type {Issue} from '../../types/Issue';

interface CommentSectionProps {
    issue: Issue;
    newComment: string;
    loading: boolean;
    onNewCommentChange: (comment: string) => void;
    onAddComment: () => void;
    canAddComment?: boolean;
}

const CommentSection: React.FC<CommentSectionProps> = ({
                                                           issue,
                                                           newComment,
                                                           loading,
                                                           onNewCommentChange,
                                                           onAddComment,
                                                           canAddComment = false,
                                                       }) => {
    return (
        <Box sx={{mb: 3}}>
            <Typography variant="h6" sx={{mb: 2, display: 'flex', alignItems: 'center', gap: 1}}>
                <CommentIcon fontSize="small"/>
                Comments ({issue.comments?.length || 0})
            </Typography>

            {issue.comments && issue.comments.length > 0 ? (
                <Stack spacing={2} sx={{mb: 2}}>
                    {issue.comments.map((comment) => (
                        <Paper
                            key={comment.commentId}
                            variant="outlined"
                            sx={{p: 2}}
                        >
                            <Box sx={{display: 'flex', alignItems: 'center', gap: 1, mb: 1}}>
                                <Avatar sx={{width: 24, height: 24}}>
                                    <PersonIcon fontSize="small"/>
                                </Avatar>
                                <Typography variant="body2" sx={{fontWeight: 500}}>
                                    {comment.userId}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    {new Date(comment.createdAt).toLocaleString()}
                                </Typography>
                            </Box>
                            <Typography variant="body1" sx={{whiteSpace: 'pre-wrap'}}>
                                {comment.content}
                            </Typography>
                        </Paper>
                    ))}
                </Stack>
            ) : (
                <Typography variant="body2" color="text.secondary" sx={{mb: 2}}>
                    No comments yet.
                </Typography>
            )}

            {/* Add Comment */}
            {canAddComment && (
                <Paper variant="outlined" sx={{p: 2}}>
                    <TextField
                        fullWidth
                        multiline
                        rows={3}
                        placeholder="Add a comment..."
                        value={newComment}
                        onChange={(e) => onNewCommentChange(e.target.value)}
                        variant="outlined"
                        sx={{mb: 2}}
                    />
                    <Button
                        variant="contained"
                        onClick={onAddComment}
                        disabled={!newComment.trim() || loading}
                        size="small"
                    >
                        Add Comment
                    </Button>
                </Paper>
            )}
        </Box>
    );
};

export default CommentSection; 