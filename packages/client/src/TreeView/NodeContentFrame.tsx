import {Card} from "@mui/material";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
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
            <CardContent sx={{
                backgroundColor: '#fafafa',
                borderBottom: "1px solid #c6c6c6",
                padding: '0 0 0 1rem',
                display: 'flex',
                alignItems: 'center',
                height: '3rem',
            }}>
                <Typography sx={{ margin: 0 }}>
                    Header
                </Typography>
            </CardContent>
            <CardContent sx={{paddingTop: '0'}}>
                {children}
            </CardContent>
        </Card>
    </>
}