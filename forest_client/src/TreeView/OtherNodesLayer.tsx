import React, {useEffect, useRef, useState} from 'react';
import {Grid, Paper, Typography} from '@mui/material';
import {useAtom, useAtomValue} from "jotai";
import {darkModeAtom, selectedNodeAtom} from "../TreeState/TreeState";

const NodeElement = ({node, refProps, dark, detail}) => {
    const [selectedNode, setSelectedNode] = useAtom(selectedNodeAtom)

    let selected = selectedNode.id === node.id
    let summary;
    if ('short_summary' in node.data) {
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
                backgroundColor: dark ? (selected ? "#343540" : "#5b5c5d") : (selected ? "#ece7f2" : "#FFFFFF"),
                color: dark ? "white" : "#000000",
            }}
            onClick={() => {
                setSelectedNode(node.id)
            }}
        >
            {
                refProps && <span ref={refProps}/>
            }
            <Typography style={{
                textAlign: 'left',
                marginLeft: '10px',
                marginRight: '5px'
            }}>{(node.title + ((detail && summary) ? "<newline>" + summary : "")).split('<newline>').map((line, index) => (
                <React.Fragment key={index}>
                    {line}
                    <br/>
                </React.Fragment>
            ))}</Typography>
        </Paper>


    );
};

const OtherNodesLayer = ({nodes, level}) => { //level={0: Ancestor,1: Sibling, 2: Children}

    const elementsPerPage = 100;
    const [startPoint, setStartPoint] = useState(0);
    const [animate, setAnimate] = useState(false);
    const selectedNode = useAtomValue(selectedNodeAtom)
    const dark = useAtomValue(darkModeAtom)
    const selectedNodeRef = useRef(null)
    const nodeContainerRef = useRef(null)
    const selectedNodeListRef = useRef(null)

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
        if (selectedNodeRef.current){
            const parent = nodeContainerRef.current.parentElement.parentElement;
            const parentRect = parent.getBoundingClientRect();
            const elementRect = selectedNodeRef.current.getBoundingClientRect();
            const scrollOffset = elementRect.top - parentRect.top - parentRect.height*0.4 + parent.scrollTop;
            // Scroll the parent to bring the element into view
            parent.scrollTo({
              top: scrollOffset,
              behavior: 'smooth'
            });
        }
         //   selectedNodeRef.current.scrollIntoView({behavior: "instant", block: "center"});
    }, [selectedNode]);

    return (
        <Grid container alignItems="center" style={{}}>
            <Grid container justifyContent="center" direction='column' alignItems="center"
                  style={{overflowY: "auto", margin: '5px', paddingBottom: '10px'}} ref={nodeContainerRef}>
                {nodes.slice(startPoint, startPoint + elementsPerPage).map((node, index) => (
                    <div
                        key={index}
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
                            <NodeElement node={node}
                                         refProps={selectedNodeRef} dark={dark} detail={level === 1}/>
                        }
                        {(selectedNode !== undefined && node.id !== selectedNode.id) &&
                            <NodeElement node={node} refProps={null} dark={dark} detail={level === 1}/>}
                    </div>
                ))}
            </Grid>
        </Grid>


    );
};

export default OtherNodesLayer;
