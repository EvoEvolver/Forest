import React, { useCallback, useEffect, useState, useRef } from 'react';
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
import { Breadcrumbs, Link, Box } from '@mui/material';

import { useReactFlow, } from 'reactflow';

import Select from 'react-select';
import 'reactflow/dist/style.css';

import NodeWithTooltip from './Nodes/NodeWithTooltip.js'
import { only } from 'node:test';

import Layout from './Layout';

const nodeTypes = {
    NodeWithTooltip: NodeWithTooltip,
};



const Flow = (props) => {
    const [nodes, setNodes, onNodesChange] = useNodesState(props.initialNodes || []);
    const [edges, setEdges, onEdgesChange] = useEdgesState(props.initialEdges || []);

    const selectedNode = props.selectedNode;
    const setSelectedNode = props.setSelectedNode;
    const showFocusPage = props.showFocusPage;
    const showFocusPageRef = useRef(showFocusPage);

    const selectedNodeHistoryMaxNumber  = 10;
    const selectedNodeHistory = useRef([]);
    const selectedNodeRef = useRef(selectedNode);
    const backRef = useRef(false);

    useEffect(() => {
        showFocusPageRef.current = showFocusPage;
    }, [showFocusPage]);
    const reactFlow = useReactFlow();

    let layout = new Layout(reactFlow, props.initialNodes, props.initialEdges);

    const [numGenerations, setNumGenerations] = useState(1);

    const keyPress = useCallback(
        (e) => {
            let result = undefined;
            const oneToNineRegex = /^[1-9]$/;
            const key = e.key;
            if (key === 'ArrowUp') {
                result = layout.move("up");
            }
            else if (key === 'ArrowDown') {
                result = layout.move("down");
            }

            else if (key === 'ArrowLeft') {
                result = layout.move("left");
            }

            else if (key === 'ArrowRight') {
                result = layout.move("right");
            }

            else if (key === 'Enter') {
                result = handleEnterKey();
            }

            else if (key === 'q') {
                handleEscapeKey();
            }
            else if (key === 'r') {
                result = layout.moveToRoot();
            }

            else if (key === 'n') {
                result = layout.moveToNextAvailable();
            }

            else if (key === 'b') {
                console.log("b clicked.")
                result = selectedNodeHistory.current.pop();
                if(result) backRef.current = true;
            }

            // if it's a number from 1 to 9.
            else if (oneToNineRegex.test(key)) {
                result = layout.moveToChildByIndex(parseInt(key) - 1);
            }

            if (result) {
                setSelectedNode(result);
            }


        },
        [layout]
      );
      useEffect(() => {
        document.addEventListener("keydown", keyPress);
        return () => document.removeEventListener("keydown", keyPress);
      }, [keyPress]);

    useEffect(() => {
        layout = new Layout(reactFlow, props.initialNodes, props.initialEdges);
        if (selectedNode) {
            if (!layout.checkIfNodeExists(selectedNode)) {
                layout.autoLayout().then(() => {
                    // Initial Layout, the previously selected node is gone.
                    setSelectedNode(null);
                });
            }
            else {
                layout.autoLayout(selectedNode).then(() => {
                    // Initial Layout and still select on the old selected node.
                });
            }
        }
        else {
            layout.autoLayout().then(() => {
                // Initial Layout, no selected node.
                setSelectedNode(null);
            });
        }

    }, [props.initialNodes, props.initialEdges]); // TODO: Do we have a better way to check if a flow is loaded? There was an event called onLoad but it doesn't seem to work.

    useEffect(() => {
        layout.updateLayout(selectedNode, numGenerations).then(() => {

            // Layout on numGenerations change.
        });
    }, [numGenerations]);

    useEffect(() => {
        // put the selectedNode to the history.
        console.log(backRef.current)
        if (selectedNodeRef.current && selectedNodeRef.current != null && selectedNodeRef.current != selectedNode && !backRef.current) {
            selectedNodeHistory.current.push(selectedNodeRef.current);
            if (selectedNodeHistory.current.length > selectedNodeHistoryMaxNumber) {
                selectedNodeHistory.current.shift();
            }
        }
        backRef.current = false;
        selectedNodeRef.current = selectedNode;
        if (selectedNode === null) {
            return;
        };
        layout.updateLayout(selectedNode, numGenerations).then(() => {
            // Layout on selectedNode change.
        });
    }, [selectedNode]);


    const focusOnNodeHelper = async (event, node: Node, center = true) => {
        //await layout.autolayout(node);
        // check if the node has already been selected.
        if (selectedNode && selectedNode.id === node.id) {
            return;
        }
        setSelectedNode(node);
    };

    const onPaneClickHandler = () => {
        layout.restoreLayout().then(() => {
            setSelectedNode(null);
        });
    }

    /**
     * Handle when the user presses the enter key.
     */
    const handleEnterKey = () => {
        let selectedNode = layout.checkIfSelectedOnNode();
        if (selectedNode) {
            selectedNode.data.setShowFocusPage(true);
            return;

        }
        else {
            // check the last of selectedNodeRef
            return layout.moveToRoot();
        }
    }

    /**
    * Handle when the user presses the escape key.
    */
    const handleEscapeKey = () => {
        let selectedNode = layout.checkIfSelectedOnNode();
        if (selectedNode && !showFocusPageRef.current) {
            onPaneClickHandler();

        }
        else if (selectedNode && showFocusPageRef.current) {
            selectedNode.data.setShowFocusPage(false);
        }
    }


    if (layout.getNodes().length > 0) {
        return (
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                deleteKeyCode={null}
                onEdgesChange={onEdgesChange}
                nodesDraggable={false}
                connectionLineType={ConnectionLineType.SmoothStep}
                fitView
                fitViewOptions={{ nodes: [nodes[0]] }}
                onNodeClick={focusOnNodeHelper} // Attach the click handler to zoom in on the clicked node
                onPaneClick={() => {
                    onPaneClickHandler();
                }}
                nodeTypes={nodeTypes}
            >
                <Panel position="top-center">
                    <Box sx={{width: "30vw"}}>
                        <Breadcrumbs aria-label="breadcrumb">
                            {
                                layout.getNodePath(selectedNode).map((node) => {
                                    return <Link key={selectedNode.id} underline="hover" color="inherit" href="#" onClick={() => {
                                        setSelectedNode(node);
                                    }}>{node.data.label}</Link>
                                })
                            }
                        </Breadcrumbs>
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
                    </Box>
                    
                </Panel>
                <Panel position="top-right">
                    <input type="number" value={numGenerations} min={0} onChange={(event) => setNumGenerations(parseInt(event.target.value))} />
                </Panel>
            </ReactFlow>
        );
    }
    else {
        return (<div>Loading...</div>)
    }
};

export default Flow;