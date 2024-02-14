import React from 'react';
import {useState, useEffect} from 'react';
import Plot from 'react-plotly.js';
import {getQualifiedDescents} from "../Layouter";

let nestedTreeMap = (tree) => {
    return (
        // for my own. and display my id to the top left.
        <div style={{width: '100%', height: '100%'}}>

        </div>
    )
};


// https://plotly.com/javascript/reference/treemap/
export default function Treemap(props) {
    let layouter = props.layouter;
    let tree = props.tree;
    let modifyTree = props.modifyTree;
    let labels = [];
    let parents = [];
    let texts = [];
    let ids = [];
    let selectedNode = layouter.getSelectedNode(tree.nodes);
    let descentantsOfSelectedNodes = layouter.getDescendantNodes(tree, selectedNode);
    let descentantsOfSelectedNodesIds = descentantsOfSelectedNodes.map((node) => node.id);
    for(let node of tree.nodes) {
        if(node.id === selectedNode.id || descentantsOfSelectedNodesIds.includes(node.id)) {
            labels.push(node.data.label);
            ids.push(node.id)
            // find its parent.
            let parent = tree.edges.find((edge) => edge.target === node.id);
            if (parent) {
                parents.push(parent.source);
            } else {
                parents.push("");
            }

            texts.push(`${node.data.label}`);
        }
    }

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <Plot
        data={[{
  type: 'treemap',
            ids: ids,
  labels: labels,
  parents: parents,
            textinfo: "text",
            text: texts,
}]}
        layout={{ autosize: true }}
        style={{ width: '100%', height: '100%' }}
        onClick={(data) => {modifyTree({
                type: 'setSelectedNode',
                node: tree.nodes.find((node) => node.id === data.points[0].id)
            }
        )}}
      />
    </div>
  );
}