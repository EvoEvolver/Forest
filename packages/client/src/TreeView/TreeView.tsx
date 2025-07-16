import React, {useEffect, useState} from 'react';
import {Box, Card, Grid, Typography} from '@mui/material';
import {useAtom, useAtomValue, useSetAtom} from "jotai";
import {listOfNodesForViewAtom, selectedNodeAtom, treeAtom} from "../TreeState/TreeState";
import CardContent from "@mui/material/CardContent";
import {NodeButtons} from "./NodeButtons";
import {isMobileModeAtom} from "../appState";
import {ColumnLeft} from "./ColumnLeft";
import {ColumnRight} from "./ColumnRight";
import {NodeVM} from "@forest/schema"
import {NodeTitle} from "./NodeTitle";
import { thisNodeContext } from './NodeContext';
import {updateChildrenCountAtom} from "../TreeState/childrenCount";

const TreeView = () => {
    const leaves = useAtomValue(listOfNodesForViewAtom)
    const mobileMode = useAtomValue(isMobileModeAtom)
    const tree = useAtomValue(treeAtom)
    const commitNumber = useAtomValue(tree.viewCommitNumberAtom)
    const countChildren = useSetAtom(updateChildrenCountAtom)
    const [showArchived, setShowArchived] = useState(false);
    useEffect(() => {
        countChildren({})
    }, [commitNumber]);
    if (leaves.length === 0)
        return null
    return (
        <Grid style={{height: "100%", width: "100%"}} container spacing={1}>
            {!mobileMode && <Grid size={3.5} style={{height: "100%"}}>
                <ColumnLeft/>
            </Grid>}
            <Grid size={mobileMode ? 12 : 5} style={{height: "100%"}}>
                <NodeContentFrame>
                    <div>
                        {leaves.filter((n) => n.data["archived"]!==true).map((n)=><MiddleContents node={n} key={n.id}/>)}
                    </div>
                    {/* Archive section only if there are archived nodes */}
                    {leaves.some(n => n.data["archived"] === true) && (
                        <>
                        <div style={{marginTop: 16, marginBottom: 8, display: 'flex', alignItems: 'center'}}>
                            <Typography
                                sx={{color: '#afafaf'}}
                                onClick={() => setShowArchived(v => !v)}
                            >
                                Archived ({leaves.filter(n => n.data["archived"]===true).length}) ({showArchived ? 'hide' : 'show'})
                            </Typography>
                        </div>
                        {showArchived && (
                            <Box style={{border: '1px dashed #555', borderRadius: 6, padding: 8, marginBottom: 8}}>
                                {leaves.filter((n) => n.data["archived"]===true).map((n)=><MiddleContents node={n} key={n.id}/>)}
                            </Box>
                        )}
                        </>
                    )}
                </NodeContentFrame>
            </Grid>
            {!mobileMode && <Grid style={{height: "100%"}} size={3.5} className={"hide-mobile"}>
                <ColumnRight/>
            </Grid>}
        </Grid>
    );
};

export const MiddleContents = ({node}: { node: NodeVM }) => {
    let setSelectedNode = useSetAtom(selectedNodeAtom)

    const handleClick = () => {
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
        <NodeBorder node={node}/>
        <div
            onClick={handleClick}
            id={`node-${node.id}`}
        >
            <thisNodeContext.Provider value={node}>
            <NodeTitle
                node={node}
            />
            {node.nodeType.render(node)}
            </thisNodeContext.Provider>
        </div>
        <NodeButtons node={node}/>
    </div>
}

const NodeBorder = ({node}) => {
    let selectedNode = useAtomValue(selectedNodeAtom)
    if (!selectedNode)
        return null
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
