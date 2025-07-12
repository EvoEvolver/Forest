import React, {useEffect, useState} from 'react';
import {Avatar, Box, Button, Paper, Stack, TextField, Typography,} from '@mui/material';
import {Comment as CommentIcon, Person as PersonIcon,} from '@mui/icons-material';
import type {Issue} from '../../types/Issue';
import {getUserMetadata} from "@forest/user-system/src/userMetadata";

interface CommentSectionProps {
    issue: Issue;
    newComment: string;
    loading: boolean;
    onNewCommentChange: (comment: string) => void;
    onAddComment: () => void;
    canAddComment?: boolean;
}

interface EnrichedComment {
    commentId: string;
    userId: string;
    content: string;
    createdAt: string;
    username: string;
    avatar?: string | null;
}

const CommentSection: React.FC<CommentSectionProps> = ({
                                                           issue,
                                                           newComment,
                                                           loading,
                                                           onNewCommentChange,
                                                           onAddComment,
                                                           canAddComment = false,
                                                       }) => {
    const [enrichedComments, setEnrichedComments] = useState<EnrichedComment[]>([]);
    const [loadingUserData, setLoadingUserData] = useState(false);

    // Fetch user metadata for all comments
    useEffect(() => {
        async function fetchCommentUserData() {
            if (!issue.comments || issue.comments.length === 0) {
                setEnrichedComments([]);
                return;
            }

            setLoadingUserData(true);
            try {
                const enrichedCommentsData = await Promise.all(
                    issue.comments.map(async (comment) => {
                        try {
                            const userMeta = await getUserMetadata(comment.userId);
                            return {
                                ...comment,
                                username: userMeta.username || comment.userId,
                                avatar: userMeta.avatar || null,
                            };
                        } catch (error) {
                            console.warn(`Failed to fetch user metadata for ${comment.userId}:`, error);
                            return {
                                ...comment,
                                username: comment.userId,
                                avatar: null,
                            };
                        }
                    })
                );
                setEnrichedComments(enrichedCommentsData);
            } catch (error) {
                console.error('Failed to fetch comment user data:', error);
                // Fallback to original comments without enrichment
                setEnrichedComments(
                    issue.comments.map(comment => ({
                        ...comment,
                        username: comment.userId,
                        avatar: null,
                    }))
                );
            } finally {
                setLoadingUserData(false);
            }
        }

        fetchCommentUserData();
    }, [issue.comments]);
    return (
        <Box sx={{mb: 3}}>
            <Typography variant="h6" sx={{mb: 2, display: 'flex', alignItems: 'center', gap: 1}}>
                <CommentIcon fontSize="small"/>
                Comments ({enrichedComments.length || 0})
            </Typography>

            {enrichedComments.length > 0 ? (
                <Stack spacing={2} sx={{mb: 2}}>
                    {enrichedComments.map((comment) => (
                        <Paper
                            key={comment.commentId}
                            variant="outlined"
                            sx={{p: 2}}
                        >
                            <Box sx={{display: 'flex', alignItems: 'center', gap: 1, mb: 1}}>
                                <Avatar 
                                    src={comment.avatar || undefined}
                                    sx={{width: 24, height: 24}}
                                >
                                    {comment.avatar ? null : <PersonIcon fontSize="small"/>}
                                </Avatar>
                                <Typography variant="body2" sx={{fontWeight: 500}}>
                                    {loadingUserData ? 'Loading...' : comment.username}
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
                    {loadingUserData ? 'Loading comments...' : 'No comments yet.'}
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