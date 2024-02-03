import React from 'react';
import { useState, useEffect } from 'react';
import 'reactflow/dist/style.css';
import { io } from 'socket.io-client';
import ATree from './ATree';

const currentPort = (process.env.NODE_ENV || 'development') == 'development' ? "29999": window.location.port;
const socket = io(`http://127.0.0.1:${currentPort}`, {
  transports: ["websocket"],
  withCredentials: false,
}); // Currently running on default port locally. Need to write it into config file.

interface Tree {
  id?: string;
  title: string;
  content: string;
  children?: Tree[];
  tabs: {};
}


export default function App() {
  let [trees, setTrees] = useState({});

  let [selectedTreeId, setSelectedTreeId] = useState(undefined);

  useEffect(() => {
    socket.on("connect", () => {
      console.log("Connected");
    });
    socket.on("setTree", (serverData) => {
      let newTrees = {...trees};

        newTrees[serverData.tree_id] = serverData.tree;
        // newTrees[serverData.tree_id+1] = {};
        setTrees(newTrees)
    });
    socket.emit('requestTree', (tree) => {
    })
  }, []);
  // On Tree Change
    useEffect(() => {
        if(Object.keys(trees).length === 1 || selectedTreeId === undefined){
            setSelectedTreeId(Object.keys(trees)[0])
        }
    }, [trees]);

  return (
      <>
          {
              // make a list of buttons for each tree ids. cliking on the button will set the selectedTreeId to the tree id.
                Object.keys(trees).map((treeId) => {
                    return <button key={treeId} onClick={() => setSelectedTreeId(treeId)}>{treeId}</button>
                })
          }
          {
              // show a list of ATrees. but only show the one that is selected.

                Object.keys(trees).map((treeId) => {
                        return treeId ===selectedTreeId && <ATree key={treeId} tree={trees[treeId]}/>
                })
          }
      </>
  );
}