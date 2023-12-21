import React, { useCallback, useEffect, useState } from 'react';
import { Grid } from '@mui/material';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

const NodeElement = (props) => {

    return (
        <Card sx={{ minWidth: "100%", maxWidth: "100%", minHeight: "100%", maxHeight: "100%" }}>
            <CardContent>
                <Typography variant="h5" component="div">
                    {props.node.id}
                </Typography>
                <Typography variant="body2">
                    {props.node.data.content}
                </Typography>
            </CardContent>
        </Card>
    );
}

const CurrentNodeLayer = (props) => {
    let node = props.node;
    let number = 3;
    const elementWidth = `${100 / number}%`;
    const [animate, setAnimate] = useState(false);

    useEffect(() => {
        setAnimate(true);
        const timeoutId = setTimeout(() => {
            setAnimate(false); 
        }, 500);
        return () => clearTimeout(timeoutId);
    }, [node]);

    return (
        <Grid style={{ height: "100%" }} container>
            <Grid key={0} item xs style={{ width: elementWidth, border: '1px solid black', height: "100%", margin: "0 20px" }}>
                Tool 1
            </Grid>

            <Grid key={1} item xs style={{ width: elementWidth, height: "100%", margin: "0 20px", transition: animate ? 'opacity 0.5s ease-in' : 'none', opacity: animate ? 0 : 1,}}>
                <NodeElement node={node} />
            </Grid>

            <Grid key={2} item xs style={{ width: elementWidth, border: '1px solid black', height: "100%", margin: "0 20px" }}>
                Tool 2
            </Grid>
        </Grid>
    );
};

export default CurrentNodeLayer;
