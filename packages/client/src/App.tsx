import React, {lazy, Suspense, useEffect, useState} from 'react';
import {Box, CssBaseline} from "@mui/material";
import {useAtom, useAtomValue, useSetAtom} from "jotai";
import TreeView from "./TreeView/TreeView";
import {setupYDocAtom, YjsProviderAtom} from "./TreeState/YjsConnection";
import LinearView from "./LinearView";
import AuthModal from '@forest/user-system/src/AuthModal';
import {supabaseClientAtom, userAtom, userPanelModalOpenAtom} from "@forest/user-system/src/authStates";
import {AppBarLeft, AppBarRight} from "./AppBar";
import {currentPageAtom, treeId} from "./appState";
import {getPastelHexFromUsername, getRandomAnimal} from "@forest/user-system/src/helper";
import {recordTreeVisit} from "./TreeState/treeVisitService";
import {treeAtom} from "./TreeState/TreeState";
import {LoadingSuspense} from "./LoadingSuspense";
import {useTheme} from "@mui/system";
import SearchModal from "./components/SearchModal";
import {searchModalOpenAtom} from "./atoms/searchModalAtoms";

const UserPanelModal = lazy(() => import("@forest/user-panel/src/UserPanelModal").then(module => ({default: module.UserPanelModal})));

// @ts-ignore
const FlowVisualizer = lazy(() => import('./FlowView'));

export default function App() {

    const supabaseClient = useAtomValue(supabaseClientAtom)
    const [currentPage, setCurrentPage] = useAtom(currentPageAtom);
    const [userPanelModalOpen, setUserPanelModalOpen] = useAtom(userPanelModalOpenAtom);
    const [searchModalOpen, setSearchModalOpen] = useAtom(searchModalOpenAtom);
    const setupYDoc = useSetAtom(setupYDocAtom);
    const theme = useTheme();

    useEffect(() => {
        // Check if no id param is present and redirect to /user
        if (!treeId && window.location.pathname === '/') {
            window.location.href = '/user';
            return;
        }

        if (treeId) {
            setupYDoc()
        }

        // Check if user accessed /user path directly and open modal
        if (window.location.pathname === '/user') {
            setUserPanelModalOpen(true)
            // Replace the URL without page reload to remove /user from the path
            window.history.replaceState({}, '', window.location.origin + window.location.search)
        }
        return () => {
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

    // Add keyboard shortcut for search
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            // Listen for both Ctrl+Shift+F and Command+Shift+F
            if (event.shiftKey && event.key === 'F' && (event.ctrlKey || event.metaKey)) {
                event.preventDefault();
                event.stopPropagation();
                setSearchModalOpen(true);
            }
        };

        document.addEventListener('keydown', handleKeyDown, true); // Use capture phase
        return () => document.removeEventListener('keydown', handleKeyDown, true);
    }, []);

    return (
        <>

            <Box sx={{
                display: 'flex',
                flexDirection: 'column',
                height: '100dvh',
                backgroundColor: theme.palette.background.default
            }}>
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
                    zIndex: 1000,
                    pointerEvents: 'none' // Allow clicks to pass through empty areas
                }}>
                    <Box sx={{pointerEvents: 'auto'}}>
                        <AppBarLeft setCurrentPage={setCurrentPage} currentPage={currentPage}/>
                    </Box>
                    <Box sx={{pointerEvents: 'auto'}}>
                        <AppBarRight/>
                    </Box>
                </Box>

                <Box
                    flexGrow={1}
                    overflow="auto"
                    p={0}
                    pt={0}
                    sx={{overflowX: 'hidden'}}
                >

                    <TheSelectedPage currentPage={currentPage}/>
                </Box>
            </Box>

            {/* Auth Modal */}
            {supabaseClient && <AuthModal/>}

            {/* User Panel Modal */}
            <Suspense fallback={null}>
                <UserPanelModal
                    open={userPanelModalOpen}
                    onClose={() => setUserPanelModalOpen(false)}
                />
            </Suspense>

            {/* Search Modal */}
            <SearchModal
                open={searchModalOpen}
                onClose={() => setSearchModalOpen(false)}
            />
        </>
    );
}


const TreeViewPage = () => {
    const tree = useAtomValue(treeAtom);
    if (!tree)
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
            return <Suspense fallback={<LoadingSuspense/>}>
                <LinearViewPage/>
            </Suspense>
        case 'flow':
            return <Suspense fallback={<LoadingSuspense/>}>
                <FlowVisualizer/>
            </Suspense>
        default:
            return <TreeViewPage/>;
    }
};