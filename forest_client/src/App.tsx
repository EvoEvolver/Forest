import React, {useEffect, useRef, useState} from 'react';
import {Box, Grid} from "@mui/material";
import axios from "axios";
import {atom, useAtom, useSetAtom} from "jotai";
import {addNodeToTreeAtom, darkModeAtom, initializeTreeAtom, selectedNodeIdAtom, treeAtom} from "./TreeState/TreeState";
import TreeView from "./TreeView";
import Treemap from "./TreeMap";
import {useAtomValue} from "jotai/index";
import * as Y from "yjs";
import {WebsocketProvider} from 'y-websocket'
import {YMap} from "yjs/dist/src/types/YMap";
import {countChildren} from "./process_tree";

const currentPort = (process.env.NODE_ENV || 'development') == 'development' ? "29999" : window.location.port;

const YDocAtom = atom(new Y.Doc());
const YjsProviderAtom = atom();
const YMapTreesAtom = atom<YMap<YMap<any>>>((get) => {
    return get(YDocAtom).getMap("trees")
})

// check whether current address starts with http or https
const http_prefix = window.location.protocol


export default function App() {

    const [page, setPage] = useState(0);
    const [currPage, setCurrPage] = useState(0);
    const [, setDark] = useAtom(darkModeAtom)
    const [tree, setTree] = useAtom(treeAtom);
    const [, setSelectedNodeId] = useAtom(selectedNodeIdAtom)
    const contentRef = useRef();
    const [wsProvider, setYjsProvider] = useAtom(YjsProviderAtom)
    const ydoc = useAtomValue(YDocAtom)
    const ymapTrees = useAtomValue(YMapTreesAtom)
    const addNodeToTree = useSetAtom(addNodeToTreeAtom)


    const setupYDoc = () => {
        setTree({
            metadata: {},
            nodeDict: {}
        })
        const treeId = new URLSearchParams(window.location.search).get("id");
        setSelectedNodeId(treeId)
        let wsProvider = new WebsocketProvider(`ws://${location.hostname}:${currentPort}`, treeId, ydoc)
        setYjsProvider(wsProvider)
        wsProvider.on('status', event => {
            console.log("wsProvider", event.status) // logs "connected" or "disconnected"
        })
        let nodeDictyMap = ydoc.getMap("nodeDict")
        nodeDictyMap.observe((ymapEvent) => {
            console.log("ymapEvent", ymapEvent)
            ymapEvent.changes.keys.forEach((change, key) => {
                if (change.action === 'add') {
                  console.log(`Property "${key}" was added. Initial value:`, nodeDictyMap.get(key).toJSON())
                  addNodeToTree(nodeDictyMap.get(key).toJSON())
                } else if (change.action === 'update') {
                  console.log(`Property "${key}" was updated. New value: "${nodeDictyMap.get(key)}". Previous value: "${change.oldValue}".`)
                } else if (change.action === 'delete') {
                  console.log(`Property "${key}" was deleted. New value: undefined. Previous value: "${change.oldValue}".`)
                }
              })
        })
    }

    async function requestTrees() {
        const treeId = new URLSearchParams(window.location.search).get("id");
        const res = await axios.get(`${http_prefix}//${location.hostname}:${currentPort}/api/getTree`, {
            params: {
                tree_id: treeId
            }
        });
        let treeData = res.data;
        countChildren(treeData)
        console.log("Received whole tree", treeId, treeData)
        initializeTreeAtom(treeData.nodeDict, setTree);
        setSelectedNodeId(treeId)
    }

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        setDark(window.matchMedia('(prefers-color-scheme: dark)').matches);
        const treeId = new URLSearchParams(window.location.search).get("id");
        console.log(treeId);
        //setCurrTreeId(treeId)
        //requestTrees()

        setupYDoc()
    }, []);


    const handleToggle = () => {
        setCurrPage(currPage === 0 ? 1 : 0);
        setPage(page === 0 ? 1 : 0);
    };

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


                <Grid item style={{height: "100%", boxSizing: "border-box"}}>
                    <Box style={{width: "100vw", height: "100vh", flexGrow: 1, boxSizing: "border-box"}}>
                        {/*make two buttons to change between focus page and treemap. the buttons should be fixed to top left.*/}
                        {tree && page === 0 &&
                            <TreeView contentRef={contentRef}/>}
                        {tree && page === 1 &&
                            <Treemap/>}
                    </Box>
                </Grid>


            </Grid>
        </>
    );
}