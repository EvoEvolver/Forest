import React, {useEffect, useState} from 'react';
import {Box, Button} from '@mui/material';
import {UserTreesList} from './UserTreesList';
import {VisitedTreesList} from './VisitedTreesList';
import {useAtomValue} from 'jotai';
import {authTokenAtom, userAtom} from '@forest/user-system/src/authStates';
import {TreeCreationDialog} from './TreeCreationDialog';

type TreeTabId = 'my-trees' | 'recent-trees';

export const TreesSection = () => {
    const [activeTab, setActiveTab] = useState<TreeTabId>('my-trees');
    const [myTreesCount, setMyTreesCount] = useState(0);
    const [recentTreesCount, setRecentTreesCount] = useState(0);
    const [createTreeDialogOpen, setCreateTreeDialogOpen] = useState(false);

    const authToken = useAtomValue(authTokenAtom);
    const user = useAtomValue(userAtom);

    const currentPort = (process.env.NODE_ENV || 'development') == 'development' ? "29999" : window.location.port;
    const httpUrl = `${window.location.protocol}//${location.hostname}:${currentPort}`;

    // Fetch counts for both tabs
    useEffect(() => {
        const fetchCounts = async () => {
            if (!authToken || !user) return;

            try {
                // Fetch My Trees count
                const myTreesResponse = await fetch(`${httpUrl}/api/user/trees`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${authToken}`,
                        'Content-Type': 'application/json',
                    },
                });
                if (myTreesResponse.ok) {
                    const myTreesData = await myTreesResponse.json();
                    setMyTreesCount(myTreesData.trees?.length || 0);
                }

                // Fetch Recent Trees count
                const recentTreesResponse = await fetch(`${httpUrl}/api/user/visitedTrees`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${authToken}`,
                        'Content-Type': 'application/json',
                    },
                });
                if (recentTreesResponse.ok) {
                    const recentTreesData = await recentTreesResponse.json();
                    setRecentTreesCount(recentTreesData.trees?.length || 0);
                }
            } catch (error) {
                console.error('Error fetching tree counts:', error);
            }
        };

        fetchCounts();
    }, [authToken, user, httpUrl]);

    const TabButton = ({tabId, label, count}: { tabId: TreeTabId; label: string; count: number }) => {
        const isActive = activeTab === tabId;

        return (
            <Button
                onClick={() => setActiveTab(tabId)}
                sx={{
                    textTransform: 'none',
                    px: 2,
                    py: 1,
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    color: isActive ? 'text.primary' : 'text.secondary',
                    borderBottom: isActive ? '2px solid' : '2px solid transparent',
                    borderColor: isActive ? 'text.primary' : 'transparent',
                    borderRadius: 0,
                    '&:hover': {
                        color: 'text.primary',
                        backgroundColor: 'transparent'
                    }
                }}
            >
                {label} ({count})
            </Button>
        );
    };

    return (
        <Box sx={{height: '100%', display: 'flex', flexDirection: 'column'}}>
            {/* Sub-tabs and Add Tree button */}
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    mb: 2
                }}
            >
                <Box sx={{display: 'flex'}}>
                    <TabButton tabId="my-trees" label="My Trees" count={myTreesCount}/>
                    <TabButton tabId="recent-trees" label="Recent Trees" count={recentTreesCount}/>
                </Box>
            </Box>

            {/* Content */}
            <Box sx={{flex: 1, minHeight: 0}}>
                {activeTab === 'my-trees' && <UserTreesList/>}
                {activeTab === 'recent-trees' && <VisitedTreesList/>}
            </Box>

            <TreeCreationDialog
                open={createTreeDialogOpen}
                onClose={() => setCreateTreeDialogOpen(false)}
            />
        </Box>
    );
};