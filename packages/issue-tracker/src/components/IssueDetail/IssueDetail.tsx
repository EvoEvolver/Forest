import React, {useState} from 'react';
import {Box, Dialog, DialogContent,} from '@mui/material';
import type {Issue, UpdateIssueRequest} from '../../types/Issue';
import type {User} from '../UserSelector';
import IssueDetailHeader from './IssueDetailHeader';
import IssueDetailContent from './IssueDetailContent';
import IssueDetailSidebar from './IssueDetailSidebar';

interface IssueDetailProps {
    issue: Issue | null;
    open: boolean;
    onClose: () => void;
    onUpdate: (issueId: string, updates: UpdateIssueRequest) => Promise<void>;
    onAddComment?: (issueId: string, comment: { userId: string; content: string }) => Promise<void>;
    onRefreshIssue?: (issueId: string) => Promise<Issue>;
}

const IssueDetail: React.FC<IssueDetailProps> = ({
                                                     issue,
                                                     open,
                                                     onClose,
                                                     onUpdate,
                                                     onAddComment,
                                                     onRefreshIssue,
                                                 }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState<UpdateIssueRequest>({});
    const [newComment, setNewComment] = useState('');
    const [loading, setLoading] = useState(false);
    const [currentIssue, setCurrentIssue] = useState<Issue | null>(issue);

    React.useEffect(() => {
        setCurrentIssue(issue);
    }, [issue]);

    React.useEffect(() => {
        if (currentIssue) {
            const assigneeUsers = currentIssue.assignees || [];
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
            });
        }
    }, [currentIssue]);

    if (!currentIssue) return null;

    const handleStartEdit = () => {
        setIsEditing(true);
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        const assigneeUsers = currentIssue.assignees || [];
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
        });
    };

    const handleSaveEdit = async () => {
        setLoading(true);
        try {
            await onUpdate(currentIssue.issueId, editData);
            setIsEditing(false);
            if (onRefreshIssue) {
                const refreshedIssue = await onRefreshIssue(currentIssue.issueId);
                setCurrentIssue(refreshedIssue);
            }
        } catch (error) {
            console.error('Failed to update issue:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleEditDataChange = (updates: Partial<UpdateIssueRequest>) => {
        setEditData({...editData, ...updates});
    };

    const handleAssigneesChange = async (users: User[]) => {
        console.log('handleAssigneesChange', users);
        const assigneeUpdates = users.map(u => ({
            userId: u.userId,
            username: u.username
        }));

        setEditData({
            ...editData,
            assignees: assigneeUpdates
        });

        // Directly save assignees changes to backend
        setLoading(true);
        try {
            await onUpdate(currentIssue.issueId, {assignees: assigneeUpdates});
            if (onRefreshIssue) {
                const refreshedIssue = await onRefreshIssue(currentIssue.issueId);
                setCurrentIssue(refreshedIssue);
            }
        } catch (error) {
            console.error('Failed to update assignees:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddComment = async () => {
        if (!newComment.trim() || !onAddComment) return;

        setLoading(true);
        try {
            await onAddComment(currentIssue.issueId, {
                userId: 'demo-user',
                content: newComment.trim(),
            });
            setNewComment('');
            if (onRefreshIssue) {
                const refreshedIssue = await onRefreshIssue(currentIssue.issueId);
                setCurrentIssue(refreshedIssue);
            }
        } catch (error) {
            console.error('Failed to add comment:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
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
                issueId={currentIssue.issueId}
                isEditing={isEditing}
                loading={loading}
                onStartEdit={handleStartEdit}
                onSaveEdit={handleSaveEdit}
                onCancelEdit={handleCancelEdit}
                onClose={onClose}
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
                        canAddComment={!!onAddComment}
                    />

                    <IssueDetailSidebar
                        issue={currentIssue}
                        isEditing={isEditing}
                        editData={editData}
                        loading={loading}
                        onEditDataChange={handleEditDataChange}
                        onAssigneesChange={handleAssigneesChange}
                    />
                </Box>
            </DialogContent>
        </Dialog>
    );
};

export default IssueDetail; 