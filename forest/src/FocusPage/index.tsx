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


                    <Grid item
                          style={{
                              height: selectedNodeLayerHeight,
                              backgroundColor: props.dark?"#2c2c2c":'#ffffff',
                              width: "100%",
                              paddingTop: "10px",
                              flex: "0 0 70%"
                          }}>
                        <SelectedNodeLayer layouter={layouter} treeData={props.tree} node={layouter.getSelectedNode(tree)} modifyTree={modifyTree}
                                           send_message_to_main={props.send_message_to_main} contentRef={props.contentRef} dark={props.dark}/>
                    </Grid>

                    <NavigatorLayer props={props}
                                         selectedNode={layouter.getSelectedNode(tree)} modifyTree={modifyTree}  dark={props.dark}/>
                </Grid>
        </>
    );
}