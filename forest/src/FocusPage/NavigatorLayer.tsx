import React, {useState, useEffect} from 'react';
import {Grid, Button, Paper, Typography} from '@mui/material';
import OtherNodesLayer from './OtherNodesLayer';
import Card from "@mui/material/Card";


const NavigatorLayer = ({props, modifyTree, selectedNode}) => {
    let rect1, rect2, rect3;
    try {
        rect1 = document.querySelector('#ancestor_card').getBoundingClientRect();

        rect2 = document.querySelector('#sibling_card').getBoundingClientRect();

        rect3 = document.querySelector('#children_card').getBoundingClientRect();
    } catch (e) {
        // Set default values for the rect object
        rect1 = rect2 = rect3 = {
            top: 0,
            left: 0,
            width: 100,
            height: 100
        };
    }


    return (
        <>
            <Grid container item style={{height: "25%", display: "flex", flexDirection: "row", flex: "0 1 25%"}}>
                <Grid item
                      id="ancestor_card"
                      style={{
                          height: '100%',
                          backgroundColor: '#ffffff',
                          width: "33%",
                          flex: "1 0 33%",
                      }}>
                    <Card style={{
                        width: '50px',
                        height: '15px',
                        backgroundColor: '#f4f4f4',
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
                        backgroundColor: '#f4f4f4'
                    }}>

                        <OtherNodesLayer
                            nodes={props.layouter.getAncestorNodes(props.tree, props.layouter.getSelectedNode(props.tree)).reverse()}
                            modifyTree={modifyTree} selectedNode={selectedNode}/>
                    </Card>
                </Grid>

                <Grid item
                      id="sibling_card"
                      style={{
                          height: '100%',
                          backgroundColor: '#ffffff',
                          width: "33%",
                          paddingLeft: "3px",
                          flex: "0 1 33%",
                      }}>
                    <Card style={{
                        width: '50px',
                        height: '15px',
                        backgroundColor: '#f4f4f4',
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
                        backgroundColor: '#f4f4f4'
                    }}>

                        <OtherNodesLayer
                            nodes={props.layouter.getSiblingNodes(props.tree, props.layouter.getSelectedNode(props.tree))}
                            modifyTree={modifyTree} selectedNode={selectedNode}/>
                    </Card>

                </Grid>
                <Grid item
                      id="children_card"
                      style={{
                          height: '100%',
                          backgroundColor: '#ffffff',
                          width: "33%",
                          paddingLeft: "3px",
                          flex: "0 1 33%",
                      }}>
                    <Card style={{
                        width: '50px',
                        height: '15px',
                        backgroundColor: '#f4f4f4',
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
