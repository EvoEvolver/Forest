import React from "react";
import SyntaxHighlighter from 'react-syntax-highlighter';
import {a11yLight} from 'react-syntax-highlighter/dist/esm/styles/hljs';
import {InlineMath} from 'react-katex';
import Zoom from 'react-medium-image-zoom'
import 'react-medium-image-zoom/dist/styles.css'
import {useAtom, useSetAtom} from "jotai";
import {jumpToNodeAtom, selectedNodeAtom} from "../../TreeState";
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


export const NodeNavigator = (props) => {
    const jumpToNode = useSetAtom(jumpToNodeAtom)
    const handleClick = () => {
        jumpToNode(props.nodeId)
    }
    return (
        <>
            <span onClick={() => {
                handleClick()
            }}>{props.children}</span>
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
