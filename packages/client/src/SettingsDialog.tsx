import React, {useEffect, useState} from "react";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import {treeId} from "./appState";
import {httpUrl} from "@forest/schema/src/config";
import {getUsername} from "@forest/user-system/src/userMetadata";
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import IconButton from '@mui/material/IconButton';
import {BugReport as BugReportIcon, Close as CloseIcon, ContentCopy as ContentCopyIcon} from '@mui/icons-material';
import {Alert, Avatar, Box, Button, Chip, Divider, Snackbar, Stack} from "@mui/material";
import {useAtom} from "jotai";
import {userAtom} from "@forest/user-system/src/authStates";

interface SettingsDialogProps {
    open: boolean;
    onClose: () => void;
}

const frontendUrl = `${window.location.protocol}//${location.hostname}:${window.location.port}`

const SettingsDialog: React.FC<SettingsDialogProps> = ({open, onClose}) => {
    const [showCopiedAlert, setShowCopiedAlert] = useState(false);

    const handleShare = async () => {
        const inviteUrl = `${frontendUrl}/tree-invite?treeId=${treeId}`;
        await navigator.clipboard.writeText(inviteUrl);
        setShowCopiedAlert(true);
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="xs"
            fullWidth
            sx={{
                '& .MuiDialog-paper': {
                    borderRadius: 2,
                    position: 'relative',
                    overflow: 'hidden'
                }
            }}
        >
            <IconButton
                onClick={onClose}
                sx={{
                    position: 'absolute',
                    top: 4,
                    right: 4,
                    zIndex: 1000,
                    backgroundColor: 'transparent',
                    backdropFilter: 'blur(4px)',
                }}
                size="large"
            >
                <CloseIcon/>
            </IconButton>
            <DialogTitle
                sx={{
                    pb: 2,
                    pt: 3,
                    px: 3,
                    fontSize: '1.5rem',
                    fontWeight: 600
                }}
            >
                Settings
            </DialogTitle>
            <DialogContent sx={{px: 3, pb: 3}}>
                <Stack spacing={2} sx={{mb: 3}}>
                    <Button
                        variant="contained"
                        startIcon={<ContentCopyIcon/>}
                        onClick={handleShare}
                        fullWidth
                        sx={{
                            py: 1.5,
                            textTransform: 'none',
                            fontSize: '1rem',
                            fontWeight: 500,
                            borderRadius: 2,
                            boxShadow: 'none',
                            '&:hover': {
                                boxShadow: 2
                            }
                        }}
                    >
                        Copy invite link
                    </Button>
                    <Button
                        variant="outlined"
                        startIcon={<BugReportIcon/>}
                        href={`${frontendUrl}/issues?treeId=${treeId}`}
                        component="a"
                        target="_blank"
                        fullWidth
                        sx={{
                            py: 1.5,
                            textTransform: 'none',
                            fontSize: '1rem',
                            fontWeight: 500,
                            borderRadius: 2,
                            borderWidth: 2,
                            '&:hover': {
                                borderWidth: 2
                            }
                        }}
                    >
                        Issue tracker
                    </Button>
                </Stack>
                <Divider sx={{mb: 2}}/>
                <TreeMembersList treeId={treeId}/>
            </DialogContent>
            <Snackbar
                open={showCopiedAlert}
                autoHideDuration={3000}
                onClose={() => setShowCopiedAlert(false)}
                anchorOrigin={{vertical: 'bottom', horizontal: 'center'}}
            >
                <Alert
                    onClose={() => setShowCopiedAlert(false)}
                    severity="success"
                    sx={{width: '100%'}}
                    icon={<ContentCopyIcon/>}
                >
                    Invite link copied to clipboard!
                </Alert>
            </Snackbar>
        </Dialog>
    );
};

export default SettingsDialog;

const API_BASE = httpUrl;

interface Permission {
    userId: string;
    permissionType: string;
}

interface MemberWithUsername extends Permission {
    username: string;
}

export function TreeMembersList({treeId}: { treeId: string }) {
    const [members, setMembers] = useState<MemberWithUsername[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentUser] = useAtom(userAtom);

    useEffect(() => {
        fetch(`${API_BASE}/api/tree-permission/tree/${treeId}`, {
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
            },
        })
            .then((res) => res.json())
            .then(async (data) => {
                const permissions = data.permissions || [];
                // Fetch usernames for all members
                const membersWithUsernames = await Promise.all(
                    permissions.map(async (member: Permission) => ({
                        ...member,
                        username: await getUsername(member.userId)
                    }))
                );

                // Add current user if not already in the list
                const currentUserId = currentUser?.id;
                if (currentUserId && !permissions.some((p: Permission) => p.userId === currentUserId)) {
                    const currentUserWithUsername = {
                        userId: currentUserId,
                        permissionType: 'member',
                        username: await getUsername(currentUserId)
                    };
                    membersWithUsernames.push(currentUserWithUsername);
                }

                setMembers(membersWithUsernames);
                setLoading(false);
            });
    }, [treeId]);

    if (loading) return <CircularProgress/>;

    return (
        <Box sx={{mt: 3}}>
            <Typography
                variant="subtitle1"
                sx={{
                    mb: 2,
                    fontWeight: 600,
                    fontSize: '1.1rem',
                    color: 'text.primary'
                }}
            >
                Members
            </Typography>
            <List sx={{pt: 0}}>
                {members.map((member) => (
                    <ListItem
                        key={member.userId}
                        sx={{
                            px: 1.5,
                            py: 1,
                            mx: -1.5,
                            borderRadius: 1,
                            transition: 'background-color 0.2s',
                            '&:hover': {
                                backgroundColor: 'action.hover'
                            }
                        }}
                    >
                        <Avatar
                            sx={{
                                width: 32,
                                height: 32,
                                mr: 2,
                                bgcolor: member.userId === currentUser?.id ? 'primary.main' : 'grey.400',
                                fontSize: '0.875rem'
                            }}
                        >
                            {member.username.charAt(0).toUpperCase()}
                        </Avatar>
                        <ListItemText
                            primary={member.username}
                            secondary={
                                <Box sx={{display: 'flex', alignItems: 'center', gap: 1, mt: 0.5}}>
                                    <Chip
                                        label={member.permissionType}
                                        size="small"
                                        variant={member.permissionType === 'owner' ? 'filled' : 'outlined'}
                                        color={member.permissionType === 'owner' ? 'primary' : 'default'}
                                        sx={{
                                            height: 20,
                                            fontSize: '0.75rem',
                                            fontWeight: member.permissionType === 'owner' ? 600 : 400
                                        }}
                                    />
                                    {member.userId === currentUser?.id && (
                                        <Chip
                                            label="You"
                                            size="small"
                                            color="primary"
                                            sx={{height: 20, fontSize: '0.75rem'}}
                                        />
                                    )}
                                </Box>
                            }
                        />
                    </ListItem>
                ))}
            </List>
        </Box>
    );
}