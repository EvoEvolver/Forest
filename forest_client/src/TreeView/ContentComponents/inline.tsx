import Latex from "react-latex-next";
import React from "react";
import {useSetAtom} from "jotai/index";
import {jumpToNodeAtom} from "../../TreeState/TreeState";
import {Accordion, AccordionDetails, AccordionSummary, Typography} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import Zoom from "react-medium-image-zoom";
import 'react-medium-image-zoom/dist/styles.css'
import SyntaxHighlighter from 'react-syntax-highlighter';
import {a11yLight} from "react-code-blocks";

export const Code = (props) => {
    return (
        <SyntaxHighlighter language={props.language} style={a11yLight} showLineNumbers={true}>
            {props.code}
        </SyntaxHighlighter>
    );
}
export const TeX = (props) => {
    return <>
        <Latex>{props.src}</Latex>
    </>;
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
export const Expandable = (props) => {
    return <>
        <Accordion>
            <AccordionSummary
                expandIcon={<ExpandMoreIcon/>}
            >
                <Typography component="span">{props.title ? props.title : "Detail"}</Typography>
            </AccordionSummary>
            <AccordionDetails>
                {props.children}
            </AccordionDetails>
        </Accordion>
    </>
}
export const TextSpan = (props) => {
    return (
        <span>{props.text}</span>
    );
}