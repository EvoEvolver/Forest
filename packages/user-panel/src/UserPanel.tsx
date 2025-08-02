import React, { useEffect, useState } from 'react';
import { Box, Grid } from '@mui/material';
import { userAtom } from "@forest/user-system/src/authStates";
import { useAtom } from "jotai/index";
import { setupSupabaseClient } from '@forest/user-system/src/supabase';
import TopBar, {TabId} from "./TopBar";
import { EditDisplayNameDialog } from './EditDisplayNameDialog';
import {UserProfile} from "./UserProfile";
import {MainContentSection} from "./MainContentSecion";

export const UserPanel = ({}) => {
    const [user, setUser] = useAtom(userAtom);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [newDisplayName, setNewDisplayName] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);
    const [updateError, setUpdateError] = useState<string | null>(null);
    const [updateSuccess, setUpdateSuccess] = useState(false);
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [tab, setTab] = useState<TabId | null>(null);

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
                padding: { xs: 1 },
                height: '100%',
            }}
        >
            <Grid container
                  spacing={1}
                  direction="row"
                  sx={{
                      height: '100%',
                      overflow: 'hidden',
                      margin: 0,
                      width: '100%'
                  }}
            >
                <Grid
                    size={{
                        xs: 12
                    }}
                >
                    <TopBar setActiveTab={setTab} activeTab={tab}/>
                </Grid>
                <Grid container spacing={3}
                      sx={{
                          height: '100%',
                          overflow: 'hidden',
                          margin: 0,
                          width: '100%'
                      }}
                      size={{
                          xs: 12
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
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column'
                        }}
                    >
                        <UserProfile
                            user={user}
                            avatarUrl={avatarUrl}
                            setAvatarUrl={setAvatarUrl}
                            setUser={setUser}
                            onEditClick={handleEditClick}
                        />
                    </Grid>

                    {/* Right Side - Trees Lists */}
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
            </Grid>

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