import React from "react";
import SyntaxHighlighter from 'react-syntax-highlighter';
import { a11yLight } from 'react-syntax-highlighter/dist/esm/styles/hljs';

export const Code = (props) => {
    return (
        <SyntaxHighlighter language={props.language} style={a11yLight} showLineNumbers={true}>
            {props.code}
        </SyntaxHighlighter>
    );
}


import { InlineMath } from 'react-katex';

export const TeX = (props) => {
    return (
        <InlineMath math={props.src} />
    );
}


export const SendMessage = (props) => {
    console.log(props.env_vars);
    return (
        <button onClick={() => props.env_funcs.send_message_to_main({node_id: props.env_vars.node_id, message: 'hello'})}>Send Message</button>
    );
}


export const NodeNavigateButton = (props) => {
    let modifyTree = props.env_funcs.modifyTree;
    let nodeId = props.nodeId;
    // make text props.text, if it's undefined, make it 'navigate to node {nodeId}'
    let text = props.text || `navigate to node ${nodeId}`;
    return (
        <>
            <button onClick={() => modifyTree({type: 'setSelectedNode', id: nodeId})}>{text}</button>
        </>
    );
}