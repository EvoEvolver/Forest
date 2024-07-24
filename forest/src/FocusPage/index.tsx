import React from 'react';
import {Grid} from '@mui/material';

import SelectedNodeLayer from './SelectedNodeLayer';
import OtherNodesLayer from './OtherNodesLayer';
import NavigatorLayer from "./NavigatorLayer";


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


    return (
        <>
                <Grid container item style={{height: "100%", display: "flex", flexDirection: "column", flex: "1 0 0%"}}>
                    {/*<Grid item style={{*/}
                    {/*    border: '1px solid black',*/}
                    {/*    height: siblingsLayerHeight,*/}
                    {/*    backgroundColor: '#A8D8B9',*/}
                    {/*    width: "100%",*/}
                    {/*    padding: "10px"*/}
                    {/*}}>*/}
                    {/*    <OtherNodesLayer nodes={layouter.getSiblingNodes(tree, layouter.getSelectedNode(tree))}*/}
                    {/*                     selectedNode={layouter.getSelectedNode(tree)}*/}
                    {/*                     modifyTree={modifyTree}/>*/}
                    {/*</Grid>*/}

                    <Grid item
                          style={{
                              border: '1px solid black',
                              height: selectedNodeLayerHeight,
                              backgroundColor: '#EB7A77',
                              width: "100%",
                              padding: "10px",
                              flex: "0 0 75%"
                          }}>
                        <SelectedNodeLayer node={layouter.getSelectedNode(tree)} modifyTree={modifyTree}
                                           send_message_to_main={props.send_message_to_main}/>
                    </Grid>

                    {/*/!* Children Layer *!/*/}
                    {/*<Grid item*/}
                    {/*      style={{*/}
                    {/*          border: '1px solid black',*/}
                    {/*          height: childrenLayerHeight,*/}
                    {/*          backgroundColor: '#FAD689',*/}
                    {/*          width: "100%",*/}
                    {/*          padding: "10px"*/}
                    {/*      }}>*/}
                    {/*    <OtherNodesLayer nodes={layouter.getChildrenNodes(tree, layouter.getSelectedNode(tree))}*/}
                    {/*                     selectedNode={layouter.getSelectedNode(tree)} modifyTree={modifyTree}/>*/}
                    {/*</Grid>*/}


                    <NavigatorLayer props={props}
                                         selectedNode={layouter.getSelectedNode(tree)} modifyTree={modifyTree}/>
                </Grid>
        </>
        // <>
        // <Grid container height="100vh" width="100vw" flexDirection="column">
        //     <Grid item
        //           style={{border: '1px solid black', height: ancestorsLayerHeight, backgroundColor: '#7DB9DE', width: "100%", padding: "10px"}}>
        //         <OtherNodesLayer nodes={layouter.getAncestorNodes(tree, layouter.getSelectedNode(tree)).reverse()} selectedNode={layouter.getSelectedNode(tree)} modifyTree={modifyTree}/>
        //     </Grid>
        //     <Grid item
        //           style={{border: '1px solid black',height: siblingsLayerHeight, backgroundColor: '#A8D8B9', width: "100%", padding: "10px"}}>
        //         <OtherNodesLayer nodes={layouter.getSiblingNodes(tree, layouter.getSelectedNode(tree))} selectedNode={layouter.getSelectedNode(tree)}
        //                          modifyTree={modifyTree}/>
        //     </Grid>
        //
        //     <Grid item
        //           style={{border: '1px solid black',height: selectedNodeLayerHeight, backgroundColor: '#EB7A77', width: "100%", padding: "10px"}}>
        //         <SelectedNodeLayer node={layouter.getSelectedNode(tree)} modifyTree={modifyTree} send_message_to_main={props.send_message_to_main}/>
        //     </Grid>
        //
        //     {/* Children Layer */}
        //     <Grid item
        //           style={{border: '1px solid black',height: childrenLayerHeight, backgroundColor: '#FAD689', width: "100%", padding: "10px"}}>
        //         <OtherNodesLayer nodes={layouter.getChildrenNodes(tree, layouter.getSelectedNode(tree))} selectedNode={layouter.getSelectedNode(tree)} modifyTree={modifyTree}/>
        //     </Grid>
        // </Grid>
        // </>
    );
}