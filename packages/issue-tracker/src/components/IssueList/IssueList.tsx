import React, {useEffect, useState} from 'react';
import {Alert, Box, Button, Snackbar, Typography,} from '@mui/material';
import {Add as AddIcon,} from '@mui/icons-material';
import type {CreateIssueRequest, Issue, UpdateIssueRequest} from '../../types/Issue';
import issueService from '../../services/issueService';
import CreateIssueDialog from './CreateIssueDialog';
import IssueDetail from '../IssueDetail/IssueDetail';
import IssueDataGrid from './IssueDataGrid';
import {useAtomValue} from "jotai";
import {authTokenAtom, userAtom} from '@forest/user-system/src/authStates';

interface IssueListProps {
    treeId: string;
    nodeId?: string;
    simple?: boolean;
}

const IssueList: React.FC<IssueListProps> = ({treeId, nodeId, simple = false}) => {
    const [issues, setIssues] = useState<Issue[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const user = useAtomValue(userAtom)

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
            await issueService.createIssue(treeId, issueData, user);
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
        <Box sx={{height: 600, width: '100%'}}>
            <Box sx={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2}}>
                <Typography variant="h5" component="h2">
                    Issues for Tree: {treeId}
                </Typography>
                <Button
                    variant="contained"
                    startIcon={<AddIcon/>}
                    onClick={() => setCreateDialogOpen(true)}
                >
                    Create Issue
                </Button>
            </Box>

            <IssueDataGrid
                issues={issues}
                loading={loading}
                simple={simple}
                onIssueSelect={setSelectedIssue}
                onIssueEdit={handleEditIssue}
                onIssueDelete={handleDeleteIssue}
            />

            {/* Issue Detail Dialog */}
            <IssueDetail
                issue={selectedIssue}
                open={!!selectedIssue}
                onClose={() => setSelectedIssue(null)}
                onUpdate={handleUpdateIssue}
                onAddComment={handleAddComment}
                onRefreshIssue={async (issueId: string) => {
                    const issue = await issueService.getIssueById(issueId);
                    return issue;
                }}
            />

            {/* Create Issue Dialog */}
            <CreateIssueDialog
                open={createDialogOpen}
                onClose={() => setCreateDialogOpen(false)}
                onSubmit={handleCreateIssue}
                treeId={treeId}
                nodeId={nodeId}
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