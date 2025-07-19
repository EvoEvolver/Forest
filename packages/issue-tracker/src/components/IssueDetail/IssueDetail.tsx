import React, {useState} from 'react';
import {Alert, Box, Dialog, DialogContent, Snackbar} from '@mui/material';
import type {Issue, UpdateIssueRequest} from '../../types/Issue';
import IssueDetailHeader from './IssueDetailHeader';
import IssueDetailContent from './IssueDetailContent';
import IssueDetailSidebar from './IssueDetailSidebar';
import {useAtomValue} from 'jotai';
import {userAtom} from '@forest/user-system/src/authStates';
import issueServiceAtom from '../../services/issueService';

interface IssueDetailProps {
    issue: Issue | null;
    open: boolean;
    onClose: () => void;
    onUpdate: (issueId: string, updates: UpdateIssueRequest) => Promise<void>;
    onAddComment?: (issueId: string, comment: { userId: string; content: string }) => Promise<void>;
    onRefreshIssue?: (issueId: string) => Promise<Issue>;
    onDelete?: (issueId: string) => Promise<void>; // New delete callback
    isCreatingNew?: boolean;
}

const IssueDetail: React.FC<IssueDetailProps> = ({
                                                     issue,
                                                     open,
                                                     onClose,
                                                     onUpdate,
                                                     onAddComment,
                                                     onRefreshIssue,
                                                     onDelete,
                                                     isCreatingNew = false,
                                                 }) => {
    const [isEditing, setIsEditing] = useState(isCreatingNew);
    const [editData, setEditData] = useState<UpdateIssueRequest>({});
    const [newComment, setNewComment] = useState('');
    const [loading, setLoading] = useState(false);
    const [currentIssue, setCurrentIssue] = useState<Issue | null>(issue);
    const [loginError, setLoginError] = useState('');

    const currentUser = useAtomValue(userAtom);
    const issueService = useAtomValue(issueServiceAtom);

    React.useEffect(() => {
        setCurrentIssue(issue);
    }, [issue]);

    React.useEffect(() => {
        setIsEditing(isCreatingNew);
    }, [isCreatingNew]);

    React.useEffect(() => {
        if (currentIssue) {
            const assigneeUsers = currentIssue.assignees || [];
            const reviewerUsers = currentIssue.reviewers || [];
            setEditData({
                title: currentIssue.title,
                description: currentIssue.description,
                status: currentIssue.status,
                priority: currentIssue.priority,
                dueDate: currentIssue.dueDate ? currentIssue.dueDate.substring(0, 16) : '',
                tags: currentIssue.tags || [],
                assignees: assigneeUsers.map(a => ({
                    userId: a.userId,
                    username: a.username
                })),
                reviewers: reviewerUsers.map(r => ({
                    userId: r.userId,
                    username: r.username
                })),
            });
        }
    }, [currentIssue]);

    if (!currentIssue && !isCreatingNew) return null;

    // Check if current user can delete this issue (only creator can delete)
    const canDelete = currentIssue && currentUser && currentIssue.creator.userId === currentUser.id;

    const handleStartEdit = () => {
        setIsEditing(true);
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        const assigneeUsers = currentIssue.assignees || [];
        const reviewerUsers = currentIssue.reviewers || [];
        setEditData({
            title: currentIssue.title,
            description: currentIssue.description,
            status: currentIssue.status,
            priority: currentIssue.priority,
            dueDate: currentIssue.dueDate ? currentIssue.dueDate.substring(0, 16) : '',
            tags: currentIssue.tags || [],
            assignees: assigneeUsers.map(a => ({
                userId: a.userId,
                username: a.username
            })),
            reviewers: reviewerUsers.map(r => ({
                userId: r.userId,
                username: r.username
            })),
        });
    };

    const handleSaveEdit = async () => {
        // Check if user is logged in
        if (!currentUser || !currentUser.id) {
            setLoginError('You must login to create/modify issues');
            return;
        }

        setLoading(true);
        try {
            if (isCreatingNew) {
                await onUpdate('', editData);
                // Close the dialog after successful creation
                onClose();
            } else if (currentIssue) {
                await onUpdate(currentIssue._id, editData);
                setIsEditing(false);
                if (onRefreshIssue) {
                    const refreshedIssue = await onRefreshIssue(currentIssue._id);
                    setCurrentIssue(refreshedIssue);
                }
            }
        } catch (error) {
            console.error('Failed to update issue:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!currentIssue) return;

        setLoading(true);
        try {
            if (onDelete) {
                // Use the callback provided by parent
                await onDelete(currentIssue._id);
            } else {
                // Use the issue service directly
                await issueService.deleteIssue(currentIssue._id);
            }
            onClose(); // Close the dialog after successful deletion
        } catch (error) {
            console.error('Failed to delete issue:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleEditDataChange = (updates: Partial<UpdateIssueRequest>) => {
        setEditData({...editData, ...updates});
    };

    const handleAddComment = async () => {
        if (!newComment.trim() || !onAddComment) return;

        // Check if user is logged in
        if (!currentUser || !currentUser.id) {
            setLoginError('You must login to add comments');
            return;
        }

        setLoading(true);
        try {
            await onAddComment(currentIssue._id, {
                userId: currentUser.id,
                content: newComment.trim(),
            });
            setNewComment('');
            if (onRefreshIssue) {
                const refreshedIssue = await onRefreshIssue(currentIssue._id);
                setCurrentIssue(refreshedIssue);
            }
        } catch (error) {
            console.error('Failed to add comment:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Dialog
                open={open}
                onClose={onClose}
                maxWidth={false}
                PaperProps={{
                    sx: {
                        borderRadius: 2,
                        boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                        height: '90vh',
                    }
                }}
            >
                <IssueDetailHeader
                    issueId={currentIssue?._id || ''}
                    isEditing={isEditing}
                    loading={loading}
                    onStartEdit={handleStartEdit}
                    onSaveEdit={handleSaveEdit}
                    onCancelEdit={handleCancelEdit}
                    onClose={onClose}
                    onDelete={handleDelete}
                    canDelete={canDelete}
                    isCreatingNew={isCreatingNew}
                />

                <DialogContent sx={{p: 0, overflow: 'auto'}}>
                    <Box sx={{display: 'flex', height: '100%'}}>
                        <IssueDetailContent
                            issue={currentIssue}
                            isEditing={isEditing}
                            editData={editData}
                            newComment={newComment}
                            loading={loading}
                            onEditDataChange={handleEditDataChange}
                            onNewCommentChange={setNewComment}
                            onAddComment={handleAddComment}
                            canAddComment={!!onAddComment && !isCreatingNew}
                            isCreatingNew={isCreatingNew}
                        />

                        <IssueDetailSidebar
                            issue={currentIssue}
                            isEditing={isEditing}
                            editData={editData}
                            loading={loading}
                            onEditDataChange={handleEditDataChange}
                            isCreatingNew={isCreatingNew}
                        />
                    </Box>
                </DialogContent>
            </Dialog>

            {/* Login Error Snackbar */}
            <Snackbar
                open={!!loginError}
                autoHideDuration={6000}
                onClose={() => setLoginError('')}
                anchorOrigin={{vertical: 'top', horizontal: 'center'}}
            >
                <Alert onClose={() => setLoginError('')} severity="warning" sx={{width: '100%'}}>
                    {loginError}
                </Alert>
            </Snackbar>
        </>
    );
};

export default IssueDetail; 