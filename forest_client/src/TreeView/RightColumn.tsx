import {NavigatorButtons, NavigatorLayer} from "./NavigatorLayer";
import React from "react";
import {Box} from "@mui/material";

export function RightColumn() {
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