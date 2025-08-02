import React, { useMemo, useState, useEffect } from 'react';
import ReactFlow, {
    Background,
    Edge,
    MarkerType,
    Node,
    ReactFlowProvider,
} from 'reactflow';
import * as d3 from 'd3-hierarchy';
import 'reactflow/dist/style.css';
import { Box, Paper, Typography } from '@mui/material';
import { TreeJson } from '@forest/schema';

interface MiniFlowViewProps {
    treeData: TreeJson;
    width?: number;
    height?: number;
}

const MiniFlowView: React.FC<MiniFlowViewProps> = ({ 
    treeData, 
    width = 400, 
    height = 300 
}) => {
    const [nodes, setNodes] = useState<Node[]>([]);
    const [edges, setEdges] = useState<Edge[]>([]);

    useEffect(() => {
        if (!treeData || !treeData.nodeDict || !treeData.metadata?.rootId) {
            return;
        }

        const { nodeDict, metadata } = treeData;
        const rootId = metadata.rootId;

        // Build hierarchy from tree data
        const buildHierarchy = (nodeId: string): any => {
            const node = nodeDict[nodeId];
            if (!node) return null;

            return {
                id: node.id,
                name: node.title || 'Untitled',
                children: node.children
                    .map(childId => buildHierarchy(childId))
                    .filter(Boolean)
            };
        };

        const hierarchyData = buildHierarchy(rootId);
        if (!hierarchyData) return;

        const root = d3.hierarchy(hierarchyData);

        // Use smaller node sizes for the minimap
        const nodeWidth = 80;
        const nodeHeight = 30;
        const treeLayout = d3.tree().nodeSize([nodeHeight + 10, nodeWidth + 20]);

        const layoutRoot = treeLayout(root);

        const newNodes: Node[] = [];
        const newEdges: Edge[] = [];

        layoutRoot.each(d => {
            // Scale down positions for minimap
            const position = { x: d.y * 0.6, y: d.x * 0.6 };

            // Truncate long labels
            const label = d.data.name.length > 12 
                ? d.data.name.substring(0, 12) + '...' 
                : d.data.name;

            newNodes.push({
                id: d.data.id,
                position,
                data: { label },
                style: {
                    background: d.depth === 0 ? '#1565c0' : '#1976d2',
                    color: 'white',
                    border: d.depth === 0 ? '2px solid #0d47a1' : '1px solid #1565c0',
                    borderRadius: '6px',
                    fontSize: '9px',
                    fontWeight: d.depth === 0 ? 600 : 400,
                    width: nodeWidth,
                    height: nodeHeight,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '2px 6px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                },
                targetPosition: 'left',
                sourcePosition: 'right',
            });

            if (d.parent) {
                newEdges.push({
                    id: `e${d.parent.data.id}-${d.data.id}`,
                    source: d.parent.data.id,
                    target: d.data.id,
                    style: { stroke: '#90caf9', strokeWidth: 2 },
                    markerEnd: {
                        type: MarkerType.ArrowClosed,
                        color: '#90caf9',
                    },
                });
            }
        });

        // Center the nodes
        const offsetX = 50;
        const offsetY = height / 2;

        const centeredNodes = newNodes.map(n => ({
            ...n,
            position: {
                x: n.position.x + offsetX,
                y: n.position.y + offsetY,
            },
        }));

        setNodes(centeredNodes);
        setEdges(newEdges);
    }, [treeData, height]);

    const nodeCount = Object.keys(treeData?.nodeDict || {}).length;

    return (
        <Paper 
            elevation={8} 
            sx={{
                width,
                height,
                overflow: 'hidden',
                position: 'relative',
                backgroundColor: '#fafafa',
                border: '1px solid #e0e0e0',
                '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: -10,
                    left: -10,
                    right: -10,
                    bottom: -10,
                    background: 'radial-gradient(ellipse at center, rgba(25, 118, 210, 0.05) 0%, transparent 70%)',
                    pointerEvents: 'none',
                    zIndex: 0,
                }
            }}
        >
            <Box sx={{ position: 'relative', width: '100%', height: '100%', zIndex: 1 }}>
                {/* Title Bar */}
                <Box sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
                    padding: '8px 12px',
                    zIndex: 2,
                    backdropFilter: 'blur(8px)',
                }}>
                    <Typography
                        variant="subtitle2"
                        sx={{
                            fontSize: '12px',
                            fontWeight: 600,
                            color: 'primary.main',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                        }}
                    >
                        Tree Preview
                    </Typography>
                </Box>
                
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    fitView
                    fitViewOptions={{
                        padding: 0.15,
                        minZoom: 0.3,
                        maxZoom: 1
                    }}
                    panOnDrag={false}
                    zoomOnScroll={false}
                    zoomOnPinch={false}
                    zoomOnDoubleClick={false}
                    nodesDraggable={false}
                    nodesConnectable={false}
                    elementsSelectable={false}
                    proOptions={{ hideAttribution: true }}
                    style={{ background: '#fafafa' }}
                >
                    <Background
                        color="#e0e0e0"
                        gap={10}
                        size={0.5}
                        variant="dots"
                    />
                </ReactFlow>
                
                {/* Node Count Badge */}
                <Box
                    sx={{
                        position: 'absolute',
                        bottom: 8,
                        right: 8,
                        backgroundColor: 'primary.main',
                        color: 'white',
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: 500,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5,
                    }}
                >
                    <span style={{ fontSize: '9px' }}>●</span> {nodeCount} nodes
                </Box>
            </Box>
        </Paper>
    );
};

// Wrap with ReactFlowProvider for proper initialization
const MiniFlowViewWrapper: React.FC<MiniFlowViewProps> = (props) => {
    return (
        <ReactFlowProvider>
            <MiniFlowView {...props} />
        </ReactFlowProvider>
    );
};

export default MiniFlowViewWrapper;