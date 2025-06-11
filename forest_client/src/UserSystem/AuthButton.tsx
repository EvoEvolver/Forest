import React from 'react'
import {useAtomValue, useSetAtom} from 'jotai'
import {Avatar, Box, Button, Divider, Menu, MenuItem, Typography} from '@mui/material'
import AccountCircleIcon from '@mui/icons-material/AccountCircle'
import LogoutIcon from '@mui/icons-material/Logout'
import {
    authModalOpenAtom,
    authTokenAtom,
    isAuthenticatedAtom,
    supabaseClientAtom,
    userAtom,
    userPermissionsAtom
} from "./authStates";
import { v4 as uuidv4 } from 'uuid';
import {httpUrl} from "../appState";
import {Node} from "../TreeState/entities";

const AuthButton: React.FC = () => {
    const user = useAtomValue(userAtom)
    const isAuthenticated = useAtomValue(isAuthenticatedAtom)
    const authToken = useAtomValue(authTokenAtom)
    const setAuthModalOpen = useSetAtom(authModalOpenAtom)
    const setUser = useSetAtom(userAtom)
    const setAuthToken = useSetAtom(authTokenAtom)
    const setUserPermissions = useSetAtom(userPermissionsAtom)
    const supabaseClient = useAtomValue(supabaseClientAtom)

    const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null)
    const open = Boolean(anchorEl)

    const handleLoginClick = () => {
        setAuthModalOpen(true)
    }

    const handleUserMenuClick = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget)
    }

    const handleMenuClose = () => {
        setAnchorEl(null)
    }

    const handleLogout = async () => {
        try {
            await supabaseClient.auth.signOut()
            setUser(null)
            setAuthToken(null)
            setUserPermissions({
                canUseAI: false,
                canUploadFiles: false,
                maxFileSize: 0
            })
            handleMenuClose()
        } catch (error) {
            console.error('Error signing out:', error)
        }
    }

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


    if (!isAuthenticated) {
        return (
            <Button
                color="inherit"
                onClick={handleLoginClick}
                startIcon={<AccountCircleIcon sx={{color: 'white'}}/>}
                sx={{
                    color: 'white',
                    textTransform: 'none',
                    '&:hover': {
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    },
                }}
            >
                Sign In
            </Button>
        )
    }

    return (
        <>
            <Button
                color="inherit"
                onClick={handleUserMenuClick}
                sx={{
                    color: 'white',
                    textTransform: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    '&:hover': {
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    },
                }}
            >
                <Avatar sx={{width: 24, height: 24, bgcolor: 'rgba(255, 255, 255, 0.2)'}}>
                    {user?.email?.charAt(0).toUpperCase()}
                </Avatar>
                <Typography variant="body2" sx={{color: 'white'}}>
                    {user?.email?.split('@')[0]}
                </Typography>
            </Button>

            <Menu
                anchorEl={anchorEl}
                open={open}
                onClose={handleMenuClose}
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'right',
                }}
                transformOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                }}
            >
                <Box sx={{p: 2, minWidth: 200}}>
                    <Typography variant="body2" color="text.secondary">
                        Signed in as
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                        {user?.email}
                    </Typography>
                </Box>
                <Divider/>
                <MenuItem onClick={handleLogout}>
                    <LogoutIcon sx={{mr: 1}}/>
                    Sign out
                </MenuItem>
                <MenuItem onClick={handleCreateTree}>
                    {/*<LogoutIcon sx={{mr: 1}}/>*/}
                    create test tree1
                </MenuItem>
            </Menu>
        </>
    )
}

export default AuthButton 