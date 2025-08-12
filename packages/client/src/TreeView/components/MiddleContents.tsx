/**
 * MiddleContents component for TreeView with drag and drop functionality
 */

import React, {useEffect, useRef, useState} from 'react';
import { useAtomValue, useSetAtom } from "jotai";
import { selectedNodeAtom, setNodePositionAtom, treeAtom } from "../../TreeState/TreeState";
import { NodeVM } from "@forest/schema";
import { NodeTitle } from "../NodeTitle";
import { NodeButtons } from "../NodeButtons";
import { HoverSidePanel } from "../HoverSidePanel";
import { HoverPlusButton } from "../HoverPlusButton";
import { thisNodeContext } from '../NodeContext';
import { useDragContext } from '../DragContext';
import { setupDragImage, setupDragData, calculateDropPosition } from '../utils/DragUtils';
import { DragButton } from './DragButton';
import { SelectedDot } from './SelectedDot';
import {useTheme} from "@mui/system";

interface MiddleContentsProps {
    node: NodeVM;
}

export const MiddleContents = ({ node }: MiddleContentsProps) => {
    let setSelectedNode = useSetAtom(selectedNodeAtom)
    const [isHovered, setIsHovered] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [dragOver, setDragOver] = useState<'top' | 'bottom' | null>(null);
    const setNodePosition = useSetAtom(setNodePositionAtom);
    const tree = useAtomValue(treeAtom);
    const theme = useTheme();

    const nodeTitle = useAtomValue(node.title);
    const { setDraggedNodeId } = useDragContext();

    const parentId = node.parent;
    let parentNode;
    if (parentId) {
        parentNode = useAtomValue(tree.nodeDict[parentId]);
    }

    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const element = ref.current;
        if (!element) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    const rect = entry.boundingClientRect;
                    const viewportCenter = window.innerHeight / 3.6;
                    const elementCenter = rect.top + rect.height / 2;
                    const tolerance = 50;
                    if (Math.abs(elementCenter - viewportCenter) < tolerance) {
                        setSelectedNode(node.id);
                    }
                }
            },
            {
                rootMargin: '-20% 0px -20% 0px', // This creates a 60% height zone in the center
                threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0]
            }
        );

        observer.observe(element);

        return () => {
            observer.unobserve(element);
        };
    }, []);

    const handleClick = () => {
        setSelectedNode(node.id);
    }

    const handleDragOver = (e: React.DragEvent) => {
        console.log("DragOver")
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';

        const dropPosition = calculateDropPosition(e, false);
        setDragOver(dropPosition);
    }

    const handleDragLeave = () => {
        console.log("DragLeave")
        setDragOver(null);
    }

    const handleDragStart = (e: React.DragEvent) => {
        console.log("DragStart")
        setTimeout(() => { // wait for the node to change, otherwise will cause bug
            setIsDragging(true);
        }, 50)
        setDraggedNodeId(node.id);
        setupDragData(e, node.id, node.parent || '');
        
        // Create drag image
        setupDragImage(e, nodeTitle);
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

        const dropPosition = calculateDropPosition(e, false);
        const shift = dropPosition === 'bottom' ? 1 : 0;

        // Calculate the shift needed
        // This will be handled by the setNodePosition atom
        setNodePosition({
            nodeId: draggedNodeId,
            targetId: node.id,
            shift: shift
        });
    }

    return <div
        ref={ref}
        style={{
            padding: '24px',
            marginBottom: '24px',
            borderRadius: '10px',
            display: 'flex',
            flexDirection: 'column',
            maxWidth: '800px',
            margin: '10px auto',
            position: "relative",
            backgroundColor: theme.palette.background.paper,
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
    >
        <div
            onClick={handleClick}
            id={`node-${node.id}`}
        >
            <thisNodeContext.Provider value={node}>
                <NodeTitle
                    node={node}
                />
                {!isDragging && node.nodeTypeVM.render(node)}
            </thisNodeContext.Provider>
        </div>
        <NodeButtons node={node}/>
        <HoverSidePanel node={node} isVisible={isHovered} isDragging={isDragging}/>
        <SelectedDot node={node}/>
        <DragButton node={node} isVisible={isHovered} handleDragStart={handleDragStart} isDragging={isDragging} handleDragEnd={handleDragEnd}/>

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