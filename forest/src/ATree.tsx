import React, {useCallback, useEffect, useReducer, useRef, useState} from 'react';
import 'reactflow/dist/style.css';
import {Box} from '@mui/material';
import FocusPage from './FocusPage';
import Layouter from "./Layouter";
import {Node, NodeDict, TreeData} from './entities';
import Treemap from './TreeMap';
import Tree from "react-d3-tree";

// convert the tree from backend to the compatible format for Forest.


export default function ATree(props) {

    let treeData = props.tree as TreeData;

    const selectedNodeHistoryMaxNumber = 10;
    const selectedNodeHistory = useRef([]);
    const selectedNodeRef = useRef(undefined); //TODO: use treeRef instead of selectedNodeRef?
    const backRef = useRef(false);
    let hidden = props.hidden;
    let layouter = new Layouter();

    const initialTree = {
        "selectedNode": undefined,
        "nodeDict": {}
    } as TreeData;

    let page = props.page;

    // let [tree, setTree] = useState(initialTree);
    function reducers(tree: TreeData, action) {
        if(action.id !== undefined) {
            // user provides an id. so we need to get the node by id.
            let node = Object.values(tree.nodeDict).find((node) => node.id === action.id);
            if(node) {
                action.node = node;
            }
        }
        switch (action.type) {
            case 'updateTree':
                return layouter.updateTree(tree, action.newTree);
            case 'setSelectedNode':{
                console.log("setSelectedNode", action.id);
                return layouter.setSelectedNode(tree, action.id);
            }
            default:
                return tree;
        }
    }

    const [tree, modifyTree] = useReducer(reducers, initialTree);
    const [selectedNode, setSelectedNode] = useState(undefined);

    const treeRef = useRef(tree);

    // On Tree Change
    useEffect(() => {
        if (treeData) {
            modifyTree({
                type: 'updateTree',
                newTree: treeData
            });
        }
    }, [treeData]);

    const keyPress = useCallback(
        (e) => {
            let result = undefined;
            const oneToNineRegex = /^[1-9]$/;
            const key = e.key;
            if (key === 'ArrowUp') {
                result = layouter.move(treeRef.current, "up");
            } else if (key === 'ArrowDown') {
                result = layouter.move(treeRef.current, "down");
            } else if (key === 'ArrowLeft') {
                result = layouter.move(treeRef.current, "left");
            } else if (key === 'ArrowRight') {
                result = layouter.move(treeRef.current, "right");
            } else if (key === 'r') {
                result = layouter.moveToRoot(treeRef.current);
            } else if (key === 'n') {
                result = layouter.moveToNextAvailable(treeRef.current);
            } else if (key === 'b') {
                console.log("b clicked.")
                result = selectedNodeHistory.current.pop();
                if (result) backRef.current = true;
            }

            // if it's a number from 1 to 9.
            else if (oneToNineRegex.test(key)) {
                result = layouter.moveToChildByIndex(treeRef.current, parseInt(key) - 1);
            }

            if (result) {
                modifyTree({
                    type: 'setSelectedNode',
                    node: result
                });
            }
        },
        []
    );


    useEffect(() => {
        if (layouter === undefined || !layouter.hasTree(tree)) return;

        let selectedNode = layouter.getSelectedNode(tree);
        // put the selectedNode to the history.
        if (selectedNodeRef.current && selectedNodeRef.current != null && selectedNodeRef.current != selectedNode && !backRef.current) {
            selectedNodeHistory.current.push(selectedNodeRef.current);
            if (selectedNodeHistory.current.length > selectedNodeHistoryMaxNumber) {
                selectedNodeHistory.current.shift();
            }
        }
        backRef.current = false;
        selectedNodeRef.current = selectedNode;
        if (selectedNode === null) {
            return;
        }
    }, [layouter, tree]); // Adding layouter to the dependency array

    useEffect(() => {
        console.log(hidden)
      document.removeEventListener("keydown", keyPress);
        if (!hidden) {
            document.addEventListener("keydown", keyPress);
        }

        return () => {
            document.removeEventListener("keydown", keyPress);
        };
    }, [hidden, keyPress]);

    useEffect(() => {
        treeRef.current = tree;
    }, [tree]);

    return (
        <>
            <Box hidden={hidden} style={{width: '100vw', height: '100vh'}}>
                {/*make two buttons to change between focus page and treemap. the buttons should be fixed to top left.*/}
                {layouter.hasTree(treeRef.current) && page === 0 &&
                    <FocusPage layouter={layouter} tree={treeRef.current} modifyTree={modifyTree} send_message_to_main={props.send_message_to_main}/>}
                {layouter.hasTree(treeRef.current) && page === 1 &&
                    <Treemap layouter={layouter} tree={treeRef.current} modifyTree={modifyTree}/>}
            </Box>
        </>
    );
}