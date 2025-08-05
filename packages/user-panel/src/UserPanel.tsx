import React, { useEffect, useState } from 'react';
import { Box, Grid } from '@mui/material';
import { userAtom } from "@forest/user-system/src/authStates";
import { useAtom } from "jotai/index";
import { setupSupabaseClient } from '@forest/user-system/src/supabase';
import TopBar, {TabId} from "./TopBar";
import { EditDisplayNameDialog } from './EditDisplayNameDialog';
import {UserProfileColumn} from "./UserProfileColumn";
import {MainContentSection} from "./MainContentSecion";

export const UserPanel = ({}) => {
    const [user, setUser] = useAtom(userAtom);
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

    return (
        <Box
            sx={{
                padding: { xs: 2 },
                height: '100%',
                display: 'flex',
                flexDirection: 'column'
            }}
        >
            {/* Top Bar  */}
            <Box sx={{ flexShrink: 0 }}>
                <TopBar setActiveTab={setTab} activeTab={tab}/>
            </Box>

            {/* Main Content Area */}
            <Box sx={{ flex: 1, minHeight: 0, marginTop: 2 }}>
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
                        <MainContentSection tabId={tab} />
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