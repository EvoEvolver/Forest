// UserProfile.tsx
import React from 'react';
import {Box, Button, Typography, useTheme,} from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import {useSetAtom} from 'jotai';
import {UserAvatar} from './UserAvatar';
import {UserDisplayName} from './UserDisplayName';
import DashboardCard from './DashboardCard';
import {AuthGuard} from './AuthGuard';
import {TabId} from './TopBar';
import {authTokenAtom, userPanelModalOpenAtom, userPermissionsAtom} from '@forest/user-system/src/authStates';
import {setupSupabaseClient} from '@forest/user-system/src/supabase';

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
    const setAuthToken = useSetAtom(authTokenAtom);
    const setUserPermissions = useSetAtom(userPermissionsAtom);
    const setUserPanelModalOpen = useSetAtom(userPanelModalOpenAtom);

    const tabs = [
        {id: 'profile' as TabId, label: 'Profile'},
        {id: 'trees' as TabId, label: 'Trees'},
        {id: 'issues' as TabId, label: 'Issues'}
    ];

    const handleLogout = async () => {
        try {
            const supabase = setupSupabaseClient();
            if (supabase) {
                await supabase.auth.signOut();
            }
            setUser(null);
            setAuthToken(null);
            setUserPermissions({
                canUseAI: false,
                canUploadFiles: false,
                maxFileSize: 0
            });
            setUserPanelModalOpen(false); // Close the panel
        } catch (error) {
            console.error('Error signing out:', error);
        }
    };

    return (
        <AuthGuard>
            <Box sx={{display: 'flex', flexDirection: 'column', height: '100%'}}>
                {/* Vertical Tab Navigation */}
                <Box sx={{flexShrink: 0, mb: 2}}>
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
                <Box sx={{mt: 'auto'}}>
                    <DashboardCard title="" sx={{backgroundColor: 'transparent'}}>
                        <Box sx={{py: 1}}>
                            {/* Photo and Name in same line */}

                            <UserAvatar
                                user={user}
                                avatarUrl={avatarUrl}
                                setAvatarUrl={setAvatarUrl}
                                setUser={setUser}
                            />
                            <Box sx={{flex: 1}}>
                                <UserDisplayName
                                    userName={user?.name}
                                    onEditClick={onEditClick}
                                />
                            </Box>

                            {/* Email below */}
                            <Typography variant="body2" color="text.secondary" sx={{
                                fontSize: {xs: '0.65rem', md: '0.75rem'},
                                wordBreak: 'break-word',
                            }}>
                                {user?.email}
                            </Typography>

                            {/* Sign out button */}
                            <Button
                                onClick={handleLogout}
                                startIcon={<LogoutIcon/>}
                                size="small"
                                sx={{
                                    mt: 2,
                                    textTransform: 'none',
                                    color: 'text.secondary',
                                    '&:hover': {
                                        backgroundColor: 'rgba(0, 0, 0, 0.04)',
                                    }
                                }}
                            >
                                Sign out
                            </Button>
                        </Box>
                    </DashboardCard>
                </Box>
            </Box>
        </AuthGuard>
    );
};