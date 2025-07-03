import React, {useEffect, useState} from 'react';
import {Box} from "@mui/material";
import {ThemeProvider} from '@mui/material/styles';
import {useAtom, useAtomValue, useSetAtom} from "jotai";
import TreeView from "./TreeView/TreeView";
import {setupYDocAtom} from "./TreeState/YjsConnection";
import LinearView from "./LinearView";
import AuthModal from './UserSystem/AuthModal';
import {themeOptions} from "./theme";
import {subscriptionAtom, supabaseClientAtom} from "./UserSystem/authStates";
import {AppBarLeft, AppBarRight} from "./AppBar";
import {treeId} from "./appState";

export default function App() {
    const [subscription, setSubscription] = useAtom(subscriptionAtom);
    const [currentPage, setCurrentPage] = useState('tree');
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

    return (
        <>
            <ThemeProvider theme={themeOptions}>
                <Box sx={{display: 'flex', flexDirection: 'column', width: '100%', height: '100vh'}}>
                    {/* Floating top bar with left and right sections */}
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
                    <Box sx={{boxSizing: 'border-box', height: '100%', position: 'relative', overflow: 'auto'}}>
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
    <Box style={{width: "100vw", height: "100%", flexGrow: 1, overflow: 'auto', boxSizing: "border-box"}}>
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
            return <LinearViewPage/>;
        default:
            return <TreeViewPage/>;
    }
};