import React, {useEffect} from 'react';
import {Card, Grid} from '@mui/material';
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
import {observe} from "jotai-effect";

const TreeView = () => {
    const leaves = useAtomValue(listOfNodesForViewAtom)
    const mobileMode = useAtomValue(isMobileModeAtom)
    const tree = useAtomValue(treeAtom)
    const commitNumber = useAtomValue(tree.viewCommitNumberAtom)
    const countChildren = useSetAtom(updateChildrenCountAtom)
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
                        {leaves.map((n, _) => <MiddleContents node={n} key={n.id}/>)}
                    </div>
                    {!mobileMode && (
                        <div style={{backgroundColor: '#fafafa', height: '100%'}}>
                            <LeftColumn/>
                        </div>
                    )}
                </Allotment>
            </Grid>
<<<<<<< HEAD:packages/client/src/TreeView/TreeView.tsx
            {!mobileMode && <Grid style={{height: "100%"}} size={3.5} className={"hide-mobile"}>
                <ColumnRight/>
            </Grid>}
        </Grid>
=======
        </Box>

>>>>>>> 2a7af02 (dev: beautify interface):forest_client/src/TreeView/TreeView.tsx
    );
};

export const MiddleContents = ({node}: { node: NodeVM }) => {
    let setSelectedNode = useSetAtom(selectedNodeAtom)

<<<<<<< HEAD:packages/client/src/TreeView/TreeView.tsx
    const handleClick = () => {
        //console.log(event.target)
=======
    const handleClick = (event) => {
>>>>>>> 2a7af02 (dev: beautify interface):forest_client/src/TreeView/TreeView.tsx
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
        <NodeBorder node={node}/>
        <div
            onClick={handleClick}
            // id={`node-${node.id}`}
        >
            <thisNodeContext.Provider value={node}>
            <NodeTitle
                node={node}
            />
<<<<<<< HEAD:packages/client/src/TreeView/TreeView.tsx
            {node.nodeType.render(node)}
            </thisNodeContext.Provider>
=======
            <NodeButtons node={node}/>
>>>>>>> 2a7af02 (dev: beautify interface):forest_client/src/TreeView/TreeView.tsx
        </div>
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
