import React, {useEffect, useState} from 'react';
import {Box} from "@mui/material";
import {ThemeProvider} from '@mui/material/styles';
import {useAtom, useAtomValue, useSetAtom} from "jotai";
import {
    addNodeToNodeDictAtom,
    deleteNodeFromNodeDictAtom,
    selectedNodeIdAtom,
    setTreeMetadataAtom
} from "./TreeState/TreeState";
import TreeView from "./TreeView/TreeView";
import {Map as YMap} from "yjs";
import {setupYDoc, YDocAtom, YjsProviderAtom} from "./TreeState/YjsConnection";
import LinearView from "./LinearView";
import AuthModal from './UserSystem/AuthModal';
import {updateChildrenCountAtom} from "./TreeState/childrenCount";
import {themeOptions} from "./theme";
import {subscriptionAtom, supabaseClientAtom} from "./UserSystem/authStates";
import {getAppBar} from "./AppBar";
import {treeId} from "./appState";


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


export default function App() {
    const setSelectedNodeId = useSetAtom(selectedNodeIdAtom)
    const [, setYjsProvider] = useAtom(YjsProviderAtom)
    const ydoc = useAtomValue(YDocAtom)
    const addNodeToTree = useSetAtom(addNodeToNodeDictAtom)
    const deleteNodeFromTree = useSetAtom(deleteNodeFromNodeDictAtom)
    const setTreeMetadata = useSetAtom(setTreeMetadataAtom);
    const updateChildrenCount = useSetAtom(updateChildrenCountAtom);
    const [subscription, setSubscription] = useAtom(subscriptionAtom);
    const [currentPage, setCurrentPage] = useState('tree');
    const supabaseClient = useAtomValue(supabaseClientAtom)

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        //setDark(window.matchMedia('(prefers-color-scheme: dark)').matches);
        // disable dark mode until we finish it
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
                        {getAppBar(setCurrentPage, currentPage)}
                    </Box>
                    <Box sx={{height: 'calc(100% - 48px)', boxSizing: 'border-box', 'paddingTop': '4px'}}>
                        {renderSelectedPage(currentPage)}
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

const renderSelectedPage = (currentPage) => {
    switch (currentPage) {
        case 'tree':
            return <TreeViewPage/>;
        case 'linear':
            return <LinearViewPage/>;
        default:
            return <TreeViewPage/>;
    }
};
