import React, {useEffect, useState} from 'react';
import {Box, Card, Grid, Typography} from '@mui/material';
import {useAtom, useAtomValue, useSetAtom} from "jotai";
import {listOfNodesForViewAtom, selectedNodeAtom, treeAtom, setNodePositionAtom} from "../TreeState/TreeState";
import {NodeButtons} from "./NodeButtons";
import {HoverSidePanel} from "./HoverSidePanel";
import {HoverPlusButton} from "./HoverPlusButton";
import {isMobileModeAtom} from "../appState";
import {ColumnLeft} from "./ColumnLeft";
import {ColumnRight} from "./ColumnRight";
import {NodeVM} from "@forest/schema"
import {NodeTitle} from "./NodeTitle";
import { thisNodeContext } from './NodeContext';
import {updateChildrenCountAtom} from "../TreeState/childrenCount";
import { NodeContentFrame } from './NodeContentFrame';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';


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
        <>
            {/* Fixed left column */}
            {!mobileMode && (
                <div style={{
                    position: 'fixed',
                    left: 10,
                    top: 70,
                    bottom: 10,
                    width: 300,
                    zIndex: 100
                }}>
                    <ColumnLeft/>
                </div>
            )}
            
            {/* Fixed right column */}
            {!mobileMode && (
                <div style={{
                    position: 'fixed',
                    right: 20,
                    top: 70,
                    bottom: 10,
                    width: 400,
                    zIndex: 100
                }}>
                    <ColumnRight/>
                </div>
            )}
            
            {/* Main content with grey background */}
            <div style={{
                minHeight: "100vh",
                width: "100%",
                margin: "auto",
                backgroundColor: "#f0f0f0",
                paddingTop: "70px",
                paddingBottom: "10px",
                paddingLeft: !mobileMode ? "326px" : "10px", // 300 + 16 gap + 10 padding
                paddingRight: !mobileMode ? "426px" : "10px", // 400 + 16 gap + 10 padding
                boxSizing: "border-box"
            }}>
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
        </>
    );
};

export const MiddleContents = ({node}: { node: NodeVM }) => {
    let setSelectedNode = useSetAtom(selectedNodeAtom)
    const [isHovered, setIsHovered] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [dragOver, setDragOver] = useState<'top' | 'bottom' | null>(null);
    const [isDragIconHovered, setIsDragIconHovered] = useState(false);
    const setNodePosition = useSetAtom(setNodePositionAtom);
    const tree = useAtomValue(treeAtom);

    const parentId = node.parent;
    let parentNode;
    if (parentId) {
        parentNode = useAtomValue(tree.nodeDict[parentId]);
    }

    const handleClick = () => {
        //console.log(event.target)
        setSelectedNode(node.id)
    }

    const handleDragStart = (e: React.DragEvent) => {
        e.stopPropagation();
        setIsDragging(true);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('nodeId', node.id);
        e.dataTransfer.setData('parentId', node.parent || '');
    }

    const handleDragEnd = () => {
        setIsDragging(false);
    }

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        
        const rect = e.currentTarget.getBoundingClientRect();
        const y = e.clientY - rect.top;
        const height = rect.height;
        
        if (y < height / 2) {
            setDragOver('top');
        } else {
            setDragOver('bottom');
        }
    }

    const handleDragLeave = () => {
        setDragOver(null);
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(null);

        const draggedNodeId = e.dataTransfer.getData('nodeId');
        const draggedParentId = e.dataTransfer.getData('parentId');

        // Don't drop on itself
        if (draggedNodeId === node.id) return;

        // Only allow reordering within the same parent
        if (draggedParentId !== (node.parent || '')) return;

        const rect = e.currentTarget.getBoundingClientRect();
        const y = e.clientY - rect.top;
        const height = rect.height;

        // Determine if dropping above or below
        const dropAbove = y < height / 2;

        // Calculate the shift needed
        // This will be handled by the setNodePosition atom
        setNodePosition({
            nodeId: draggedNodeId,
            targetId: node.id,
            shift: dropAbove ? 0 : 1
        });
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
            opacity: isDragging ? 0.5 : 1,
            borderTop: dragOver === 'top' ? '3px solid #1976d2' : '1px solid #c6c6c6',
            borderBottom: dragOver === 'bottom' ? '3px solid #1976d2' : '1px solid #c6c6c6',
            transition: 'opacity 0.2s ease',
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => {
            setIsHovered(false);
            setIsDragIconHovered(false);
            setIsDragging(false);
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
    >
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
        <SelectedDot node={node}/>
        
        {/* Hover Plus Buttons for Adding Siblings */}
        {parentNode && (
            <>
                <HoverPlusButton 
                    node={node} 
                    parentNode={parentNode} 
                    isVisible={isHovered}
                    position="bottom"
                />
            </>
        )}
        
        {/* Drag Indicator Icon */}
        {node.nodeType.allowReshape && (isHovered || isDragIconHovered) && (
            <div
                style={{
                    position: 'absolute',
                    left: '-15px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    cursor: 'move',
                    padding: '4px',
                    borderRadius: '4px',
                    backgroundColor: isDragIconHovered ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0.05)',
                    transition: 'background-color 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 9999
                }}
                draggable={true}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onMouseEnter={() => setIsDragIconHovered(true)}
                onMouseLeave={() => setIsDragIconHovered(false)}
            >
                <DragIndicatorIcon 
                    sx={{ 
                        color: '#666',
                        fontSize: '20px'
                    }} 
                />
            </div>
        )}
    </div>
}

const SelectedDot = ({node}) => {
    let selectedNode = useAtomValue(selectedNodeAtom)
    if (!selectedNode)
        return null
    const isSelected = selectedNode.id === node.id;

    if (!isSelected)
        return null
    else
        return <div
            style={{
                position: 'absolute',
                left: '8px',
                top: '35px', // Position near the title
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: '#1976d2', // Blue color
                zIndex: 10
            }}
        />
}

export default TreeView;
