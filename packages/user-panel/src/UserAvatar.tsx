// UserAvatar.tsx
import React, {useRef, useState} from 'react';
import {Alert, Avatar, Box, CircularProgress, Tooltip,} from '@mui/material';
import {setupSupabaseClient} from '@forest/user-system/src/supabase';

interface UserAvatarProps {
    user: any;
    avatarUrl: string | null;
    setAvatarUrl: (url: string | null) => void;
    setUser: (user: any) => void;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
                                                          user,
                                                          avatarUrl,
                                                          setAvatarUrl,
                                                          setUser
                                                      }) => {
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
    const [avatarUploadError, setAvatarUploadError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

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
        <>
            <Box sx={{
                position: 'relative',
                display: 'flex',
                justifyContent: 'center',
                mb: {xs: 1, md: 2}
            }}>
                <Tooltip title="Click to change avatar">
                    <Avatar
                        src={avatarUrl || undefined}
                        sx={{
                            width: '70%',
                            height: 'auto',
                            aspectRatio: '1/1',
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
            </Box>

            {avatarUploadError && (
                <Alert severity="error" sx={{mb: 2, fontSize: '0.75rem'}}>
                    {avatarUploadError}
                </Alert>
            )}

            {/* Hidden file input */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                style={{display: 'none'}}
                onChange={handleAvatarUpload}
            />
        </>
    );
};