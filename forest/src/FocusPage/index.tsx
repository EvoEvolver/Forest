import React from 'react';
import 'reactflow/dist/style.css';
import {Grid} from '@mui/material';

import SelectedNodeLayer from './SelectedNodeLayer';
import OtherNodesLayer from './OtherNodesLayer';

import {TreeData} from "../entities";
import Layouter from "../Layouter";


export default function FocusPage(props) {
    let layouter: Layouter = props.layouter;
    let tree: TreeData = props.tree;
    let modifyTree = props.modifyTree;


    const ancestorsLayerHeight = '10%';
    const siblingsLayerHeight = '10%';
    const selectedNodeLayerHeight = '70%';
    const childrenLayerHeight = '10%';


    if(Object.keys(tree.nodeDict).length > 0)
    return (
        <>
        <Grid container height="100vh" width="100vw" flexDirection="column">
            <Grid item
                  style={{height: ancestorsLayerHeight, backgroundColor: '#7DB9DE', width: "100%", padding: "10px"}}>
                <OtherNodesLayer nodes={layouter.getAncestorNodes(tree, layouter.getSelectedNode(tree)).reverse()} selectedNode={layouter.getSelectedNode(tree)} modifyTree={modifyTree}/>
            </Grid>
            <Grid item
                  style={{height: siblingsLayerHeight, backgroundColor: '#A8D8B9', width: "100%", padding: "10px"}}>
                <OtherNodesLayer nodes={layouter.getSiblingNodes(tree, layouter.getSelectedNode(tree))} selectedNode={layouter.getSelectedNode(tree)}
                                 modifyTree={modifyTree}/>
            </Grid>

            <Grid item
                  style={{height: selectedNodeLayerHeight, backgroundColor: '#EB7A77', width: "100%", padding: "10px"}}>
                <SelectedNodeLayer node={layouter.getSelectedNode(tree)} modifyTree={modifyTree} send_message_to_main={props.send_message_to_main}/>
            </Grid>

            {/* Children Layer */}
            <Grid item
                  style={{height: childrenLayerHeight, backgroundColor: '#FAD689', width: "100%", padding: "10px"}}>
                <OtherNodesLayer nodes={layouter.getChildrenNodes(tree, layouter.getSelectedNode(tree))} selectedNode={layouter.getSelectedNode(tree)} modifyTree={modifyTree}/>
            </Grid>
        </Grid>
        </>
    );
}