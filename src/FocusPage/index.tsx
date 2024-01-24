import React from 'react';
import { useState, useEffect } from 'react';
import {Node, Edge } from 'reactflow';
import 'reactflow/dist/style.css';
import {Grid,IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

import SelectedNodeLayer from './nonReactflowElements/SelectedNodeLayer';
import OtherNodesLayer from './nonReactflowElements/OtherNodesLayer';

import { getAncestors, getChildren, getQualifiedDescents, getSiblingsIncludeSelf } from '../FlowPage/Layout';


export default function FocusPage(props) {
  let nodes = props.nodes;
  let edges = props.edges;
  let selectedNode = props.selectedNode;
  let setSelectedNode = props.setSelectedNode;
  let setShowFocusPage = props.setShowFocusPage;
  
  let [siblingNodes, setSiblingNodes] = useState<Node[]>([]);
  let [childrenNodes, setChildrenNodes] = useState<Node[]>([]);
  let [ancestorsNodes, setAncestorsNodes] = useState<Node[]>([]);

  const ancestorsLayerHeight = '10%';
  const siblingsLayerHeight = '10%';
  const selectedNodeLayerHeight = '70%';
  const childrenLayerHeight = '10%';

  let changeSelectedNode = (node: Node) => {
    setSelectedNode(node);
  };


  // when selectedNode changes, update the siblings, children, and ancestors.
  useEffect(() => {
    if (selectedNode) {
      let siblings = getSiblingsIncludeSelf(selectedNode, nodes, edges);
      setSiblingNodes(siblings);
      let children = getChildren(selectedNode, nodes, edges);
      setChildrenNodes(children);
      let ancestors = getAncestors(selectedNode, nodes, edges);
      setAncestorsNodes(ancestors);
    }
  }, [selectedNode]);

  if (nodes.length === 0) {
    return <div>Loading...</div>;
  }
  else {
    return (
      <Grid container height="100vh" width="100vw" flexDirection="column">
        <IconButton aria-label="delete" size="small" style={{position: "absolute", right: "0", top: "0"}} onClick={() => setShowFocusPage(false)}>
          <CloseIcon fontSize="small" />
        </IconButton>
        <Grid item style={{ height: ancestorsLayerHeight, backgroundColor: '#7DB9DE', width: "100%", padding: "10px" }}>
          <OtherNodesLayer nodes={ancestorsNodes} changeSelectedNode={changeSelectedNode} />
        </Grid>
        <Grid item style={{ height: siblingsLayerHeight, backgroundColor: '#A8D8B9', width: "100%", padding: "10px" }}>
          <OtherNodesLayer nodes={siblingNodes.filter((n) => n.id != selectedNode.id)} changeSelectedNode={changeSelectedNode} />
        </Grid>

        <Grid item style={{ height: selectedNodeLayerHeight, backgroundColor: '#EB7A77', width: "100%", padding: "10px" }}>
          <SelectedNodeLayer node={selectedNode} />
        </Grid>

        {/* Children Layer */}
        <Grid item style={{ height: childrenLayerHeight, backgroundColor: '#FAD689', width: "100%", padding: "10px" }}>
          <OtherNodesLayer nodes={childrenNodes} changeSelectedNode={changeSelectedNode} />
        </Grid>
      </Grid>
    );
  }
}