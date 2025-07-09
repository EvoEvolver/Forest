import React, {useEffect, useState} from 'react';
import {AppBar, Container, Toolbar} from '@mui/material';
import IssueList from './components/IssueList/IssueList';
import AuthButton from "@forest/user-system/src/AuthButton";
import {subscriptionAtom, supabaseClientAtom} from "@forest/user-system/src/authStates";
import {useAtom, useAtomValue} from "jotai";

function IssuePanel() {
    // Demo tree ID - in a real application, this would come from props or routing
    const demoTreeId = 'demo-tree';
    const [subscription, setSubscription] = useAtom(subscriptionAtom);
    const supabaseClient = useAtomValue(supabaseClientAtom)

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
            <IssueList treeId={demoTreeId}/>
        </Container>
    </>
}

export default IssuePanel;
