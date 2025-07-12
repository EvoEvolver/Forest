import React, {lazy, Suspense, useEffect, useState} from 'react';
import {Box, CssBaseline} from "@mui/material";
import {useAtom, useAtomValue, useSetAtom} from "jotai";
import TreeView from "./TreeView/TreeView";
import {setupYDocAtom, YjsProviderAtom} from "./TreeState/YjsConnection";
import LinearView from "./LinearView";
import AuthModal from '../../user-system/src/AuthModal';
import {subscriptionAtom, supabaseClientAtom, userAtom} from "../../user-system/src/authStates";
import {MyAppBar} from "./AppBar";
import {treeId} from "./appState";
import {getPastelHexFromUsername, getRandomAnimal} from "@forest/user-system/src/helper";
import {recordTreeVisit} from "./TreeState/treeVisitService";
import {treeAtom} from "./TreeState/TreeState";

// @ts-ignore
const FlowVisualizer = lazy(() => import('./FlowView'));


export default function App() {
    const [subscription, setSubscription] = useAtom(subscriptionAtom);
    const [currentPage, setCurrentPage] = useState('tree');
    const supabaseClient = useAtomValue(supabaseClientAtom)
    const setupYDoc = useSetAtom(setupYDocAtom);

    useEffect(() => {
        document.body.style.overflow = 'hidden';
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

    const appBarHeight = 55;

    return (
        <>

            <Box sx={{display: 'flex', flexDirection: 'column', height: '100dvh'}}>
                <CssBaseline/>
                <Box sx={{width: '100%'}}>
                    <MyAppBar setCurrentPage={setCurrentPage} currentPage={currentPage}/>
                </Box>
                <Box
                    flexGrow={1}
                    overflow="auto"
                    p={2}
                    pt={`${appBarHeight}px`}
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
    return <Box style={{width: "100vw", height: "100%", flexGrow: 1, boxSizing: "border-box"}}>
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