import React, {useCallback, useEffect, useReducer, useRef, useState} from 'react';
import 'reactflow/dist/style.css';
import {Box} from '@mui/material';
import FocusPage from './FocusPage';
import Layouter from "./Layouter";
import {Edge, Node, RawTree} from './entities';
import Treemap from './TreeMap';

// convert the tree from backend to the compatible format for Forest.
const convertTreeToWhatWeWant = (tree: RawTree) => {
    // return a list of nodes and a list of edges. Every child node is connected to its parent node.
    // the node should have a id, a position, and a label.
    // the edge should have a id, a source, and a target.
    // the position of the node should be calculated based on the level of the node.
    // the root node should be at the center of the screen.

    const nodes: Node[] = [];
    const edges: Edge[] = [];

    const dfs = (tree: RawTree, parent: string | undefined) => {
        //const id = tree.id ? tree.id: tree.title;
        const id = tree.path;
        const label = tree.title;
        const content = tree.content;
        const tabs = tree.tabs;
        let node: Node = {id, data: {label, content, tabs}, selected: false};
        nodes.push(node);
        if (parent) {
            let edge: Edge = {id: `${parent}-${id}`, source: parent, target: id};
            edges.push(edge);
        }
        if (tree.children) {
            tree.children.forEach((child, index) => {
                dfs(child, id);
            });
        }
    };

    dfs(tree, undefined);

    return {'nodes': nodes, 'edges': edges};
}


export default function ATree(props) {

    let rawTree = props.tree as RawTree;

    const selectedNodeHistoryMaxNumber = 10;
    const selectedNodeHistory = useRef([]);
    const selectedNodeRef = useRef(undefined); //TODO: use treeRef instead of selectedNodeRef?
    const backRef = useRef(false);
    let hidden = props.hidden;
    let layouter = new Layouter();
    const initialTree = {
        'nodes': undefined,
        'edges': undefined
    };

    let [page, setPage] = useState(0);

    // let [tree, setTree] = useState(initialTree);
    function reducers(tree, action) {
        switch (action.type) {
            case 'updateTree':
                return layouter.updateTree(tree, action.newTree);
            case 'setSelectedNode':
                return layouter.setSelectedNode(tree, action.node);
            default:
                return tree;
        }
    }

    const [tree, modifyTree] = useReducer(reducers, initialTree);

    const treeRef = useRef(tree);

    // On Tree Change
    useEffect(() => {
        if (rawTree) {
            let {nodes, edges} = convertTreeToWhatWeWant(rawTree);
            modifyTree({
                type: 'updateTree',
                newTree: {'nodes': nodes, 'edges': edges}
            });
        }
    }, [rawTree]);

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

        let selectedNode = layouter.getSelectedNode(tree.nodes);
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
      console.log(tree)
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
            <div style={{position: 'fixed', zIndex: 99999999999, top: 0, left: 0}}>
                <button onClick={() => setPage(0)}>Focus Page</button>
                <button onClick={() => setPage(1)}>Treemap</button>
            </div>
            <Box hidden={hidden} style={{width: '100vw', height: '100vh'}}>
                {/*make two buttons to change between focus page and treemap. the buttons should be fixed to top left.*/}
                {layouter.hasTree(treeRef.current) && page === 0 &&
                    <FocusPage layouter={layouter} tree={treeRef.current} modifyTree={modifyTree}/>}
                {layouter.hasTree(treeRef.current) && page === 1 &&
                    <Treemap layouter={layouter} tree={treeRef.current} modifyTree={modifyTree}/>}
            </Box>
        </>
    );
}