import {Avatar, Button, Paper, Stack, ToggleButton, ToggleButtonGroup, useMediaQuery} from "@mui/material";
import {useTheme} from '@mui/system';
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import ArticleIcon from "@mui/icons-material/Article";
import React, {useState} from "react";
import {useAtomValue, useSetAtom} from "jotai";
import {YjsConnectionStatusAtom, YjsProviderAtom} from "./TreeState/YjsConnection";
import {jumpToNodeAtom, scrollToNodeAtom} from "./TreeState/TreeState";
import Tooltip from "@mui/material/Tooltip";
import AuthButton from "@forest/user-system/src/AuthButton";
import {supabaseClientAtom} from "@forest/user-system/src/authStates";
import SettingsIcon from "@mui/icons-material/Settings";
import SettingsDialog from "./SettingsDialog";
import EditDocumentIcon from '@mui/icons-material/EditDocument';
// Left side component - navigation buttons
export const AppBarLeft = ({setCurrentPage, currentPage}) => {
    const theme = useTheme();
    const isNarrow = useMediaQuery(theme.breakpoints.down('md'));

    const handlePageChange = (event: React.MouseEvent<HTMLElement>, newPage: string | null) => {
        if (newPage !== null) {
            setCurrentPage(newPage);
        }
    };

    return (
        <Paper elevation={1} sx={{p: 1, borderRadius: 2, margin: '8px 10px', width: "20vw"}}>
            <ToggleButtonGroup
                value={currentPage}
                exclusive
                onChange={handlePageChange}
                aria-label="page selection"
                size="small"
                sx={{
                    '& .MuiToggleButton-root': {
                        border: 'none',
                        borderRadius: 12,
                        px: 2,
                        py: 1,
                        gap: 1,
                        fontSize: '0.875rem',
                        fontWeight: 500,
                        textTransform: 'none',
                        color: theme.palette.text.secondary,
                        '&.Mui-selected': {
                            backgroundColor: theme.palette.primary.main,
                            color: theme.palette.primary.contrastText,
                            '&:hover': {
                                backgroundColor: theme.palette.primary.dark,
                            }
                        },
                        '&:hover': {
                            backgroundColor: theme.palette.action.hover,
                        }
                    }
                }}
            >
                <ToggleButton value="tree" aria-label="tree view">
                    <EditDocumentIcon fontSize="small"/>
                    {!isNarrow && "Tree"}
                </ToggleButton>
                <ToggleButton value="linear" aria-label="linear view">
                    <ArticleIcon fontSize="small"/>
                    {!isNarrow && "Linear"}
                </ToggleButton>
                <ToggleButton value="flow" aria-label="flow view">
                    <AccountTreeIcon fontSize="small"/>
                    {!isNarrow && "Flow"}
                </ToggleButton>
            </ToggleButtonGroup>
        </Paper>
    );
};

// Right side component - status and auth
export const AppBarRight = () => {
    const theme = useTheme();
    const isNarrow = useMediaQuery(theme.breakpoints.down('md'));
    const connectionStatus = useAtomValue(YjsConnectionStatusAtom);
    const supabaseClient = useAtomValue(supabaseClientAtom);
    const [settingsOpen, setSettingsOpen] = useState(false);

    const handleOpenSettings = () => setSettingsOpen(true);
    const handleCloseSettings = () => setSettingsOpen(false);

    return (
        <Stack
            direction="row"
            spacing={0}
            alignItems="center"
            sx={{
                backgroundColor: '#ffffff',
                boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
                borderRadius: '10px',
                padding: '8px 8px',
                minHeight: '48px',
                alignItems: 'center',
                margin: '8px 20px'
            }}
        >
            <AwarenessStatus/>
            {connectionStatus !== 'connected' && !isNarrow &&
                <span>
                    {connectionStatus === 'connecting' ? 'Connecting...(version not saved)' : 'Disconnected'}
                </span>
            }
            {supabaseClient && <AuthButton/>}
            <Button onClick={handleOpenSettings} sx={{minWidth: 0, padding: 0, marginLeft: 1}}>
                <SettingsIcon/>
            </Button>
            <SettingsDialog open={settingsOpen} onClose={handleCloseSettings}/>
        </Stack>
    );
};

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
    const transparency = "FF"; // Full opacity
    return (
        <Stack direction="row" spacing={1}>
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