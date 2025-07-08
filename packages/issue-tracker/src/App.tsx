import React from 'react';
import {createTheme, ThemeProvider} from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import {Container} from '@mui/material';
import IssueList from './components/IssueList/IssueList.tsx';

// Create a custom theme
const theme = createTheme({
    palette: {
        mode: 'light',
        primary: {
            main: '#1976d2',
        },
        secondary: {
            main: '#dc004e',
        },
    },
    typography: {
        fontFamily: [
            'Roboto',
            '-apple-system',
            'BlinkMacSystemFont',
            '"Segoe UI"',
            'Arial',
            'sans-serif',
        ].join(','),
    },
});

function App() {
    // Demo tree ID - in a real application, this would come from props or routing
    const demoTreeId = 'demo-tree';

    return (
        <ThemeProvider theme={theme}>
            <CssBaseline/>
            <Container maxWidth="xl" sx={{py: 4}}>
                {/* <Box sx={{ mb: 4 }}>
          <Typography variant="h3" component="h1" gutterBottom>
            Issue Management System
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage and track issues for your project trees
          </Typography>
        </Box> */}

                <IssueList treeId={demoTreeId}/>
            </Container>
        </ThemeProvider>
    );
}

export default App;
