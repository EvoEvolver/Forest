import React from "react";
import SyntaxHighlighter from 'react-syntax-highlighter';
import {a11yLight} from 'react-syntax-highlighter/dist/esm/styles/hljs';
import {InlineMath} from 'react-katex';
import Zoom from 'react-medium-image-zoom'
import 'react-medium-image-zoom/dist/styles.css'
import {useSetAtom} from "jotai";
import {selectedNodeAtom} from "../../TreeState";

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
    const setSelectedNode = useSetAtom(selectedNodeAtom)
    let nodeId = props.nodeId;
    // make text props.text, if it's undefined, make it 'navigate to node {nodeId}'
    let text = props.text || `navigate to node ${nodeId}`;
    return (
        <>
            <button onClick={() => setSelectedNode(nodeId)}>{text}</button>
        </>
    );
}


export const FigureBox = (props) => {
    return <>
        <Zoom>
        {props.children}
        </Zoom>
    </>
}
