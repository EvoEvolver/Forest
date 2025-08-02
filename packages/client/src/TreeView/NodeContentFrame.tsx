import {Card} from "@mui/material";
import CardContent from "@mui/material/CardContent";
import React from "react";
import {useTheme} from "@mui/system";

export const NodeContentFrame = ({children}) => {
    const theme = useTheme();
    const sxDefault = {
        width: "100%",
        height: "100%",
        overflowY: 'auto',
        overflowX: 'hidden',
        wordBreak: "break-word",
        boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
        borderRadius: "16px",
        backgroundColor: theme.palette.background.paper,
        transition: "all 0.4s cubic-bezier(0.4, 0.0, 0.2, 1)",
        backgroundImage: "none", // removes the overlay gradient
    }
    return <>
        <Card sx={sxDefault}>
            <CardContent sx={{padding: '1rem'}}>
                {children}
            </CardContent>
        </Card>
    </>
}