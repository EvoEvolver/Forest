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
        border: "1px solid #c6c6c6",
        borderRadius: "16px",
        backgroundColor: "#fafafa",
        color: "black",
        transition: "all 0.4s cubic-bezier(0.4, 0.0, 0.2, 1)",
    }
    return <>
        <Card sx={sxDefault}>
            <CardContent sx={{padding: '1rem'}}>
                {children}
            </CardContent>
        </Card>
    </>
}