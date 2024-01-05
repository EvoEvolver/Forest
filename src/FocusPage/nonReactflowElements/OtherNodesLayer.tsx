import React, { useState, useEffect } from 'react';
import { Grid, Button, Paper, Typography } from '@mui/material';

const NodeElement = (props) => {
    const { node, changeSelectedNode } = props;

    return (
        <Paper
            elevation={3}
            style={{
                height: '100%',
                p: 1,
                boxSizing: 'border-box',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}
            onClick={() => changeSelectedNode(node)}
        >
            <Typography>{props.node.data.label}</Typography>
        </Paper>
    );
};

const OtherNodesLayer = (props) => {
    const { nodes, changeSelectedNode } = props;
    const elementsPerPage = 5;
    const [startPoint, setStartPoint] = useState(0);
    const [animate, setAnimate] = useState(false);

    useEffect(() => {
        setAnimate(true);
        const timeoutId = setTimeout(() => {
            setAnimate(false); 
        }, 500);
        return () => clearTimeout(timeoutId);
    }, [startPoint]);

    const handleNext = () => {
        if (startPoint + elementsPerPage >= nodes.length) {
            return;
        } else {
            setStartPoint((startPoint) => startPoint + 1);
        }
    };

    const handleBack = () => {
        setStartPoint((startPoint) => Math.max(startPoint - 1, 0));
    };

    const elementWidth = `${100 / elementsPerPage}%`;

    return (
        <Grid container direction="column" alignItems="center" style={{ height: '100%' }}>
            <Grid style={{ height: '100%', marginTop: '10px' }} container justifyContent="center" alignItems="center">
                <Grid item>
                    <Button disabled={startPoint === 0} onClick={handleBack}>
                        Back
                    </Button>
                </Grid>
                {nodes.slice(startPoint, startPoint + elementsPerPage).map((node, index) => (
                    <Grid
                        key={index}
                        item
                        xs
                        style={{
                            width: elementWidth,
                            maxWidth: elementWidth,
                            height: '100%',
                            margin: `0 5px`,
                            transition: animate ? 'opacity 0.5s ease-in' : 'none',
                            opacity: animate ? 0 : 1,
                        }}
                    >
                        <NodeElement node={node} changeSelectedNode={changeSelectedNode} />
                    </Grid>
                ))}

                <Grid item>
                    <Button disabled={(startPoint + elementsPerPage) >= nodes.length} onClick={handleNext}>
                        Next
                    </Button>
                </Grid>
            </Grid>
        </Grid>
    );
};

export default OtherNodesLayer;
