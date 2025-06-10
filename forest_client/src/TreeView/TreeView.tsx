import React from 'react';
import {Card, Grid2 as Grid} from '@mui/material';
import {Node} from "../TreeState/entities";
import {useAtom, useAtomValue} from "jotai";
import {listOfNodesForViewAtom, selectedNodeAtom} from "../TreeState/TreeState";
import {NodeContentTabs} from "./NodeContentTab";
import CardContent from "@mui/material/CardContent";
import {NodeButtons} from "./NodeButtons";
import {isMobileModeAtom} from "../appState";
import {RightColumn} from "./RightColumn";
import {LeftColumn} from "./LeftColumn";


const TreeView = () => {
    const node: Node = useAtomValue(selectedNodeAtom)
    const leaves = useAtomValue(listOfNodesForViewAtom)
    const mobileMode = useAtomValue(isMobileModeAtom)

    if (!node) {
        return <></>
    }
    return (
        <Grid style={{height: "100%", width: "100%"}} container spacing={1}>
            {!mobileMode && <Grid size={3.5} style={{height: "100%"}}>
                {RightColumn()}
            </Grid>}
            <Grid size={mobileMode ? 12 : 5} style={{height: "100%"}}>
                <NodeContentFrame sx={{}}>
                    <div>
                        {leaves.map((n, index) =>
                            <MiddleContents node={n} key={index} index={index}/>)}
                    </div>
                </NodeContentFrame>
            </Grid>
            {!mobileMode && <Grid style={{height: "100%"}} size={3.5} className={"hide-mobile"}>
                {LeftColumn(node)}
            </Grid>}
        </Grid>
    );
};


const MiddleContents = ({node, index}: { node: Node, selected: boolean, index: number }) => {
    let [selectedNode, setSelectedNode] = useAtom(selectedNodeAtom)

    const handleClick = (event) => {
        console.log(event.target)
        setSelectedNode(node.id)
    }

    return <div
        style={{
            boxShadow: selectedNode.id == node.id ? '0 0 1px 2px rgba(0,0,0,0.1)' : null,
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
