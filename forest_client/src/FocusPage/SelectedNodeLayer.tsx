import React, {useEffect, useRef, useState} from 'react';
import {Button, Card, Grid} from '@mui/material';
import {Node} from "../entities";
import './SelectedNodeLayer.css';
import {atom, useAtom, useAtomValue, useSetAtom} from "jotai";
import {
    darkModeAtom,
    listOfNodesForViewAtom,
    selectedNodeAtom,
    setToNodeChildrenAtom,
    setToNodeParentAtom
} from "../TreeState";
import {NodeContentTabs} from "./NodeContentTab";
import CardContent from "@mui/material/CardContent";


const currNodeInViewMiddleAtom = atom<string>("")


const NodeNaviButton = ({node}) => {

    const setToNodeChildren = useSetAtom(setToNodeChildrenAtom)
    const setToNodeParent = useSetAtom(setToNodeParentAtom)

    const onLeftBtn = (id) => {
        setToNodeParent(id)
    }
    const onRightBtn = (id) => {
        setToNodeChildren(id)
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

let mouseX = -1
let mouseY = -1

const SelectedNodeLayer = (props) => {
    const node: Node = useAtomValue(selectedNodeAtom)
    const [animate, setAnimate] = useState(false);
    const leaves = useAtomValue(listOfNodesForViewAtom)
    const [selectedNode, setSelectedNode] = useAtom(selectedNodeAtom)
    const [currNodeInViewMiddle, setCurrNodeInViewMiddle] = useAtom(currNodeInViewMiddleAtom)
    const selectableColumnRef = useRef(null);

    useEffect(() => {
        let wheelTimeout = null;

        const handleWheel = () => {
            if (wheelTimeout) {
                clearTimeout(wheelTimeout);
            }

            wheelTimeout = setTimeout(() => {
                const targets = selectableColumnRef.current.querySelectorAll('[data-ref]');

                let closestIndex = -1;

                function isUnderMouse(target) {
                    const rect = target.getBoundingClientRect();
                    return (
                        mouseX >= rect.left &&
                        mouseX <= rect.right &&
                        mouseY >= rect.top &&
                        mouseY <= rect.bottom
                    );
                }

                for (let i = 0; i < targets.length; i++) {
                    const target = targets[i];
                    if (isUnderMouse(target)) {
                        closestIndex = i;
                        break;
                    }
                }

                if (closestIndex !== -1) {
                    const nodeId = targets[closestIndex].getAttribute('data-index');
                    if (nodeId !== node.id) {
                        setCurrNodeInViewMiddle(() => nodeId);
                        setSelectedNode(nodeId);
                    }
                }
            }, 150);
        };

        selectableColumnRef.current.addEventListener('wheel', handleWheel);

        selectableColumnRef.current.addEventListener('mousemove', (event) => {
            mouseX = event.clientX; // Mouse X coordinate
            mouseY = event.clientY;
        })

        return () => {
            if (selectableColumnRef.current)
                selectableColumnRef.current.removeEventListener('wheel', handleWheel);
        };
    }, []);


    const scrollToTarget = (id) => {
        if (currNodeInViewMiddle === id) {
            return;
        }
        const targetElement = document.querySelector(`[data-index="${id}"]`);
        if (targetElement) {
            const parent = selectableColumnRef.current.parentElement.parentElement;
            const parentRect = parent.getBoundingClientRect();
            const elementRect = targetElement.getBoundingClientRect();
            const scrollOffset = elementRect.top - parentRect.top - parentRect.height * 0.1 + parent.scrollTop;

            // Scroll the parent to bring the element into view
            parent.scrollTo({
                top: scrollOffset,
                behavior: 'instant'
            });
            // }
        }
    };


    useEffect(() => {
        setAnimate(true);
        // Make sure we scroll to target after the page was fully loaded.
        const scrollTimeoutId = setTimeout(() => {
            if (node && currNodeInViewMiddle !== node.id)
                scrollToTarget(node.id);
        }, 0); // Delay scrollToTarget by 50ms

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
        <Grid style={{height: "100%", width: "100%"}} container spacing={1}>
            <NodeContentFrame gridStyle={gridStyle} xs={3.5}>
                <NodeContentTabs node={node} tabDict={node.tools[0]} title=""/>
            </NodeContentFrame>

            <NodeContentFrame gridStyle={gridStyle} xs={5}>
                <div ref={selectableColumnRef}>
                    {leaves.map((n, index) =>
                        <MiddleContents node={n} selected={n.id === node.id} key={index} index={index}/>)}
                </div>
            </NodeContentFrame>

            <NodeContentFrame gridStyle={gridStyle} xs={3.5}>
                <NodeContentTabs node={node} tabDict={node.tools[1]} title=""/>
            </NodeContentFrame>
        </Grid>
    );
};


const MiddleContents = ({node, selected, index}: { node: Node, selected: boolean, index: number }) => {

    let setSelectedNode = useSetAtom(selectedNodeAtom)

    const handleClick = (event) => {
        if (event.target === event.currentTarget) {
            setSelectedNode(node.id)
        }
    }

    return <div
        style={{
            boxShadow: selected ? '0 0 1px 2px rgba(0,0,0,0.1)' : null,
            padding: "2px",
            paddingLeft: '10px',
            paddingRight: '10px',
        }}

    >
        <div
            onClick={handleClick}
            data-ref={`content-${index}`}
            data-index={node.id}
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
