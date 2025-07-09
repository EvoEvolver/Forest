import React from "react";
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
        </DialogContent>
        <DialogActions>
            <Button onClick={onClose} variant="contained">Close</Button>
        </DialogActions>
    </Dialog>
);

export default SettingsDialog; 