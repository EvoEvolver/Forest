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
import {MyAppBar} from "./AppBar";
import {treeId} from "./appState";


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

    return (
        <>
            <ThemeProvider theme={themeOptions}>
                <Box sx={{display: 'flex', flexDirection: 'column', width: '100%', height: '100vh'}}>
                    <Box sx={{width: '100%'}}>
                        <MyAppBar setCurrentPage={setCurrentPage} currentPage={currentPage}/>
                    </Box>
                    <Box sx={{height: 'calc(100% - 48px)', boxSizing: 'border-box', 'paddingTop': '4px'}}>
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
            return <LinearViewPage/>;
        default:
            return <TreeViewPage/>;
    }
};
