// UserProfile.tsx
import React from 'react';
import {
    Box,
    Typography,
} from '@mui/material';
import { UserAvatar } from './UserAvatar';
import { UserDisplayName } from './UserDisplayName';
import DashboardCard from './DashboardCard';
import { AuthGuard } from './AuthGuard';

interface UserProfileProps {
    user: any;
    avatarUrl: string | null;
    setAvatarUrl: (url: string | null) => void;
    setUser: (user: any) => void;
    onEditClick: () => void;
}

export const UserProfile: React.FC<UserProfileProps> = ({
                                                                          user,
                                                                          avatarUrl,
                                                                          setAvatarUrl,
                                                                          setUser,
                                                                          onEditClick
                                                                      }) => {
    return (
        <AuthGuard>
            <DashboardCard title="" sx={{ backgroundColor: 'transparent' }}>
                <Box sx={{textAlign: 'center', py: { xs: 1, md: 2 }}}>
                    <UserAvatar
                        user={user}
                        avatarUrl={avatarUrl}
                        setAvatarUrl={setAvatarUrl}
                        setUser={setUser}
                    />

                    <UserDisplayName
                        userName={user?.name}
                        onEditClick={onEditClick}
                    />

                    <Typography variant="body2" color="text.secondary" gutterBottom sx={{
                        fontSize: { xs: '0.75rem', md: '0.875rem' },
                        textAlign: 'center',
                        wordBreak: 'break-word'
                    }}>
                        {user?.email}
                    </Typography>
                </Box>
            </DashboardCard>
        </AuthGuard>
    );
};