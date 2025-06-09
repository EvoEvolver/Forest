import React, {useEffect, useState} from 'react';
import {Card, Grid2 as Grid} from '@mui/material';
import {Node} from "../entities";
import {useAtomValue, useSetAtom} from "jotai";
import {listOfNodesForViewAtom, selectedNodeAtom} from "../TreeState/TreeState";
import {NodeContentTabs} from "./NodeContentTab";
import CardContent from "@mui/material/CardContent";
import {NavigatorButtons, NavigatorLayer} from "./NavigatorLayer";
import {NodeButtons} from "./NodeButtons";


const SelectedNodeLayer = (props) => {
    const node: Node = useAtomValue(selectedNodeAtom)
    const leaves = useAtomValue(listOfNodesForViewAtom)

    const [mobileMode, setMobileMode] = useState(false);

    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth < 800) {
                setMobileMode(true);
            } else {
                setMobileMode(false);
            }
        }
        handleResize()

        window.addEventListener("resize", handleResize);

        // Cleanup function to remove event listener
        return () => window.removeEventListener("resize", handleResize);
    }, []);


    const gridStyle = {
        height: "100%",
    }


    if (!node) {
        return <></>
    }
    return (
        <Grid style={{height: "100%", width: "100%"}} container spacing={1}>
            {!mobileMode && <Grid item size={3.5} style={gridStyle}>
                <div style={{height: "100%"}}>
                    <div style={{height: "5%", width: "100%"}}><NavigatorButtons/></div>
                    <div style={{height: "95%", width: "100%"}}>
                        <NodeContentFrame sx={{}}>
                            <NavigatorLayer/>
                        </NodeContentFrame>
                    </div>
                </div>
            </Grid>}
            <Grid item size={mobileMode ? 12 : 5} style={gridStyle}>
                <NodeContentFrame sx={{}}>
                    <div>
                        {leaves.map((n, index) =>
                            <MiddleContents node={n} selected={n.id === node.id} key={index} index={index}/>)}
                    </div>
                </NodeContentFrame>
            </Grid>
            {!mobileMode && <Grid item style={gridStyle} size={3.5} className={"hide-mobile"}>
                <div style={{display: 'flex', flexDirection: 'column', height: '100%'}}>
                    <div style={{flex: 0.9, height: '50%', marginBottom: '2%'}}>
                        <NodeContentFrame sx={{}}>
                            <NodeContentTabs node={node} tabDict={node.tools[0]} title=""/>
                        </NodeContentFrame>
                    </div>
                    <div style={{flex: 0.9, height: '50%'}}>
                        <NodeContentFrame sx={{}}>
                            <NodeContentTabs node={node} tabDict={node.tools[1]} title=""/>
                        </NodeContentFrame>
                    </div>
                </div>
            </Grid>}
        </Grid>
    );
};


const MiddleContents = ({node, selected, index}: { node: Node, selected: boolean, index: number }) => {
    let setSelectedNode = useSetAtom(selectedNodeAtom)

    const handleClick = (event) => {
        console.log(event.target)
        setSelectedNode(node.id)
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
                titleAtom={node.title}
            />
        </div>
        <NodeButtons node={node}/>
    </div>
}


const NodeContentFrame = ({children, sx}) => {
    const sxDefault = {
        width: "100%",
        height: "100%",
        overflowY: 'auto',
        overflowX: 'hidden',
        wordBreak: "break-word",
        backgroundColor: '#f4f4f4'
    }
    return <>
        <Card sx={{
            ...sxDefault,
            ...sx
        }}>
            <CardContent>
                {children}
            </CardContent>
        </Card>
    </>
}

export default SelectedNodeLayer;
