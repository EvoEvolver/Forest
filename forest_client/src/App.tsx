import React, {useEffect, useRef, useState} from 'react';
import {Box, Button, Grid, Stack} from "@mui/material";
import {useAtom, useSetAtom} from "jotai";
import {
    addNodeToTreeAtom,
    darkModeAtom,
    deleteNodeFromTreeAtom,
    selectedNodeIdAtom
} from "./TreeState/TreeState";
import TreeView from "./TreeView";
import {useAtomValue} from "jotai";
import {WebsocketProvider} from 'y-websocket'
import {Map as YMap} from "yjs";
import {YDocAtom, YjsProviderAtom} from "./TreeState/YjsConnection";
import {AppBar, Toolbar, Typography} from "@mui/material";
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import ArticleIcon from '@mui/icons-material/Article';
import LinearView from "./LinearView";
const currentPort = (process.env.NODE_ENV || 'development') == 'development' ? "29999" : window.location.port;
const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
const wsUrl = `${wsProtocol}://${location.hostname}:${currentPort}`
export const httpUrl = `${window.location.protocol}//${location.hostname}:${currentPort}`
const setupYDoc = (setSelectedNodeId, setYjsProvider,addNodeToTree,ydoc, deleteNodeFromTree) => {
    const treeId = new URLSearchParams(window.location.search).get("id");
    setSelectedNodeId(treeId)
    let wsProvider = new WebsocketProvider(wsUrl, treeId, ydoc)
    setYjsProvider(wsProvider)
    wsProvider.on('status', event => {
        console.log("wsProvider", event.status) // logs "connected" or "disconnected"
    })
    let nodeDictyMap: YMap<YMap<any>> = ydoc.getMap("nodeDict")
    nodeDictyMap.observe((ymapEvent) => {
        console.log("ymapEvent", ymapEvent)
        ymapEvent.changes.keys.forEach((change, key) => {
            if (change.action === 'add') {
                let newNode = nodeDictyMap.get(key)
                console.log(`Property "${key}" was added. Initial value:`, nodeDictyMap.get(key).toJSON())
                addNodeToTree(newNode)
            } else if (change.action === 'update') {
                //console.log(`Property "${key}" was updated. New value: "${nodeDictyMap.get(key)}". Previous value: "${change.oldValue}".`)
                let newNode = nodeDictyMap.get(key)
                deleteNodeFromTree(key)
                addNodeToTree(newNode)
            } else if (change.action === 'delete') {
                //console.log(`Property "${key}" was deleted. New value: undefined. Previous value: "${change.oldValue}".`)
                deleteNodeFromTree(key)
            }
        })
    })
}


export default function App() {

    const setDark = useSetAtom(darkModeAtom)
    const setSelectedNodeId = useSetAtom(selectedNodeIdAtom)
    const contentRef = useRef();
    const [, setYjsProvider] = useAtom(YjsProviderAtom)
    const ydoc = useAtomValue(YDocAtom)
    const addNodeToTree = useSetAtom(addNodeToTreeAtom)
    const deleteNodeFromTree = useSetAtom(deleteNodeFromTreeAtom)
    const [currentPage, setCurrentPage] = useState('tree');
    const renderPage = () => {
        switch(currentPage) {
            case 'tree':
                return <TreeViewPage contentRef={contentRef} />;
            case 'linear':
                return <SecondPage />;
            default:
                return <TreeViewPage contentRef={contentRef} />;
        }
    };


    useEffect(() => {
        document.body.style.overflow = 'hidden';
        setDark(window.matchMedia('(prefers-color-scheme: dark)').matches);
        setupYDoc(setSelectedNodeId, setYjsProvider, addNodeToTree, ydoc, deleteNodeFromTree);
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
                            <Typography variant="h6" component="div" sx={{ marginRight: 3 }}>
                                Treer
                            </Typography>
                            <Stack direction="row" spacing={2}>
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
                        </Toolbar>
                    </AppBar>
                </Grid>
                <Grid item style={{height: "calc(100% - 48px)", boxSizing: "border-box"}}>
                    {renderPage()}
                </Grid>
            </Grid>
        </>
    );
}


const TreeViewPage = ({ contentRef }) => (
    <Box style={{width: "100vw", height: "100%", flexGrow: 1, boxSizing: "border-box"}}>
        <TreeView contentRef={contentRef}/>
    </Box>
);

const SecondPage = () => (
    <Box style={{width: "100vw", height: "100%", flexGrow: 1, boxSizing: "border-box"}}>
        <LinearView/>
    </Box>
);
