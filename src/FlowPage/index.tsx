import React, { useCallback, useEffect, useState } from 'react';
import ReactFlow, {
    addEdge,
    ConnectionLineType,
    Panel,
    useNodesState,
    useEdgesState,
    Node,
    Edge,
    ReactFlowInstance
} from 'reactflow';

import { useReactFlow, } from 'reactflow';

import Select from 'react-select';
import 'reactflow/dist/style.css';

import NodeWithTooltip from './Nodes/NodeWithTooltip.js'
import { only } from 'node:test';

import Layout from './Layout.tsx';

const nodeTypes = {
    NodeWithTooltip: NodeWithTooltip,
};



const Flow = (props) => {
    const [nodes, setNodes, onNodesChange] = useNodesState(props.initialNodes || []);
    const [edges, setEdges, onEdgesChange] = useEdgesState(props.initialEdges || []);

    const selectedNode = props.selectedNode;
    const setSelectedNode = props.setSelectedNode;
    const reactFlow = useReactFlow();

    let layout = new Layout(reactFlow, props.initialNodes, props.initialEdges);

    const [numGenerations, setNumGenerations] = useState(1);

    useEffect(() => {
        layout = new Layout(reactFlow, props.initialNodes, props.initialEdges);
        if(selectedNode && layout.checkIfNodeExists(selectedNode)) {
            layout.autolayout(selectedNode).then(() => {
                console.log("Initial Layout.")
            });
        }
        else {
            layout.autolayout(layout.getRootNode()).then(() => {
                console.log("Initial Layout.")
            });
        }

    }, [props.initialNodes, props.initialEdges]); // TODO: Do we have a better way to check if a flow is loaded? There was an event called onLoad but it doesn't seem to work.

    useEffect(() => {
        layout.autolayout(selectedNode, numGenerations).then(() => {
            
            console.log("Layout on numGenerations change.")
        });
    }, [numGenerations]);

    useEffect(() => {
        layout.autolayout(selectedNode).then(() => {
            console.log("Layout on selectedNode change.")
        });
    }, [selectedNode]);


    const focusOnNodeHelper = async (event, node: Node, center = true) => {
        //await layout.autolayout(node);
        setSelectedNode(node);
    };
    if(layout.getNodes().length > 0) {
        return (
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                connectionLineType={ConnectionLineType.SmoothStep}
                fitView
                fitViewOptions={{ nodes: [nodes[0]], padding: 0.2 }}
                onNodeClick={focusOnNodeHelper} // Attach the click handler to zoom in on the clicked node
                onPaneClick={async () => {
                    await layout.restoreLayout(selectedNode);
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
                        }}
                    />
                </Panel>
            </ReactFlow>
        );
    }
    else {
        return(<div>Loading...</div>)
    }
};

export default Flow;
