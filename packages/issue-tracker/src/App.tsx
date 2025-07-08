import React from 'react';
import {Container} from '@mui/material';
import IssueList from './components/IssueList/IssueList';


function App() {
    // Demo tree ID - in a real application, this would come from props or routing
    const demoTreeId = 'demo-tree';

    return (
        <Container maxWidth="xl" sx={{py: 4}}>
            <IssueList treeId={demoTreeId}/>
        </Container>
    );
}

export default App;
