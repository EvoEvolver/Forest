import React, {useRef} from 'react';
import {Card, Grid2 as Grid} from '@mui/material';
import {Node} from "../TreeState/entities";
import {useAtomValue, useSetAtom} from "jotai";
import {listOfNodesForViewAtom, selectedNodeAtom} from "../TreeState/TreeState";
import {NodeContentTabs} from "./NodeContentTab";
import CardContent from "@mui/material/CardContent";
import {NodeButtons} from "./NodeButtons";
import {isMobileModeAtom} from "../appState";
import {RightColumn} from "./RightColumn";
import {LeftColumn} from "./LeftColumn";


const TreeView = () => {
    const leaves = useAtomValue(listOfNodesForViewAtom)
    const mobileMode = useAtomValue(isMobileModeAtom)
    const nodesDivRef = useRef(null);

    if (leaves.length === 0) {
        return <></>
    }
    return (
        <Grid style={{height: "100%", width: "100%"}} container spacing={1}>
            {!mobileMode && <Grid size={3.5} style={{height: "100%"}}>
                <RightColumn/>
            </Grid>}
            <Grid size={mobileMode ? 12 : 5} style={{height: "100%"}}>
                <NodeContentFrame sx={{}}>
                    <div ref={nodesDivRef}>
                        {leaves.map((n, index) => <MiddleContents node={n} key={index}/>)}
                    </div>
                </NodeContentFrame>
            </Grid>
            {!mobileMode && <Grid style={{height: "100%"}} size={3.5} className={"hide-mobile"}>
                <LeftColumn/>
            </Grid>}
        </Grid>
    );
};


export const MiddleContents = ({node}: { node: Node }) => {
    let setSelectedNode = useSetAtom(selectedNodeAtom)

    const handleClick = (event) => {
        //console.log(event.target)
        setSelectedNode(node.id)
    }

    return <div
        style={{
            padding: "2px",
            paddingLeft: '10px',
            paddingRight: '10px',
            position: "relative",
        }}
    >
        <NodeFrame node={node}/>
        <div
            onClick={handleClick}
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

const NodeFrame = ({node}) => {
    let selectedNode = useAtomValue(selectedNodeAtom)
    const isSelected = selectedNode.id === node.id;
    const divStyle = {
        position: "absolute",
        top: "0",
        left: "0",
        width: "100%",
        height: "100%",
        boxShadow: isSelected ? '0 0 1px 2px rgba(0,0,0,0.1)' : null,
    }
    return <div style={divStyle} id={"frame-" + node.id}>
    </div>
}

export const NodeContentFrame = ({children, sx}) => {
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


export default TreeView;
