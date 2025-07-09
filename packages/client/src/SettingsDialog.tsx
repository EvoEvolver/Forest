import React, {useEffect, useState} from "react";
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';

interface SettingsDialogProps {
    open: boolean;
    onClose: () => void;
}

const SettingsDialog: React.FC<SettingsDialogProps> = ({ open, onClose }) => (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
        <DialogTitle>Settings</DialogTitle>
        <DialogContent>
            <p>Settings content goes here.</p>
            <TreeMembersList treeId={treeId}/>
        </DialogContent>
        <DialogActions>
            <Button onClick={onClose} variant="contained">Close</Button>
        </DialogActions>
    </Dialog>
);

export default SettingsDialog; 

import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import {httpUrl, treeId} from "./appState";

const API_BASE = httpUrl // Replace with your actual base URL

interface Permission {
  userId: string;
  permissionType: string;
}

export function TreeMembersList({ treeId }: { treeId: string }) {
  const [members, setMembers] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/api/tree-permission/tree/${treeId}`, {
      credentials: "include", // if you use cookies/auth
      headers: {
        "Content-Type": "application/json",
        // Add auth headers if needed
      },
    })
      .then((res) => res.json())
      .then((data) => {
        setMembers(data.permissions || []);
        setLoading(false);
      });
  }, [treeId]);

  if (loading) return <CircularProgress />;

  return (
    <div>
      <Typography variant="h6">Tree Members</Typography>
      <List>
        {members.map((member) => (
          <ListItem key={member.userId}>
            <ListItemText
              primary={member.userId}
              secondary={member.permissionType}
            />
          </ListItem>
        ))}
      </List>
    </div>
  );
}