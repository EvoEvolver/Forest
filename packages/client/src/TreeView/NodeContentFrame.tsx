import {Card} from "@mui/material";
import CardContent from "@mui/material/CardContent";
import React from "react";

export const NodeContentFrame = ({children}) => {
    const sxDefault = {
        width: "100%",
        height: "100%",
        overflowY: 'auto',
        overflowX: 'hidden',
        wordBreak: "break-word",
        boxShadow: "none",
    }
    return <>
        <Card sx={sxDefault}>
            <CardContent sx={{padding: '1rem'}}>
                {children}
            </CardContent>
        </Card>
    </>
}