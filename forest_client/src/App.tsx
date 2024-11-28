import React, {useCallback, useEffect, useRef, useState} from 'react';
import {io} from 'socket.io-client';
import ATree from './ATree';
import {TreeData} from "./entities";
import {Grid, Tooltip} from "@mui/material";
import CenterFocusStrongIcon from '@mui/icons-material/CenterFocusStrong';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import IconButton from '@mui/material/IconButton';
import {ToggleButton, ToggleButtonGroup} from "@mui/lab";
const currentPort = (process.env.NODE_ENV || 'development') == 'development' ? "29999" : window.location.port;
import axios from "axios";
import {Provider, useAtom} from "jotai";
import {selectedTreeIdAtom, darkModeAtom, treesMapAtom, selectedNodeAtom, selectedNodeIdAtom} from "./Layouter";


export default function App() {

    const [page, setPage] = useState(0);
    const [currPage, setCurrPage] = useState(0);


    const [dark, setDark] = useAtom(darkModeAtom)
    const [treesMap, setTreesMap] = useAtom(treesMapAtom);
    const [currTreeId, setCurrTreeId] = useAtom(selectedTreeIdAtom)
    const [selectedNodeId, setSelectedNodeId] = useAtom(selectedNodeIdAtom)

    async function requestTrees() {
        const res = await axios.get(`http://${location.hostname}:${currentPort}/getTrees`);
        let treesData = res.data;
        console.log("Received whole tree", treesData)
        setTreesMap((prev)=>({...prev, ...treesData}))
        const rootId = Object.keys(treesData)[0];
        setCurrTreeId((prev) => {
            if(!prev)
                return rootId
            return prev
        });
        setSelectedNodeId((prev) => {
            if(!prev)
                return rootId
            return prev
        });
    }

    useEffect(() => {
        setDark(window.matchMedia('(prefers-color-scheme: dark)').matches);
        requestTrees()
    }, []);


    const handleToggle = () => {
        setCurrPage(currPage === 0 ? 1 : 0);
        setPage(page === 0 ? 1 : 0);
    };

    return (
        <>
            <Grid container item
                  style={{width: "100%", height: "100vh", display: "flex", flexDirection: "column", flex: "1 1 100%", boxSizing: "border-box"}}>
                <Grid container item style={{
                    height: "4.5%",
                    alignItems: "center",
                    backgroundColor: dark?"#2c2c2c":"#f4f4f4",
                    boxSizing: "border-box"
                }}>
                    {Object.keys(treesMap).length > 1 && <Grid container direction="row" style={{marginBottom: '10px'}}>
                        {Object.keys(treesMap).map((treeId, i) => (
                            <Grid item key={treeId} style={{marginBottom: '3px'}}>
                                <button style={{backgroundColor: "#00000000", color: dark?"#ffffff":"#626262"}}
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
                                {currPage === 1 ? <CenterFocusStrongIcon style={{color: dark ? 'white' : ''}}/> : <AccountTreeIcon style={{color: dark ? 'white' : ''}}/>}
                            </ToggleButton>
                        </Tooltip>
                    </Grid>
                </Grid>

                <Grid item style={{height: "95.5%", boxSizing: "border-box"}}>
                        <ATree page={page}
                               setPage={setPage}
                               setCurrPage={setCurrPage}
                        />
                </Grid>


            </Grid>
        </>
    );
}