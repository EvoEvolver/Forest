import React, {useEffect, useRef, useState} from 'react';
import {io} from 'socket.io-client';
import ATree from './ATree';
import {TreeData} from "./entities";
import {Grid} from "@mui/material";

const currentPort = (process.env.NODE_ENV || 'development') == 'development' ? "29999" : window.location.port;
const socket = io(`http://127.0.0.1:${currentPort}`, {
    transports: ["websocket"],
    withCredentials: false,
}); // Currently running on default port locally. Need to write it into config file.


const send_message_to_main = (message) => {
    socket.emit("message_to_main", message);
}


function applyPatchTree(currTree: TreeData, patchTree: TreeData) {
    console.log("original tree", currTree)
    if (currTree === undefined) {
        currTree = {
            selectedNode: undefined,
            nodeDict: {}
        };
    }
    if (patchTree.selectedNode) {
        currTree.selectedNode = patchTree.selectedNode;
    }
    for (let node_id in patchTree.nodeDict) {
        let patch_node = patchTree.nodeDict[node_id];
        if (patch_node === null) {
            delete currTree.nodeDict[node_id];
        } else {
            currTree.nodeDict[node_id] = patch_node;
        }
    }
    if (!currTree.selectedNode) {
        currTree.selectedNode = Object.keys(currTree.nodeDict)[0];
    }
    console.log("patched tree", currTree)
    return currTree;
}


export default function App() {
    let [trees, setTrees] = useState({});

    let [selectedTreeId, setSelectedTreeId] = useState(undefined);
    let [toLoadTree, setToLoadTree] = useState([]);
    let [page, setPage] = useState(0);
    let firstTreeReceived = useRef(false);

    useEffect(() => {
        socket.on("connect", () => {
            console.log("Connected");
        });

        socket.on("patchTree", (serverData) => {
            console.log("Received tree delta", serverData.tree)
            setTrees((trees) => {
                let newTrees = {...trees};
                newTrees[serverData.tree_id] = applyPatchTree(newTrees[serverData.tree_id], serverData.tree);
                return newTrees;
            })
        });

        socket.on('setTrees', (trees_data: TreeData[]) => {

            for (let tree of Object.values(trees_data)) {
                if (!tree.selectedNode || tree.selectedNode == "None") {
                    tree.selectedNode = Object.keys(tree.nodeDict)[0];
                }
            }
            console.log("Received whole tree", trees_data)
            setTrees(trees_data);
        })

        socket.emit('requestTrees', () => {
            console.log("Requesting trees")
        })

        // check whether trees is empty or not. If not, request the tree.
        let requestTimer = setInterval(() => {
            if (!firstTreeReceived.current) {
                socket.emit('requestTrees', () => {
                    console.log("Requesting trees")
                })
            } else {
                clearInterval(requestTimer);
            }
        }, 500)

    }, []);

    // On Tree Change
    useEffect(() => {
        if (Object.keys(trees).length === 1 || selectedTreeId === undefined) {
            setSelectedTreeId(Object.keys(trees)[0]);
            // push the tree to the toLoadTree if not exist, which is an array of tree ids that we want to load.
        }
        firstTreeReceived.current = true;
    }, [trees]);


    useEffect(() => {
        console.log("selectedTreeId", selectedTreeId)
        if (!toLoadTree.includes(selectedTreeId) && selectedTreeId !== undefined) {
            setToLoadTree([...toLoadTree, selectedTreeId])
            console.log(`set to load tree ${selectedTreeId}`)
        }
    }, [selectedTreeId]);

    return (
        <>
            <Grid container item style={{width: "100%", display: "flex", flexDirection: "row", flex: "1 0 100%"}}>
                <Grid container item style={{width: "20%", display: "flex", flexDirection: "column", flex: "0 0 0%", backgroundColor: "#f4f4f4"}}>
                    <Grid container direction="column" style={{marginBottom:'10px'}}>
                        {Object.keys(trees).map((treeId, i) => (
                            <Grid item key={treeId} style={{marginBottom:'3px'}}>
                                <button style={{backgroundColor: "#00000000", color:"#626262"}} onClick={() => setSelectedTreeId(treeId)}>{i + 1}</button>
                            </Grid>
                        ))}
                    </Grid>

                    <Grid item style={{backgroundColor: "#00000000"}}>
                        {/*style={{position: 'fixed', zIndex: 99999999999, top: 0, right: 0}}*/}
                        <button style={{backgroundColor: "#00000000", color:"#626262"}} onClick={() => setPage(0)}>Focus</button>

                    </Grid>
                    <Grid item style={{marginTop:'3px'}}>
                        <button style={{backgroundColor: "#00000000", color:"#626262"}} onClick={() => setPage(1)}>Tree</button>
                    </Grid>
                </Grid>

                <Grid item style={{width: "90%", display: "flex", flex: "1 0 90%"}}>
                    {
                        Object.keys(trees).map((treeId) => {
                            return <ATree hidden={treeId !== selectedTreeId} key={treeId} tree={trees[treeId]}
                                          page={page}
                                          send_message_to_main={send_message_to_main}/>
                        })
                    }
                </Grid>


            </Grid>
        </>
    );
}