import React from 'react'
import {useAtomValue, useSetAtom} from 'jotai'
import {Avatar, Button, Typography, useTheme} from '@mui/material'
import AccountCircleIcon from '@mui/icons-material/AccountCircle'
import {
    authModalOpenAtom,
    isAuthenticatedAtom,
    userAtom,
    userPanelModalOpenAtom
} from "./authStates"
import { getUserMetadata } from "./userMetadata"

const AuthButton: React.FC = () => {
    const user = useAtomValue(userAtom)
    const isAuthenticated = useAtomValue(isAuthenticatedAtom)

    const setAuthModalOpen = useSetAtom(authModalOpenAtom)
    const setUserPanelModalOpen = useSetAtom(userPanelModalOpenAtom)
    const theme = useTheme()
    const [userMetadata, setUserMetadata] = React.useState<{username: string, avatar: string | null} | null>(null)

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

    const handleUserMenuClick = () => {
        setUserPanelModalOpen(true)
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
        <Button
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
                sx={{width: 24, height: 24}}
            >
                {!userMetadata?.avatar && (userMetadata?.username?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase())}
            </Avatar>
            <Typography variant="body2" sx={{color: theme.palette.text.secondary, textTransform: 'none'}}>
                {userMetadata?.username || user?.email?.split('@')[0]}
            </Typography>
        </Button>
    )
}

export default AuthButton 