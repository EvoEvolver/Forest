import React, {useEffect, useState} from 'react';
import {Box, Card, Grid, Typography} from '@mui/material';
import {useAtom, useAtomValue, useSetAtom} from "jotai";
import {listOfNodesForViewAtom, selectedNodeAtom, treeAtom} from "../TreeState/TreeState";
import {NodeButtons} from "./HoverSidePanel";
import {isMobileModeAtom} from "../appState";
import {ColumnLeft} from "./ColumnLeft";
import {ColumnRight} from "./ColumnRight";
import {NodeVM} from "@forest/schema"
import {NodeTitle} from "./NodeTitle";
import { thisNodeContext } from './NodeContext';
import {updateChildrenCountAtom} from "../TreeState/childrenCount";
import { NodeContentFrame } from './NodeContentFrame';

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
            <Grid size={mobileMode ? 12 : 5} style={{height: "100%", overflow: "visible", zIndex: "1000"}}>
               <div>
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
               </div>
            </Grid>
            {/*{!mobileMode && <Grid style={{height: "100%"}} size={3.5} className={"hide-mobile"}>*/}
            {/*    <ColumnRight/>*/}
            {/*</Grid>}*/}
        </Grid>
    );
};

export const MiddleContents = ({node}: { node: NodeVM }) => {
    let setSelectedNode = useSetAtom(selectedNodeAtom)
    const [isHovered, setIsHovered] = useState(false);

    const handleClick = () => {
        //console.log(event.target)
        setSelectedNode(node.id)
    }

    return <div
        style={{
            padding: '24px',
            marginBottom: '24px',
            borderRadius: '24px',
            display: 'flex',
            flexDirection: 'column',
            position: "relative",
            color: 'black',
            backgroundColor: 'white',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            border: '1px solid #c6c6c6',
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
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
        <NodeButtons node={node} isVisible={isHovered}/>
    </div>
}

const NodeBorder = ({node}) => {
    return null
}


export default TreeView;
