import React, { useMemo } from 'react';
import { useTheme } from '@mui/material';
import ReactFlow, {
    Background,
    Controls,
    Edge,
    MarkerType,
    MiniMap,
    Node,
    useEdgesState,
    useNodesState
} from 'reactflow';
import {atom, useAtom} from 'jotai';
import * as d3 from 'd3-hierarchy';
import 'reactflow/dist/style.css';
import {treeAtom} from '../TreeState/TreeState';
import SmoothEdge from "./SmoothEdge";
import ExpandableNode from './ExpandableNode'; // Import the new node type
import {nodeStateAtom} from './nodeStateAtom';
import {NodeVM} from "@forest/schema"; // Import the state atom

// Derive flow data with d3-hierarchy and expand/collapse logic
const flowDataAtom = atom((get) => {
    const treeData = get(treeAtom);
    if (!treeData) return {nodes: [], edges: []};

    const {nodeDict} = treeData;

    const rawNodes = Object.entries(nodeDict).map(([id, nodeAtom]) => {
        const node: NodeVM = get(nodeAtom);
        const title = get(node.title);
        return {id, title, parentId: node.parent, childrenIds: get(node.children)};
    });

    const rootNodeData = rawNodes.find(n => !n.parentId);
    if (!rootNodeData) return {nodes: [], edges: []};

    const nodeDataMap = new Map(rawNodes.map(n => [n.id, n]));

    const buildHierarchy = (nodeId: string): any => {
        const node = nodeDataMap.get(nodeId);
        if (!node) return null;

        const children = node.childrenIds.map(childId => nodeDataMap.get(childId)).filter(Boolean);
        const nodeState = get(nodeStateAtom(nodeId));

        // If the node is collapsed, we don't include its children
        if (nodeState.isCollapsed && children.length > 0) {
            return {
                id: node.id,
                name: node.title,
                children: undefined, // No children for collapsed nodes
                _children: children.map(child => buildHierarchy(child.id)), // Keep track of hidden children
            };
        }

        return {
            id: node.id,
            name: node.title,
            children: children.length > 0 ? children.map(child => buildHierarchy(child.id)) : undefined,
        };
    };

    const root = d3.hierarchy(buildHierarchy(rootNodeData.id));

    const nodeWidth = 220;
    const nodeHeight = 60;
    const treeLayout = d3.tree().nodeSize([nodeHeight + 40, nodeWidth + 100]);

    const layoutRoot = treeLayout(root);

    const nodes: Node[] = [];
    const edges: Edge[] = [];

    layoutRoot.each(d => {
        const position = {x: d.y, y: d.x};
        const hasChildren = !!rawNodes.find(n => n.parentId === d.data.id);
        const isCollapsed = get(nodeStateAtom(d.data.id)).isCollapsed;

        nodes.push({
            id: d.data.id,
            position,
            targetPosition: 'left',
            sourcePosition: 'right',
            data: {
                label: d.data.name,
                isExpandable: hasChildren,
                isCollapsed: isCollapsed,
            },
            type: 'expandable'
        });

        if (d.parent) {
            edges.push({
                id: `e${d.parent.data.id}-${d.data.id}`,
                source: d.parent.data.id,
                target: d.data.id,
                type: 'smooth',
                markerEnd: {
                    type: MarkerType.ArrowClosed,
                },
            });
        }
    });

    // Better centering with more space
    const offsetX = 150;
    const offsetY = 100;

    const centeredNodes = nodes.map(n => ({
        ...n,
        position: {
            x: n.position.x + offsetX,
            y: n.position.y + offsetY,
        },
    }));


    return {nodes: centeredNodes, edges};
});

const edgeTypes = {
    smooth: SmoothEdge,
};

// Define the custom node types
const nodeTypes = {
    expandable: ExpandableNode,
};

const FlowVisualizer = () => {
    const theme = useTheme();
    // We use useAtom instead of useAtomValue to get the setter for recalculating layout
    const [flowData, recomputeFlowData] = useAtom(flowDataAtom);
    const [nodes, setNodes, onNodesChange] = useNodesState(flowData.nodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(flowData.edges);

    // Memoize types to prevent ReactFlow warnings
    const memoizedNodeTypes = useMemo(() => nodeTypes, []);
    const memoizedEdgeTypes = useMemo(() => edgeTypes, []);

    React.useEffect(() => {
        // When the atom's data changes (e.g., on expand/collapse),
        // update the state in React Flow.
        setNodes(flowData.nodes);
        setEdges(flowData.edges);
    }, [flowData, setNodes, setEdges]);

    if (nodes.length === 0) return null;

    return (
        <div style={{width: '100vw', height: '100vh', background: theme.palette.background.default}}>
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                nodeTypes={memoizedNodeTypes}
                edgeTypes={memoizedEdgeTypes}
                fitView
                fitViewOptions={{
                    padding: 0.2,
                    minZoom: 0.5,
                    maxZoom: 1.5
                }}
                defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
                proOptions={{hideAttribution: true}}
                style={{ background: theme.palette.background.default }}
            >
                <Background
                    gap={20}
                    size={1}
                    variant="dots"
                />
                <MiniMap
                    nodeColor={theme.palette.primary.main}
                    maskColor={theme.palette.mode === 'dark' ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"}
                    style={{
                        background: theme.palette.background.paper,
                        border: `1px solid ${theme.palette.divider}`,
                        borderRadius: 8
                    }}
                />
                <Controls
                    style={{
                        background: theme.palette.background.paper,
                        border: `1px solid ${theme.palette.divider}`,
                        borderRadius: 8,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    }}
                />
            </ReactFlow>
        </div>
    );
};

export default FlowVisualizer;