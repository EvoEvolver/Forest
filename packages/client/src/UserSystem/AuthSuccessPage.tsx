import React, {useEffect} from 'react'
import {Box, Button, Container, Paper, Stack, Typography} from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import {setupSupabaseClient} from "./supabase";

const AuthSuccessPage: React.FC = () => {
    // Handle authentication on this page
    useEffect(() => {
        const handleAuthCallback = async (supabaseClient) => {
            try {
                // This ensures the session is properly handled even on this page
                const {data: {session}, error} = await supabaseClient.auth.getSession()
                if (error) {
                    console.error('Error getting session on auth success page:', error)
                } else if (session) {
                    console.log('Session confirmed on auth success page:', session.user.email)
                }
            } catch (error) {
                console.error('Error handling auth callback:', error)
            }
        }
        const supabaseClient = setupSupabaseClient() // Ensure Supabase client is set up
        handleAuthCallback(supabaseClient)
    }, [])

    const handleCloseWindow = () => {
        try {
            window.close()

            // Fallback for stubborn windows
            setTimeout(() => {
                window.open('', '_self').close()
            }, 100)

        } catch (error) {
            console.error('Error closing window:', error)
        }
    }

    const handleGoBack = () => {
        try {
            // Simple browser back navigation
            window.history.go(-1)
        } catch (error) {
            console.error('Error going back:', error)
            // Fallback to main app
            window.location.href = window.location.origin
        }
    }

    return (
        <Box
            sx={{
                minHeight: '100vh',
                width: '100vw',
                backgroundColor: '#f5f5f5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: {xs: 2, sm: 3, md: 4}
            }}
        >
            <Container
                maxWidth="sm"
                sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center'
                }}
            >
                <Paper
                    elevation={3}
                    sx={{
                        padding: {xs: 3, sm: 4, md: 6},
                        textAlign: 'center',
                        borderRadius: 3,
                        backgroundColor: '#ffffff',
                        width: '100%',
                        maxWidth: 500
                    }}
                >
                    {/* Success Icon */}
                    <CheckCircleIcon
                        sx={{
                            fontSize: {xs: 48, sm: 56, md: 64},
                            color: '#4caf50',
                            marginBottom: {xs: 2, sm: 3}
                        }}
                    />

                    {/* Success Message */}
                    <Typography
                        variant="h4"
                        component="h1"
                        sx={{
                            color: '#000000',
                            fontWeight: 500,
                            marginBottom: {xs: 1.5, sm: 2},
                            fontSize: {xs: '1.5rem', sm: '2rem', md: '2.125rem'}
                        }}
                    >
                        Login Successful!
                    </Typography>

                    <Typography
                        variant="body1"
                        sx={{
                            color: '#666666',
                            marginBottom: {xs: 3, sm: 4},
                            lineHeight: 1.6,
                            fontSize: {xs: '0.9rem', sm: '1rem'},
                            px: {xs: 1, sm: 2}
                        }}
                    >
                        You have successfully signed in to Treer.
                        Choose how you'd like to continue.
                    </Typography>

                    {/* Action Buttons */}
                    <Stack
                        direction={{xs: 'column', sm: 'row'}}
                        spacing={2}
                        sx={{
                            justifyContent: 'center',
                            marginBottom: 2
                        }}
                    >
                        <Button
                            variant="outlined"
                            size="large"
                            onClick={handleGoBack}
                            startIcon={<ArrowBackIcon/>}
                            sx={{
                                borderColor: '#4caf50',
                                color: '#4caf50',
                                padding: {xs: '10px 20px', sm: '12px 24px'},
                                fontSize: {xs: '14px', sm: '16px'},
                                fontWeight: 500,
                                borderRadius: 2,
                                textTransform: 'none',
                                minWidth: {xs: '180px', sm: '200px'},
                                '&:hover': {
                                    borderColor: '#45a049',
                                    color: '#45a049',
                                    backgroundColor: 'rgba(76, 175, 80, 0.04)'
                                }
                            }}
                        >
                            Go Back
                        </Button>
                    </Stack>

                    {/* Helper Text */}
                    <Typography
                        variant="caption"
                        sx={{
                            color: '#999999',
                            fontSize: {xs: '12px', sm: '14px'},
                            display: 'block'
                        }}
                    >
                        Authentication completed successfully
                    </Typography>
                </Paper>
            </Container>
        </Box>
    )
}

export default AuthSuccessPage 