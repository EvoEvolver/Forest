import React, {useState, useEffect} from 'react';
import {Grid, Button, Paper, Typography} from '@mui/material';
import OtherNodesLayer from './OtherNodesLayer';
import Card from "@mui/material/Card";


const NavigatorLayer = ({props, modifyTree, selectedNode}) => {
    return (
        <>
            <Grid container item style={{ display: "flex", flexDirection: "row", flex: "0 1 30%"}}>
                <Grid item
                      id="ancestor_card"
                      style={{
                          height: '100%',
                          backgroundColor: props.dark ? '#2c2c2c' : '#ffffff',
                          flex: "1 0 20%",
                      }}>
                    <Card style={{
                        width: '50px',
                        height: '15px',
                        backgroundColor: props.dark ? '#3b3d3e' : '#f4f4f4',
                        color: props.dark ? 'white' : '',
                        fontSize: '10px',
                        textAlign: 'center',
                        transform: 'translateX(0%)',
                        overflow: 'hidden',
                        boxShadow: 'none',
                        zIndex: 10
                    }}>
                        Ancestor
                    </Card>
                    <Card sx={{
                        minWidth: "100%",
                        maxWidth: "100%",
                        minHeight: "90%",
                        maxHeight: "90%",
                        overflowY: 'auto',
                        overflowX: 'hidden',
                        wordBreak: "break-word",
                        backgroundColor: props.dark ? '#3b3d3e' : '#f4f4f4'
                    }}>

                        <OtherNodesLayer
                            nodes={props.layouter.getAncestorNodes(props.tree, props.layouter.getSelectedNode(props.tree)).reverse()}
                            modifyTree={modifyTree} selectedNode={selectedNode} dark={props.dark} level={0}/>
                    </Card>
                </Grid>

                <Grid item
                      id="sibling_card"
                      style={{
                          height: '100%',
                          backgroundColor: props.dark ? '#2c2c2c' : '#ffffff',
                          paddingLeft: "3px",
                          flex: "0 1 50%",
                      }}>
                    <Card style={{
                        width: '50px',
                        height: '15px',
                        backgroundColor: props.dark ? '#3b3d3e' : '#f4f4f4',
                        color: props.dark ? 'white' : '',
                        fontSize: '10px',
                        textAlign: 'center',
                        transform: 'translateX(0%)',
                        overflow: 'hidden',
                        boxShadow: 'none',
                        zIndex: 10
                    }}>
                        Sibling
                    </Card>
                    <Card sx={{
                        minWidth: "100%",
                        maxWidth: "100%",
                        minHeight: "90%",
                        maxHeight: "90%",
                        overflowY: 'auto',
                        overflowX: 'hidden',
                        wordBreak: "break-word",
                        backgroundColor: props.dark ? '#3b3d3e' : '#f4f4f4'
                    }}>

                        <OtherNodesLayer
                            nodes={props.layouter.getSiblingNodes(props.tree, props.layouter.getSelectedNode(props.tree))}
                            modifyTree={modifyTree} selectedNode={selectedNode} dark={props.dark} level={1}/>
                    </Card>

                </Grid>
                <Grid item
                      id="children_card"
                      style={{
                          height: '100%',
                          backgroundColor: props.dark ? '#2c2c2c' : '#ffffff',
                          paddingLeft: "3px",
                          flex: "0 1 30%",
                      }}>
                    <Card style={{
                        width: '50px',
                        height: '15px',
                        backgroundColor: props.dark ? '#3b3d3e' : '#f4f4f4',
                        color: props.dark ? 'white' : '',
                        fontSize: '10px',
                        textAlign: 'center',
                        transform: 'translateX(0%)',
                        overflow: 'hidden',
                        boxShadow: 'none',
                        zIndex: 10
                    }}>
                        Children
                    </Card>
                    <Card sx={{
                        minWidth: "100%",
                        maxWidth: "100%",
                        minHeight: "90%",
                        maxHeight: "90%",
                        overflowY: 'auto',
                        overflowX: 'hidden',
                        wordBreak: "break-word",
                        backgroundColor: props.dark ? '#3b3d3e' : '#f4f4f4'
                    }}>
                        <OtherNodesLayer
                            nodes={props.layouter.getChildrenNodes(props.tree, props.layouter.getSelectedNode(props.tree))}
                            modifyTree={modifyTree} selectedNode={selectedNode} dark={props.dark} level={2}/>
                    </Card>
                </Grid>
            </Grid>
        </>
    );
};

export default NavigatorLayer;
