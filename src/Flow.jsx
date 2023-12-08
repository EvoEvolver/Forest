import React, { useCallback, useEffect, useState } from 'react';
import ReactFlow, {
    addEdge,
    ConnectionLineType,
    Panel,
    useNodesState,
    useEdgesState,
} from 'reactflow';

import { useReactFlow } from 'reactflow';
import dagre from 'dagre';


import 'reactflow/dist/style.css';

import { layoutOnDoubleClick } from './layoutAlgorithms';

const nodeWidth = 172;
const nodeHeight = 36;

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
    const [clickedNode, setClickedNode] = useState(null);
    const reactFlow = useReactFlow();

    useEffect(() => {
        const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
            props.initialNodes,
            props.initialEdges
        );
        setNodes([...layoutedNodes]);
        setEdges([...layoutedEdges]);

        reactFlow.fitView();
    }, [props.initialNodes, props.initialEdges, reactFlow]);

    const onConnect = useCallback(
        (params) =>
            setEdges((eds) =>
                addEdge({ ...params, type: ConnectionLineType.SmoothStep, animated: true }, eds)
            ),
        []
    );

    const moveAncestors = (node) => {
        const getSiblings = (node) => {
            let parent = edges.find((e) => e.target === node.id);
            let siblings = [];
            if (parent) {
                siblings = edges.filter((e) => (e.source === parent.source) && (e.target !== node.id));
            }
            return siblings;
        }


        let parent = edges.find((e) => e.target === node.id);

        // and get the parent's parent node.

        // should be a while loop here.

        //TODO: Question: do we need to worry about moving ancestors' position may lead to overlapping issue?.

        const getDangerousNodes = (node) => {
            // get all other nodes that are on the same level as this node. (need to consider the node's height)

            let allNodes = reactFlow.getNodes();
            let dangerousNodes = [];

            const centerY = node.position.y + node.height / 2;

            const targetNodes = nodes.filter(
                (n) =>
                    centerY > n.position.y &&
                    centerY < n.position.y + n.height &&
                    n.id !== node.id // this is needed, otherwise we would always find the dragged node
            );

            return targetNodes;
        }

        let ancestors = [];
        while (parent) {
            ancestors.push(parent);
            parent = edges.find((e) => e.target === parent.source);
        }

        // move the ancestors' position to just above this node.
        let currentNodes = reactFlow.getNodes();

        ancestors.forEach((a) => {
            const ancestorNode = currentNodes.find((n) => n.id === a.source);
            if (ancestorNode) {
                // Possibly need to remove siblings' position as well.
                // If ancestorNode is shifted right, then all its siblings to its right should be shifted right as well.
                // If ancestorNode is shifted left, then all its siblings to its left should be shifted left as well.

                // get the siblings of the ancestor node.
                const siblings = getSiblings(ancestorNode);
                // get where ancestorNode is shifted by checking ancestorNode and node position.
                const shiftLeft = (ancestorNode.position.x - node.position.x) > 0;
                const shiftValue = ancestorNode.position.x - node.position.x;

                let dangerousNodes = getDangerousNodes(ancestorNode);
                if (shiftLeft) {
                    dangerousNodes = dangerousNodes.filter((n) => n.position.x < ancestorNode.position.x);
                }
                else {
                    dangerousNodes = dangerousNodes.filter((n) => n.position.x > ancestorNode.position.x);
                }

                // if there are dangerous nodes, then we need to shift the ancestor node to the left or right.
                dangerousNodes.forEach((n) => {
                    n.position.x = n.position.x - shiftValue;
                });

                ancestorNode.position.x = node.position.x;
            }
        });

        reactFlow.setNodes(currentNodes);

    }

    const onNodeClick = useCallback(
        (event, node) => {
            console.log(node.selected)
            // check if the node is already clicked.
            if (clickedNode === node.id) {
                // check if node has content.
                if (node.data.content) {
                    handleOpen(node);
                }
            }
            // change background color of the node.

            if (node && node.id) {
                const nodeId = node.id;
                const clickedNode = nodes.find((n) => n.id === nodeId);

                if (clickedNode) {
                    // move the parent and ancestors' position to just above this node.
                    reactFlow.fitView({ nodes: [clickedNode], padding: 0.2 });

                    // move ancestors above.

                    moveAncestors(clickedNode);
                }


                setClickedNode(node.id);
            }
        },
        [nodes]
    );

    const onLayout = useCallback(
        (direction) => {
            const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
                nodes,
                edges,
                direction
            );

            setNodes([...layoutedNodes]);
            setEdges([...layoutedEdges]);
        },
        [nodes, edges]
    );

    const handleOpen = props.handleOpen;

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
        reactFlow.fitView();
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

        reactFlow.setNodes(currentNodes);
    }

    const layoutOnDoubleClickHandler = async (event, node) => {
        await restoreLayout();
        await selectNode(node);
        // call the function.
        layoutOnDoubleClick(event, node, reactFlow);
    };

    return (
        <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            connectionLineType={ConnectionLineType.SmoothStep}
            fitView
            onNodeClick={layoutOnDoubleClickHandler} // Attach the click handler to zoom in on the clicked node
            onPaneClick={restoreLayout}
        >
            <Panel position="top-right">
            </Panel>
        </ReactFlow>
    );
};

export default Flow;
