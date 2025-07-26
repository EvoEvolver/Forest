import React, {lazy, Suspense, useEffect, useState} from 'react';
import {Box, CssBaseline} from "@mui/material";
import {atom, useAtom, useAtomValue, useSetAtom} from "jotai";
import TreeView from "./TreeView/TreeView";
import {setupYDocAtom, YjsProviderAtom} from "./TreeState/YjsConnection";
import LinearView from "./LinearView";
import AuthModal from '../../user-system/src/AuthModal';
import {subscriptionAtom, supabaseClientAtom, userAtom} from "../../user-system/src/authStates";
import {AppBarLeft, AppBarRight} from "./AppBar";
import {currentPageAtom, treeId} from "./appState";
import {getPastelHexFromUsername, getRandomAnimal} from "@forest/user-system/src/helper";
import {recordTreeVisit} from "./TreeState/treeVisitService";
import {treeAtom} from "./TreeState/TreeState";

// @ts-ignore
const FlowVisualizer = lazy(() => import('./FlowView'));

export default function App() {
    const [subscription, setSubscription] = useAtom(subscriptionAtom);
    const [currentPage, setCurrentPage] = useAtom(currentPageAtom);
    const supabaseClient = useAtomValue(supabaseClientAtom)
    const setupYDoc = useSetAtom(setupYDocAtom);

    useEffect(() => {
        if (treeId) {
            setupYDoc()
        }
        setSubscription()
        return () => {
            if (subscription)
                subscription.unsubscribe()
        }
    }, []);

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