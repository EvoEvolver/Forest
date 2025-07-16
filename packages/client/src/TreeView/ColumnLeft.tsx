import {NavigatorButtons, NavigatorLayer} from "./NavigatorLayer";
import React from "react";
import {selectedNodeAtom} from "../TreeState/TreeState";
import {useAtomValue} from "jotai";
import {NodeContentFrame} from "./NodeContentFrame";
import {Box} from "@mui/material";


export function ColumnLeft() {
    const selectedNode = useAtomValue(selectedNodeAtom)
    if (!selectedNode)
        return null
    return <>
        <Box sx={{
            height: "100%",
            width: "100%",
            boxShadow: "0px 0px 20px rgba(0,0,0,0.1)",
            border: "1px solid",
            borderColor: '#c6c6c6',
            borderRadius: "10px",
            boxSizing: 'border-box',
            paddingTop: '5px',
            paddingBottom: '5px',
            backgroundColor: '#fafafa',
            color: 'black',
        }}>
            <NavigatorLayer/>
        </Box>
    </>;
}