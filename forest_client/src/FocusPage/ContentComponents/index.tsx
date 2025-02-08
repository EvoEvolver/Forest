import React from "react";
import SyntaxHighlighter from 'react-syntax-highlighter';
import {a11yLight} from 'react-syntax-highlighter/dist/esm/styles/hljs';
import {InlineMath} from 'react-katex';
import Zoom from 'react-medium-image-zoom'
import 'react-medium-image-zoom/dist/styles.css'
import {useSetAtom} from "jotai";
import {selectedNodeAtom} from "../../TreeState";
import {Link} from "@mui/material";

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
    // make text props.text, if it's undefined, make it 'navigate to node {nodeId}'
    let text = props.text || `navigate to node ${props.nodeId}`;
    return (
        <>
            <button onClick={() => {setSelectedNode(props.nodeId)}}>{text}</button>
        </>
    );
}


export const NodeNavigator = (props) => {
    const setSelectedNode = useSetAtom(selectedNodeAtom)
    return (
        <>
            <div onClick={() => {
                setSelectedNode(props.nodeId)
            }}>
                {props.children}
            </div>
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
