import React from 'react';
import { useState, useEffect } from 'react';
import Flow from './Flow.tsx';
import { ReactFlowProvider, Node, Edge } from 'reactflow';
import { Helmet, HelmetProvider } from "react-helmet-async";
import 'reactflow/dist/style.css';
import { TextField, Box, Button, Typography, Modal, Grid } from '@mui/material';
import testTrees from './testing/trees.json';

import { io } from 'socket.io-client';
import { CSSTransition } from 'react-transition-group';

import CurrentNodeLayer from './nonReactflowElements/CurrentNodeLayer.tsx';
import OtherNodesLayer from './nonReactflowElements/OtherNodesLayer.js';

import { getAncestors, getChildren, getQualifiedDescents, getSiblings } from './layoutAlgorithms/layoutOnDoubleClick.tsx';


// const socket = io("http://127.0.0.1:5000"); // Currently running on default port locally. Need to write it into config file.

interface Tree {
  title: string;
  content: string;
  sections?: Tree[];
}

const theTree = {
  "title": "An introduction to the republic of Ganzi",
  "sections": [
    {
      "title": "Basic information of Ganzi",
      "sections": [
        {
          "title": "Capital of Ganzi",
          "content": "Litang is the capital of the republic of Ganzi."
        },
        {
          "title": "Leaders of Ganzi",
          "sections": [
            {
              "title": "President of Ganzi",
              "content": "Dingzhen is the president of the republic of Ganzi."
            },
            {
              "title": "Vice President of Ganzi",
              "content": "Ruike is the vice president of the republic of Ganzi."
            }
          ]
        },
        {
          "title": "Industrial of Ganzi",
          "content": "The main industry of Ganzi is pipe making."
        }
      ]
    },
    {
      "title": "Information of Dingzhen",
      "sections": [
        {
          "title": "Dingzhen's Pet",
          "content": "Zhenzhu is the pet of Dingzhen."
        },
        {
          "title": "Dingzhen's Motto",
          "content": "It's the mother who give me life."
        }
      ]
    }
  ]
};


const convertTreeToWhatWeWant = (tree: Tree) => {
  // return a list of nodes and a list of edges. Every child node is connected to its parent node.
  // the node should have a id, a position, and a label.
  // the edge should have a id, a source, and a target.
  // the position of the node should be calculated based on the level of the node.
  // the root node should be at the center of the screen.

  const nodes: Node[] = [];
  const edges: Edge[] = [];

  const dfs = (tree: Tree, parent: string | undefined) => {
    const id = tree.title;
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
    let node: Node = { id, position, data: { label, content }, type: "NodeWithTooltip" };
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


export default function App() {
  let [tree, setTree] = useState<Tree | null>(null);
  let [nodes, setNodes] = useState<Node[]>([]);
  let [edges, setEdges] = useState<Edge[]>([]);
  let [currentNode, setCurrentNode] = useState<Node | null>(null);
  let [siblingNodes, setSiblingNodes] = useState<Node[]>([]);
  let [childrenNodes, setChildrenNodes] = useState<Node[]>([]);
  let [ancestorsNodes, setAncestorsNodes] = useState<Node[]>([]);

  const ancestorsLayerHeight = '20%';
  const siblingsLayerHeight = '20%';
  const currentNodeLayerHeight = '40%';
  const childrenLayerHeight = '20%';

  let changeCurrentNode = (node: Node) => {
    setCurrentNode(node);
  };


  useEffect(() => {
    setTree(theTree);
  });

  useEffect(() => {
    if (tree) {
      let { nodes, edges } = convertTreeToWhatWeWant(tree);
      setNodes(nodes);
      setEdges(edges);
      setCurrentNode(nodes[0]);
    }
  }, [tree])

  // when currentNode changes, update the siblings, children, and ancestors.
  useEffect(() => {
    if (currentNode) {
      let siblings = getSiblings(currentNode, nodes, edges);
      setSiblingNodes(siblings);
      let children = getChildren(currentNode, nodes, edges);
      setChildrenNodes(children);
      let ancestors = getAncestors(currentNode, nodes, edges);
      setAncestorsNodes(ancestors);
    }
  }, [currentNode]);

  if (nodes.length === 0) {
    return <div>Loading...</div>;
  }
  else {
    return (
      <Grid container height="100vh" width="100vw" flexDirection="column">
        <Grid item style={{ height: ancestorsLayerHeight, backgroundColor: '#7DB9DE', width: "100%", padding: "20px" }}>
          <OtherNodesLayer nodes={ancestorsNodes} changeCurrentNode={changeCurrentNode} />
        </Grid>
        <Grid item style={{ height: siblingsLayerHeight, backgroundColor: '#A8D8B9', width: "100%", padding: "20px" }}>
          <OtherNodesLayer nodes={siblingNodes} changeCurrentNode={changeCurrentNode} />
        </Grid>

        <Grid item style={{ height: currentNodeLayerHeight, backgroundColor: '#EB7A77', width: "100%", padding: "20px" }}>
          <CurrentNodeLayer node={currentNode} />
        </Grid>

        {/* Children Layer */}
        <Grid item style={{ height: childrenLayerHeight, backgroundColor: '#FAD689', width: "100%", padding: "20px" }}>
          <OtherNodesLayer nodes={childrenNodes} changeCurrentNode={changeCurrentNode} />
        </Grid>
      </Grid>
    );
  }
}