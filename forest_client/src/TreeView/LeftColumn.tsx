import {Node} from "../TreeState/entities";
import {NodeContentTabs} from "./NodeContentTab";
import React from "react";
import {NodeContentFrame} from "./TreeView";

export function LeftColumn(node: Node) {
    return <div style={{display: 'flex', flexDirection: 'column', height: '100%'}}>
        <div style={{flex: 0.9, height: '50%', marginBottom: '2%'}}>
            <NodeContentFrame sx={{}}>
                <NodeContentTabs node={node} tabDict={node.tools[0]} title=""/>
            </NodeContentFrame>
        </div>
        <div style={{flex: 0.9, height: '50%'}}>
            <NodeContentFrame sx={{}}>
                <NodeContentTabs node={node} tabDict={node.tools[1]} title=""/>
            </NodeContentFrame>
        </div>
    </div>;
}