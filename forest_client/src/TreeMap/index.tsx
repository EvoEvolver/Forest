import React from 'react';
import Plot from 'react-plotly.js';
import {selectedNodeAtom, treeAtom} from "../TreeState";
import {atom, useAtom, useAtomValue} from "jotai";


const treeMapData = atom((get) => {
    if (!get(selectedNodeAtom))
        return null
    let labels = [];
    let parents = [];
    let texts = [];
    let ids = [];
    let currentLevel = get(selectedNodeAtom).id
    for (let node of Object.values(get(treeAtom).nodeDict)) {
        labels.push(node.title);
        ids.push(node.id)
        // find its parent.
        let parent = node.parent
        if (parent) {
            parents.push(parent);
        } else {
            parents.push("");
        }
    }

    return [{
        type: "treemap",
        labels: labels,
        parents: parents,
        ids: ids,
        level: currentLevel
    }]
})


// https://plotly.com/javascript/reference/treemap/
export default function Treemap(props) {
    let [selectedNode, setSelectedNode] = useAtom(selectedNodeAtom)
    let data = useAtomValue(treeMapData)
    if (!data) {
        return <div>loading...</div>
    }
    return (
        <Plot
            data={data}
            layout={{
                autosize: true,
                pathbar: {
                    visible: false
                }
            }}
            style={{width: '100vw', height: '95vh'}}
            onAnimated={(e) => {
                setSelectedNode(data[0].level)
            }}
        />
    );
}