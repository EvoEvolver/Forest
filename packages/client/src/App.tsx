import React, {lazy, Suspense, useEffect, useState} from 'react';
import {Box, CssBaseline} from "@mui/material";
import {ThemeProvider} from '@mui/material/styles';
import {useAtom, useAtomValue, useSetAtom} from "jotai";
import TreeView from "./TreeView/TreeView";
import {setupYDocAtom} from "./TreeState/YjsConnection";
import LinearView from "./LinearView";
import AuthModal from '../../user-system/src/AuthModal';
import {themeOptions} from "./theme";
import {subscriptionAtom, supabaseClientAtom} from "../../user-system/src/authStates";
import {MyAppBar} from "./AppBar";
import {treeId} from "./appState";

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

    const appBarHeight = 55;

    return (
        <>
            <ThemeProvider theme={themeOptions}>
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
            </ThemeProvider>
        </>
    );
}


const TreeViewPage = () => (
    <Box style={{width: "100vw", height: "100%", flexGrow: 1, boxSizing: "border-box"}}>
        <TreeView/>
    </Box>
);

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
