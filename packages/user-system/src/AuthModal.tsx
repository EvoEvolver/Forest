import React, { useState } from 'react'
import {useAtom} from 'jotai'
import {
    Box, 
    Dialog, 
    DialogContent, 
    IconButton, 
    Typography, 
    Button, 
    TextField, 
    Divider,
    Avatar
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import GitHubIcon from '@mui/icons-material/GitHub'
import EmailIcon from '@mui/icons-material/Email'
import ParkIcon from '@mui/icons-material/Park'
import {authModalOpenAtom, supabaseClientAtom} from './authStates';
import {useAtomValue} from "jotai";
import {saveUrlBeforeLogin} from "./authUtils";

const AuthModal: React.FC = () => {
    const [authModalOpen, setAuthModalOpen] = useAtom(authModalOpenAtom)
    const supabaseClient = useAtomValue(supabaseClientAtom)
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    
    const handleClose = () => {
        setAuthModalOpen(false)
    }

    const handleGithubLogin = async () => {
        // Save current URL before redirecting to GitHub
        saveUrlBeforeLogin()
        
        const { error } = await supabaseClient.auth.signInWithOAuth({
            provider: 'github',
            options: {
                redirectTo: `${window.location.origin}/auth-success/`,
            },
        })
        if (error) {
            console.error('GitHub login error:', error.message)
        }
    }

    const handleMagicLinkLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!email) return

        // Save current URL before sending magic link
        saveUrlBeforeLogin()
        
        setLoading(true)
        const { error } = await supabaseClient.auth.signInWithOtp({
            email,
            options: {
                emailRedirectTo: `${window.location.origin}/auth-success/`,
            },
        })

        if (error) {
            console.error('Magic link error:', error.message)
        }
        setLoading(false)
    }

    return (
        <Dialog
            open={authModalOpen}
            onClose={handleClose}
            maxWidth="sm"
            fullWidth
            sx={{
                '& .MuiDialog-paper': {
                    borderRadius: 2,
                    maxWidth: 400,
                }
            }}
        >
            <Box sx={{ position: 'relative' }}>
                <IconButton 
                    onClick={handleClose} 
                    sx={{ 
                        position: 'absolute', 
                        right: 8, 
                        top: 8, 
                        zIndex: 1 
                    }}
                >
                    <CloseIcon />
                </IconButton>
                
                <DialogContent sx={{ p: 4, textAlign: 'center' }}>
                    <Box sx={{ mb: 3 }}>
                        <Avatar
                            sx={{
                                width: 64,
                                height: 64,
                                bgcolor: '#e3f2fd',
                                mx: 'auto',
                                mb: 2
                            }}
                        >
                            <ParkIcon sx={{ fontSize: 32, color: '#1976d2' }} />
                        </Avatar>
                        
                        <Typography variant="h4" component="h1" sx={{ mb: 1, fontWeight: 600 }}>
                            Welcome to Treer
                        </Typography>
                        
                        <Typography variant="body1" color="text.secondary">
                            Sign in to your account to continue
                        </Typography>
                    </Box>

                    <Box sx={{ mb: 3 }}>
                        <Button
                            variant="outlined"
                            fullWidth
                            size="large"
                            startIcon={<GitHubIcon />}
                            onClick={handleGithubLogin}
                            sx={{
                                py: 1.5,
                                borderRadius: 2,
                                textTransform: 'none',
                                fontSize: '16px',
                                borderColor: '#e0e0e0',
                                color: '#424242',
                                '&:hover': {
                                    borderColor: '#bdbdbd',
                                    backgroundColor: '#f5f5f5'
                                }
                            }}
                        >
                            Continue with GitHub
                        </Button>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', my: 3 }}>
                        <Divider sx={{ flex: 1 }} />
                        <Typography variant="body2" color="text.secondary" sx={{ px: 2 }}>
                            OR
                        </Typography>
                        <Divider sx={{ flex: 1 }} />
                    </Box>

                    <Box component="form" onSubmit={handleMagicLinkLogin} sx={{ mb: 3 }}>
                        <TextField
                            type="email"
                            placeholder="Enter your email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            fullWidth
                            variant="outlined"
                            sx={{
                                mb: 2,
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: 2,
                                }
                            }}
                        />
                        
                        <Button
                            type="submit"
                            variant="contained"
                            fullWidth
                            size="large"
                            disabled={loading}
                            startIcon={<EmailIcon />}
                            sx={{
                                py: 1.5,
                                borderRadius: 2,
                                textTransform: 'none',
                                fontSize: '16px',
                                bgcolor: '#1976d2',
                                '&:hover': {
                                    bgcolor: '#1565c0'
                                }
                            }}
                        >
                            {loading ? 'Sending...' : 'Send Magic Link'}
                        </Button>
                    </Box>

                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        By signing in, you agree to our terms of service and privacy policy.
                    </Typography>
                </DialogContent>
            </Box>
        </Dialog>
    )
}

export default AuthModal 