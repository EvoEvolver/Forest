import React, {useEffect, useState} from 'react';
import {useAtomValue} from 'jotai'
import {
    Avatar, 
    Box, 
    Grid2 as Grid, 
    Typography, 
    IconButton, 
    Dialog, 
    DialogTitle, 
    DialogContent, 
    DialogActions, 
    TextField, 
    Button,
    Alert,
    CircularProgress
} from '@mui/material';
import {Edit as EditIcon} from '@mui/icons-material';
import {authTokenAtom, subscriptionAtom, userAtom} from "./authStates";
import {UserTreesList} from './UserTreesList';
import {useAtom} from "jotai/index";
import {VisitedTreesList} from './VisitedTreesList';
import DashboardCard from './DashboardCard';
import {setupSupabaseClient} from './supabase';

export const UserPanel = ({}) => {
    const [, setSubscription] = useAtom(subscriptionAtom);
    const user = useAtomValue(userAtom);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [newDisplayName, setNewDisplayName] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);
    const [updateError, setUpdateError] = useState<string | null>(null);
    const [updateSuccess, setUpdateSuccess] = useState(false);

    useEffect(() => {
        setSubscription()
    }, []);

    useEffect(() => {
        if (user?.name) {
            setNewDisplayName(user.name);
        }
    }, [user]);

    const handleEditClick = () => {
        setNewDisplayName(user?.name || '');
        setUpdateError(null);
        setUpdateSuccess(false);
        setEditDialogOpen(true);
    };

    const handleUpdateDisplayName = async () => {
        if (!newDisplayName.trim()) {
            setUpdateError('Display name cannot be empty');
            return;
        }

        const supabase = setupSupabaseClient();
        if (!supabase) {
            setUpdateError('Supabase client not available');
            return;
        }

        try {
            setIsUpdating(true);
            setUpdateError(null);

            const { data, error } = await supabase.auth.updateUser({
                data: { 
                    display_name: newDisplayName.trim(),
                    name: newDisplayName.trim() // Also update name for consistency
                }
            });

            if (error) {
                throw error;
            }

            setUpdateSuccess(true);
            setTimeout(() => {
                setEditDialogOpen(false);
                setUpdateSuccess(false);
                // Refresh the page to update the user state
                window.location.reload();
            }, 1500);

        } catch (error) {
            console.error('Error updating display name:', error);
            setUpdateError(error instanceof Error ? error.message : 'Failed to update display name');
        } finally {
            setIsUpdating(false);
        }
    };

    const handleDialogClose = () => {
        if (!isUpdating) {
            setEditDialogOpen(false);
            setUpdateError(null);
            setUpdateSuccess(false);
        }
    };

    return (
        <Box
            sx={{
                margin: 'auto',
                maxWidth: 1200,
                width: '100vw',
                padding: "20px"
            }}
        >
            <Grid container spacing={3}>
                {/* User Profile Section */}
                <Grid
                    size={{
                        xs: 12,
                        lg: 4
                    }}
                >
                    <DashboardCard title="Profile">
                        <Box sx={{ textAlign: 'center', py: 2 }}>
                            <Avatar
                                sx={{ width: 80, height: 80, margin: '0 auto 16px' }}
                                alt="User Avatar"
                            />
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 2 }}>
                                <Typography variant="h5" component="div">
                                    {user?.name}
                                </Typography>
                                <IconButton 
                                    size="small" 
                                    onClick={handleEditClick}
                                    sx={{ p: 0.5 }}
                                >
                                    <EditIcon fontSize="small" />
                                </IconButton>
                            </Box>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                                {user?.email}
                            </Typography>
                        </Box>
                    </DashboardCard>
                </Grid>

                {/* Right Side - Trees Lists */}
                <Grid
                    size={{
                        xs: 12,
                        lg: 8
                    }}
                >
                    <Grid container spacing={3}>
                        <Grid size={12}>
                            <VisitedTreesList/>
                        </Grid>
                        <Grid size={12}>
                            <UserTreesList/>
                        </Grid>
                    </Grid>
                </Grid>
            </Grid>

            {/* Edit Display Name Dialog */}
            <Dialog 
                open={editDialogOpen} 
                onClose={handleDialogClose}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>Edit Display Name</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Display Name"
                        type="text"
                        fullWidth
                        variant="outlined"
                        value={newDisplayName}
                        onChange={(e) => setNewDisplayName(e.target.value)}
                        disabled={isUpdating}
                        sx={{ mt: 2 }}
                    />
                    {updateError && (
                        <Alert severity="error" sx={{ mt: 2 }}>
                            {updateError}
                        </Alert>
                    )}
                    {updateSuccess && (
                        <Alert severity="success" sx={{ mt: 2 }}>
                            Display name updated successfully! Refreshing...
                        </Alert>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button 
                        onClick={handleDialogClose} 
                        disabled={isUpdating}
                    >
                        Cancel
                    </Button>
                    <Button 
                        onClick={handleUpdateDisplayName} 
                        variant="contained"
                        disabled={isUpdating || !newDisplayName.trim()}
                        startIcon={isUpdating ? <CircularProgress size={16} /> : null}
                    >
                        {isUpdating ? 'Updating...' : 'Update'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};