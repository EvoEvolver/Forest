import React, { useCallback, useEffect, useState } from 'react';
import ReactFlow, {
    addEdge,
    ConnectionLineType,
    Panel,
    useNodesState,
    useEdgesState,
    Node,
    Edge
} from 'reactflow';

import { useReactFlow, } from 'reactflow';
import dagre from 'dagre';

import Select from 'react-select';


import 'reactflow/dist/style.css';

import { layoutOnDoubleClick } from './layoutAlgorithms';
import { onlyShowGenerations } from './layoutAlgorithms';

import NodeWithTooltip from './Nodes/NodeWithTooltip.tsx'
import { only } from 'node:test';

const nodeTypes = {
    NodeWithTooltip: NodeWithTooltip,
};

const nodeWidth = 200;
const nodeHeight = 50;

const getLayoutedElements = (nodes, edges, direction = 'TB') => {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    const isHorizontal = direction === 'LR';
    dagreGraph.setGraph({ rankdir: direction });

    nodes.forEach((node) => {
        dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
    });

    edges.forEach((edge) => {
        dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    nodes.forEach((node) => {
        const nodeWithPosition = dagreGraph.node(node.id);
        node.targetPosition = isHorizontal ? 'left' : 'top';
        node.sourcePosition = isHorizontal ? 'right' : 'bottom';

        // We are shifting the dagre node position (anchor=center center) to the top left
        // so it matches the React Flow node anchor point (top left).
        node.position = {
            x: nodeWithPosition.x - nodeWidth / 2,
            y: nodeWithPosition.y - nodeHeight / 2,
        };

        return node;
    });


    return { nodes, edges };
};

const Flow = (props) => {
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const selectedNode = props.selectedNode;
    const setSelectedNode = props.setSelectedNode;
    const reactFlow = useReactFlow();
    useEffect(() => {
        const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
            props.initialNodes,
            props.initialEdges
        );
        setNodes([...layoutedNodes]);
        setEdges([...layoutedEdges]);
        console.log(props.initialNodes[0]);
        reactFlow.fitView({ nodes: [layoutedNodes[0]], padding: 0.2 });
    }, [props.initialNodes]); // TODO: Do we have a better way to check if a flow is loaded? There was an event called onLoad but it doesn't seem to work.

    const onConnect = useCallback(
        (params) =>
            setEdges((eds) =>
                addEdge({ ...params, type: ConnectionLineType.SmoothStep, animated: true }, eds)
            ),
        []
    );


    const restoreLayout = async () => {
        // Need to restore the original layout.
        // Need to hide other nodes. Only includes the nodes that are i. the node itself, the node's siblings (not not siblings' children), and the node's ancestors (but not the ancestors' siblings and their children).

        // unhidden all nodes and edges first. and change back the orientation.
        const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
            props.initialNodes,
            props.initialEdges
        );
        setNodes([...layoutedNodes]);
        setEdges([...layoutedEdges]);
    }

    const selectNode = async (node) => {
        let currentNodes = reactFlow.getNodes();
        currentNodes.forEach((n) => {
            if (n.id === node.id) {
                n.style = { ...n.style, background: 'blue', color: 'white' };
            }
            else {
                n.style = { ...n.style, background: '#fff' };
            }
        });

        node.selected = true;

        reactFlow.setNodes(currentNodes);
    }

    const layoutOnDoubleClickHandler = async (event, node, center = true) => {
        await restoreLayout();
        await selectNode(node);
        //await onlyShowGenerations(node, reactFlow, numGenerations);

        await layoutOnDoubleClick(event, node, reactFlow, getLayoutedElements, numGenerations, center);

        let theNode = reactFlow.getNodes().find((n) => n.id === node.id);
        reactFlow.fitView({ nodes: [theNode] });
        setSelectedNode(theNode);
    };

    const [numGenerations, setNumGenerations] = useState(1);

    // listen to the numGenerations change and update the layout.

    const handleNumGenerationsChange = async (event) => {
        await restoreLayout();
        if (selectedNode) {
            layoutOnDoubleClickHandler(event, selectedNode, false);
        }
    }
    useEffect(() => {
        handleNumGenerationsChange(null);
    }, [numGenerations]);


    return (
        <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            connectionLineType={ConnectionLineType.SmoothStep}
            fitView
            fitViewOptions={{ nodes: [nodes[0]], padding: 0.2 }}
            onNodeClick={layoutOnDoubleClickHandler} // Attach the click handler to zoom in on the clicked node
            onPaneClick={async () => {
                await restoreLayout();
                if (selectedNode) {

                    let theSelectedNode = reactFlow.getNodes().find((n) => n.id === selectedNode.id);
                    reactFlow.fitView({ nodes: [theSelectedNode], padding: 0.2 });
                }
            }}
            nodeTypes={nodeTypes}
        >
            <Panel position="top-right">
                <input type="number" value={numGenerations} min={0} onChange={(event) => setNumGenerations(parseInt(event.target.value))} />
                <Select styles={{
                    // Fixes the overlapping problem of the component
                    menu: provided => ({ ...provided, zIndex: 9999999, minWidth: "100px" }),
                }}
                    isSearchable={true}
                    options={nodes}
                    getOptionLabel={(option: Node) => option.data.label}
                    getOptionValue={(option: Node) => option.id}
                    value={selectedNode}
                    onChange={(option: Node) => {
                        setSelectedNode(option)
                        layoutOnDoubleClickHandler(null, option);
                    }}
                />
            </Panel>
        </ReactFlow>
    );
};

export default Flow;
