import React, {useEffect} from 'react';
import {AppBar, Container, Toolbar, Typography} from '@mui/material';
import IssueList from './components/IssueList/IssueList';
import AuthButton from "@forest/user-system/src/AuthButton";
import {subscriptionAtom, supabaseClientAtom} from "@forest/user-system/src/authStates";
import {useAtom, useAtomValue} from "jotai";
import AuthModal from "@forest/user-system/src/AuthModal";

function IssuePanel() {
    const [subscription, setSubscription] = useAtom(subscriptionAtom);
    const supabaseClient = useAtomValue(supabaseClientAtom);

    // Get treeId from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const treeId = urlParams.get('treeId');

    useEffect(() => {
        setSubscription()
        return () => {
            if (subscription)
                subscription.unsubscribe()
        }
    }, []);

    return <>
        <AppBar position="fixed">
            <Toolbar variant="dense">
                {supabaseClient && <AuthButton/>}
            </Toolbar>
        </AppBar>
        {supabaseClient && <AuthModal/>}
        <Container maxWidth="xl" sx={{
            pb: 3, 
            height: '100vh', // Full viewport height
            display: 'flex',
            flexDirection: 'column',
            //paddingTop: '48px' 
        }}>
            {treeId ? (
                <IssueList treeId={treeId} simple={false}/>
            ) : (
                <Typography variant="h6" color="error">
                    No tree ID provided. Please add a treeId parameter to the URL.
                </Typography>
            )}
        </Container>
    </>
}

export default IssuePanel;