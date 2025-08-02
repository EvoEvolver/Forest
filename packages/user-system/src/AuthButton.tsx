import React from 'react'
import {useAtomValue, useSetAtom} from 'jotai'
import {Avatar, Box, Button, Divider, Menu, MenuItem, Typography} from '@mui/material'
import AccountCircleIcon from '@mui/icons-material/AccountCircle'
import LogoutIcon from '@mui/icons-material/Logout'
import {
    authModalOpenAtom,
    authTokenAtom,
    isAuthenticatedAtom,
    supabaseClientAtom,
    userAtom,
    userPermissionsAtom,
    userPanelModalOpenAtom
} from "./authStates"
import { getUserMetadata } from "./userMetadata"

const AuthButton: React.FC = () => {
    const user = useAtomValue(userAtom)
    const isAuthenticated = useAtomValue(isAuthenticatedAtom)

    const setAuthModalOpen = useSetAtom(authModalOpenAtom)
    const setUser = useSetAtom(userAtom)
    const setAuthToken = useSetAtom(authTokenAtom)
    const setUserPermissions = useSetAtom(userPermissionsAtom)
    const supabaseClient = useAtomValue(supabaseClientAtom)
    const setUserPanelModalOpen = useSetAtom(userPanelModalOpenAtom)

    const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null)
    const [userMetadata, setUserMetadata] = React.useState<{username: string, avatar: string | null} | null>(null)
    const open = Boolean(anchorEl)

    React.useEffect(() => {
        if (user?.id) {
            getUserMetadata(user.id).then(metadata => {
                setUserMetadata({
                    username: metadata.username,
                    avatar: metadata.avatar
                })
            })
        } else {
            setUserMetadata(null)
        }
    }, [user?.id])

    const handleLoginClick = () => {
        setAuthModalOpen(true)
    }

    const handleUserMenuClick = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget)
    }

    const handleMenuClose = () => {
        setAnchorEl(null)
    }

    const handleLogout = async () => {
        try {
            await supabaseClient.auth.signOut()
            setUser(null)
            setAuthToken(null)
            setUserPermissions({
                canUseAI: false,
                canUploadFiles: false,
                maxFileSize: 0
            })
            handleMenuClose()
        } catch (error) {
            console.error('Error signing out:', error)
        }
    }


    if (!isAuthenticated) {
        return (
            <Button
                color="primary"
                onClick={handleLoginClick}
                startIcon={<AccountCircleIcon sx={{color: 'rgba(78, 137, 192, 0.8)'}}/>}
                sx={{
                    textTransform: 'none',
                    '&:hover': {
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    }
                }}
            >
                Sign In
            </Button>
        )
    }

    return (
        <>
            <Button
                color="primary"
                onClick={handleUserMenuClick}
                sx={{
                    textTransform: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    '&:hover': {
                        backgroundColor: 'rgba(100, 100, 100, 0.1)',
                    },
                    margin: 0
                }}
            >
                <Avatar 
                    src={userMetadata?.avatar || undefined}
                    sx={{width: 24, height: 24, bgcolor: 'rgba(78, 137, 192, 0.8)'}}
                >
                    {!userMetadata?.avatar && (userMetadata?.username?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase())}
                </Avatar>
                <Typography variant="body2">
                    {userMetadata?.username || user?.email?.split('@')[0]}
                </Typography>
            </Button>

            <Menu
                anchorEl={anchorEl}
                open={open}
                onClose={handleMenuClose}
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'right',
                }}
                transformOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                }}
            >
                <Box sx={{p: 2, minWidth: 200}}>
                    <Typography variant="body2" color="text.secondary">
                        Signed in as
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                        {userMetadata?.username || user?.email}
                    </Typography>
                </Box>
                <Divider/>
                <MenuItem onClick={() => {
                    setAnchorEl(null)
                    setAuthModalOpen(false)
                    setUserPanelModalOpen(true)
                }}>
                    <AccountCircleIcon sx={{mr: 1}}/>
                    My account
                </MenuItem>
                <MenuItem onClick={handleLogout}>
                    <LogoutIcon sx={{mr: 1}}/>
                    Sign out
                </MenuItem>
            </Menu>
        </>
    )
}

export default AuthButton 