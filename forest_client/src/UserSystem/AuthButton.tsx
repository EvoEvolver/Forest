import React from 'react'
import { useAtom, useAtomValue, useSetAtom } from 'jotai'
import {
  Button,
  Menu,
  MenuItem,
  Avatar,
  Typography,
  Box,
  Divider
} from '@mui/material'
import AccountCircleIcon from '@mui/icons-material/AccountCircle'
import LogoutIcon from '@mui/icons-material/Logout'
import { supabase } from '../supabase'
import {authModalOpenAtom, authTokenAtom, isAuthenticatedAtom, userAtom, userPermissionsAtom} from "./authStates";

const AuthButton: React.FC = () => {
  const user = useAtomValue(userAtom)
  const isAuthenticated = useAtomValue(isAuthenticatedAtom)
  const setAuthModalOpen = useSetAtom(authModalOpenAtom)
  const [, setUser] = useAtom(userAtom)
  const [, setAuthToken] = useAtom(authTokenAtom)
  const [, setUserPermissions] = useAtom(userPermissionsAtom)
  
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null)
  const open = Boolean(anchorEl)

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
      await supabase.auth.signOut()
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
        color="inherit"
        onClick={handleLoginClick}
        startIcon={<AccountCircleIcon sx={{ color: 'white' }} />}
        sx={{
          color: 'white',
          textTransform: 'none',
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
          },
        }}
      >
        Sign In
      </Button>
    )
  }

  return (
    <>
      <Button
        color="inherit"
        onClick={handleUserMenuClick}
        sx={{
          color: 'white',
          textTransform: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
          },
        }}
      >
        <Avatar sx={{ width: 24, height: 24, bgcolor: 'rgba(255, 255, 255, 0.2)' }}>
          {user?.email?.charAt(0).toUpperCase()}
        </Avatar>
        <Typography variant="body2" sx={{ color: 'white' }}>
          {user?.email?.split('@')[0]}
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
        <Box sx={{ p: 2, minWidth: 200 }}>
          <Typography variant="body2" color="text.secondary">
            Signed in as
          </Typography>
          <Typography variant="body1" fontWeight="medium">
            {user?.email}
          </Typography>
        </Box>
        <Divider />
        <MenuItem onClick={handleLogout}>
          <LogoutIcon sx={{ mr: 1 }} />
          Sign out
        </MenuItem>
      </Menu>
    </>
  )
}

export default AuthButton 