import {Card} from "@mui/material";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import React from "react";

export const NodeContentFrame = ({children}) => {
    const sxDefault = {
        position: "relative",
        width: "100%",
        height: "100%",
        overflowX: 'hidden',
        wordBreak: "break-word",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        display: "flex",
        flexDirection: "column",
        borderRadius: "24px",
        border: "1px solid #c6c6c6",
        backgroundColor: "white",
    }
    return <>
        <Card sx={sxDefault}>
            <CardContent sx={{
                backgroundColor: '#fafafa',
                borderBottom: "1px solid #c6c6c6",
                borderRadius: "24px 24px 0 0",
                padding: '0 0 0 1rem',
                display: 'flex',
                alignItems: 'center',
                height: '3rem',
            }}>
                <Typography sx={{ margin: 0 }}>
                    Header
                </Typography>
            </CardContent>
            <CardContent sx={{
                overflowY: 'auto',
                height: '100%',
                borderRadius: "0 0 24px 24px",
            }}>
                {children}
            </CardContent>
        </Card>
    </>
}