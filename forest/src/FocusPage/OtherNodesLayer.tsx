import React, {useState, useEffect, useRef} from 'react';
import {Grid, Button, Paper, Typography} from '@mui/material';
import {Node} from "../entities";

const NodeElement = (props) => {
    const {modifyTree, selected} = props;
    let node: Node = props.node;
    let summary;
    if('short_summary' in node.data){
        summary = node.data['short_summary'];
    }
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
                justifyContent: 'flex-start', // Change this line
                wordBreak: "break-word",
                padding: "1px",
                overflowY: "auto",
                backgroundColor: props.dark?(selected ? "#343540" : "#5b5c5d"):(selected ? "#ece7f2" : "#FFFFFF"),
                color: props.dark ? "white" : "#000000",
            }}
            onClick={() => {
                modifyTree({
                    type: 'setSelectedNode',
                    id: node.id
                })
            }}
        >
            {
                props.refProps && <span ref={props.refProps}/>
            }
            <Typography style={{textAlign: 'left', marginLeft: '10px', marginRight:'5px'}}>{(node.title+((props.detail&&summary)?"<newline>"+summary:"")).split('<newline>').map((line, index) => (
        <React.Fragment key={index}>
          {line}
          <br />
        </React.Fragment>
      ))}</Typography>
        </Paper>


    );
};

const OtherNodesLayer = ({nodes, modifyTree, selectedNode, dark, level}) => { //level={0: Ancestor,1: Sibling, 2: Children}

    const elementsPerPage = 100;
    const [startPoint, setStartPoint] = useState(0);
    const [animate, setAnimate] = useState(false);

    const selectedNodeRef = useRef(null)
    const nodeContainerRef = useRef(null)

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
        if (selectedNodeRef.current)
            selectedNodeRef.current.scrollIntoView({behavior: "instant", block: "center"});
    }, [selectedNode]);

    return (
        <Grid container alignItems="center" style={{height: '21vh'}}>
            <Grid container justifyContent="center" direction='column' alignItems="center" style={{overflowY: "auto", margin: '5px',paddingBottom:'10px'}} ref={nodeContainerRef}>
                {nodes.slice(startPoint, startPoint + elementsPerPage).map((node, index) => (
                    <Grid
                        key={index}
                        item
                        style={{
                            width: '100%',
                            height: 'auto',
                            margin: `1px 0`,
                            transition: animate ? 'opacity 0.5s ease-in' : 'none',
                            opacity: animate ? 0 : 1,
                            flex: "0 0 10%",
                        }}
                    >
                        {(selectedNode !== undefined && node.id === selectedNode.id) &&
                            <NodeElement node={node} selected={true}
                                                     modifyTree={modifyTree}
                                                     refProps={selectedNodeRef} dark={dark} detail={level === 1}/>
                        }
                        {(selectedNode !== undefined && node.id !== selectedNode.id) &&
                        <NodeElement node={node} selected={false}
                                     modifyTree={modifyTree} dark={dark} detail={level === 1}/>}
                    </Grid>
                ))}
            </Grid>
        </Grid>


    );
};

export default OtherNodesLayer;
