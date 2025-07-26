import React, {useEffect, useState} from 'react';
import {Box, Typography, IconButton, Tooltip} from '@mui/material';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import {useAtomValue, useSetAtom} from "jotai";
import {listOfNodesForViewAtom, selectedNodeAtom, setNodePositionAtom, treeAtom} from "../TreeState/TreeState";
import {useTheme} from "@mui/system";
import {NodeButtons} from "./NodeButtons";
import {HoverSidePanel} from "./HoverSidePanel";
import {HoverPlusButton} from "./HoverPlusButton";
import {isMobileModeAtom} from "../appState";
import {ColumnLeft} from "./ColumnLeft";
import {ColumnRight} from "./ColumnRight";
import {NodeVM} from "@forest/schema"
import {NodeTitle} from "./NodeTitle";
import {thisNodeContext} from './NodeContext';
import {updateChildrenCountAtom} from "../TreeState/childrenCount";
import {MarkedNodesBar} from './MarkedNodesBar';
import {DragProvider, useDragContext} from './DragContext';


const TreeViewContent = () => {
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
                        {leaves.filter((n) => n.data["archived"] !== true).map((n) => <MiddleContents node={n}
                                                                                                      key={n.id}/>)}
                    </div>
                    {/* Archive section only if there are archived nodes */}
                    {leaves.some(n => n.data["archived"] === true) && (
                        <>
                            <div style={{marginTop: 16, marginBottom: 8, display: 'flex', alignItems: 'center'}}>
                                <Typography
                                    sx={{color: '#afafaf'}}
                                    onClick={() => setShowArchived(v => !v)}
                                >
                                    Archived ({leaves.filter(n => n.data["archived"] === true).length})
                                    ({showArchived ? 'hide' : 'show'})
                                </Typography>
                            </div>
                            {showArchived && (
                                <Box style={{border: '1px dashed #555', borderRadius: 6, padding: 8, marginBottom: 8}}>
                                    {leaves.filter((n) => n.data["archived"] === true).map((n) => <MiddleContents
                                        node={n} key={n.id}/>)}
                                </Box>
                            )}
                        </>
                    )}
                </div>
            </div>
            
            {/* Floating bottom bar for marked nodes */}
            <MarkedNodesBar />
        </>
    );
};

const TreeView = () => {
    return (
        <DragProvider>
            <TreeViewContent />
        </DragProvider>
    );
};

const DragButton = ({node, isVisible, handleDragStart, isDragging}: {node: NodeVM, isVisible: boolean, handleDragStart: (e: React.DragEvent) => void, isDragging: boolean}) => {
    if (!isVisible || !node.nodeType.allowReshape) return null;
    
    return (
        <Tooltip title="Drag to Reorder" placement="left">
            <IconButton
                size="small"
                draggable={true}
                onDragStart={handleDragStart}
                sx={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    width: 28,
                    height: 28,
                    color: 'rgba(128, 128, 128, 0.8)',
                    cursor: 'move',
                    zIndex: 10,
                    opacity: isDragging ? 0 : 1,
                    transition: 'opacity 0.1s ease',
                    '&:hover': {
                        backgroundColor: 'rgba(128, 128, 128, 0.1)',
                        color: 'rgba(128, 128, 128, 1)',
                    }
                }}
            >
                <DragIndicatorIcon fontSize="small"/>
            </IconButton>
        </Tooltip>
    );
};

export const MiddleContents = ({node}: { node: NodeVM }) => {
    let setSelectedNode = useSetAtom(selectedNodeAtom)
    const [isHovered, setIsHovered] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [dragOver, setDragOver] = useState<'top' | 'bottom' | null>(null);
    const setNodePosition = useSetAtom(setNodePositionAtom);
    const tree = useAtomValue(treeAtom);

    const nodeTitle = useAtomValue(node.title);
    const { setDraggedNodeId } = useDragContext();

    const parentId = node.parent;
    let parentNode;
    if (parentId) {
        parentNode = useAtomValue(tree.nodeDict[parentId]);
    }

    const handleClick = () => {
        //console.log(event.target)
        setSelectedNode(node.id)
    }


    const handleDragOver = (e: React.DragEvent) => {
        console.log("DragOver")
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
        console.log("DragLeave")
        setDragOver(null);
    }


    const handleDragStart = (e: React.DragEvent) => {
        console.log("DragStart")
        setIsDragging(true);
        setDraggedNodeId(node.id);
        e.stopPropagation();
        e.dataTransfer.effectAllowed = 'copyMove';
        e.dataTransfer.setData('nodeId', node.id);
        e.dataTransfer.setData('parentId', node.parent || '');
        
        // Create a drag image that matches DragFollowCursor styling
        const dragImageEl = document.createElement('div');
        dragImageEl.style.cssText = `
            background: white;
            border: 1px solid rgba(0, 0, 0, 0.12);
            border-radius: 6px;
            padding: 6px 12px;
            font-size: 13px;
            font-weight: 400;
            color: rgba(0, 0, 0, 0.87);
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            opacity: 0.8;
            white-space: nowrap;
            font-family: inherit;
            max-width: 300px;
            overflow: hidden;
            text-overflow: ellipsis;
            pointer-events: none;
        `;
        dragImageEl.textContent = nodeTitle || 'Untitled Node';
        
        // Temporarily add to DOM, set as drag image, then remove
        document.body.appendChild(dragImageEl);
        e.dataTransfer.setDragImage(dragImageEl, -15, 14);
        setTimeout(() => document.body.removeChild(dragImageEl), 0);
    };

    const handleDragEnd = () => {
        console.log("DragEnd")
        setIsDragging(false);
        setDraggedNodeId(null);
    }

    const handleDrop = (e: React.DragEvent) => {
        console.log("Drop")
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
            borderRadius: '10px',
            display: 'flex',
            flexDirection: 'column',
            maxWidth: '800px',
            margin: '10px auto',
            position: "relative",
            color: 'black',
            backgroundColor: 'white',
            boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
            opacity: isDragging ? 0.5 : 1,
            borderTop: dragOver === 'top' ? '3px solid #1976d2' : '0px solid #c6c6c6',
            borderBottom: dragOver === 'bottom' ? '3px solid #1976d2' : '0px solid #c6c6c6',
            transition: 'opacity 0.2s ease',
        }}
        onMouseEnter={() => {
                setIsHovered(true)
            }
        }
        onMouseLeave={() => {
            setIsHovered(false);
            setIsDragging(false);
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onDragEnd={handleDragEnd}
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
        <HoverSidePanel node={node} isVisible={isHovered} isDragging={isDragging} setIsDragging={setIsDragging}/>
        <SelectedDot node={node}/>
        <DragButton node={node} isVisible={isHovered} handleDragStart={handleDragStart} isDragging={isDragging}/>

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
