import React from 'react';
import {Box, Button, IconButton, Paper, TextField, Typography} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import {usernameAtom} from "./index";
import {useAtom} from "jotai";

const SettingsPanel = ({closePanel}: { closePanel: () => void }) => {
    const [username, setUsername] = useAtom(usernameAtom);
    const handleSave = () => {
        closePanel();
    };

    return (
        <Paper
            elevation={6}
            sx={{
                position: 'fixed',
                top: 20,
                right: 20,
                zIndex: 1300,
                padding: 2,
                width: 300,
            }}
        >
            <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="h6" gutterBottom>
                    Settings
                </Typography>
                <IconButton onClick={closePanel}>
                    <CloseIcon/>
                </IconButton>
            </Box>
            <TextField
                label="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                fullWidth
                margin="normal"
            />
            <Button variant="contained" color="primary" onClick={handleSave} fullWidth>
                Save
            </Button>
        </Paper>
    );
};

export default SettingsPanel;