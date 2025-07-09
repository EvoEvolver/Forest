import React, {useEffect} from 'react';
import {AppBar, Container, Toolbar, Typography} from '@mui/material';
import IssueList from './components/IssueList/IssueList';
import AuthButton from "@forest/user-system/src/AuthButton";
import {subscriptionAtom, supabaseClientAtom} from "@forest/user-system/src/authStates";
import {useAtom, useAtomValue} from "jotai";

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
        <Container maxWidth="xl" sx={{py: 4, paddingTop: 10}}>
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