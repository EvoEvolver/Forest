import React, {useEffect, useState} from 'react';
import {Button, Card, Grid} from '@mui/material';
import TabPanel from '@mui/lab/TabPanel';
import * as content_components from "./ContentComponents";
import {Node} from "../entities";
import './SelectedNodeLayer.css';
import {useAtom, useAtomValue, useSetAtom} from "jotai";
import {
    darkModeAtom,
    listOfNodesForViewAtom,
    selectedNodeAtom,
    setToCurrNodeChildrenAtom,
    setToCurrNodeParentAtom
} from "../Layouter";
import {NodeContentTabs} from "./NodeContentTab";
import CardContent from "@mui/material/CardContent";

let lastScroll = 0;

const NodeNaviButton = ({node}) => {

    const setToCurrNodeChildren = useSetAtom(setToCurrNodeChildrenAtom)
    const setToCurrNodeParent = useSetAtom(setToCurrNodeParentAtom)

    const onLeftBtn = (id) => {
        setToCurrNodeParent()
    }
    const onRightBtn = (id) => {
        setToCurrNodeChildren()
    }

    return <div
        style={{
            height: '2rem',
            paddingLeft: '10px',
            paddingRight: '10px',
            paddingBottom: '5px',
            marginBottom: '10px',
            position: 'relative'
        }}
    >
        {node.parent && <Button
            class="hover-button"
            onClick={() => onLeftBtn(node.id)}
            style={{
                //align left
                position: 'absolute',
                left: '0',

            }}
        >←
        </Button>}
        {node.children.length > 0 && <Button
            class="hover-button"
            onClick={() => onRightBtn(node.id)}
            style={{
                // align right
                position: 'absolute',
                right: '0',
            }}
        >→
        </Button>}
    </div>
}

const SelectedNodeLayer = (props) => {
    const node: Node = useAtomValue(selectedNodeAtom)
    const [animate, setAnimate] = useState(false);
    const leaves = useAtomValue(listOfNodesForViewAtom)


    useEffect(() => {
        const handleWheel = () => {
            const targets = document.querySelectorAll('[data-ref]');
            let closestIndex = -1;
            let minDistance = Infinity;

            // Define a helper function to get the distance of an element's rect.y from 0
            const getDistance = (target) => {
                const rect = target.getBoundingClientRect();
                return Math.abs(rect.y + rect.height / 2 - window.innerHeight * 0.3);
            };

            // Binary search for the minimum absolute rect.y
            for (let i = 0; i < targets.length; i++) {
                const distance = getDistance(targets[i]);
                if (distance < minDistance) {
                    minDistance = distance;
                    closestIndex = i;
                }
            }
            if (closestIndex !== -1) {
                const nodeId = targets[closestIndex].getAttribute('data-index');
                if (nodeId !== node.id) {
                    props.modifyTree({
                        type: 'setSelectedNode',
                        id: targets[closestIndex].getAttribute('data-index')
                    });
                }
            }
            lastScroll = new Date().getTime();
        };
        window.addEventListener('wheel', handleWheel);
        return () => {
            window.removeEventListener('wheel', handleWheel);
        };
    }, []);


    const handleClick = (event, id) => {
        if (node.id === id) return;
        console.log("Clicked", id);
        lastScroll = new Date().getTime();
        props.modifyTree({
            type: 'setSelectedNode',
            id: id
        });

    }

    const scrollToTarget = (id) => {
        let currTime = new Date().getTime();
        if (currTime - lastScroll < 300) return;
        const targetElement = document.querySelector(`[data-index="${id}"]`);
        if (targetElement) {
            const rect = targetElement.getBoundingClientRect();
            // if (((rect.y + rect.height / 2) > window.innerHeight * 0.7) || ((rect.y + rect.height / 2) < 0)) {
            targetElement.scrollIntoView({behavior: 'auto', block: 'start'});
            // }
        }
    };


    useEffect(() => {
        setAnimate(true);
        // Make sure we scroll to target after the page was fully loaded.
        const scrollTimeoutId = setTimeout(() => {
            if(node)
                scrollToTarget(node.id);
        }, 30); // Delay scrollToTarget by 50ms

        const animateTimeoutId = setTimeout(() => {
            setAnimate(false);
        }, 0);

        // Clear both timeouts when the component unmounts or `node` changes
        return () => {
            clearTimeout(scrollTimeoutId);
            clearTimeout(animateTimeoutId);
        };
    }, [node]);



    const gridStyle = {
        height: "100%",
        transition: animate ? 'opacity 0.5s ease-in' : 'none',
        opacity: animate ? 0 : 1,
    }


    if (!node) {
        return <></>
    }
    return (
        <Grid style={{height: "100%", width:"100%"}} container spacing={1}>
            <NodeContentFrame gridStyle={gridStyle} xs={3.5}>
                <NodeContentTabs node={node} tabDict={node.tools[0]} title=""/>
            </NodeContentFrame>

            <NodeContentFrame gridStyle={gridStyle} xs={5}>

                {leaves.map((n,index)=>
                    <MiddleContents node={n} selected={n.id === node.id} key={index}/>)}
            </NodeContentFrame>

            <NodeContentFrame gridStyle={gridStyle} xs={3.5}>
                <NodeContentTabs node={node} tabDict={node.tools[1]} title=""/>
            </NodeContentFrame>
        </Grid>
    );
};


const MiddleContents = ({node, selected}: {node: Node, selected: boolean}) => {

    let setSelectedNode = useSetAtom(selectedNodeAtom)

    return <div
        style={{
            boxShadow: selected ? '0 0 1px 2px rgba(0,0,0,0.1)': null,
            padding: "2px",
            paddingLeft: '10px',
            paddingRight: '10px',
        }}

    >
        <div
        onClick={()=>{setSelectedNode(node.id)}}
        >
        <NodeContentTabs
            node={node}
            tabDict={node.tabs}
            title={node.title}
            //ref={props.contentRef}
        />
        </div>
        <NodeNaviButton node={node}/>
    </div>
}


const NodeContentFrame = ({children, gridStyle, xs}) => {
    const dark = useAtomValue(darkModeAtom)
    return <>
        <Grid key={0} item xs={xs} style={gridStyle}>
            <Card sx={{
            width: "100%",
            height: "100%",
            overflowY: 'auto',
            overflowX: 'hidden',
            wordBreak: "break-word",
            backgroundColor: dark ? '#3b3d3e' : '#f4f4f4'
            }}>
                <CardContent>
                    {children}
                </CardContent>
            </Card>

        </Grid>
    </>
}

export default SelectedNodeLayer;
