import React, {useEffect, useRef, useState} from 'react';
import {AppBar, Box, Button, Grid, Stack, Toolbar, Typography} from "@mui/material";
import {useAtom, useAtomValue, useSetAtom} from "jotai";
import {
    addNodeToTreeAtom,
    darkModeAtom,
    deleteNodeFromTreeAtom,
    selectedNodeIdAtom,
    setTreeMetadataAtom,
    userAtom,
    authTokenAtom,
    userPermissionsAtom,
    supabaseClientAtom
} from "./TreeState/TreeState";
import TreeView from "./TreeView";
import {WebsocketProvider} from 'y-websocket'
import {Map as YMap} from "yjs";
import {YDocAtom, YjsProviderAtom} from "./TreeState/YjsConnection";
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import ArticleIcon from '@mui/icons-material/Article';
import LinearView from "./LinearView";
import { supabase } from './supabase';
import AuthButton from './components/AuthButton';
import AuthModal from './components/AuthModal';
import AuthSuccessPage from './components/AuthSuccessPage';

const currentPort = (process.env.NODE_ENV || 'development') == 'development' ? "29999" : window.location.port;
const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
const wsUrl = `${wsProtocol}://${location.hostname}:${currentPort}`
export const httpUrl = `${window.location.protocol}//${location.hostname}:${currentPort}`

const setupYDoc = (setSelectedNodeId, setYjsProvider, addNodeToTree, ydoc, deleteNodeFromTree) => {
    const treeId = new URLSearchParams(window.location.search).get("id");
    setSelectedNodeId(treeId)
    let wsProvider = new WebsocketProvider(wsUrl, treeId, ydoc)
    setYjsProvider(wsProvider)
    wsProvider.on('status', event => {
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

const setToNodeInUrl = (ydoc, setSelectedNodeId) => {
    const nodeId = new URLSearchParams(window.location.search).get("n");
    const nodeDict = ydoc.getMap("nodeDict") as YMap<any>;
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


export default function App() {

    const setDark = useSetAtom(darkModeAtom)
    const setSelectedNodeId = useSetAtom(selectedNodeIdAtom)
    const contentRef = useRef();
    const [, setYjsProvider] = useAtom(YjsProviderAtom)
    const ydoc = useAtomValue(YDocAtom)
    const addNodeToTree = useSetAtom(addNodeToTreeAtom)
    const deleteNodeFromTree = useSetAtom(deleteNodeFromTreeAtom)
    const setTreeMetadata = useSetAtom(setTreeMetadataAtom);
    
    // Authentication state
    const [, setUser] = useAtom(userAtom)
    const [, setAuthToken] = useAtom(authTokenAtom)
    const [, setUserPermissions] = useAtom(userPermissionsAtom)
    const [, setSupabaseClient] = useAtom(supabaseClientAtom)

    const [currentPage, setCurrentPage] = useState('tree');

    // Check if current URL is auth-success route
    const isAuthSuccessPage = window.location.pathname === '/auth-success';

    // If on auth-success page, render only AuthSuccessPage
    if (isAuthSuccessPage) {
        return <AuthSuccessPage />;
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
        setDark(window.matchMedia('(prefers-color-scheme: dark)').matches);
        setupYDoc(setSelectedNodeId, setYjsProvider, addNodeToTree, ydoc, deleteNodeFromTree);
        setToNodeInUrl(ydoc, setSelectedNodeId);
        setTreeMetadata({
            id: new URLSearchParams(window.location.search).get("id")
        })

        // Initialize Supabase client in atom
        setSupabaseClient(supabase)

        // Set up auth state change listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
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

        return () => {
            subscription.unsubscribe()
        }
    }, []);

    return (
        <>
            <Grid container
                  style={{
                      width: "100%",
                      height: "100vh",
                      display: "flex",
                      flexDirection: "column",
                      flex: "1 1 100%",
                      boxSizing: "border-box"
                  }}>
                <Grid item style={{width: "100%"}}>
                    <AppBar position="static">
                        <Toolbar variant="dense">
                            <Typography variant="h6" component="div" sx={{marginRight: 3}}>
                                Treer
                            </Typography>
                            <Stack direction="row" spacing={2} sx={{ flexGrow: 1 }}>
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
                            <AuthButton />
                        </Toolbar>
                    </AppBar>
                </Grid>
                <Grid item style={{height: "calc(100% - 48px)", boxSizing: "border-box"}}>
                    {renderPage()}
                </Grid>
            </Grid>
            
            {/* Auth Modal */}
            <AuthModal />
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
