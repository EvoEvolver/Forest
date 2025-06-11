import React from 'react';
import {useAtomValue, useSetAtom} from 'jotai'
import {Box, Card, CardContent,Tooltip, IconButton, Typography, Avatar, Stack, Button, Paper} from '@mui/material';
import { v4 as uuidv4 } from 'uuid';
import {httpUrl} from "../appState";
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import {
    authModalOpenAtom,
    authTokenAtom,
    isAuthenticatedAtom,
    supabaseClientAtom,
    userAtom,
    userPermissionsAtom
} from "./authStates";
import { UserTreesList } from './UserTreesList';
export const UserPanel =  ({}) => {
    const user = useAtomValue(userAtom)
    const authToken = useAtomValue(authTokenAtom)
    const handleCreateTree = async () => {
        try {
            const nodeId = uuidv4();  
            const treeData = {
                tree: {
                    selectedNode: null,
                    nodeDict: {
                        [nodeId]: { 
                            title: "root",
                            tabs: { content: "" },
                            children: [],
                            id: nodeId,
                            parent: null,
                            data: {},
                            tools: [{"Operations":"<PaperEditorSide1/>"}, {"AI assistant":"<PaperEditorSide2/>"}],
                            other_parents: []
                        }
                    }
                },
                root_id: nodeId
            };
            console.log("request body:", treeData)
            const response = await fetch(httpUrl + "/api/createTree", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${authToken}`,
                },
                body: JSON.stringify(treeData)
            });

            if (response.status === 401) {
                throw new Error("AUTHENTICATION_FAILED");
            }

            if (response.status === 403) {
                throw new Error("PERMISSION_DENIED");
            }

            if (!response.ok) {
                throw new Error(`HTTP_ERROR_${response.status}`);
            }

            const data = await response.json();
            if (data.error) {
                console.error("Error creating tree:", data.error);
                throw new Error(data.error);
            }

            // get returned tree_id and redirect to the tree
            const treeId = data.tree_id;
            if (treeId) {
                console.log(`Tree created successfully with ID: ${treeId}`);
                window.location.href = `${window.location.origin}/?id=${treeId}`;
            } else {
                throw new Error("No tree_id returned from server");
            }

        } catch (error) {
            console.error("Error creating tree:", error);
            throw error;
        }
    }
    return (
        <Paper
            sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
            }}
        >
            <Card sx={{ maxWidth: 345, m: 2 }}>
                <CardContent>
                    <Stack spacing={0} alignItems="center">
                        <Avatar
                            sx={{ width: 64, height: 64 }}
                            alt="User Avatar"
                        />
                        <Typography variant="h6" component="div">
                            {user?.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {user?.email}
                        </Typography>
                        <Stack direction="row" spacing={0.5} alignItems="center">
                        <Typography variant="caption" color="text.secondary">
                            {user?.id}
                        </Typography>
                        {user?.id && (
                            <Tooltip title="Copy ID">
                            <IconButton
                                size="small"
                                onClick={() => navigator.clipboard.writeText(user.id)}
                            >
                                <ContentCopyIcon fontSize="inherit" />
                            </IconButton>
                            </Tooltip>
                        )}
                        </Stack>
                    </Stack>

                </CardContent>
                <Button variant="contained" sx={{ mb: 2 }} onClick={handleCreateTree}>
                        Create new tree
                </Button>
                <UserTreesList />
            </Card>
        </Paper>
    );
};