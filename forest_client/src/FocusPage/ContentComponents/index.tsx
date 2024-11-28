import React, {useContext} from "react";
import SyntaxHighlighter from 'react-syntax-highlighter';
import {a11yLight} from 'react-syntax-highlighter/dist/esm/styles/hljs';
import {InlineMath} from 'react-katex';
import {EnvFuncsContext} from "../NodeContext";

export const Code = (props) => {
    return (
        <SyntaxHighlighter language={props.language} style={a11yLight} showLineNumbers={true}>
            {props.code}
        </SyntaxHighlighter>
    );
}


export const TeX = (props) => {
    return (
        <InlineMath math={props.src}/>
    );
}


export const SendMessage = (props) => {
    return (
        <button
            onClick={() => props.env_funcs.send_message_to_main(props.message || 'hello')}>{props.title || "Send message"}</button>
    );
}


export const NodeNavigateButton = (props) => {
    const env_funcs = useContext(EnvFuncsContext)
    let modifyTree = env_funcs.modifyTree;
    let nodeId = props.nodeId;
    // make text props.text, if it's undefined, make it 'navigate to node {nodeId}'
    let text = props.text || `navigate to node ${nodeId}`;
    return (
        <>
            <button onClick={() => modifyTree({type: 'setSelectedNode', id: nodeId})}>{text}</button>
        </>
    );
}