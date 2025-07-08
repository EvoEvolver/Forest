import {NavigatorButtons, NavigatorLayer} from "./NavigatorLayer";
import React from "react";
import {NodeContentFrame} from "./TreeView";
import {useAtom} from "jotai/index";
import {selectedNodeAtom} from "../TreeState/TreeState";
import {useAtomValue} from "jotai";

export function ColumnLeft() {
    const selectedNode = useAtomValue(selectedNodeAtom)
    if(!selectedNode)
        return null
    return <>
        <div style={{height: "100%", width: "100%"}}>
            <div style={{height: "5%", width: "100%"}}><NavigatorButtons/></div>
            <div style={{height: "95%", width: "100%"}}>
                <NodeContentFrame>
                    <NavigatorLayer/>
                </NodeContentFrame>
            </div>
        </div>
    </>;
}