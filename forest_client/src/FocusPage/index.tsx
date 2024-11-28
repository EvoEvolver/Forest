import React from 'react';
import {Grid} from '@mui/material';

import SelectedNodeLayer from './SelectedNodeLayer';
import NavigatorLayer from "./NavigatorLayer";
import {darkModeAtom} from "../TreeState";
import {useAtomValue} from "jotai";


export default function FocusPage(props) {
    const dark = useAtomValue(darkModeAtom)
    const selectedNodeLayerHeight = '70%';
    return (
        <Grid container item style={{height: "100%", display: "flex", flexDirection: "column", flex: "1 0 0%"}}>
            <Grid item
                  style={{
                      height: selectedNodeLayerHeight,
                      backgroundColor: dark ? "#2c2c2c" : '#ffffff',
                      width: "100%",
                      paddingTop: "10px",
                      flex: "0 0 70%"
                  }}>
                <SelectedNodeLayer contentRef={props.contentRef}/>
            </Grid>
            <NavigatorLayer/>
        </Grid>
    );
}