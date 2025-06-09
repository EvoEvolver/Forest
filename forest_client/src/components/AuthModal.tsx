import React from 'react'
import { useAtom } from 'jotai'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Box,
  Typography,
  Paper
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { supabase } from '../supabase'

import {authModalOpenAtom} from "./authStates";

const AuthModal: React.FC = () => {
  const [authModalOpen, setAuthModalOpen] = useAtom(authModalOpenAtom)

  const handleClose = () => {
    setAuthModalOpen(false)
  }

  return (
    <Dialog
      open={authModalOpen}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        style: {
          borderRadius: 12,
          padding: '8px'
        }
      }}
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6" component="div">
            Sign in to Treer
          </Typography>
          <IconButton onClick={handleClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Paper elevation={0} sx={{ p: 2, backgroundColor: 'transparent' }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2, textAlign: 'center' }}>
            Access AI features and collaborate securely
          </Typography>
          
          <Auth
            supabaseClient={supabase}
            appearance={{
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    brand: '#3874cb',
                    brandAccent: '#2c5ba0',
                  },
                },
              },
            }}
            providers={['github']}
            onlyThirdPartyProviders={false}
            magicLink={true}
            showLinks={false}
            view="magic_link"
            redirectTo={`${window.location.origin}/auth-success`}
            localization={{
              variables: {
                magic_link: {
                  email_input_label: 'Email address',
                  email_input_placeholder: 'Your email address',
                  button_label: 'Send magic link',
                  loading_button_label: 'Sending magic link...',
                  link_text: 'Send a magic link to your email',
                  confirmation_text: 'Check your email for the login link',
                },
              },
            }}
          />
        </Paper>
      </DialogContent>
    </Dialog>
  )
}

export default AuthModal 