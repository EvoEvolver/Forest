import React, {useEffect} from 'react';
import Plot from 'react-plotly.js';
import {TreeData, Node} from "../entities";
import Layouter from "../Layouter";

let nestedTreeMap = (tree) => {
    return (
        // for my own. and display my id to the top left.
        <div style={{width: '100%', height: '100%'}}>

        </div>
    )
};


// https://plotly.com/javascript/reference/treemap/
export default function Treemap(props) {
    let layouter: Layouter = props.layouter;
    let tree: TreeData = props.tree;
    let selectedNode = layouter.getSelectedNode(tree);
    let currentLevel = selectedNode.id;


    let modifyTree = props.modifyTree;
    let labels = [];
    let parents = [];
    let texts = [];
    let ids = [];
    for (let node of Object.values(tree.nodeDict)) {
        labels.push(node.title);
        ids.push(node.id)
        // find its parent.
        let parent = node.parent
        if (parent) {
            parents.push(parent);
        } else {
            parents.push("");
        }
        texts.push(`${node.tabs['code']}`);
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
                        id: data[0].level
                    }
                )
            }}
        />
    );
}