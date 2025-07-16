import React, {useState} from 'react';
import {Box, Card, Grid2 as Grid} from '@mui/material';
import {Node} from "../TreeState/entities";
import {useAtomValue, useSetAtom} from "jotai";
import {listOfNodesForViewAtom, selectedNodeAtom, setNodePositionAtom} from "../TreeState/TreeState";
import {NodeContentTabs} from "./NodeContentTab";
import CardContent from "@mui/material/CardContent";
import {NodeButtons} from "./NodeButtons";
import {isMobileModeAtom} from "../appState";
import {RightColumn} from "./RightColumn";
import {LeftColumn} from "./LeftColumn";



const TreeView = () => {
    const leaves = useAtomValue(listOfNodesForViewAtom)
    const mobileMode = useAtomValue(isMobileModeAtom)
    const setNodePosition = useSetAtom(setNodePositionAtom)
    const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null)

    if (leaves.length === 0) {
        return <></>
    }
    // @ts-ignore
    return (
        <Box style={{
            display: 'flex', 
            flexDirection: 'row', 
            width: '100%', 
            height: '100%', 
            backgroundColor: '#fafafa',
            overflow: 'hidden'
        }} >
            {!mobileMode && <RightColumn/>}
            
            <div
                style={{
                    flex: 1,
                    overflowY: 'auto',
                    height: '100%',
                    boxSizing: 'border-box',
                    padding: '48px',
                    minWidth: 0,
                }}>
                {leaves.map((n, index) => (
                    <MiddleContents 
                        node={n} 
                        key={n.id}
                        index={index}
                        draggedNodeId={draggedNodeId}
                        setDraggedNodeId={setDraggedNodeId}
                        setNodePosition={setNodePosition}
                    />
                ))}
            </div>
            
            {!mobileMode && <LeftColumn/>}
        </Box>

    );
};


export const MiddleContents = ({node, index, draggedNodeId, setDraggedNodeId, setNodePosition}: { 
    node: Node, 
    index: number,
    draggedNodeId: string | null,
    setDraggedNodeId: (id: string | null) => void,
    setNodePosition: (params: {nodeId: string, targetId: string, shift: number}) => void
}) => {
    let setSelectedNode = useSetAtom(selectedNodeAtom)
    const [isHovered, setIsHovered] = useState(false);
    const [isDragOver, setIsDragOver] = useState(false);

    const handleClick = (event) => {
        setSelectedNode(node.id)
    }

    const handleDragStart = (e: React.DragEvent) => {
        setDraggedNodeId(node.id);
        e.dataTransfer.effectAllowed = 'move';
    }

    const handleDragEnd = () => {
        setDraggedNodeId(null);
        setIsDragOver(false);
    }

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setIsDragOver(true);
    }

    const handleDragLeave = () => {
        setIsDragOver(false);
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        
        if (draggedNodeId && draggedNodeId !== node.id) {
            setNodePosition({
                nodeId: draggedNodeId,
                targetId: node.id,
                shift: 0
            });
        }
    }

    return <div
        draggable
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
            padding: '24px',
            marginBottom: '24px',
            borderRadius: '24px',
            display: 'flex',
            flexDirection: 'column',
            position: "relative",
            color: 'black',
            backgroundColor: isDragOver ? '#f0f0f0' : 'white',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            border: isDragOver ? '2px dashed #1976d2' : '1px solid #c6c6c6',
            cursor: 'move',
            opacity: draggedNodeId === node.id ? 0.5 : 1,
            transition: 'all 0.2s ease'
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
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

        {/* Side panel that appears on hover */}
        <NodeButtons node={node} isVisible={isHovered} />
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