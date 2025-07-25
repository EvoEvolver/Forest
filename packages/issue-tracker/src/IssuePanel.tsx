import React, {useEffect} from 'react';
import {Container, Typography} from '@mui/material';
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
        {supabaseClient && (
            <div style={{
                position: 'fixed',
                top: '20px',
                right: '20px',
                zIndex: 1000,
                backgroundColor: 'white',
                borderRadius: '12px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                padding: '8px 12px'
            }}>
                <AuthButton/>
            </div>
        )}
        {supabaseClient && <AuthModal/>}
        <Container maxWidth="xl" sx={{
            pb: 3,
            pt: '20px', // Reduced since no AppBar
            px: 0, // Remove default horizontal padding from Container
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxSizing: 'border-box',
            backgroundColor: '#f0f0f0' // Grey background like TreeView
        }}>
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: '10px',
                    backgroundColor: 'white',
                    boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
                    transition: 'opacity 0.2s ease',
                }}>
            {treeId ? (
                <IssueList treeId={treeId} simple={false}/>
            ) : (
                <Typography variant="h6" color="error">
                    No tree ID provided. Please add a treeId parameter to the URL.
                </Typography>
            )}
            </div>
        </Container>
    </>
}

export default IssuePanel;