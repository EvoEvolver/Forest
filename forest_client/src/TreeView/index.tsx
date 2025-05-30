import React from 'react';
import {Grid} from '@mui/material';

import SelectedNodeLayer from './SelectedNodeLayer';
import {darkModeAtom} from "../TreeState/TreeState";
import {useAtomValue} from "jotai";


export default function TreeView(props) {
    const dark = useAtomValue(darkModeAtom)
    const selectedNodeLayerHeight = '99%';
    return (
        <Grid container item style={{height: "100%", width: "100%"}}>
            <Grid item
                  style={{
                      height: selectedNodeLayerHeight,
                      backgroundColor: dark ? "#2c2c2c" : '#ffffff',
                      width: "100%",
                      paddingTop: "10px"
                  }}>
                <SelectedNodeLayer contentRef={props.contentRef}/>
            </Grid>
        </Grid>
    );
}