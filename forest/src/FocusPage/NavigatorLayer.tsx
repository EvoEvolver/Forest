import React, {useState, useEffect} from 'react';
import {Grid, Button, Paper, Typography} from '@mui/material';
import OtherNodesLayer from './OtherNodesLayer';
import Card from "@mui/material/Card";


const NavigatorLayer = ({props, modifyTree, selectedNode}) => {
    console.log("num of sibling:", props.layouter.getSiblingNodes(props.tree, props.layouter.getSelectedNode(props.tree)).length)
    return (
        <>
            <Grid container item style={{height: "25%", display: "flex", flexDirection: "row", flex: "0 1 25%"}}>
                <Grid item
                      style={{
                          height: '100%',
                          backgroundColor: '#ffffff',
                          width: "33%",
                          padding: "8px",
                          flex: "1 0 33%",
                          overflowY: "auto"
                      }}>
                     <Card sx={{
                        minWidth: "100%",
                        maxWidth: "100%",
                        minHeight: "100%",
                        maxHeight: "100%",
                        overflowY: 'auto',
                        overflowX: 'hidden',
                        wordBreak: "break-word",
                        backgroundColor: '#f4f4f4'
                    }}>
                    <OtherNodesLayer
                        nodes={props.layouter.getAncestorNodes(props.tree, props.layouter.getSelectedNode(props.tree)).reverse()}
                        modifyTree={modifyTree} selectedNode={selectedNode}/>
                     </Card>
                </Grid>


                <Grid item
                      style={{
                          height: '100%',
                          backgroundColor: '#ffffff',
                          width: "33%",
                          padding: "8px",
                          flex: "0 1 33%",
                          overflowY: "auto"
                      }}>
                    <Card sx={{
                        minWidth: "100%",
                        maxWidth: "100%",
                        minHeight: "100%",
                        maxHeight: "100%",
                        overflowY: 'auto',
                        overflowX: 'hidden',
                        wordBreak: "break-word",
                        backgroundColor: '#f4f4f4'
                    }}>
                        <OtherNodesLayer

                        nodes={props.layouter.getSiblingNodes(props.tree, props.layouter.getSelectedNode(props.tree))}

                        modifyTree={modifyTree} selectedNode={selectedNode}/>
                    </Card>

                </Grid>
                <Grid item
                      style={{
                          height: '100%',
                          backgroundColor: '#ffffff',
                          width: "33%",
                          padding: "8px",
                          flex: "0 1 33%",
                          overflowY: "auto"
                      }}>
                     <Card sx={{
                        minWidth: "100%",
                        maxWidth: "100%",
                        minHeight: "100%",
                        maxHeight: "100%",
                        overflowY: 'auto',
                        overflowX: 'hidden',
                        wordBreak: "break-word",
                        backgroundColor: '#f4f4f4'
                    }}>
                    <OtherNodesLayer
                        nodes={props.layouter.getChildrenNodes(props.tree, props.layouter.getSelectedNode(props.tree))}
                        modifyTree={modifyTree} selectedNode={selectedNode}/>
                     </Card>
                </Grid>
            </Grid>
        </>
    );
};

export default NavigatorLayer;
