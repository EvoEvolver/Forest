import React, {useCallback, useEffect, useReducer, useRef} from 'react';
import {Box} from '@mui/material';
import FocusPage from './FocusPage';
import Layouter from "./Layouter";
import {TreeData} from './entities';
import Treemap from './TreeMap';

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
        if (action.id !== undefined) {
            // user provides an id. so we need to get the node by id.
            let node = Object.values(tree.nodeDict).find((node) => node.id === action.id);
            if (node) {
                action.node = node;
            }
        }
        switch (action.type) {
            case 'updateTree':
                return layouter.updateTree(tree, action.newTree);
            case 'setSelectedNode':
                return layouter.setSelectedNode(tree, action.id);
            default:
                return tree;
        }
    }

    const [tree, modifyTree] = useReducer(reducers, initialTree);

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
            if (!e.shiftKey)
                return;
            let result = undefined;
            const oneToNineRegex = /^[1-9]$/;
            const key = e.key;
            if (key === 'ArrowUp') {
                result = layouter.move(treeRef.current, "left_sib");
            } else if (key === 'ArrowDown') {
                result = layouter.move(treeRef.current, "right_sib");
            } else if (key === 'ArrowLeft') {
                result = layouter.move(treeRef.current, "parent");
            } else if (key === 'ArrowRight') {
                result = layouter.move(treeRef.current, "child");
            } else if (key === 'R') {
                result = layouter.moveToRoot(treeRef.current);
            } else if (key === 'N') {
                result = layouter.moveToNextAvailable(treeRef.current);
            } else if (key === 'B') {
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
                    id: result.id
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

    // useEffect(() => {
    //     document.removeEventListener("keydown", keyPress);
    //     if (!hidden) {
    //         document.addEventListener("keydown", keyPress);
    //     }
    //
    //     return () => {
    //         document.removeEventListener("keydown", keyPress);
    //     };
    // }, [hidden, keyPress]);

    useEffect(() => {
        document.addEventListener("keydown", keyPress);


        return () => {
            document.removeEventListener("keydown", keyPress);
        };
    }, []);

    useEffect(() => {
        treeRef.current = tree;
    }, [tree]);

    return (
        <>
            <Box hidden={hidden} style={{width: '100vw', height: '100vh'}}>
                {/*make two buttons to change between focus page and treemap. the buttons should be fixed to top left.*/}
                {layouter.hasTree(treeRef.current) && page === 0 &&
                    <FocusPage layouter={layouter} tree={tree} modifyTree={modifyTree}
                               send_message_to_main={props.send_message_to_main}/>}
                {layouter.hasTree(treeRef.current) && page === 1 &&
                    <Treemap layouter={layouter} tree={tree} modifyTree={modifyTree}/>}
            </Box>
        </>
    );
}