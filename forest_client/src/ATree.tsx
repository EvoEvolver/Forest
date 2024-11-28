import React, {useEffect, useRef, useState} from 'react';
import {Box} from '@mui/material';
import FocusPage from './FocusPage';
import {selectedTreeAtom, Layouter} from "./Layouter";
import Treemap from './TreeMap';
import {useAtomValue} from "jotai";
import {CentralSearchBox} from "./SearchBox";
// convert the tree from backend to the compatible format for Forest.


export default function ATree(props) {
    let hidden = props.hidden;
    let page = props.page;
    const [searchPanel, switchSearchPanel] = useState(false);
    const innerRef = useRef();
    const contentRef = useRef();
    const tree = useAtomValue(selectedTreeAtom)
    //{<CentralSearchBox onSearch={searchPanel} props={props} contentRef={contentRef}
     //                              ref={innerRef} dark={props.dark}/>}
    useEffect(() => {
        console.log("currTree", tree)
    }, [tree]);
    return (
        <>
            <Box hidden={hidden} style={{width: "100vw", height: "95vh", flexGrow: 1, boxSizing: "border-box"}}>
                {/*make two buttons to change between focus page and treemap. the buttons should be fixed to top left.*/}
                {tree && page === 0 &&
                    <FocusPage contentRef={contentRef}/>}
                {tree && page === 1 &&
                    <Treemap/>}
            </Box>
        </>
    );
}