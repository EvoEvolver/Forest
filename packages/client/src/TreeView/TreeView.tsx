import React, {useEffect, useState} from 'react';
import {Box, Card, Grid, Typography} from '@mui/material';
import {useAtom, useAtomValue, useSetAtom} from "jotai";
import {listOfNodesForViewAtom, selectedNodeAtom, treeAtom} from "../TreeState/TreeState";
import {NodeButtons} from "./NodeButtons";
import {HoverSidePanel} from "./HoverSidePanel";
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
        <div style={{
            display: "flex", 
            height: "100%", 
            width: "100%", 
            backgroundColor: "#f0f0f0", 
            padding: "70px 10px 10px 10px", 
            boxSizing: "border-box",
            gap: "16px"
        }}>
            {!mobileMode && <div style={{width: "300px", flexShrink: 0, height: "100%"}}>
                <ColumnLeft/>
            </div>}
            <div style={{flex: 1, height: "100%", overflow: "visible", zIndex: "1000", minWidth: 0}}>
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
            </div>
            {!mobileMode && <div style={{width: "400px", flexShrink: 0, height: "100%"}} className={"hide-mobile"}>
                <ColumnRight/>
            </div>}
        </div>
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
        <NodeButtons node={node}/>
        <HoverSidePanel node={node} isVisible={isHovered}/>
    </div>
}

const NodeBorder = ({node}) => {
    return null
}


export default TreeView;
