import React from 'react';
import { useState, useEffect } from 'react';
import Flow from './Flow.jsx';
import { ReactFlowProvider } from 'reactflow';
import { Helmet } from "react-helmet";
import 'reactflow/dist/style.css';
import { TextField, Box, Button, Typography, Modal } from '@mui/material';
import testTrees from './testing/trees.json';


const convertTreeToWhatWeWant = (tree) => {
  // return a list of nodes and a list of edges. Every child node is connected to its parent node.
  // the node should have a id, a position, and a label.
  // the edge should have a id, a source, and a target.
  // the position of the node should be calculated based on the level of the node.
  // the root node should be at the center of the screen.

  const nodes = [];
  const edges = [];

  const dfs = (tree, level, parent, order) => {
    const id = tree.title;
    // Calculate x-coordinate based on the level
    const x = 0; // Adjust the multiplier based on your preference
    // Calculate y-coordinate based on the order within the parent's sections
    const y = 0; // Adjust the multiplier based on your preference
    const position = { x, y };
    const label = tree.title;
    const content = tree.content;
    nodes.push({ id, position, data: { label, content } });
    if (parent) {
      edges.push({ id: `${parent}-${id}`, source: parent, target: id });
    }
    if (tree.sections) {
      tree.sections.forEach((child, index) => {
        dfs(child, level + 1, id, index);
      });
    }
  };

  dfs(tree, 0, null);

  return { 'nodes': nodes, 'edges': edges };
}

// let { nodes, edges } = convertTreeToWhatWeWant(tree);
// console.log(convertTreeToWhatWeWant(tree))
// console.log(nodes)


export default function App() {
  let [query, setQuery] = useState('');
  let [tree, setTree] = useState(null);
  let [nodes, setNodes] = useState([]);
  let [edges, setEdges] = useState([]);


  const handleQuerySearch = () => {
    let theTree = null;
    if(testTrees[query]) {
      theTree = testTrees[query];
    }
    else {
      theTree = testTrees['Ganzi'];
    }
    setTree(theTree);
  }

  // On Tree Change
  useEffect(() => {
    if (tree) {
      console.log(tree)
      let { nodes, edges } = convertTreeToWhatWeWant(tree);
      console.log(nodes)
      setNodes(nodes);
      setEdges(edges);
    }
  }, [tree])


  const [open, setOpen] = React.useState(false);
  const handleOpen = (node) => {
    setOpen(true);
    setModalTitle(node.data.label);
    setModalContent(node.data.content);
  };
  const handleClose = () => setOpen(false);

  const [modalTitle, setModalTitle] = React.useState('');
  const [modalContent, setModalContent] = React.useState('');

  const style = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 400,
    bgcolor: 'background.paper',
    border: '2px solid #000',
    boxShadow: 24,
    p: 4,
  };



  return (
    <div>
      <Helmet>
        <title>Forest</title>
      </Helmet>
      <Box style={{ width: '100vw', height: '100vh' }}>
        <Modal
          open={open}
          onClose={handleClose}
          aria-labelledby="modal-modal-title"
          aria-describedby="modal-modal-description"
        >
          <Box sx={style}>
            <Typography id="modal-modal-title" variant="h6" component="h2">
              {modalTitle}
            </Typography>
            <Typography id="modal-modal-description" sx={{ mt: 2 }}>
              {modalContent}
            </Typography>
          </Box>
        </Modal>
        <Box style={{ position: "absolute", display: 'flex', alignItems: 'center', margin: '50px 20px', zIndex: '10000' }}>
          <TextField id="outlined-basic" label="Knowledege" variant="outlined" style={{ flex: 1 }} value={query} onChange={(e) => setQuery(e.target.value)} />
          <Button variant="contained" style={{ marginLeft: '10px' }} onClick={handleQuerySearch}>Search</Button>
        </Box>
        <ReactFlowProvider>
          <Flow initialNodes={nodes} initialEdges={edges} handleOpen={handleOpen} />
        </ReactFlowProvider>
      </Box>

    </div>
  );
}