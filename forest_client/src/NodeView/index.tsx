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
import {atom, useAtom} from 'jotai';
import * as d3 from 'd3-hierarchy';
import 'reactflow/dist/style.css';
import {treeAtom} from '../TreeState/TreeState';
import SmoothEdge from "./SmoothEdge";
import ExpandableNode from './ExpandableNode'; // Import the new node type
import {nodeStateAtom} from './nodeStateAtom'; // Import the state atom

// Derive flow data with d3-hierarchy and expand/collapse logic
const flowDataAtom = atom((get) => {
    const treeData = get(treeAtom);
    if (!treeData) return {nodes: [], edges: []};

    const {nodeDict} = treeData;

    const rawNodes = Object.entries(nodeDict).map(([id, nodeAtom]) => {
        const node = get(nodeAtom);
        const title = get(node.title);
        return {id, title, parentId: node.parent};
    });

    const rootNodeData = rawNodes.find(n => !n.parentId);
    if (!rootNodeData) return {nodes: [], edges: []};

    const nodeDataMap = new Map(rawNodes.map(n => [n.id, n]));

    const buildHierarchy = (nodeId: string): any => {
        const node = nodeDataMap.get(nodeId);
        if (!node) return null;

        const children = rawNodes.filter(n => n.parentId === nodeId);
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

    const nodeWidth = 300;
    const nodeHeight = 100;
    const treeLayout = d3.tree().nodeSize([nodeHeight , nodeWidth + 100]); // Add more spacing

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

    // Simple centering
    const offsetX = 50;
    const offsetY = 50;

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
    // We use useAtom instead of useAtomValue to get the setter for recalculating layout
    const [flowData, recomputeFlowData] = useAtom(flowDataAtom);
    const [nodes, setNodes, onNodesChange] = useNodesState(flowData.nodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(flowData.edges);

    React.useEffect(() => {
        // When the atom's data changes (e.g., on expand/collapse),
        // update the state in React Flow.
        setNodes(flowData.nodes);
        setEdges(flowData.edges);
    }, [flowData, setNodes, setEdges]);

    // This effect is crucial. It ensures that any interaction with a node
    // that might change its state (like collapsing) triggers a re-calculation
    // of the layout. The dependency on `nodeStateAtom` is implicit via `flowDataAtom`.
    /*React.useEffect(() => {
        recomputeFlowData();
    }, [recomputeFlowData]);*/


    if (nodes.length === 0) return null;

    return (
        <div style={{width: '80vw', height: '100vh'}}>
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                nodeTypes={nodeTypes} // Register the custom node type
                edgeTypes={edgeTypes}
                fitView
                proOptions={{hideAttribution: true}}
            >
                <Background/>
                <Controls/>
                <MiniMap/>
            </ReactFlow>
        </div>
    );
};

export default FlowVisualizer;