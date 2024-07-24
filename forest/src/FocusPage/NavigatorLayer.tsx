import React, {useState, useEffect} from 'react';
import {Grid, Button, Paper, Typography} from '@mui/material';
import OtherNodesLayer from './OtherNodesLayer';


const NavigatorLayer = ({props, modifyTree, selectedNode}) => {
    console.log("type of props is:", props)
    return (
        <>
            <Grid container item style={{height: "30%", display: "flex", flexDirection: "row", flex: "1 1 25%"}}>
                <Grid item
                      style={{
                          border: '1px solid black',
                          height: '100%',
                          backgroundColor: '#FAD689',
                          width: "33%",
                          padding: "10px",
                          flex: "1 0 0%"
                      }}>
                    <OtherNodesLayer
                        nodes={props.layouter.getAncestorNodes(props.tree, props.layouter.getSelectedNode(props.tree)).reverse()}
                        modifyTree={modifyTree} selectedNode={selectedNode}/>
                </Grid>
                <Grid item
                      style={{
                          border: '1px solid black',
                          height: '100%',
                          backgroundColor: '#FAD689',
                          width: "33%",
                          padding: "10px",
                          flex: "0 1 33%"
                      }}>
                    <OtherNodesLayer
                        nodes={props.layouter.getSiblingNodes(props.tree, props.layouter.getSelectedNode(props.tree))}
                        modifyTree={modifyTree} selectedNode={selectedNode}/>
                </Grid>
                <Grid item
                      style={{
                          border: '1px solid black',
                          height: '100%',
                          backgroundColor: '#FAD689',
                          width: "33%",
                          padding: "10px",
                          flex: "0 1 33%"
                      }}>
                    <OtherNodesLayer
                        nodes={props.layouter.getChildrenNodes(props.tree, props.layouter.getSelectedNode(props.tree))}
                        modifyTree={modifyTree} selectedNode={selectedNode}/>
                </Grid>
            </Grid>
        </>
    );
};

export default NavigatorLayer;
