import React, {useEffect, useRef, useState} from 'react';
import {
    Alert,
    Avatar,
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Grid,
    IconButton,
    TextField,
    Tooltip,
    Typography
} from '@mui/material';
import {Edit as EditIcon, PhotoCamera as PhotoCameraIcon} from '@mui/icons-material';
import {userAtom} from "@forest/user-system/src/authStates";
import {UserTreesList} from './UserTreesList';
import {useAtom} from "jotai/index";
import {VisitedTreesList} from './VisitedTreesList';
import DashboardCard from './DashboardCard';
import {setupSupabaseClient} from '@forest/user-system/src/supabase';
import {AuthGuard} from './AuthGuard';

export const UserPanel = ({}) => {
    const [user, setUser] = useAtom(userAtom);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [newDisplayName, setNewDisplayName] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);
    const [updateError, setUpdateError] = useState<string | null>(null);
    const [updateSuccess, setUpdateSuccess] = useState(false);
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
    const [avatarUploadError, setAvatarUploadError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);


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

    const handleAvatarClick = () => {
        if (!isUploadingAvatar) {
            fileInputRef.current?.click();
        }
    };

    const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            setAvatarUploadError('Please upload a valid image file (JPEG, PNG, or WebP)');
            return;
        }

        // Validate file size (5MB limit)
        if (file.size > 5 * 1024 * 1024) {
            setAvatarUploadError('File size must be less than 5MB');
            return;
        }

        const supabase = setupSupabaseClient();
        if (!supabase) {
            setAvatarUploadError('Supabase client not available');
            return;
        }

        // Check if user is authenticated
        const {data: {user: currentUser}} = await supabase.auth.getUser();
        if (!currentUser) {
            setAvatarUploadError('User not authenticated');
            return;
        }

        try {
            setIsUploadingAvatar(true);
            setAvatarUploadError(null);

            // Create a unique filename with user ID as folder
            const fileExtension = file.name.split('.').pop();
            const fileName = `avatar_${Date.now()}.${fileExtension}`;
            const filePath = `${user?.id}/${fileName}`;

            // Upload file to Supabase Storage
            const {data: uploadData, error: uploadError} = await supabase.storage
                .from('avatars')
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: true
                });

            if (uploadError) {
                throw uploadError;
            }

            // Get public URL
            const {data: urlData} = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            const avatarUrl = urlData.publicUrl;

            // Update user metadata with avatar URL
            console.log('Updating user metadata with avatar URL:', avatarUrl);
            const {data: updateData, error: updateError} = await supabase.auth.updateUser({
                data: {
                    avatar_url: avatarUrl
                }
            });

            if (updateError) {
                console.error('Error updating user metadata:', updateError);
                throw updateError;
            }

            console.log('User metadata updated successfully:', updateData);

            // Verify the update by getting fresh user data
            const {data: {user: updatedUser}, error: getUserError} = await supabase.auth.getUser();
            if (getUserError) {
                console.error('Error getting updated user:', getUserError);
            } else {
                console.log('Updated user data:', updatedUser);
                console.log('Updated user metadata:', updatedUser?.user_metadata);
            }

            // Update local state immediately
            setAvatarUrl(avatarUrl);

            // Update the user atom with the new avatar URL
            if (user) {
                const updatedUser = {
                    ...user,
                    user_metadata: {
                        ...user.user_metadata,
                        avatar_url: avatarUrl
                    },
                    avatar_url: avatarUrl
                };
                setUser(updatedUser);
            }

            // Show success message briefly - no need to refresh immediately
            // The UI is already updated with the new avatar

        } catch (error) {
            console.error('Error uploading avatar:', error);
            setAvatarUploadError(error instanceof Error ? error.message : 'Failed to upload avatar');
        } finally {
            setIsUploadingAvatar(false);
            // Clear the file input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    return (
        <Box
            sx={{
                padding: { xs: 1, sm: 5 },
                height: '100%',
            }}
        >
            <Grid container spacing={3} sx={{ 
                height: '100%',
                overflow: 'hidden',
                margin: 0,
                width: '100%'
            }}>
                {/* User Profile Section */}
                <Grid
                    size={{
                        xs: 12,
                        md: 3,
                        lg: 3
                    }}
                    sx={{
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column'
                    }}
                >
                    <AuthGuard>
                        <DashboardCard title="Profile">
                            <Box sx={{textAlign: 'center', py: { xs: 1, md: 2 }}}>
                                <Box sx={{position: 'relative', display: 'inline-block', mb: { xs: 1, md: 2 }}}>
                                    <Tooltip title="Click to change avatar">
                                        <Avatar
                                            src={avatarUrl || undefined}
                                            sx={{
                                                width: { xs: 60, md: 80 },
                                                height: { xs: 60, md: 80 },
                                                cursor: isUploadingAvatar ? 'default' : 'pointer',
                                                '&:hover': {
                                                    opacity: isUploadingAvatar ? 1 : 0.8
                                                }
                                            }}
                                            alt="User Avatar"
                                            onClick={handleAvatarClick}
                                        >
                                            {!avatarUrl && user?.name?.charAt(0)}
                                        </Avatar>
                                    </Tooltip>
                                    {isUploadingAvatar && (
                                        <Box
                                            sx={{
                                                position: 'absolute',
                                                top: 0,
                                                left: 0,
                                                right: 0,
                                                bottom: 0,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                                                borderRadius: '50%'
                                            }}
                                        >
                                            <CircularProgress size={24} sx={{color: 'white'}}/>
                                        </Box>
                                    )}
                                    <IconButton
                                        sx={{
                                            position: 'absolute',
                                            bottom: -5,
                                            right: -5,
                                            backgroundColor: 'primary.main',
                                            color: 'white',
                                            width: 28,
                                            height: 28,
                                            '&:hover': {
                                                backgroundColor: 'primary.dark'
                                            }
                                        }}
                                        size="small"
                                        onClick={handleAvatarClick}
                                        disabled={isUploadingAvatar}
                                    >
                                        <PhotoCameraIcon fontSize="small"/>
                                    </IconButton>
                                </Box>

                                {avatarUploadError && (
                                    <Alert severity="error" sx={{mb: 2, fontSize: '0.75rem'}}>
                                        {avatarUploadError}
                                    </Alert>
                                )}

                                <Box sx={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: { xs: 1, md: 2 }}}>
                                    <Typography variant="h5" component="div" sx={{
                                        fontSize: { xs: '1rem', md: '1.25rem' },
                                        textAlign: 'center',
                                        wordBreak: 'break-word'
                                    }}>
                                        {user?.name}
                                    </Typography>
                                    <IconButton
                                        size="small"
                                        onClick={handleEditClick}
                                        sx={{p: 0.5}}
                                    >
                                        <EditIcon fontSize="small"/>
                                    </IconButton>
                                </Box>
                                <Typography variant="body2" color="text.secondary" gutterBottom sx={{
                                    fontSize: { xs: '0.75rem', md: '0.875rem' },
                                    textAlign: 'center',
                                    wordBreak: 'break-word'
                                }}>
                                    {user?.email}
                                </Typography>

                                {/* Hidden file input */}
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/jpeg,image/jpg,image/png,image/webp"
                                    style={{display: 'none'}}
                                    onChange={handleAvatarUpload}
                                />
                            </Box>
                        </DashboardCard>
                    </AuthGuard>
                </Grid>

                {/* Right Side - Trees Lists */}
                <Grid
                    size={{
                        xs: 12,
                        md: 9,
                        lg: 9
                    }}
                    sx={{
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column'
                    }}
                >
                    <AuthGuard>
                        <Box sx={{ 
                            display: 'flex',
                            flexDirection: 'column',
                            height: '100%',
                            minHeight: '400px',
                            gap: 2,
                            overflow: 'hidden'
                        }}>
                            <Box sx={{
                                flex: '1 1 0',
                                minHeight: 0,
                                display: 'flex',
                                flexDirection: 'column'
                            }}>
                                <UserTreesList/>
                            </Box>
                            <Box sx={{
                                flex: '1 1 0',
                                minHeight: 0,
                                display: 'flex',
                                flexDirection: 'column'
                            }}>
                                <VisitedTreesList/>
                            </Box>
                        </Box>
                    </AuthGuard>
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
                        sx={{mt: 2}}
                    />
                    {updateError && (
                        <Alert severity="error" sx={{mt: 2}}>
                            {updateError}
                        </Alert>
                    )}
                    {updateSuccess && (
                        <Alert severity="success" sx={{mt: 2}}>
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
                        startIcon={isUpdating ? <CircularProgress size={16}/> : null}
                    >
                        {isUpdating ? 'Updating...' : 'Update'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};