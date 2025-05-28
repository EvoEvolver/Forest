import React, {useEffect, useRef} from 'react';
import {Box, Grid} from "@mui/material";
import {useAtom, useSetAtom} from "jotai";
import {
    addNodeToTreeAtom,
    darkModeAtom,
    deleteNodeFromTreeAtom,
    selectedNodeIdAtom,
    treeAtom
} from "./TreeState/TreeState";
import TreeView from "./TreeView";
import {useAtomValue} from "jotai/index";
import {WebsocketProvider} from 'y-websocket'
import {Map as YMap} from "yjs";
import {YDocAtom, YjsProviderAtom} from "./TreeState/YjsConnection";

const currentPort = (process.env.NODE_ENV || 'development') == 'development' ? "29999" : window.location.port;
const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws'

export default function App() {

    const setDark = useSetAtom(darkModeAtom)
    const setTree = useSetAtom(treeAtom);
    const setSelectedNodeId = useSetAtom(selectedNodeIdAtom)
    const contentRef = useRef();
    const [, setYjsProvider] = useAtom(YjsProviderAtom)
    const ydoc = useAtomValue(YDocAtom)
    const addNodeToTree = useSetAtom(addNodeToTreeAtom)
    const deleteNodeFromTree = useSetAtom(deleteNodeFromTreeAtom)

    const setupYDoc = () => {
        setTree({
            metadata: {},
            nodeDict: {}
        })
        const treeId = new URLSearchParams(window.location.search).get("id");
        setSelectedNodeId(treeId)

        let wsProvider = new WebsocketProvider(`${wsProtocol}://${location.hostname}:${currentPort}`, treeId, ydoc)
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

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        setDark(window.matchMedia('(prefers-color-scheme: dark)').matches);
        const treeId = new URLSearchParams(window.location.search).get("id");
        setupYDoc()
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


                <Grid item style={{height: "100%", boxSizing: "border-box"}}>
                    <Box style={{width: "100vw", height: "100vh", flexGrow: 1, boxSizing: "border-box"}}>
                        <TreeView contentRef={contentRef}/>
                    </Box>
                </Grid>


            </Grid>
        </>
    );
}