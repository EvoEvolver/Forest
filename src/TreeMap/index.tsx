import React, {useEffect} from 'react';
import {useState} from 'react';
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
    let nodesWithoutSelectedInfo = tree.nodes.map((node) => {
        let newNode = {...node};
        delete newNode.selected;
        return newNode;
    });

    let selectedNode = layouter.getSelectedNode(tree.nodes);

    let currentLevel = selectedNode.id;

    useEffect(() => {
        if(layouter.rawNodes === undefined) return;
        console.log(layouter.rawNodes.length)
    }, [layouter.rawNodes, layouter.rawEdges]);


    let modifyTree = props.modifyTree;
    let labels = [];
    let parents = [];
    let texts = [];
    let ids = [];
    for (let node of tree.nodes) {
        labels.push(node.data.label);
        ids.push(node.id)
        // find its parent.
        let parent = tree.edges.find((edge) => edge.target === node.id);
        if (parent) {
            parents.push(parent.source);
        } else {
            parents.push("");
        }
        texts.push(`${node.data.tabs['code']}`);
    }


    const data = [{
        type: "treemap",
        labels: labels,
        parents: parents,
        ids: ids,
        level: currentLevel
    }];


    return (
        <Plot
            data={data}
            layout={{
                autosize: true,
                pathbar: {
                    visible: false
                }
            }}
            style={{width: '100%', height: '100%'}}
            onAnimated={(e) => {
                modifyTree(
                    {
                        type: 'setSelectedNode',
                        node: tree.nodes.find((node) => node.id === data[0].level)
                    }
                )
                // setCurrentLevel(data.points[0].id)
                console.log(data[0].level)
            }}
        />
    );
}