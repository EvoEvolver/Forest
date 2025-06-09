import React, {useEffect, useRef, useState} from 'react';
import {AppBar, Box, Button, Stack, Toolbar} from "@mui/material";
import {ThemeProvider} from '@mui/material/styles';
import {useAtom, useAtomValue, useSetAtom} from "jotai";
import {
    addNodeToTreeAtom,
    darkModeAtom,
    deleteNodeFromTreeAtom,
    selectedNodeIdAtom,
    setTreeMetadataAtom
} from "./TreeState/TreeState";
import TreeView from "./TreeView";
import {WebsocketProvider} from 'y-websocket'
import {Map as YMap} from "yjs";
import {YDocAtom, YjsProviderAtom} from "./TreeState/YjsConnection";
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import ArticleIcon from '@mui/icons-material/Article';
import LinearView from "./LinearView";
import {supabase} from './supabase';
import AuthButton from './components/AuthButton';
import AuthModal from './components/AuthModal';
import AuthSuccessPage from './components/AuthSuccessPage';
import {updateChildrenCountAtom} from "./TreeState/childrenCount";
import {themeOptions} from "./theme";
import {authTokenAtom, supabaseClientAtom, userAtom, userPermissionsAtom} from "./components/authStates";

const isDevMode = (import.meta.env.MODE === 'development');
const currentPort = (process.env.NODE_ENV || 'development') == 'development' ? "29999" : window.location.port;
const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
const wsUrl = `${wsProtocol}://${location.hostname}:${currentPort}`
export const httpUrl = `${window.location.protocol}//${location.hostname}:${currentPort}`
const treeId = new URLSearchParams(window.location.search).get("id");

const setupYDoc = (setYjsProvider, addNodeToTree, ydoc, deleteNodeFromTree, observeSync) => {
    let wsProvider = new WebsocketProvider(wsUrl, treeId, ydoc)
    setYjsProvider(wsProvider)
    wsProvider.on('status', event => {
        console.log("Server connected!", event)
    })
    wsProvider.on('sync', isSynced => {
        if (isSynced) {
            observeSync()
        }
    })
    let nodeDictyMap: YMap<YMap<any>> = ydoc.getMap("nodeDict")
    nodeDictyMap.observe((ymapEvent) => {
        ymapEvent.changes.keys.forEach((change, key) => {
            if (change.action === 'add') {
                let newNode = nodeDictyMap.get(key)
                addNodeToTree(newNode)
            } else if (change.action === 'update') {
                let newNode = nodeDictyMap.get(key)
                deleteNodeFromTree(key)
                addNodeToTree(newNode)
            } else if (change.action === 'delete') {
                deleteNodeFromTree(key)
            }
        })
    })
}

const initSelectedNode = (ydoc, setSelectedNodeId) => {
    let nodeId = new URLSearchParams(window.location.search).get("n");
    const nodeDict = ydoc.getMap("nodeDict") as YMap<any>;
    if (!nodeId) nodeId = ydoc.getMap("metadata").get("rootId") || null;
    if (!nodeId) return;
    // observe the nodeDict for changes
    const observer = (ymapEvent) => {
        if (ymapEvent.keys.has(nodeId)) {
            setSelectedNodeId(nodeId);
            // unobserve the nodeDict after setting the selected node
            nodeDict.unobserve(observer);
        }
    }
    nodeDict.observe(observer)
    // unobserve the nodeDict after 10 seconds
    setTimeout(() => {
        nodeDict.unobserve(observer);
    }, 10000);
}


function setupAuth(setSupabaseClient, setUser, setAuthToken, setUserPermissions) {
    // Initialize Supabase client in atom
    setSupabaseClient(supabase)

    // Get current session on app startup (CRITICAL for session restoration)
    const initializeSession = async () => {
        try {
            const { data: { session }, error } = await supabase.auth.getSession()
            if (error) {
                console.error('Error getting session:', error)
                return
            }
            
            if (session) {
                console.log('Restoring existing session:', session.user.email)
                // Restore existing session
                setUser({
                    id: session.user.id,
                    email: session.user.email || '',
                    ...session.user.user_metadata
                })
                setAuthToken(session.access_token)
                setUserPermissions({
                    canUseAI: true,
                    canUploadFiles: true,
                    maxFileSize: 10,
                })
            }
        } catch (error) {
            console.error('Error initializing session:', error)
        }
    }
    
    // Initialize session immediately
    initializeSession()

    // Set up auth state change listener
    const {data: {subscription}} = supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email)
        
        if (session) {
            // User is signed in
            setUser({
                id: session.user.id,
                email: session.user.email || '',
                ...session.user.user_metadata
            })
            setAuthToken(session.access_token)

            // Set default permissions (draft)
            setUserPermissions({
                canUseAI: true,
                canUploadFiles: true,
                maxFileSize: 10, // 10MB default
            })
        } else {
            // User is signed out
            setUser(null)
            setAuthToken(null)
            setUserPermissions({
                canUseAI: false,
                canUploadFiles: false,
                maxFileSize: 0
            })
        }
    })
    return subscription;
}

export default function App() {

    const setDark = useSetAtom(darkModeAtom)
    const setSelectedNodeId = useSetAtom(selectedNodeIdAtom)
    const contentRef = useRef();
    const [, setYjsProvider] = useAtom(YjsProviderAtom)
    const ydoc = useAtomValue(YDocAtom)
    const addNodeToTree = useSetAtom(addNodeToTreeAtom)
    const deleteNodeFromTree = useSetAtom(deleteNodeFromTreeAtom)
    const setTreeMetadata = useSetAtom(setTreeMetadataAtom);
    const updateChildrenCount = useSetAtom(updateChildrenCountAtom);

    // Authentication state
    const [, setUser] = useAtom(userAtom)
    const [, setAuthToken] = useAtom(authTokenAtom)
    const [, setUserPermissions] = useAtom(userPermissionsAtom)
    const [, setSupabaseClient] = useAtom(supabaseClientAtom)

    const [currentPage, setCurrentPage] = useState('tree');

    // Check if current URL is auth-success route
   // const isAuthSuccessPage = window.location.pathname === '/auth-success';
    const isAuthSuccessPage = window.location.pathname.includes('/auth-success');

    // If on auth-success page, render only AuthSuccessPage
    if (isAuthSuccessPage) {
        return <AuthSuccessPage/>;
    }

    const renderPage = () => {
        switch (currentPage) {
            case 'tree':
                return <TreeViewPage contentRef={contentRef}/>;
            case 'linear':
                return <SecondPage/>;
            default:
                return <TreeViewPage contentRef={contentRef}/>;
        }
    };

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        //setDark(window.matchMedia('(prefers-color-scheme: dark)').matches);
        // disable dark mode until we finish it
        setDark(false)
        if (treeId) {
            setupYDoc(setYjsProvider, addNodeToTree, ydoc, deleteNodeFromTree, () => {
                const treeMetadata = ydoc.getMap("metadata").toJSON()
                console.log('Yjs sync completed', treeMetadata)
                // Set up the metadata map
                setTreeMetadata(treeMetadata)
                updateChildrenCount({});
            })
            initSelectedNode(ydoc, setSelectedNodeId);
            setTreeMetadata({
                treeId: treeId
            })
        }
        let subscription
        if (supabase)
            subscription = setupAuth(setSupabaseClient, setUser, setAuthToken, setUserPermissions);
        return () => {
            if (supabase)
                subscription.unsubscribe()
        }
    }, []);

    return (
        <>
            <ThemeProvider theme={themeOptions}>
                <Box sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    width: '100%',
                    height: '100vh'
                }}>
                    <Box sx={{width: '100%'}}>
                        <AppBar position="static">
                            <Toolbar variant="dense">
                                <Stack direction="row" spacing={2} sx={{flexGrow: 1}}>
                                    <Button
                                        color="inherit"
                                        onClick={() => setCurrentPage('tree')}
                                        variant={currentPage === 'tree' ? 'outlined' : 'text'}
                                    >
                                        <AccountTreeIcon/>
                                    </Button>
                                    <Button
                                        color="inherit"
                                        onClick={() => setCurrentPage('linear')}
                                        variant={currentPage === 'second' ? 'outlined' : 'text'}
                                    >
                                        <ArticleIcon/>
                                    </Button>
                                </Stack>

                                {/* Auth button in the top right */}
                                {supabase && <AuthButton/>}
                            </Toolbar>
                        </AppBar>
                    </Box>
                    <Box sx={{
                        height: 'calc(100% - 48px)',
                        boxSizing: 'border-box'
                    }}>
                        {renderPage()}
                    </Box>
                </Box>

                {/* Auth Modal */}
                {supabase && <AuthModal/>}
            </ThemeProvider>
        </>
    );
}


const TreeViewPage = ({contentRef}) => (
    <Box style={{width: "100vw", height: "100%", flexGrow: 1, boxSizing: "border-box"}}>
        <TreeView contentRef={contentRef}/>
    </Box>
);

const SecondPage = () => (
    <Box style={{width: "100vw", height: "100%", flexGrow: 1, boxSizing: "border-box"}}>
        <LinearView/>
    </Box>
);
