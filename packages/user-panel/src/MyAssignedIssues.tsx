import React, {useEffect, useState} from 'react';
import {useAtomValue} from 'jotai';
import {
    Alert,
    Box,
    CircularProgress
} from '@mui/material';
import {userAtom, authTokenAtom} from '@forest/user-system/src/authStates';
import {IssueList} from '@forest/issue-tracker';
import DashboardCard from './DashboardCard';

const currentPort = (process.env.NODE_ENV || 'development') == 'development' ? "29999" : window.location.port;
const httpUrl = `${window.location.protocol}//${location.hostname}:${currentPort}`;

export const MyAssignedIssues: React.FC = () => {
    const [availableTreeId, setAvailableTreeId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const user = useAtomValue(userAtom);
    const authToken = useAtomValue(authTokenAtom);

    // Get the first available tree that the user has access to
    const fetchFirstAvailableTree = async () => {
        if (!user || !authToken) {
            setError('Please log in to view assigned issues');
            setLoading(false);
            return;
        }

        try {
            // Fetch both owned and visited trees to get any available tree
            const [ownedResponse, visitedResponse] = await Promise.all([
                fetch(`${httpUrl}/api/user/trees`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${authToken}`,
                        'Content-Type': 'application/json',
                    },
                }),
                fetch(`${httpUrl}/api/user/visitedTrees`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${authToken}`,
                        'Content-Type': 'application/json',
                    },
                })
            ]);

            let firstTreeId = null;

            if (ownedResponse.ok) {
                const ownedData = await ownedResponse.json();
                if (ownedData.trees && ownedData.trees.length > 0) {
                    firstTreeId = ownedData.trees[0].treeId;
                }
            }

            if (!firstTreeId && visitedResponse.ok) {
                const visitedData = await visitedResponse.json();
                if (visitedData.trees && visitedData.trees.length > 0) {
                    firstTreeId = visitedData.trees[0].treeId;
                }
            }

            if (firstTreeId) {
                setAvailableTreeId(firstTreeId);
            } else {
                setError('No trees available. Create or visit a tree to see assigned issues.');
            }
        } catch (err) {
            console.error('Error fetching available trees:', err);
            setError('Failed to load available trees');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFirstAvailableTree();
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

    if (error || !availableTreeId) {
        return (
            <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <DashboardCard title="Remaining Issues Assigned To Me">
                    <Alert severity="info" sx={{m: 1}}>
                        {error || 'No trees available'}
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
                    <IssueListWrapper treeId={availableTreeId} />
                </Box>
            </DashboardCard>
        </Box>
    );
};

// Simple wrapper component that uses IssueList with proper configuration
const IssueListWrapper: React.FC<{treeId: string}> = ({treeId}) => {
    return (
        <Box sx={{ height: '100%' }}>
            <IssueList 
                treeId={treeId}
                simple={true}  // Use simple mode 
                hideFilters={true}  // Hide the filter controls
                defaultAssigneeFilter="me"  // Default to show only assigned to me
                defaultShowResolved={false}  // Default to hide resolved/closed issues
            />
        </Box>
    );
};