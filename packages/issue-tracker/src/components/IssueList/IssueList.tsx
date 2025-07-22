import React, {useEffect, useState} from 'react';
import {Alert, Box, Snackbar,} from '@mui/material';
import type {CreateIssueRequest, Issue, UpdateIssueRequest} from '../../types/Issue';
import {issueServiceAtom} from '../../services/issueService';
import IssueDetail from '../IssueDetail/IssueDetail';
import IssueDataGrid from './IssueDataGrid';
import {useAtomValue} from "jotai";
import {userAtom} from '@forest/user-system/src/authStates';
import Slide from '@mui/material/Slide';

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
    const [filteredIssues, setFilteredIssues] = useState<Issue[]>([]);

    // Filter and sort states for large version
    const [assigneeFilter, setAssigneeFilter] = useState<string>('all'); // 'all', 'me', 'specific-user-id'
    const [creatorFilter, setCreatorFilter] = useState<string>('all'); // 'all', 'me', 'specific-user-id'
    const [sortBy, setSortBy] = useState<string>('smart'); // 'smart', 'deadline', 'created', 'updated'
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

    const issueService = useAtomValue(issueServiceAtom);
    const currentUser = useAtomValue(userAtom);

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
        reviewers: [],
        nodes: nodeId ? [{nodeId, nodeType: undefined}] : [],
        tags: [],
        comments: []
    });

    // Smart sorting function - prioritizes current user's assigned issues by deadline, closed issues last
    const smartSort = (issues: Issue[]): Issue[] => {
        if (!currentUser) return issues;

        const currentUserId = currentUser.id;

        return [...issues].sort((a, b) => {
            // First, sort by status - closed issues go to the end
            if (a.status === 'closed' && b.status !== 'closed') return 1;
            if (a.status !== 'closed' && b.status === 'closed') return -1;

            // For non-closed issues, check if they are assigned to current user
            const aAssignedToMe = a.assignees?.some(assignee => assignee.userId === currentUserId) || false;
            const bAssignedToMe = b.assignees?.some(assignee => assignee.userId === currentUserId) || false;

            // If one is assigned to me and the other isn't, prioritize the assigned one
            if (aAssignedToMe && !bAssignedToMe) return -1;
            if (!aAssignedToMe && bAssignedToMe) return 1;

            // If both are assigned to me or both are not, sort by deadline
            const aDeadline = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
            const bDeadline = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER;

            return aDeadline - bDeadline;
        });
    };

    // Generic sorting function
    const sortIssues = (issues: Issue[], sortBy: string, sortOrder: 'asc' | 'desc'): Issue[] => {
        const sorted = [...issues].sort((a, b) => {
            // Always put closed issues at the end regardless of sort type
            if (a.status === 'closed' && b.status !== 'closed') return 1;
            if (a.status !== 'closed' && b.status === 'closed') return -1;

            let aValue: any, bValue: any;

            switch (sortBy) {
                case 'smart':
                    return 0; // Will be handled by smartSort
                case 'deadline':
                    aValue = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
                    bValue = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
                    break;
                case 'created':
                    aValue = new Date(a.createdAt).getTime();
                    bValue = new Date(b.createdAt).getTime();
                    break;
                case 'updated':
                    aValue = new Date(a.updatedAt).getTime();
                    bValue = new Date(b.updatedAt).getTime();
                    break;
                default:
                    return 0;
            }

            if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });

        return sortBy === 'smart' ? smartSort(sorted) : sorted;
    };

    // Filter issues based on assignee and creator filters
    const filterIssues = (issues: Issue[]): Issue[] => {
        if (!currentUser) return issues;

        let filtered = issues;

        // Filter by assignee
        if (assigneeFilter === 'me') {
            filtered = filtered.filter(issue =>
                issue.assignees?.some(assignee => assignee.userId === currentUser.id)
            );
        } else if (assigneeFilter !== 'all') {
            filtered = filtered.filter(issue =>
                issue.assignees?.some(assignee => assignee.userId === assigneeFilter)
            );
        }

        // Filter by creator
        if (creatorFilter === 'me') {
            filtered = filtered.filter(issue => issue.creator.userId === currentUser.id);
        } else if (creatorFilter !== 'all') {
            filtered = filtered.filter(issue => issue.creator.userId === creatorFilter);
        }

        return filtered;
    };

    // Apply filters and sorting whenever issues or filter/sort options change
    useEffect(() => {
        let processed = issues;

        if (!simple) {
            // Apply filters for large version
            processed = filterIssues(processed);
        }

        // Apply sorting
        processed = sortIssues(processed, sortBy, sortOrder);

        setFilteredIssues(processed);
    }, [issues, assigneeFilter, creatorFilter, sortBy, sortOrder, currentUser, simple]);

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
        try {
            await issueService.deleteIssue(issueId);
            await loadIssues();
            setSuccessMessage('Issue deleted successfully');
        } catch (error) {
            console.error('Failed to delete issue:', error);
            setErrorMessage('Failed to delete issue');
        }
    };

    const handleCreateIssue = async (issueData: CreateIssueRequest) => {
        try {
            await issueService.createIssue(treeId, issueData);
            await loadIssues(); // Refresh the list
            setSuccessMessage('Issue created successfully');
        } catch (error) {
            console.error('Failed to create issue:', error);
            const rrorMessage = error instanceof Error ? error.message : 'Failed to create issue';
            setErrorMessage(errorMessage);
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
            const errorMessage = error instanceof Error ? error.message : 'Failed to update issue';
            setErrorMessage(errorMessage);
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
                reviewers: updates.reviewers || [],
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
            const errorMessage = error instanceof Error ? error.message : 'Failed to add comment';
            setErrorMessage(errorMessage);
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
                    issues={filteredIssues}
                    loading={loading}
                    simple={simple}
                    onIssueSelect={setSelectedIssue}
                    onIssueEdit={handleEditIssue}
                    onIssueDelete={handleDeleteIssue}
                    onCreateIssue={() => {
                        setIsCreatingNew(true);
                        setSelectedIssue(createEmptyIssue());
                    }}
                    // Filter and sort props for large version
                    assigneeFilter={assigneeFilter}
                    onAssigneeFilterChange={setAssigneeFilter}
                    creatorFilter={creatorFilter}
                    onCreatorFilterChange={setCreatorFilter}
                    sortBy={sortBy}
                    onSortByChange={setSortBy}
                    sortOrder={sortOrder}
                    onSortOrderChange={setSortOrder}
                    treeId={treeId}
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
                autoHideDuration={1500}
                onClose={() => setSuccessMessage('')}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                TransitionComponent={Slide}
            >
                <Alert onClose={() => setSuccessMessage('')} severity="success">
                    {successMessage}
                </Alert>
            </Snackbar>

            <Snackbar
                open={!!errorMessage}
                autoHideDuration={1500}
                onClose={() => setErrorMessage('')}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                TransitionComponent={Slide}
            >
                <Alert onClose={() => setErrorMessage('')} severity="error">
                    {errorMessage}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default IssueList;