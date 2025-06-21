import React from 'react';
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
import {atom, useAtomValue} from 'jotai';
import * as d3 from 'd3-hierarchy'; // Import d3-hierarchy
import 'reactflow/dist/style.css';
import {treeAtom} from '../TreeState/TreeState'; // Assuming this path is correct
import SmoothEdge from "./SmoothEdge"; // Assuming this path is correct

// Derive flow data (nodes and edges) with d3-hierarchy horizontal layout
const flowDataAtom = atom((get) => {
    const treeData = get(treeAtom);
    if (!treeData) return {nodes: [], edges: []};

    const {nodeDict} = treeData;

    // Transform raw nodes into a format suitable for d3-hierarchy
    // d3.hierarchy expects a root node, and children array on each node.
    // We'll create a flat list first and then build the hierarchy.
    const rawNodes = Object.entries(nodeDict).map(([id, nodeAtom]) => {
        const node = get(nodeAtom);
        const title = get(node.title);
        return {id, title, parentId: node.parent}; // Use parentId to distinguish from d3 'parent' property
    });

    // Find the root node (a node with no parentId)
    const rootNodeData = rawNodes.find(n => !n.parentId);
    if (!rootNodeData) return {nodes: [], edges: []}; // No root, no hierarchy

    // Build a map for quick access to node data by ID
    const nodeDataMap = new Map(rawNodes.map(n => [n.id, n]));

    // Recursively build the d3-hierarchy data structure
    const buildHierarchy = (nodeId) => {
        const node = nodeDataMap.get(nodeId);
        if (!node) return null;

        const children = rawNodes.filter(n => n.parentId === nodeId);
        return {
            id: node.id,
            name: node.title, // 'name' is often used in d3 examples, mapping 'title' here
            children: children.length > 0 ? children.map(child => buildHierarchy(child.id)) : undefined,
        };
    };

    const root = d3.hierarchy(buildHierarchy(rootNodeData.id));

    // Create the d3 tree layout generator for a horizontal tree
    // We will fix the height/width for now, and React Flow will handle scaling.
    // The nodeSize is for specific spacing between nodes.
    const nodeWidth = 200; // Estimated width for a node
    const nodeHeight = 100; // Estimated height for a node

    // Using d3.tree() which is more suitable for "classic" tree layouts
    const treeLayout = d3.tree()
        .nodeSize([nodeHeight, nodeWidth]); // [x, y] where x is height (for horizontal) and y is width

    // Apply the tree layout to the hierarchy
    const layoutRoot = treeLayout(root);

    // Prepare React Flow nodes and edges
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    // Iterate over the laid-out nodes
    layoutRoot.each(d => {
        // d.x and d.y are relative to the root of the tree.
        // For a horizontal tree, d.x is depth-related (vertical position in React Flow)
        // and d.y is breadh-related (horizontal position in React Flow).
        // We need to swap them for React Flow, and potentially adjust origin.
        const position = {x: d.y, y: d.x}; // Swap x and y for horizontal layout

        nodes.push({
            id: d.data.id,
            position: position,
            targetPosition: 'left',
            sourcePosition: 'right',
            data: {label: d.data.name},
            type: 'default',
            // style: { width: nodeWidth - 20, height: nodeHeight - 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }, // Example styling
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
                sourceHandle: 'right', // For horizontal layout, connect from right of parent
                targetHandle: 'left',  // To left of child
            });
        }
    });

    // Center the layout in the view
    // Find min/max x and y to calculate overall bounds
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    nodes.forEach(n => {
        minX = Math.min(minX, n.position.x);
        minY = Math.min(minY, n.position.y);
        maxX = Math.max(maxX, n.position.x);
        maxY = Math.max(maxY, n.position.y);
    });

    const offsetX = -minX + 50; // Add some padding
    const offsetY = -minY + 50;

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

const FlowVisualizer = () => {
    const {nodes, edges} = useAtomValue(flowDataAtom);
    const [rfNodes, setRfNodes, onNodesChange] = useNodesState(nodes);
    const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState(edges);

    // Update React Flow nodes and edges when the atom value changes
    React.useEffect(() => {
        setRfNodes(nodes);
        setRfEdges(edges);
    }, [nodes, edges, setRfNodes, setRfEdges]);

    if (rfNodes.length === 0) return null;

    return (
        <div style={{width: '80vw', height: '100vh'}}> {/* Use 100vh for full viewport height */}
            <ReactFlow
                nodes={rfNodes}
                edges={rfEdges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                edgeTypes={edgeTypes}
                fitView // Zoom and pan to fit the entire graph into the view
                proOptions={{hideAttribution: true}} // Hide the React Flow attribution
            >
                <Background/>
                <Controls/>
                <MiniMap/> {/* Add a MiniMap for better navigation */}
            </ReactFlow>
        </div>
    );
};

export default FlowVisualizer;
