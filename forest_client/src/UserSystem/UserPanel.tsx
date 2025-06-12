import React, {useEffect} from 'react';
import {useAtomValue} from 'jotai'
import {Avatar, Box, Button, Card, CardContent, Stack, Typography} from '@mui/material';
import {v4 as uuidv4} from 'uuid';
import {httpUrl} from "../appState";
import {authTokenAtom, subscriptionAtom, userAtom} from "./authStates";
import {UserTreesList} from './UserTreesList';
import {useAtom} from "jotai/index";


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
                maxWidth: 800,
                width: '100vw',
                padding: "15px"
            }}
        >
            <Card>
                <CardContent>
                    <Stack spacing={0} alignItems="center">
                        <Avatar
                            sx={{width: 64, height: 64}}
                            alt="User Avatar"
                        />
                        <Typography variant="h6" component="div">
                            {user?.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {user?.email}
                        </Typography>
                    </Stack>
                </CardContent>
                <CardContent>
                    <Stack spacing={2} sx={{p: 2}}>
                        <Button variant="contained" onClick={handleCreateTree} size="small" sx={{mr: 2}}>
                            Create new tree
                        </Button>
                    </Stack>
                    <UserTreesList/>
                </CardContent>
            </Card>
        </Box>
    );
};