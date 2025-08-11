// UserProfile.tsx
import React from 'react';
import {
    Box,
    Typography, useTheme, Button,
} from '@mui/material';
import { UserAvatar } from './UserAvatar';
import { UserDisplayName } from './UserDisplayName';
import DashboardCard from './DashboardCard';
import { AuthGuard } from './AuthGuard';
import { TabId } from './TopBar';

interface UserProfileProps {
    user: any;
    avatarUrl: string | null;
    setAvatarUrl: (url: string | null) => void;
    setUser: (user: any) => void;
    onEditClick: () => void;
    tab: TabId;
    setTab: React.Dispatch<React.SetStateAction<TabId>>;
}

export const UserProfileColumn: React.FC<UserProfileProps> = ({
      user,
      avatarUrl,
      setAvatarUrl,
      setUser,
      onEditClick,
      tab,
      setTab
  }) => {
    const theme = useTheme();
    
    const tabs = [
        { id: 'profile' as TabId, label: 'Profile' },
        { id: 'trees' as TabId, label: 'Trees' },
        { id: 'issues' as TabId, label: 'Issues' }
    ];
    
    return (
        <AuthGuard>
            <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                {/* Vertical Tab Navigation */}
                <Box sx={{ flexShrink: 0, mb: 2 }}>
                    {tabs.map((tabItem) => (
                        <Button
                            key={tabItem.id}
                            onClick={() => setTab(tabItem.id)}
                            fullWidth
                            sx={{
                                justifyContent: 'flex-start',
                                textTransform: 'none',
                                py: 1.5,
                                px: 2,
                                mb: 0.5,
                                fontWeight: 500,
                                fontSize: '1rem',
                                transition: 'all 0.2s ease',
                                backgroundColor: tab === tabItem.id ? 'rgba(0, 0, 0, 0.08)' : 'transparent',
                                color: tab === tabItem.id ? 'primary.main' : 'text.primary',
                                borderRadius: 1,
                                '&:hover': {
                                    backgroundColor: tab === tabItem.id ? 'rgba(0, 0, 0, 0.12)' : 'rgba(0, 0, 0, 0.04)',
                                }
                            }}
                        >
                            {tabItem.label}
                        </Button>
                    ))}
                </Box>
                
                {/* User Profile - moved to bottom */}
                <Box sx={{ mt: 'auto' }}>
                    <DashboardCard title="" sx={{ backgroundColor: 'transparent' }}>
                        <Box sx={{ py: 1 }}>
                            {/* Photo and Name in same line */}

                                <UserAvatar
                                    user={user}
                                    avatarUrl={avatarUrl}
                                    setAvatarUrl={setAvatarUrl}
                                    setUser={setUser}
                                />
                                <Box sx={{ flex: 1 }}>
                                    <UserDisplayName
                                        userName={user?.name}
                                        onEditClick={onEditClick}
                                    />
                                </Box>

                            {/* Email below */}
                            <Typography variant="body2" color="text.secondary" sx={{
                                fontSize: { xs: '0.65rem', md: '0.75rem' },
                                wordBreak: 'break-word',
                            }}>
                                {user?.email}
                            </Typography>
                        </Box>
                    </DashboardCard>
                </Box>
            </Box>
        </AuthGuard>
    );
};