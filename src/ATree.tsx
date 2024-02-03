import React from 'react';
import { useState, useEffect } from 'react';
import { ReactFlowProvider, Node, Edge } from 'reactflow';
import 'reactflow/dist/style.css';
import { TextField, Box, Button, Typography, Modal } from '@mui/material';
// import testTrees from './testing/trees.json';
import { io } from 'socket.io-client';
import FocusPage from './FocusPage';
import Flow from './FlowPage';


function makeid(length) {
  let result = '';
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const charactersLength = characters.length;
  let counter = 0;
  while (counter < length) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
    counter += 1;
  }
  return result;
}
const currentPort = (process.env.NODE_ENV || 'development') == 'development' ? "29999": window.location.port;
const socket = io(`http://127.0.0.1:${currentPort}`, {
  transports: ["websocket"],
  withCredentials: false,
}); // Currently running on default port locally. Need to write it into config file.

interface Tree {
  id?: string;
  title: string;
  content: string;
  children?: Tree[];
  tabs: {};
}


export default function ATree(props) {
  let [query, setQuery] = useState<string>('');

  let tree = props.tree;
  let [nodes, setNodes] = useState<Node[]>([]);
  let [edges, setEdges] = useState<Edge[]>([]);
  let [selectedNode, setSelectedNode] = useState<Node | null>(null); // [id, position, label, content

  let [showFocusPage, setShowFocusPage] = useState<boolean>(false);

  let hidden = props.hidden;


  const convertTreeToWhatWeWant = (tree: Tree) => {
    // return a list of nodes and a list of edges. Every child node is connected to its parent node.
    // the node should have a id, a position, and a label.
    // the edge should have a id, a source, and a target.
    // the position of the node should be calculated based on the level of the node.
    // the root node should be at the center of the screen.

    const nodes: Node[] = [];
    const edges: Edge[] = [];

    const dfs = (tree: Tree, parent: string | undefined) => {
      //const id = tree.id ? tree.id: tree.title;
      const id = makeid(32);
      // Calculate x-coordinate based on the level
      const x = 0; // Adjust the multiplier based on your preference
      // Calculate y-coordinate based on the order within the parent's children
      const y = 0; // Adjust the multiplier based on your preference
      const position = { x, y };
      const label = tree.title;
      const content = tree.content;
      const tabs = tree.tabs;
      // Initialize the node (using interface Node).
      // Initialize the edge (using interface Edge).
      // Add the node to the list of nodes.
      // Add the edge to the list of edges.
      // If the tree has children, call dfs on each child.
      let node: Node = { id, position, data: { label, content, tabs, setShowFocusPage, showFocusPage }, type: "NodeWithTooltip" };
      nodes.push(node);
      if (parent) {
        let edge: Edge = { id: `${parent}-${id}`, source: parent, target: id };
        edges.push(edge);
      }
      if (tree.children) {
        tree.children.forEach((child, index) => {
          dfs(child, id);
        });
      }
    };

    dfs(tree, undefined);

    return { 'nodes': nodes, 'edges': edges };
  }

  // On Tree Change
  useEffect(() => {
    if (tree) {
      let { nodes, edges } = convertTreeToWhatWeWant(tree);
      setNodes(nodes);
      setEdges(edges);
    }
  }, [tree])


  return (
    <Box hidden={hidden} style={{ width: '100vw', height: '100vh' }}>
      <ReactFlowProvider>
        <Flow initialNodes={nodes} initialEdges={edges} query={query} selectedNode={selectedNode} setSelectedNode={setSelectedNode} showFocusPage={showFocusPage} hidden={hidden}/>
      </ReactFlowProvider>
      <Modal
        open={showFocusPage}
        onClose={() => setShowFocusPage(false)}
        style={{ position: "absolute", display: 'flex', alignItems: 'center', margin: '10px 20px', zIndex: '100000' }}
      >
        <>
        <FocusPage nodes={nodes} edges={edges} selectedNode={selectedNode} setSelectedNode={setSelectedNode} setShowFocusPage={setShowFocusPage} />
        </>
      </Modal>
    </Box>
  );
}