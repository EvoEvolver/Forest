import React, {useEffect, useState} from 'react';
import {Box, Grid, Typography, Paper} from '@mui/material';
import {userAtom, isAuthenticatedAtom} from "@forest/user-system/src/authStates";
import {useAtom, useAtomValue} from "jotai/index";
import {setupSupabaseClient} from '@forest/user-system/src/supabase';
import {TabId} from "./TopBar";
import {EditDisplayNameDialog} from './EditDisplayNameDialog';
import {UserProfileColumn} from "./UserProfileColumn";
import {MainContentSection} from "./MainContentSecion";
import AuthButton from '@forest/user-system/src/AuthButton';
import ParkIcon from '@mui/icons-material/Park';

export const UserPanel = ({}) => {
    const [user, setUser] = useAtom(userAtom);
    const isAuthenticated = useAtomValue(isAuthenticatedAtom);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [newDisplayName, setNewDisplayName] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);
    const [updateError, setUpdateError] = useState<string | null>(null);
    const [updateSuccess, setUpdateSuccess] = useState(false);
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [tab, setTab] = useState<TabId>('trees');

    useEffect(() => {
        if (user?.name) {
            setNewDisplayName(user.name);
        }
        // Get avatar URL from user metadata or direct property
        const userAvatarUrl = user?.user_metadata?.avatar_url || user?.avatar_url;
        if (userAvatarUrl) {
            setAvatarUrl(userAvatarUrl);
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

            const {error} = await supabase.auth.updateUser({
                data: {
                    display_name: newDisplayName.trim(),
                    name: newDisplayName.trim() // Also update name for consistency
                }
            });

            if (error) {
                throw error;
            }

            // Update local user state immediately
            if (user) {
                const updatedUser = {
                    ...user,
                    user_metadata: {
                        ...user.user_metadata,
                        display_name: newDisplayName.trim(),
                        name: newDisplayName.trim()
                    },
                    name: newDisplayName.trim(),
                    display_name: newDisplayName.trim()
                };
                setUser(updatedUser);
            }

            setUpdateSuccess(true);
            setTimeout(() => {
                setEditDialogOpen(false);
                setUpdateSuccess(false);
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


    // If user is not authenticated, show login interface
    if (!isAuthenticated) {
        return (
            <Box
                sx={{
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 3
                }}
            >
                <Paper
                    elevation={3}
                    sx={{
                        padding: 6,
                        textAlign: 'center',
                        maxWidth: 400,
                        width: '100%'
                    }}
                >
                    <ParkIcon 
                        sx={{ 
                            fontSize: 64, 
                            color: 'primary.main', 
                            marginBottom: 2 
                        }} 
                    />
                    <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold' }}>
                        Forest
                    </Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ marginBottom: 3 }}>
                        Please sign in to access your user panel and manage your trees.
                    </Typography>
                    <Box sx={{ transform: 'scale(1.2)' }}>
                        <AuthButton />
                    </Box>
                </Paper>
            </Box>
        );
    }

    return (
        <Box
            sx={{
                padding: {xs: 2},
                height: '100%',
                display: 'flex',
                flexDirection: 'column'
            }}
        >
            {/* Main Content Area */}
            <Box sx={{flex: 1, minHeight: 0}}>
                <Grid container
                      spacing={3}
                      sx={{
                          height: '100%',
                          margin: 0,
                          width: '100%'
                      }}
                >
                    {/* User Profile Section */}
                    <Grid
                        size={{
                            xs: 12,
                            md: 2,
                            lg: 1.5
                        }}
                        sx={{
                            height: '100%'
                        }}
                    >
                        <UserProfileColumn
                            user={user}
                            avatarUrl={avatarUrl}
                            setAvatarUrl={setAvatarUrl}
                            setUser={setUser}
                            onEditClick={handleEditClick}
                            tab={tab}
                            setTab={setTab}
                        />
                    </Grid>

                    {/* main contents */}
                    <Grid
                        size={{
                            xs: 12,
                            md: 10,
                            lg: 10.5
                        }}
                        sx={{
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column'
                        }}
                    >
                        <MainContentSection tabId={tab}/>
                    </Grid>
                </Grid>
            </Box>

            {/* Edit Display Name Dialog */}
            <EditDisplayNameDialog
                open={editDialogOpen}
                onClose={handleDialogClose}
                displayName={newDisplayName}
                onDisplayNameChange={setNewDisplayName}
                onUpdate={handleUpdateDisplayName}
                isUpdating={isUpdating}
                updateError={updateError}
                updateSuccess={updateSuccess}
            />
        </Box>
    );
};