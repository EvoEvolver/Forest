import React, {useEffect, useState} from 'react';
import {useAtomValue} from 'jotai';
import {
    Alert,
    Box,
    CircularProgress,
    Chip
} from '@mui/material';
import {DataGrid, GridColDef, GridRenderCellParams} from '@mui/x-data-grid';
import {userAtom, authTokenAtom} from '@forest/user-system/src/authStates';
import {issueServiceAtom} from '@forest/issue-tracker/src/services/issueService';
import {Issue} from '@forest/issue-tracker/src/types/Issue';
import IssueDetail from '@forest/issue-tracker/src/components/IssueDetail/IssueDetail';
import TitleCell from '@forest/issue-tracker/src/components/IssueList/columns/TitleCell';
import AssigneesCell from '@forest/issue-tracker/src/components/IssueList/columns/AssigneesCell';
import DueDateCell from '@forest/issue-tracker/src/components/IssueList/columns/DueDateCell';
import PriorityCell from '@forest/issue-tracker/src/components/IssueList/columns/PriorityCell';
import DashboardCard from './DashboardCard';

const currentPort = (process.env.NODE_ENV || 'development') == 'development' ? "29999" : window.location.port;
const httpUrl = `${window.location.protocol}//${location.hostname}:${currentPort}`;

interface TreePermission {
    treeId: string;
    permissionType: string;
}

interface IssueWithTreeTitle extends Issue {
    treeTitle?: string;
}

export const MyAssignedIssues: React.FC = () => {
    const [allIssues, setAllIssues] = useState<IssueWithTreeTitle[]>([]);
    const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
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
            // Fetch issues and tree metadata in parallel
            const treeIds = trees.map(tree => tree.treeId);
            const [allIssuesArrays, treeMetadataMap] = await Promise.all([
                Promise.all(trees.map(tree => issueService.getIssuesByTree(tree.treeId))),
                fetchTreeMetadata(treeIds)
            ]);
            
            // Flatten and deduplicate issues by _id, adding tree titles
            const issuesMap = new Map<string, IssueWithTreeTitle>();
            allIssuesArrays.forEach(issuesArray => {
                issuesArray.forEach(issue => {
                    const issueWithTitle: IssueWithTreeTitle = {
                        ...issue,
                        treeTitle: treeMetadataMap[issue.treeId]?.title || 'Unknown Tree'
                    };
                    issuesMap.set(issue._id, issueWithTitle);
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

    // Fetch tree metadata for multiple trees using the new endpoint
    const fetchTreeMetadata = async (treeIds: string[]): Promise<{ [key: string]: { title: string } }> => {
        try {
            const response = await fetch(`${httpUrl}/api/trees/metadata`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ treeIds })
            });
            
            if (response.ok) {
                const data = await response.json();
                console.log("treeMetadata",data);
                return data;
            } else {
                console.error('Failed to fetch tree metadata');
                return {};
            }
        } catch (err) {
            console.error('Error fetching tree metadata:', err);
            return {};
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

    // Issue update handlers
    const handleIssueUpdate = async (issueId: string, updates: any) => {
        try {
            await issueService.updateIssue(issueId, updates);
            // Refresh issues after update
            await fetchUserPermittedTrees();
        } catch (error) {
            console.error('Failed to update issue:', error);
            throw error;
        }
    };

    const handleAddComment = async (issueId: string, comment: { userId: string; content: string }) => {
        try {
            await issueService.addComment(issueId, comment);
            // Refresh issues after adding comment
            await fetchUserPermittedTrees();
        } catch (error) {
            console.error('Failed to add comment:', error);
            throw error;
        }
    };

    // Custom wrapper around IssueList that sets the title
    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <DashboardCard 
                title="Remaining Issues Assigned To Me"
                sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}
            >
                <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <MultiTreeIssueListWrapper 
                        issues={allIssues} 
                        loading={loading} 
                        onIssueSelect={setSelectedIssue}
                    />
                </Box>
            </DashboardCard>
            
            {/* Issue Detail Dialog */}
            <IssueDetail
                issue={selectedIssue}
                open={!!selectedIssue}
                onClose={() => setSelectedIssue(null)}
                onUpdate={handleIssueUpdate}
                onAddComment={handleAddComment}
                onDelete={async (issueId: string) => {
                    await issueService.deleteIssue(issueId);
                    await fetchUserPermittedTrees(); // Refresh the list
                }}
                onRefreshIssue={async (issueId: string) => {
                    return await issueService.getIssueById(issueId);
                }}
                isCreatingNew={false}
            />
        </Box>
    );
};

// Multi-tree issue list wrapper using DataGrid to match existing IssueList design
const MultiTreeIssueListWrapper: React.FC<{
    issues: IssueWithTreeTitle[], 
    loading: boolean,
    onIssueSelect: (issue: Issue) => void
}> = ({issues, loading, onIssueSelect}) => {
    
    if (issues.length === 0 && !loading) {
        return (
            <Alert severity="info" sx={{m: 1}}>
                No issues assigned to you found across all your trees.
            </Alert>
        );
    }

    // Tree Title Cell component
    const TreeTitleCell: React.FC<{value: string}> = ({value}) => (
        <Chip 
            label={value || 'Unknown Tree'} 
            size="small"
            variant="outlined"
            sx={{ maxWidth: '100%' }}
        />
    );

    // Define columns similar to simple mode IssueList but with tree title
    const columns: GridColDef[] = [
        {
            field: 'title',
            headerName: 'Issue',
            minWidth: 200,
            flex: 2,
            renderCell: (params: GridRenderCellParams) => (
                <TitleCell value={params.value} row={params.row} onSelect={onIssueSelect}/>
            ),
        },
        {
            field: 'treeTitle',
            headerName: 'Tree',
            minWidth: 120,
            flex: 1,
            renderCell: (params: GridRenderCellParams) => (
                <TreeTitleCell value={params.value}/>
            ),
        },
        {
            field: 'priority',
            headerName: 'Priority',
            width: 100,
            minWidth: 100,
            renderCell: (params: GridRenderCellParams) => (
                <PriorityCell value={params.value}/>
            ),
        },
        {
            field: 'assignees',
            headerName: 'Assignees',
            minWidth: 120,
            flex: 1,
            renderCell: (params: GridRenderCellParams) => (
                <AssigneesCell value={params.value} treeId={params.row.treeId}/>
            ),
        },
        {
            field: 'dueDate',
            headerName: 'Due Date',
            width: 120,
            minWidth: 120,
            renderCell: (params: GridRenderCellParams) => (
                <DueDateCell value={params.value}/>
            ),
        }
    ];

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <DataGrid
                rows={issues}
                columns={columns}
                loading={loading}
                pageSizeOptions={[5, 10, 25]}
                initialState={{
                    pagination: { paginationModel: { pageSize: 5 } },
                }}
                getRowId={(row) => row._id}
                disableRowSelectionOnClick
                hideFooterSelectedRowCount
                sx={{
                    width: '100%',
                    flex: 1,
                    border: 'none',
                    '& .MuiDataGrid-columnHeaders': {
                        backgroundColor: '#f5f5f5',
                        minHeight: '35px !important',
                        maxHeight: '35px !important',
                    },
                    '& .MuiDataGrid-columnHeader': {
                        minHeight: '35px !important',
                        maxHeight: '35px !important',
                    },
                    '& .MuiDataGrid-cell': {
                        padding: '4px',
                        display: 'flex',
                    },
                }}
                rowHeight={35}
            />
        </Box>
    );
};