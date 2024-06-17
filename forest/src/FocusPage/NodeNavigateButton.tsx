import React from 'react';

export default function NodeNavigateButton(props) {
    let modifyTree = props.modifyTree;
    let nodeId = props.nodeId;
    // make text props.text, if it's undefined, make it 'navigate to node {nodeId}'
    let text = props.text || `navigate to node ${nodeId}`;
    return (
        <>
            <button onClick={() => modifyTree({type: 'setSelectedNode', id: nodeId})}>{text}</button>
        </>
    );
}