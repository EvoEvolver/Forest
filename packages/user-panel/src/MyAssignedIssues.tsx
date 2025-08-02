import React, {useEffect, useState} from 'react';
import {useAtomValue} from 'jotai';
import {
    Alert,
    Box,
    CircularProgress,
    List,
    ListItem,
    ListItemText,
    Chip,
    Typography,
    Paper
} from '@mui/material';
import {userAtom, authTokenAtom} from '@forest/user-system/src/authStates';
import {IssueList} from '@forest/issue-tracker';
import {issueServiceAtom} from '@forest/issue-tracker/src/services/issueService';
import {Issue} from '@forest/issue-tracker/src/types/Issue';
import DashboardCard from './DashboardCard';

const currentPort = (process.env.NODE_ENV || 'development') == 'development' ? "29999" : window.location.port;
const httpUrl = `${window.location.protocol}//${location.hostname}:${currentPort}`;

interface TreePermission {
    treeId: string;
    permissionType: string;
}

export const MyAssignedIssues: React.FC = () => {
    const [permittedTrees, setPermittedTrees] = useState<TreePermission[]>([]);
    const [allIssues, setAllIssues] = useState<Issue[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const user = useAtomValue(userAtom);
    const authToken = useAtomValue(authTokenAtom);
    const issueService = useAtomValue(issueServiceAtom);

    // Get all trees that the user has permissions for
    const fetchUserPermittedTrees = async () => {
        if (!user || !authToken) {
            setError('Please log in to view assigned issues');
            setLoading(false);
            return;
        }
        try {   
            console.log(`${httpUrl}/api/tree-permission/user/${user.id}`);
            const response = await fetch(`${httpUrl}/api/tree-permission/user/${user.id}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                const data = await response.json();
                if (data.permissions && data.permissions.length > 0) {
                    setPermittedTrees(data.permissions);
                    await fetchIssuesFromAllTrees(data.permissions);
                } else {
                    setError('No trees available. Create or visit a tree to see assigned issues.');
                    setLoading(false);
                }
            } else {
                setError('Failed to load tree permissions');
                setLoading(false);
            }
        } catch (err) {
            console.error('Error fetching tree permissions:', err);
            setError('Failed to load tree permissions');
            setLoading(false);
        }
    };

    // Fetch issues from all permitted trees and filter for current user assignments
    const fetchIssuesFromAllTrees = async (trees: TreePermission[]) => {
        try {
            const issuePromises = trees.map(tree => 
                issueService.getIssuesByTree(tree.treeId)
            );
            
            const allIssuesArrays = await Promise.all(issuePromises);
            
            // Flatten and deduplicate issues by _id
            const issuesMap = new Map<string, Issue>();
            allIssuesArrays.forEach(issuesArray => {
                issuesArray.forEach(issue => {
                    issuesMap.set(issue._id, issue);
                });
            });
            
            const allIssues = Array.from(issuesMap.values());
            
            // Filter issues assigned to the current user and not resolved/closed
            const myAssignedIssues = allIssues.filter(issue => {
                const isAssignedToMe = issue.assignees?.some(assignee => assignee.userId === user?.id);
                const isNotResolved = issue.status !== 'resolved' && issue.status !== 'closed';
                return isAssignedToMe && isNotResolved;
            });
            
            setAllIssues(myAssignedIssues);
        } catch (err) {
            console.error('Error fetching issues from trees:', err);
            setError('Failed to load assigned issues');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUserPermittedTrees();
    }, [user, authToken]);

    if (loading) {
        return (
            <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <DashboardCard title="Remaining Issues Assigned To Me">
                    <Box display="flex" justifyContent="center" p={2}>
                        <CircularProgress size={20}/>
                    </Box>
                </DashboardCard>
            </Box>
        );
    }

    if (error) {
        return (
            <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <DashboardCard title="Remaining Issues Assigned To Me">
                    <Alert severity="info" sx={{m: 1}}>
                        {error}
                    </Alert>
                </DashboardCard>
            </Box>
        );
    }

    // Custom wrapper around IssueList that sets the title
    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <DashboardCard 
                title="Remaining Issues Assigned To Me"
                sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}
            >
                <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <MultiTreeIssueListWrapper issues={allIssues} loading={loading} />
                </Box>
            </DashboardCard>
        </Box>
    );
};

// Multi-tree issue list wrapper that displays issues from all permitted trees
const MultiTreeIssueListWrapper: React.FC<{issues: Issue[], loading: boolean}> = ({issues, loading}) => {
    if (loading) {
        return (
            <Box display="flex" justifyContent="center" p={2}>
                <CircularProgress size={20}/>
            </Box>
        );
    }

    if (issues.length === 0) {
        return (
            <Alert severity="info" sx={{m: 1}}>
                No issues assigned to you found across all your trees.
            </Alert>
        );
    }

    // Sort issues by priority and due date
    const sortedIssues = [...issues].sort((a, b) => {
        // Priority order: high -> medium -> low
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] || 0;
        const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] || 0;
        
        if (aPriority !== bPriority) {
            return bPriority - aPriority; // Higher priority first
        }
        
        // If same priority, sort by due date (earlier first)
        const aDate = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
        const bDate = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
        return aDate - bDate;
    });

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'high': return 'error';
            case 'medium': return 'warning';
            case 'low': return 'default';
            default: return 'default';
        }
    };

    const formatDueDate = (dueDate: string) => {
        const date = new Date(dueDate);
        const now = new Date();
        const diffTime = date.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays < 0) {
            return `Overdue by ${Math.abs(diffDays)} days`;
        } else if (diffDays === 0) {
            return 'Due today';
        } else if (diffDays === 1) {
            return 'Due tomorrow';
        } else {
            return `Due in ${diffDays} days`;
        }
    };
    
    return (
        <Box sx={{ height: '100%', overflow: 'auto' }}>
            <List dense>
                {sortedIssues.map((issue) => (
                    <ListItem key={issue._id} sx={{ mb: 1 }}>
                        <Paper 
                            elevation={1} 
                            sx={{ 
                                width: '100%', 
                                p: 2,
                                '&:hover': { 
                                    backgroundColor: 'grey.50' 
                                }
                            }}
                        >
                            <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                                <Box flex={1}>
                                    <Typography variant="subtitle2" component="div" sx={{ fontWeight: 'bold' }}>
                                        {issue.title}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                        Tree ID: {issue.treeId}
                                    </Typography>
                                    {issue.description && (
                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                            {issue.description.substring(0, 100)}
                                            {issue.description.length > 100 ? '...' : ''}
                                        </Typography>
                                    )}
                                </Box>
                                <Box display="flex" flexDirection="column" alignItems="flex-end" gap={1}>
                                    <Chip 
                                        label={issue.priority} 
                                        color={getPriorityColor(issue.priority) as any}
                                        size="small"
                                    />
                                    {issue.dueDate && (
                                        <Typography variant="caption" color="text.secondary">
                                            {formatDueDate(issue.dueDate)}
                                        </Typography>
                                    )}
                                </Box>
                            </Box>
                        </Paper>
                    </ListItem>
                ))}
            </List>
        </Box>
    );
};