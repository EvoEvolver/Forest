import React, {useEffect, useState} from 'react';
import {Alert, Box, Button, Snackbar,} from '@mui/material';
import {Add as AddIcon,} from '@mui/icons-material';
import type {CreateIssueRequest, Issue, UpdateIssueRequest} from '../../types/Issue';
import {issueServiceAtom} from '../../services/issueService';
import IssueDetail from '../IssueDetail/IssueDetail';
import IssueDataGrid from './IssueDataGrid';
import {useAtomValue} from "jotai";

interface IssueListProps {
    treeId: string;
    nodeId?: string;
    simple?: boolean;
}

const IssueList: React.FC<IssueListProps> = ({treeId, nodeId, simple = false}) => {
    const [issues, setIssues] = useState<Issue[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
    const [isCreatingNew, setIsCreatingNew] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const issueService = useAtomValue(issueServiceAtom)

    const createEmptyIssue = (): Issue => ({
        _id: '',
        treeId,
        title: '',
        description: '',
        status: 'open',
        priority: 'medium',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        creator: {userId: '', username: ''},
        assignees: [],
        nodes: nodeId ? [{nodeId, nodeType: undefined}] : [],
        tags: [],
        comments: []
    });

    // Fetch issues on component mount
    useEffect(() => {
        loadIssues();
    }, [treeId, nodeId]);

    const loadIssues = async () => {
        try {
            setLoading(true);
            const params = {
                ...(nodeId && {nodeId}),
            };
            const issuesData = await issueService.getIssuesByTree(treeId, params);
            setIssues(issuesData);
        } catch (error) {
            console.error('Failed to load issues:', error);
            setErrorMessage('Failed to load issues');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteIssue = async (issueId: string) => {
        if (window.confirm('Are you sure you want to delete this issue?')) {
            try {
                await issueService.deleteIssue(issueId);
                await loadIssues();
                setSuccessMessage('Issue deleted successfully');
            } catch (error) {
                console.error('Failed to delete issue:', error);
                setErrorMessage('Failed to delete issue');
            }
        }
    };

    const handleCreateIssue = async (issueData: CreateIssueRequest) => {
        try {
            await issueService.createIssue(treeId, issueData);
            await loadIssues(); // Refresh the list
            setSuccessMessage('Issue created successfully');
        } catch (error) {
            console.error('Failed to create issue:', error);
            setErrorMessage('Failed to create issue');
            throw error; // Re-throw to let the dialog handle it
        }
    };

    const handleUpdateIssue = async (issueId: string, updates: UpdateIssueRequest) => {
        try {
            await issueService.updateIssue(issueId, updates);
            await loadIssues(); // Refresh the list
            setSuccessMessage('Issue updated successfully');
        } catch (error) {
            console.error('Failed to update issue:', error);
            setErrorMessage('Failed to update issue');
            throw error;
        }
    };

    const handleIssueUpdate = async (issueId: string, updates: UpdateIssueRequest) => {
        if (isCreatingNew) {
            // When creating new, we need to create the issue first
            const createData: CreateIssueRequest = {
                title: updates.title || '',
                description: updates.description || '',
                priority: updates.priority || 'medium',
                dueDate: updates.dueDate,
                tags: updates.tags || [],
                assignees: updates.assignees || [],
                nodes: updates.nodes || (nodeId ? [{nodeId, nodeType: undefined}] : [])
            };
            await handleCreateIssue(createData);
            setIsCreatingNew(false);
        } else {
            // When updating existing issue
            await handleUpdateIssue(issueId, updates);
        }
    };

    const handleAddComment = async (issueId: string, comment: { userId: string; content: string }) => {
        try {
            await issueService.addComment(issueId, comment);
            await loadIssues(); // Refresh the list
            setSuccessMessage('Comment added successfully');
        } catch (error) {
            console.error('Failed to add comment:', error);
            setErrorMessage('Failed to add comment');
            throw error;
        }
    };

    const handleEditIssue = (issue: Issue) => {
        setSelectedIssue(issue);
    };

    return (
        <Box sx={{
            height: '100%', 
            width: '100%', 
            flexGrow: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            minHeight: 0 // Important for flex containers
        }}>
            {/* DataGrid with fixed height to prevent size changes */}
            <Box sx={{ 
                flex: 1, 
                display: 'flex', 
                flexDirection: 'column',
                overflow: 'hidden',
                minHeight: 0 // Important for nested flex containers
            }}>
                <IssueDataGrid
                    issues={issues}
                    loading={loading}
                    simple={simple}
                    onIssueSelect={setSelectedIssue}
                    onIssueEdit={handleEditIssue}
                    onIssueDelete={handleDeleteIssue}
                    onCreateIssue={() => {
                        setIsCreatingNew(true);
                        setSelectedIssue(createEmptyIssue());
                    }}
                />
            </Box>
            {/* Issue Detail Dialog */}
            <IssueDetail
                issue={selectedIssue}
                open={!!selectedIssue}
                onClose={() => {
                    setSelectedIssue(null);
                    setIsCreatingNew(false);
                }}
                onUpdate={handleIssueUpdate}
                onAddComment={handleAddComment}
                onDelete={async (issueId: string) => {
                    await issueService.deleteIssue(issueId);
                    await loadIssues(); // Refresh the list
                    setSuccessMessage('Issue deleted successfully');
                }}
                onRefreshIssue={async (issueId: string) => {
                    const issue = await issueService.getIssueById(issueId);
                    return issue;
                }}
                isCreatingNew={isCreatingNew}
            />

            {/* Success/Error Snackbars */}
            <Snackbar
                open={!!successMessage}
                autoHideDuration={6000}
                onClose={() => setSuccessMessage('')}
            >
                <Alert onClose={() => setSuccessMessage('')} severity="success">
                    {successMessage}
                </Alert>
            </Snackbar>

            <Snackbar
                open={!!errorMessage}
                autoHideDuration={6000}
                onClose={() => setErrorMessage('')}
            >
                <Alert onClose={() => setErrorMessage('')} severity="error">
                    {errorMessage}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default IssueList;