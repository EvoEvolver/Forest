import React from 'react'
import { Box, Typography, Button, Container, Paper } from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'

const AuthSuccessPage: React.FC = () => {
  const handleReturnToApp = () => {
    try {
      // Standard window close
      window.close()
      
      // More aggressive approach for stubborn windows
      setTimeout(() => {
        window.open('', '_self').close()
      }, 100)
      
      // If all else fails, replace with blank page then try to close
      setTimeout(() => {
        if (!window.closed) {
          window.location.replace('about:blank')
          setTimeout(() => {
            window.close()
          }, 100)
        }
      }, 300)
      
      // Ultimate fallback - redirect to main app after attempts
      setTimeout(() => {
        if (!window.closed) {
          console.log('🔄 Window close failed, redirecting to main app...')
          window.location.href = window.location.origin
        }
      }, 1000)
      
    } catch (error) {
      console.error('Error closing window:', error)
      // Emergency fallback
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
        padding: { xs: 2, sm: 3, md: 4 }
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
            padding: { xs: 3, sm: 4, md: 6 },
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
              fontSize: { xs: 48, sm: 56, md: 64 }, 
              color: '#4caf50', 
              marginBottom: { xs: 2, sm: 3 }
            }} 
          />
          
          {/* Success Message */}
          <Typography 
            variant="h4" 
            component="h1" 
            sx={{ 
              color: '#000000', 
              fontWeight: 500, 
              marginBottom: { xs: 1.5, sm: 2 },
              fontSize: { xs: '1.5rem', sm: '2rem', md: '2.125rem' }
            }}
          >
            Login Successful!
          </Typography>
          
          <Typography 
            variant="body1" 
            sx={{ 
              color: '#666666', 
              marginBottom: { xs: 3, sm: 4 },
              lineHeight: 1.6,
              fontSize: { xs: '0.9rem', sm: '1rem' },
              px: { xs: 1, sm: 2 }
            }}
          >
            You have successfully signed in to Treer. 
            Please return to your original page to continue.
          </Typography>
          
          {/* Return Button */}
          <Button
            variant="contained"
            size="large"
            onClick={handleReturnToApp}
            title="Click to close this window and return to the main application"
            sx={{
              backgroundColor: '#4caf50',
              color: '#ffffff',
              padding: { xs: '10px 24px', sm: '12px 32px' },
              fontSize: { xs: '14px', sm: '16px' },
              fontWeight: 500,
              borderRadius: 2,
              textTransform: 'none',
              minWidth: { xs: '200px', sm: '250px' },
              marginBottom: 2,
              '&:hover': {
                backgroundColor: '#45a049'
              }
            }}
          >
            Close Window & Return to App
          </Button>

          
          {/* Helper Text */}
          <Typography 
            variant="caption" 
            sx={{ 
              color: '#999999', 
              marginTop: { xs: 1.5, sm: 2 },
              fontSize: { xs: '12px', sm: '14px' },
              display: 'block'
            }}
          >
            This window will close automatically
          </Typography>
        </Paper>
      </Container>
    </Box>
  )
}

export default AuthSuccessPage 