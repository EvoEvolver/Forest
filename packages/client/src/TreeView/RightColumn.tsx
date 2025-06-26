import {NavigatorButtons, NavigatorLayer} from "./NavigatorLayer";
import React from "react";
import {NodeContentFrame} from "./TreeView";

export function RightColumn() {
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