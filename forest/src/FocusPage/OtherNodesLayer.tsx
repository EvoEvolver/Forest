import React, {useState, useEffect} from 'react';
import {Grid, Button, Paper, Typography} from '@mui/material';
import {Node} from "../entities";

const NodeElement = (props) => {
    const {modifyTree, selected} = props;
    let node: Node = props.node;
    return (
        <Paper
            elevation={3}
            style={{
                height: '100%',
                //p: 1,
                boxSizing: 'border-box',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                wordBreak: "break-word",
                padding: "10px",
                overflowY: "auto",
                backgroundColor: selected ? "blue" : "#FFFFFF",
                color: selected ? "#FFFFFF" : "#000000",
            }}
            onClick={() =>
            {
                modifyTree({
                    type: 'setSelectedNode',
                    id: node.id
                })
            }
            }
        >
            <Typography>{props.node.title}</Typography>
        </Paper>
    );
};

const OtherNodesLayer = ({nodes, modifyTree, selectedNode}) => {

    const elementsPerPage = 5;
    const [startPoint, setStartPoint] = useState(0);
    const [animate, setAnimate] = useState(false);

    useEffect(() => {
        setAnimate(true);
        const timeoutId = setTimeout(() => {
            setAnimate(false);
        }, 0);
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

    // listen to selectedNode change.

    useEffect(() => {
        let selectedNodeIndex = nodes.findIndex((node) => node.id === selectedNode.id);
        // check if need to click back or next button.
        if (selectedNodeIndex < startPoint) {
            handleBack();
        } else if (selectedNodeIndex >= startPoint + elementsPerPage) {
            handleNext();
        }
    }, [selectedNode]);

    return (
        <Grid container direction="column" alignItems="center" style={{height: '100%'}}>
            <Grid style={{height: '100%', marginTop: '10px'}} container justifyContent="center" alignItems="center">
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
                        <NodeElement node={node} selected={selectedNode !== undefined && node.id === selectedNode.id}
                                     modifyTree={modifyTree}/>
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
