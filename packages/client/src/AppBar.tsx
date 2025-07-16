import {AppBar, Avatar, Button, Stack, Toolbar} from "@mui/material";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import ArticleIcon from "@mui/icons-material/Article";
import AuthButton from "@forest/user-system/src/AuthButton";
import React, {useState} from "react";
import {useAtomValue, useSetAtom} from "jotai";
import {supabaseClientAtom} from "@forest/user-system/src/authStates";
import {YjsConnectionStatusAtom, YjsProviderAtom} from "./TreeState/YjsConnection";
import {jumpToNodeAtom, scrollToNodeAtom} from "./TreeState/TreeState";
import Tooltip from "@mui/material/Tooltip";
import SchemaRoundedIcon from '@mui/icons-material/SchemaRounded';
import SettingsIcon from '@mui/icons-material/Settings';
import IconButton from '@mui/material/IconButton';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import SettingsDialog from "./SettingsDialog";

export const MyAppBar = ({setCurrentPage, currentPage}: { setCurrentPage: any, currentPage: string }) => {
    const connectionStatus = useAtomValue(YjsConnectionStatusAtom)
    const supabaseClient = useAtomValue(supabaseClientAtom)
    const [settingsOpen, setSettingsOpen] = useState(false);
    return <AppBar position="fixed" color={"transparent"} style={{borderBottom: '1px solid #c6c6c6'}} elevation={0}>
        <Toolbar variant="dense">
            <Stack direction="row" spacing={2} sx={{flexGrow: 1}}>
                <Button
                    onClick={() => setCurrentPage('tree')}
                    variant={currentPage === 'tree' ? 'outlined' : 'text'}
                >
                    <AccountTreeIcon/>
                </Button>
                <Button
                    onClick={() => setCurrentPage('linear')}
                    variant={currentPage === 'second' ? 'outlined' : 'text'}
                >
                    <ArticleIcon/>
                </Button>
                <Button
                    onClick={() => setCurrentPage('flow')}
                    variant={currentPage === 'second' ? 'outlined' : 'text'}
                >
                    <SchemaRoundedIcon/>
                </Button>
            </Stack>
            {/* Awareness status */}
            <AwarenessStatus/>
            {/* Connection status */}
            {connectionStatus !== 'connected' &&
                <span>
                {connectionStatus === 'connecting' ? 'Connecting...(version not saved)' : 'Disconnected'}
                </span>
            }
            {/* Auth button in the top right */}
            {supabaseClient && <AuthButton/>}
            <IconButton color="inherit" onClick={() => setSettingsOpen(true)}>
                <SettingsIcon/>
            </IconButton>
            <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
        </Toolbar>
    </AppBar>;
}

interface User {
    clientId: number;
    name: string;
    color: string;
}

const defaultUserColor = "#72a1cd"; // Default color for users without a specified color
const defaultUserName = "Anonymous"; // Default name for users without a specified name

const AwarenessStatus = () => {
    const provider = useAtomValue(YjsProviderAtom);
    const awareness = provider?.awareness;
    const [otherUsers, setOtherUsers] = useState<Array<User>>([]);
    const jumpToNode = useSetAtom(jumpToNodeAtom)
    const scrollToNode = useSetAtom(scrollToNodeAtom)
    React.useEffect(() => {
        if (!awareness) return;

        const handleChange = ({added, updated, removed}: { added: number[], updated: number[], removed: number[] }) => {
            const states = awareness.getStates();
            const currentClientId = awareness.clientID;

            setOtherUsers(prevUsers => {
                // Remove users that are in the removed array and the current user
                let newUsers = prevUsers.filter(user =>
                    !removed.includes(user.clientId) &&
                    user.clientId !== currentClientId
                );

                // Process added and updated users, excluding the current user
                const changedIds = [...added, ...updated];
                changedIds.forEach(clientId => {
                    // Skip if it's the current user
                    if (clientId === currentClientId) return;

                    const state = states.get(clientId);
                    if (state && state.user) {
                        const existingUserIndex = newUsers.findIndex(user => user.clientId === clientId);
                        if (existingUserIndex !== -1) {
                            // Update the existing user in place
                            newUsers[existingUserIndex].name = state.user.name || defaultUserName;
                        } else {
                            // Add new user only if they don't exist
                            newUsers.push({
                                clientId,
                                name: state.user.name || defaultUserName,
                                color: state.user.color || defaultUserColor
                            });
                        }
                    }
                });

                return newUsers;
            });
        };

        awareness.on('change', handleChange);

        // Initial state
        const states = awareness.getStates();
        const initialUsers: Array<{ clientId: number, name: string, color: string }> = [];
        states.forEach((state, clientId) => {
            if (state && state.user) {
                initialUsers.push({
                    clientId,
                    name: state.user.name || `Anonymous`,
                    color: state.user.color || defaultUserColor
                });
            }
        });
        setOtherUsers(initialUsers);

        // Cleanup
        return () => {
            awareness.off('change', handleChange);
        };
    }, [awareness]);

    if (!awareness) {
        return null;
    }

    const handleClickUser = (clientId) => {
        const userState = awareness.getStates().get(clientId)
        const selectedNodeId = userState?.selectedNodeId;
        if (!selectedNodeId) {
            return;
        }
        jumpToNode(selectedNodeId);
        setTimeout(() => {
            scrollToNode(selectedNodeId);
        }, 100)
    }
    const transparency = "80";
    return (
        <Stack direction="row" spacing={1} sx={{marginRight: "10px"}}>
            {otherUsers.map(user => (
                <Tooltip key={user.clientId} title={user.name} arrow>
                    <Avatar
                        sx={{width: 24, height: 24, bgcolor: user.color + transparency, cursor: "pointer"}}
                        onClick={() => handleClickUser(user.clientId)}
                    >
                        {user.name.at(0)}
                    </Avatar>
                </Tooltip>
            ))}
        </Stack>
    );
};