import React from 'react';
import { useState, useEffect } from 'react';
import { ReactFlowProvider, Node, Edge } from 'reactflow';
import 'reactflow/dist/style.css';
import { TextField, Box, Button, Typography, Modal } from '@mui/material';
import testTrees from './testing/trees.json';
import { io } from 'socket.io-client';
import FocusPage from './FocusPage';
import Flow from './FlowPage';


const socket = io("http://127.0.0.1:5000", {
  transports: ["websocket"],
  withCredentials: false,
}); // Currently running on default port locally. Need to write it into config file.

interface Tree {
  id?: string;
  title: string;
  content: string;
  sections?: Tree[];
}


export default function App() {
  let [query, setQuery] = useState<string>('');
  let [tree, setTree] = useState<Tree | null>(null);
  let [nodes, setNodes] = useState<Node[]>([]);
  let [edges, setEdges] = useState<Edge[]>([]);
  let [selectedNode, setSelectedNode] = useState<Node | null>(null); // [id, position, label, content

  let [showFocusPage, setShowFocusPage] = useState<boolean>(false);


  const convertTreeToWhatWeWant = (tree: Tree) => {
    // return a list of nodes and a list of edges. Every child node is connected to its parent node.
    // the node should have a id, a position, and a label.
    // the edge should have a id, a source, and a target.
    // the position of the node should be calculated based on the level of the node.
    // the root node should be at the center of the screen.

    const nodes: Node[] = [];
    const edges: Edge[] = [];

    const dfs = (tree: Tree, parent: string | undefined) => {
      const id = tree.id ? tree.id: tree.title;
      // Calculate x-coordinate based on the level
      const x = 0; // Adjust the multiplier based on your preference
      // Calculate y-coordinate based on the order within the parent's sections
      const y = 0; // Adjust the multiplier based on your preference
      const position = { x, y };
      const label = tree.title;
      const content = tree.content;
      // Initialize the node (using interface Node).
      // Initialize the edge (using interface Edge).
      // Add the node to the list of nodes.
      // Add the edge to the list of edges.
      // If the tree has children, call dfs on each child.
      let node: Node = { id, position, data: { label, content, setShowFocusPage }, type: "NodeWithTooltip" };
      nodes.push(node);
      if (parent) {
        let edge: Edge = { id: `${parent}-${id}`, source: parent, target: id };
        edges.push(edge);
      }
      if (tree.sections) {
        tree.sections.forEach((child, index) => {
          dfs(child, id);
        });
      }
    };

    dfs(tree, undefined);

    return { 'nodes': nodes, 'edges': edges };
  }


  const handleQuerySearch = () => {
    let theTree: Tree | null = null; // Set the type for theTree

    if (testTrees[query]) {
      // Assuming testTrees[query] is of type MyTreeType
      theTree = testTrees[query] as Tree;
    } else {
      // Assuming testTrees['Ganzi'] is also of type MyTreeType
      theTree = testTrees['Places of Interests'] as Tree;
    }

    setTree(theTree);
  };

  useEffect(() => {
    socket.on("connect", () => {
      console.log("Connected");
    });
    socket.on("tree", (tree) => {
      setTree(tree);
      // wait 3 seconds.
      // setTimeout(() => {
      //   tree["sections"] = []
      //   setTree(tree);
      // }, 3000);
    });

    socket.emit('requestTree', (tree) => {
      console.log('testing');
    })
  }, []);
  // On Tree Change
  useEffect(() => {
    console.log("tree changes")
    if (tree) {
      let { nodes, edges } = convertTreeToWhatWeWant(tree);
      setNodes(nodes);
      setEdges(edges);
    }
  }, [tree])


  return (
    <Box style={{ width: '100vw', height: '100vh' }}>
      {/* // Select label is the node's title. value is the node's id. */}
      <Box style={{ position: "absolute", display: 'flex', alignItems: 'center', margin: '10px 20px', zIndex: '10000' }}>
        <TextField id="outlined-basic" label="Knowledege" variant="outlined" style={{ flex: 1 }} value={query} onChange={(e) => setQuery(e.target.value)} />
        <Button variant="contained" style={{ marginLeft: '10px' }} onClick={handleQuerySearch}>Search</Button>
      </Box>
      <ReactFlowProvider>
        <Flow initialNodes={nodes} initialEdges={edges} query={query} selectedNode={selectedNode} setSelectedNode={setSelectedNode} />
      </ReactFlowProvider>
      <Modal
        open={showFocusPage}
        onClose={() => setShowFocusPage(false)}
        style={{ position: "absolute", display: 'flex', alignItems: 'center', margin: '10px 20px', zIndex: '100000' }}
      >
        <FocusPage nodes={nodes} edges={edges} selectedNode={selectedNode} setSelectedNode={setSelectedNode} setShowFocusPage={setShowFocusPage} />
      </Modal>
    </Box>
  );
}