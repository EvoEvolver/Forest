import React, {useEffect, useState} from 'react';
import 'reactflow/dist/style.css';
import {io} from 'socket.io-client';
import ATree from './ATree';
import {TreeData} from "./entities";

const currentPort = (process.env.NODE_ENV || 'development') == 'development' ? "29999" : window.location.port;
const socket = io(`http://127.0.0.1:${currentPort}`, {
    transports: ["websocket"],
    withCredentials: false,
}); // Currently running on default port locally. Need to write it into config file.


const send_message_to_main = (message) => {
    socket.emit("message_to_main", message);
}

interface Tree {
    id?: string;
    title: string;
    content: string;
    children?: Tree[];
    tabs: {};
}


function patchTree(currTree: TreeData, patchTree: TreeData) {
    if(currTree === undefined) {
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
        if(patch_node === null) {
            delete currTree.nodeDict[node_id];
        }
        else {
            currTree.nodeDict[node_id] = patch_node;
        }
    }
    return currTree;
}


export default function App() {
    let [trees, setTrees] = useState({});

    let [selectedTreeId, setSelectedTreeId] = useState(undefined);
    let [toLoadTree, setToLoadTree] = useState([]);
    let [page, setPage] = useState(0);

    useEffect(() => {
        socket.on("connect", () => {
            console.log("Connected");
        });

        socket.on("setTree", (serverData) => {
            console.log("set tree", serverData.tree)
            let newTrees = {...trees};
            newTrees[serverData.tree_id] = patchTree(newTrees[serverData.tree_id], serverData.tree);
            setTrees(newTrees);
        });

        socket.on('requestTree', (trees) => {
            console.log("request tree")
            setTrees(trees);
        })

        socket.emit('requestTree', () => {
        })

    }, []);
    // On Tree Change
    useEffect(() => {
        if (Object.keys(trees).length === 1 || selectedTreeId === undefined) {
            setSelectedTreeId(Object.keys(trees)[0]);
            // push the tree to the toLoadTree if not exist, which is an array of tree ids that we want to load.
        }
    }, [trees]);


    useEffect(() => {
        console.log(selectedTreeId)
        if (!toLoadTree.includes(selectedTreeId) && selectedTreeId !== undefined) {
            setToLoadTree([...toLoadTree, selectedTreeId])
            console.log(`set to load tree ${selectedTreeId}`)
        }
    }, [selectedTreeId]);

    return (
        <>
            <div style={{position: "fixed", top: "5px", left: "5px", zIndex: 99999999}}>
                {
                    // make a list of buttons for each tree ids. cliking on the button will set the selectedTreeId to the tree id.
                    Object.keys(trees).map((treeId, i) => {
                        return <button key={treeId} onClick={() => setSelectedTreeId(treeId)}>{i+1}</button>
                    })
                }
            </div>

            <div style={{position: 'fixed', zIndex: 99999999999, top: 0, right: 0}}>
                <button onClick={() => setPage(0)}>FocusMap</button>
                <button onClick={() => setPage(1)}>TreeMap</button>
            </div>
            {
                // show a list of ATrees. but only show the one that is selected.

                Object.keys(trees).map((treeId) => {
                    return <ATree hidden={treeId !== selectedTreeId} key={treeId} tree={trees[treeId]} page={page}
                                  send_message_to_main={send_message_to_main}/>
                })
            }
        </>
    );
}