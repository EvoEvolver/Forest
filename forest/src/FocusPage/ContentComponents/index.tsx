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
    return (
        <button onClick={() => props.send_message_to_main({type: 'send_message', message: 'hello'})}>Send Message</button>
    );
}