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
    Alert,
    TextField,
    FormControl,
    Snackbar
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

    const [copySuccess, setCopySuccess] = useState(false);

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

    const CopySuccessSnackbar = ({
        open,
        onClose,
      }: {
        open: boolean;
        onClose: () => void;
      }) => {
        return (
          <Snackbar open={open} autoHideDuration={1000} onClose={onClose}>
            <Alert severity="success">Copied</Alert>
          </Snackbar>
        );
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
    
    const handleDuplicateTree = async () => {
        if (!treeIdToDuplicate) {
            alert('Please enter a tree ID to duplicate');
            return;
        }
    
        try {
            const data = await handleApiResponse(
                await fetch(httpUrl + "/api/duplicateTree", {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${authToken}`,
                    },
                    body: JSON.stringify({ origin_tree_id: treeIdToDuplicate })
                }),
                "duplicate tree"
            );
    
            if (!data.new_tree_id) throw new Error("No new_tree_id returned from server");
            window.location.href = `${window.location.origin}/?id=${data.new_tree_id}`;
    
        } catch (error) {
            console.error("Error duplicating tree:", error);
            alert(`Failed to duplicate tree: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

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
                                        onClick={() => {
                                            navigator.clipboard.writeText(user.id)
                                            setCopySuccess(true)
                                        }}
                                    >
                                        <ContentCopyIcon fontSize="inherit" />
                                    </IconButton>
                                </Tooltip>
                            )}
                        </Stack>
                    </Stack>
                </CardContent>
                <Stack spacing={2} sx={{ p: 2 }}>
                    <Button variant="contained" onClick={handleCreateTree} size="small" sx={{ mr: 2}}>
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
                <UserTreesList copySuccess={copySuccess} onCopySuccess={setCopySuccess} />
            </Card>
            <Snackbar
                open={copySuccess}
                autoHideDuration={1000}
                sx={{ 
                    opacity: 0.9,
                }}
                onClose={() => setCopySuccess(false)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert 
                    severity="success" 
                    sx={{ 
                        bgcolor: 'primary.main',
                        color: 'white',
                        opacity: 0.9,
                        '& .MuiAlert-icon': {
                            color: 'white'
                        }
                    }}
                >
                    Copied
                </Alert>
            </Snackbar>
        </Box>
    );
};