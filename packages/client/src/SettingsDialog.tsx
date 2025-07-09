import React, {useEffect, useState} from "react";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import {httpUrl, treeId} from "./appState";
import {getUsername} from "@forest/user-system/src/userMetadata";
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import {Link} from "@mui/material";

interface SettingsDialogProps {
    open: boolean;
    onClose: () => void;
}

const frontendUrl = `${window.location.protocol}//${location.hostname}:${window.location.port}`

const SettingsDialog: React.FC<SettingsDialogProps> = ({open, onClose}) => (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
        <DialogTitle>Settings</DialogTitle>
        <DialogContent>
            <Link href={`${frontendUrl}/tree-invite?treeId=${treeId}`}>Link to join tree</Link>
            <br/>
            <Link href={`${frontendUrl}/issues?treeId=${treeId}`}>Tree issue tracker</Link>
            <TreeMembersList treeId={treeId}/>
        </DialogContent>
        <DialogActions>
            <Button onClick={onClose} variant="contained">Close</Button>
        </DialogActions>
    </Dialog>
);

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
                setMembers(membersWithUsernames);
                setLoading(false);
            });
    }, [treeId]);

    if (loading) return <CircularProgress/>;

    return (
        <div>
            <Typography variant="h6">Tree Members</Typography>
            <List>
                {members.map((member) => (
                    <ListItem key={member.userId}>
                        <ListItemText
                            primary={member.username}
                            secondary={member.permissionType}
                        />
                    </ListItem>
                ))}
            </List>
        </div>
    );
}