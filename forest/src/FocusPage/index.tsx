import React from 'react';
import {useState, useEffect} from 'react';
import {Node, Edge} from 'reactflow';
import 'reactflow/dist/style.css';
import {Grid, IconButton} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

import SelectedNodeLayer from './SelectedNodeLayer';
import OtherNodesLayer from './OtherNodesLayer';

import {getAncestors, getChildren, getQualifiedDescents, getSiblingsIncludeSelf} from '../FlowPage/Layout';


export default function FocusPage(props) {
    let layouter = props.layouter;
    let tree = props.tree;
    let modifyTree = props.modifyTree;

    // let [siblingNodes, setSiblingNodes] = useState<Node[]>([]);
    // let [childrenNodes, setChildrenNodes] = useState<Node[]>([]);
    // let [ancestorsNodes, setAncestorsNodes] = useState<Node[]>([]);

    const ancestorsLayerHeight = '10%';
    const siblingsLayerHeight = '10%';
    const selectedNodeLayerHeight = '70%';
    const childrenLayerHeight = '10%';

    let changeSelectedNode = (node: Node) => {
        layouter.setSelectedNode(node);
    };


    // when selectedNode changes, update the siblings, children, and ancestors.
    // useEffect(() => {
    //     if (selectedNode) {
    //         let siblings = getSiblingsIncludeSelf(selectedNode, nodes, edges);
    //         setSiblingNodes(siblings);
    //         let children = getChildren(selectedNode, nodes, edges);
    //         setChildrenNodes(children);
    //         let ancestors = getAncestors(selectedNode, nodes, edges);
    //         setAncestorsNodes(ancestors);
    //     }
    // }, [selectedNode]);

    return (
        <>
        <Grid container height="100vh" width="100vw" flexDirection="column">
            <Grid item
                  style={{height: ancestorsLayerHeight, backgroundColor: '#7DB9DE', width: "100%", padding: "10px"}}>
                <OtherNodesLayer nodes={layouter.getAncestorNodes(tree, layouter.getSelectedNode(tree.nodes)).reverse()} selectedNode={layouter.getSelectedNode(tree.nodes)} modifyTree={modifyTree}/>
            </Grid>
            <Grid item
                  style={{height: siblingsLayerHeight, backgroundColor: '#A8D8B9', width: "100%", padding: "10px"}}>
                <OtherNodesLayer nodes={layouter.getSiblingNodes(tree, layouter.getSelectedNode(tree.nodes))} selectedNode={layouter.getSelectedNode(tree.nodes)}
                                 modifyTree={modifyTree}/>
            </Grid>

            <Grid item
                  style={{height: selectedNodeLayerHeight, backgroundColor: '#EB7A77', width: "100%", padding: "10px"}}>
                <SelectedNodeLayer node={layouter.getSelectedNode(tree.nodes)} modifyTree={modifyTree} send_message_to_main={props.send_message_to_main}/>
            </Grid>

            {/* Children Layer */}
            <Grid item
                  style={{height: childrenLayerHeight, backgroundColor: '#FAD689', width: "100%", padding: "10px"}}>
                <OtherNodesLayer nodes={layouter.getChildrenNodes(tree, layouter.getSelectedNode(tree.nodes))} selectedNode={layouter.getSelectedNode(tree.nodes)} modifyTree={modifyTree}/>
            </Grid>
        </Grid>
        </>
    );
}