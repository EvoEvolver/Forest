import React, { useState } from 'react';
import {useAtomValue, useSetAtom} from 'jotai'
import {
    Box, 
    Card, 
    CardContent,
    Tooltip, 
    IconButton, 
    Typography, 
    Avatar, 
    Stack, 
    Button, 
    Paper,
    TextField,
    FormControl
} from '@mui/material';
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
const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const UserPanel = ({}) => {
    const user = useAtomValue(userAtom)
    const authToken = useAtomValue(authTokenAtom)
    const [treeIdToDuplicate, setTreeIdToDuplicate] = useState('');

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

    const handleDuplicateTree = async () => {
        if (!treeIdToDuplicate) {
            alert('Please enter a tree ID to duplicate');
            return;
        }

        try {
            const response = await fetch(httpUrl + "/api/duplicateTree", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${authToken}`,
                },
                body: JSON.stringify({
                    origin_tree_id: treeIdToDuplicate
                })
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
                console.error("Error duplicating tree:", data.error);
                throw new Error(data.error);
            }

            // get returned new_tree_id and redirect to the tree
            const newTreeId = data.new_tree_id;
            if (newTreeId) {
                console.log(`Tree duplicated successfully with new ID: ${newTreeId}`);
                window.location.href = `${window.location.origin}/?id=${newTreeId}`;
            } else {
                throw new Error("No new_tree_id returned from server");
            }

        } catch (error) {
            console.error("Error duplicating tree:", error);
            alert(`Failed to duplicate tree: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    return (
        <Box
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
                <Stack spacing={2} sx={{ p: 2 }}>
                    <Button variant="contained" onClick={handleCreateTree}>
                        Create new tree
                    </Button>
                    <FormControl>
                        <Stack direction="row" spacing={1}>
                            <TextField
                                size="small"
                                placeholder="Enter tree ID to duplicate"
                                value={treeIdToDuplicate}
                                onChange={(e) => setTreeIdToDuplicate(e.target.value)}
                                sx={{ flexGrow: 1 }}
                            />
                            <Button 
                                variant="contained" 
                                onClick={handleDuplicateTree}
                                disabled={!UUID_V4_REGEX.test(treeIdToDuplicate)}
                            >
                                Duplicate
                            </Button>
                        </Stack>
                    </FormControl>
                </Stack>
                <UserTreesList />
            </Card>
        </Box>
    );
};