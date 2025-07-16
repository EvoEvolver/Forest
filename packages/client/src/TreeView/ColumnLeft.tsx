import {NavigatorButtons, NavigatorLayer} from "./NavigatorLayer";
import React from "react";
import {selectedNodeAtom} from "../TreeState/TreeState";
import {useAtomValue} from "jotai";
import {Card} from "@mui/material";
import CardContent from "@mui/material/CardContent";



export const NodeContentFrame = ({children}) => {
    const sxDefault = {
        width: "100%",
        height: "100%",
        overflowY: 'auto',
        overflowX: 'hidden',
        wordBreak: "break-word",
        backgroundColor: '#fbfbfb',
        border: "1px solid",
        borderColor: '#c6c6c6',
        boxShadow: "0px 0px 20px rgba(0,0,0,0.1)",
        borderRadius: "10px",
    }
    return <>
        <Card sx={sxDefault}>
            <CardContent>
                {children}
            </CardContent>
        </Card>
    </>
}


export function ColumnLeft() {
    const selectedNode = useAtomValue(selectedNodeAtom)
    if (!selectedNode)
        return null
    return <>
        <div style={{height: "100%", width: "100%"}}>
            <NodeContentFrame>
                <NavigatorLayer/>
            </NodeContentFrame>
        </div>
    </>;
}