import React from 'react';
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

    if (leaves.length === 0) {
        return <></>
    }
    return (
        <Grid style={{height: "100%", width: "100%"}} container spacing={1}>
            {!mobileMode && <Grid size={3.5} style={{height: "100%"}}>
                <RightColumn/>
            </Grid>}
            <Grid size={mobileMode ? 12 : 5} style={{height: "100%"}}>
                <NodeContentFrame>
                    <div>
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
            id={`node-${node.id}`}
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
    const lineWidth = "3px"
    const lineStyle = {
        position: 'absolute' as const,
        left: '0',
        top: '0',
        width: '100%',
        height: lineWidth,
        backgroundColor: '#dadada'
    };

    if (!isSelected)
        return <></>
    else
        return <>
            <div style={{...lineStyle, top: '0'}}></div>
            <div style={{...lineStyle, width: lineWidth, height: '100%'}}></div>
            <div style={{...lineStyle, width: lineWidth, height: '100%', left: `calc(100% - ${lineWidth})`}}></div>
            <div style={{...lineStyle, top: '100%'}}></div>
        </>
}

export const NodeContentFrame = ({children}) => {
    const sxDefault = {
        width: "100%",
        height: "100%",
        overflowY: 'auto',
        overflowX: 'hidden',
        wordBreak: "break-word",
        backgroundColor: '#f4f4f4'
    }
    return <>
        <Card sx={sxDefault}>
            <CardContent>
                {children}
            </CardContent>
        </Card>
    </>
}


export default TreeView;
