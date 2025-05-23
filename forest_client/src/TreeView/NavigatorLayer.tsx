import React from 'react';
import {Grid} from '@mui/material';
import OtherNodesLayer from './OtherNodesLayer';
import Card from "@mui/material/Card";
import {useAtomValue} from "jotai/index";
import {
    ancestorStackNodesAtom,
    currNodeAncestorsAtom,
    currNodeChildrenAtom,
    darkModeAtom,
    listOfNodesForViewAtom
} from "../TreeState";


const NavigatorLayer = () => {
    const dark = useAtomValue(darkModeAtom)
    const currNodeChildren = useAtomValue(currNodeChildrenAtom)
    const listOfNodesForView = useAtomValue(listOfNodesForViewAtom)
    const currNodeAncestors = useAtomValue(ancestorStackNodesAtom)

    return (
        <>
            <Grid container item style={{width: "100%", height: "30%"}} spacing={1}>
                <Grid item
                      id="ancestor_card"
                      style={{
                          height: '100%',
                          backgroundColor: dark ? '#2c2c2c' : '#ffffff',
                      }}
                      xs={3.5}
                >
                    <Card style={{
                        width: '50px',
                        height: '15px',
                        backgroundColor: dark ? '#3b3d3e' : '#f4f4f4',
                        color: dark ? 'white' : '',
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
                        backgroundColor: dark ? '#3b3d3e' : '#f4f4f4'
                    }}>

                        <OtherNodesLayer nodes={currNodeAncestors} level={0}/>
                    </Card>
                </Grid>

                <Grid item
                      id="sibling_card"
                      style={{
                          height: '100%',
                          backgroundColor: dark ? '#2c2c2c' : '#ffffff',
                          paddingLeft: "3px",
                      }}
                      xs={5}>
                    <Card style={{
                        width: '50px',
                        height: '15px',
                        backgroundColor: dark ? '#3b3d3e' : '#f4f4f4',
                        color: dark ? 'white' : '',
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
                        backgroundColor: dark ? '#3b3d3e' : '#f4f4f4'
                    }}>

                        <OtherNodesLayer nodes={listOfNodesForView} level={1}/>
                    </Card>

                </Grid>
                <Grid item
                      id="children_card"
                      style={{
                          height: '100%',
                          backgroundColor: dark ? '#2c2c2c' : '#ffffff',
                          paddingLeft: "3px",
                      }}
                      xs={3.5}>
                    <Card style={{
                        width: '50px',
                        height: '15px',
                        backgroundColor: dark ? '#3b3d3e' : '#f4f4f4',
                        color: dark ? 'white' : '',
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
                        backgroundColor: dark ? '#3b3d3e' : '#f4f4f4'
                    }}>
                        <OtherNodesLayer
                            nodes={currNodeChildren} level={2}/>
                    </Card>
                </Grid>
            </Grid>
        </>
    );
};

export default NavigatorLayer;
