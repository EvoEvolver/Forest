import React from 'react';
import {Box, Card, Grid2 as Grid} from '@mui/material';
import {Node} from "../TreeState/entities";
import {useAtomValue, useSetAtom} from "jotai";
import {listOfNodesForViewAtom, selectedNodeAtom} from "../TreeState/TreeState";
import {NodeContentTabs} from "./NodeContentTab";
import CardContent from "@mui/material/CardContent";
import {NodeButtons} from "./NodeButtons";
import {isMobileModeAtom} from "../appState";
import {RightColumn} from "./RightColumn";
import {LeftColumn} from "./LeftColumn";
import {Allotment} from "allotment";
import "allotment/dist/style.css";



const TreeView = () => {
    const leaves = useAtomValue(listOfNodesForViewAtom)
    const mobileMode = useAtomValue(isMobileModeAtom)

    if (leaves.length === 0) {
        return <></>
    }
    // @ts-ignore
    return (
        <Box style={{display: 'flex', flexDirection: 'row', width: '100%', height: '100%'}} >
            {!mobileMode &&
                <Grid
                    sx={{
                        position: 'absolute',
                        left: 0,
                        height: 'calc(100% - 24px)',
                        width: '18vw',
                        paddingLeft: '24px',
                        paddingTop: '24px'
                    }}
                >
                    <RightColumn/>
                </Grid>
            }

            <Grid
                style={{
                    position: 'absolute',
                    top: '0',
                    left: '20vw',
                    width: '80vw',
                    height: '100%',
                }}
            >
                <Allotment defaultSizes={[70, 30]}>
                    <div
                        style={{
                        overflowY: 'auto',
                        height: '100%',
                        boxSizing: 'border-box',
                        padding: '48px'
                        }}>
                        {leaves.map((n, index) => <MiddleContents node={n} key={index}/>)}
                    </div>
                    {!mobileMode && (
                        <div style={{backgroundColor: '#fafafa', height: '100%'}}>
                            <LeftColumn/>
                        </div>
                    )}
                </Allotment>
            </Grid>
        </Box>

    );
};


export const MiddleContents = ({node}: { node: Node }) => {
    let setSelectedNode = useSetAtom(selectedNodeAtom)

    const handleClick = (event) => {
        setSelectedNode(node.id)
    }

    return <div
        style={{
            display: 'flex',
            flexDirection: 'column',
            position: "relative",
            color: 'black',
        }}
    >
        <NodeFrame node={node}/>
        <div
            onClick={handleClick}
            // id={`node-${node.id}`}
        >
            <NodeContentTabs
                node={node}
                tabDict={node.tabs}
                titleAtom={node.title}
            />
            <NodeButtons node={node}/>
        </div>
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
        height: lineWidth};

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




export default TreeView;
