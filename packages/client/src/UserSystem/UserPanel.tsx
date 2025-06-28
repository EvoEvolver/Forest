import React, {useEffect} from 'react';
import {useAtomValue} from 'jotai'
import {Avatar, Box, Button, Card, CardContent, Grid2 as Grid, Stack, Typography} from '@mui/material';
import {v4 as uuidv4} from 'uuid';
import {httpUrl} from "../appState";
import {authTokenAtom, subscriptionAtom, userAtom} from "./authStates";
import {UserTreesList} from './UserTreesList';
import {useAtom} from "jotai/index";
import {VisitedTreesList} from './VisitedTreesList';
import DashboardCard from './DashboardCard';

export const UserPanel = ({}) => {
    const [, setSubscription] = useAtom(subscriptionAtom);
    const user = useAtomValue(userAtom)
    const authToken = useAtomValue(authTokenAtom)

    useEffect(() => {
        setSubscription()
    }, []);

    const handleApiResponse = async (response: Response, errorContext: string) => {
        if (!response.ok) {
            const status = response.status;
            if (status === 401) throw new Error("AUTHENTICATION_FAILED");
            if (status === 403) throw new Error("PERMISSION_DENIED");
            throw new Error(`HTTP_ERROR_${status}`);
        }

        const data = await response.json();
        if (data.error) throw new Error(data.error);
        return data;
    };

    const handleCreateTree = async () => {
        try {
            const nodeId = uuidv4();
            const treeData = {
                tree: {
                    selectedNode: null,
                    nodeDict: {
                        [nodeId]: {
                            title: "root",
                            tabs: {content: "<PaperEditorMain/>"},
                            children: [],
                            id: nodeId,
                            parent: null,
                            data: {},
                            tools: [{"Operations": "<PaperEditorSide1/>"}, {"AI assistant": "<PaperEditorSide2/>"}],
                            other_parents: []
                        }
                    }
                },
                root_id: nodeId
            };

            const data = await handleApiResponse(
                await fetch(httpUrl + "/api/createTree", {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${authToken}`,
                    },
                    body: JSON.stringify(treeData)
                }),
                "create tree"
            );

            if (!data.tree_id) throw new Error("No tree_id returned from server");
            window.location.href = `${window.location.origin}/?id=${data.tree_id}`;

        } catch (error) {
            console.error("Error creating tree:", error);
            throw error;
        }
    };

    return (
        <Box
            sx={{
                margin: 'auto',
                maxWidth: 1200,
                width: '100vw',
                padding: "20px"
            }}
        >
            <Grid container spacing={3}>
                {/* User Profile Section */}
                <Grid
                    size={{
                        xs: 12,
                        lg: 4
                    }}
                >
                    <DashboardCard title="Profile">
                        <Box sx={{ textAlign: 'center', py: 2 }}>
                            <Avatar
                                sx={{ width: 80, height: 80, margin: '0 auto 16px' }}
                                alt="User Avatar"
                            />
                            <Typography variant="h5" component="div" gutterBottom>
                                {user?.name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                                {user?.email}
                            </Typography>
                            <Button 
                                variant="contained" 
                                onClick={handleCreateTree} 
                                size="large"
                                sx={{ mt: 2, minWidth: 200 }}
                            >
                                Create New Tree
                            </Button>
                        </Box>
                    </DashboardCard>
                </Grid>

                {/* Quick Actions Section */}
                <Grid
                    size={{
                        xs: 12,
                        lg: 8
                    }}
                >
                    <Grid container spacing={3}>
                        <Grid size={12}>
                            <VisitedTreesList/>
                        </Grid>
                    </Grid>
                </Grid>

                {/* Main Trees List */}
                <Grid
                    size={{
                        xs: 12
                    }}
                >
                    <UserTreesList/>
                </Grid>
            </Grid>
        </Box>
    );
};