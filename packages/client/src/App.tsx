import React, {lazy, Suspense, useEffect, useState} from 'react';
import {Box, CssBaseline} from "@mui/material";
import {atom, useAtom, useAtomValue, useSetAtom} from "jotai";
import TreeView from "./TreeView/TreeView";
import {setupYDocAtom, YjsProviderAtom} from "./TreeState/YjsConnection";
import LinearView from "./LinearView";
import AuthModal from '../../user-system/src/AuthModal';
import {subscriptionAtom, supabaseClientAtom, userAtom, userPanelModalOpenAtom} from "../../user-system/src/authStates";
import {AppBarLeft, AppBarRight} from "./AppBar";
import {currentPageAtom, treeId} from "./appState";
import {UserPanelModal} from "../../user-panel/src/UserPanelModal";
import {getPastelHexFromUsername, getRandomAnimal} from "@forest/user-system/src/helper";
import {recordTreeVisit} from "./TreeState/treeVisitService";
import {treeAtom} from "./TreeState/TreeState";
import {parseOAuthTokensFromHash, clearOAuthTokensFromUrl, hasOAuthTokensInUrl, clearSavedUrlBeforeLogin} from "../../user-system/src/authUtils";

// @ts-ignore
const FlowVisualizer = lazy(() => import('./FlowView'));

export default function App() {
    const [subscription, setSubscription] = useAtom(subscriptionAtom);
    const [currentPage, setCurrentPage] = useAtom(currentPageAtom);
    const [userPanelModalOpen, setUserPanelModalOpen] = useAtom(userPanelModalOpenAtom);
    const supabaseClient = useAtomValue(supabaseClientAtom)
    const setupYDoc = useSetAtom(setupYDocAtom);

    useEffect(() => {
        if (treeId) {
            setupYDoc()
        }
        setSubscription()
        
        // Check if user accessed /user path directly and open modal
        if (window.location.pathname === '/user') {
            setUserPanelModalOpen(true)
            // Replace the URL without page reload to remove /user from the path
            window.history.replaceState({}, '', window.location.origin + window.location.search)
        }
        
        return () => {
            if (subscription)
                subscription.unsubscribe()
        }
    }, []);

    // Handle OAuth tokens from URL hash (for direct homepage visits from OAuth providers)
    useEffect(() => {
        if (supabaseClient && hasOAuthTokensInUrl()) {
            console.log('Processing OAuth tokens from URL hash...')
            const tokens = parseOAuthTokensFromHash()
            console.log('Parsed tokens:', {
                hasAccessToken: !!tokens?.access_token,
                hasRefreshToken: !!tokens?.refresh_token,
                expiresAt: tokens?.expires_at,
                expiresIn: tokens?.expires_in,
                tokenType: tokens?.token_type
            })
            
            if (tokens?.access_token && tokens?.refresh_token) {
                // Check if token is expired
                if (tokens.expires_at) {
                    const expiresAt = parseInt(tokens.expires_at) * 1000 // Convert to milliseconds
                    const now = Date.now()
                    if (now >= expiresAt) {
                        console.error('OAuth token has expired', {
                            expiresAt: new Date(expiresAt),
                            now: new Date(now)
                        })
                        clearOAuthTokensFromUrl()
                        return
                    }
                    console.log('Token is valid, expires at:', new Date(expiresAt))
                }
                
                console.log('Setting session with tokens...')
                supabaseClient.auth.setSession({
                    access_token: tokens.access_token,
                    refresh_token: tokens.refresh_token
                }).then(({ data, error }) => {
                    if (error) {
                        console.error('Error setting session from OAuth tokens:', error)
                        console.error('Error details:', {
                            name: error.name,
                            message: error.message,
                            status: error.status
                        })
                    } else if (data.session) {
                        console.log('OAuth session established successfully:', data.session.user.email)
                        // Clear tokens from URL
                        clearOAuthTokensFromUrl()
                        // Clear any saved pre-login URL since login was successful
                        clearSavedUrlBeforeLogin()
                    } else {
                        console.warn('No session returned from setSession')
                    }
                }).catch(error => {
                    console.error('Error processing OAuth tokens:', error)
                })
            } else {
                console.error('Missing required tokens:', {
                    hasAccessToken: !!tokens?.access_token,
                    hasRefreshToken: !!tokens?.refresh_token
                })
            }
        }
    }, [supabaseClient]); // Only run when supabaseClient is available

    const user = useAtomValue(userAtom)
    const provider = useAtomValue(YjsProviderAtom)

    useEffect(() => {
        const awareness = provider?.awareness
        if (awareness) {
            const userEmail = user?.email || '';
            console.log('Setting awareness user state for:', userEmail);
            const username = userEmail?.split('@')[0] || 'Annonymous ' + getRandomAnimal(awareness.clientID)
            awareness.setLocalStateField("user", {"name": username, "color": getPastelHexFromUsername(username)});
        }
        recordTreeVisit(treeId, supabaseClient);
    }, [user]);

    return (
        <>

            <Box sx={{display: 'flex', flexDirection: 'column', height: '100dvh'}}>
                <CssBaseline/>
                <Box sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    width: '100%',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'stretch',
                    backgroundColor: 'transparent',
                    zIndex: 1000,
                    pointerEvents: 'none' // Allow clicks to pass through empty areas
                }}>
                    <Box sx={{ pointerEvents: 'auto' }}>
                        <AppBarLeft setCurrentPage={setCurrentPage} currentPage={currentPage}/>
                    </Box>
                    <Box sx={{ pointerEvents: 'auto' }}>
                        <AppBarRight/>
                    </Box>
                </Box>

                <Box
                    flexGrow={1}
                    overflow="auto"
                    p={0}
                    pt={0}
                    bgcolor="background.default"
                    sx={{overflowX: 'hidden'}}
                >

                    <TheSelectedPage currentPage={currentPage}/>
                </Box>
            </Box>
            
            {/* Auth Modal */}
            {supabaseClient && <AuthModal/>}
            
            {/* User Panel Modal */}
            <UserPanelModal
                open={userPanelModalOpen}
                onClose={() => setUserPanelModalOpen(false)}
            />
        </>
    );
}


const TreeViewPage = () => {
    const tree = useAtomValue(treeAtom);
    if(!tree)
        return null;
    return <Box style={{width: "100vw", height: "100%", flexGrow: 1, overflow: 'auto', boxSizing: "border-box"}}>
        <TreeView/>
    </Box>
}


const LinearViewPage = () => (
    <Box style={{width: "100vw", height: "100%", flexGrow: 1, boxSizing: "border-box"}}>
        <LinearView/>
    </Box>
);

const TheSelectedPage = ({currentPage}) => {
    switch (currentPage) {
        case 'tree':
            return <TreeViewPage/>;
        case 'linear':
            return <Suspense fallback={<div>Loading...</div>}>
                <LinearViewPage/>
            </Suspense>
        case 'flow':
            return <Suspense fallback={<div>Loading...</div>}>
                <FlowVisualizer/>
            </Suspense>
        default:
            return <TreeViewPage/>;
    }
};