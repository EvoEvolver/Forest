import React, {useEffect, useRef, useState} from 'react';
import {Box, Grid, Tooltip} from "@mui/material";
import CenterFocusStrongIcon from '@mui/icons-material/CenterFocusStrong';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import {ToggleButton} from '@mui/material'
import axios from "axios";
import {atom, useAtom, useSetAtom} from "jotai";
import {darkModeAtom, selectedNodeIdAtom, selectedTreeAtom, selectedTreeIdAtom, treesMapAtom} from "./TreeState";
import TreeView from "./TreeView";
import Treemap from "./TreeMap";
import {useAtomValue} from "jotai/index";
import * as Y from "yjs";
import { WebsocketProvider } from 'y-websocket'
import {YMap} from "yjs/dist/src/types/YMap";
import {countChildren} from "./process_tree";

const currentPort = (process.env.NODE_ENV || 'development') == 'development' ? "29999" : window.location.port;
//const currentPort =  window.location.port;

const YDocAtom = atom(new Y.Doc());
const YjsProviderAtom = atom();
const YMapTreesAtom = atom<YMap<YMap<any>>>((get)=>{
    return get(YDocAtom).getMap("trees")
})

// check whether current address starts with http or https
const http_prefix = window.location.protocol


export default function App() {

    const [page, setPage] = useState(0);
    const [currPage, setCurrPage] = useState(0);
    const [dark, setDark] = useAtom(darkModeAtom)
    const [treesMap, setTreesMap] = useAtom(treesMapAtom);
    const [currTreeId, setCurrTreeId] = useAtom(selectedTreeIdAtom)
    const [selectedNodeId, setSelectedNodeId] = useAtom(selectedNodeIdAtom)
    const contentRef = useRef();
    const tree = useAtomValue(selectedTreeAtom)
    const [trees, setTrees] = useAtom(treesMapAtom)
    const [wsProvider, setYjsProvider] = useAtom(YjsProviderAtom)
    const ydoc = useAtomValue(YDocAtom)
    const ymapTrees = useAtomValue(YMapTreesAtom)



    const setupYDoc = ()=>{
        setYjsProvider(new WebsocketProvider(`ws://${location.hostname}:${currentPort}`, "", ydoc))
        wsProvider.on('status', event => {
          console.log("wsProvider", event.status) // logs "connected" or "disconnected"
        })
        ymapTrees.observeDeep((ymapEvent)=>{
            let parsedTrees = {}
            for (let [treeId, yTree] of ymapTrees.entries()){
                let parsedNodeDict = {}
                const yNodeDict = yTree.get("nodeDict")
                for (let [nodeId, nodeStr] of yNodeDict.entries()) {
                    if(nodeStr)
                        parsedNodeDict[nodeId] = JSON.parse(nodeStr)
                }
                parsedTrees[treeId] = {nodeDict:parsedNodeDict}
            }
            setTrees(parsedTrees)
        })
    }

    async function requestTrees() {
        const treeId = new URLSearchParams(window.location.search).get("id");
        const res = await axios.get(`${http_prefix}//${location.hostname}:${currentPort}/api/getTree`, {
            params: {
                tree_id: treeId
            }
        });
        let treesData = res.data;
        countChildren(treesData[treeId])
        console.log("Received whole tree", treeId, treesData)
        setTreesMap((prev) => ({...prev, ...treesData}))
        const rootId = Object.keys(treesData)[0];
        setCurrTreeId((prev) => {
            if (!prev)
                return rootId
            return prev
        });
        setSelectedNodeId((prev) => {
            if (!prev)
                return rootId
            return prev
        });
    }

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        setDark(window.matchMedia('(prefers-color-scheme: dark)').matches);
        const treeId = new URLSearchParams(window.location.search).get("id");
        console.log(treeId);
        setCurrTreeId(treeId)
        requestTrees()

        //setupYDoc()
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
                {false &&
                    <><Grid container item style={{
                    height: "4.5%",
                    alignItems: "center",
                    backgroundColor: dark ? "#2c2c2c" : "#f4f4f4",
                    boxSizing: "border-box"
                }}
            >
                {Object.keys(treesMap).length > 1 && <Grid container direction="row" style={{marginBottom: '10px'}}>
                    {Object.keys(treesMap).map((treeId, i) => (
                        <Grid item key={treeId} style={{marginBottom: '3px'}}>
                            <button style={{backgroundColor: "#00000000", color: dark ? "#ffffff" : "#626262"}}
                                    onClick={() => setCurrTreeId(treeId)}>{i + 1}</button>
                        </Grid>
                    ))}
                </Grid>}

                <Grid item style={{marginLeft: "5px"}}>
                    <Tooltip title={currPage === 1 ? "Focus View (Shift+T)" : "Tree Map (Shift+T)"}>
                        <ToggleButton
                            value={currPage}
                            selected
                            style={{
                                height: "4.5vh",
                                width: "4.5vh",
                            }}
                            onChange={handleToggle}
                        >
                            {currPage === 1 ? <CenterFocusStrongIcon style={{color: dark ? 'white' : ''}}/> :
                                <AccountTreeIcon style={{color: dark ? 'white' : ''}}/>}
                        </ToggleButton>
                    </Tooltip>
                </Grid>
            </Grid>
                    </>}

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