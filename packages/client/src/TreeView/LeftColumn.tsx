import React from "react";
import {useAtomValue} from "jotai";
import {selectedNodeAtom} from "../TreeState/TreeState";
import {NodeContentFrame} from "./TreeView";
import {NodeContentTabs} from "./NodeContentTab";

export function LeftColumn() {
    const node = useAtomValue(selectedNodeAtom)

    return <div style={{display: 'flex', flexDirection: 'column', height: '100%'}}>
        <div style={{flex: 0.9, height: '50%', marginBottom: '2%'}}>
            <NodeContentFrame>
                <NodeContentTabs node={node} tabDict={node.tools[0]} title=""/>
            </NodeContentFrame>
        </div>
        <div style={{flex: 0.9, height: '50%'}}>
            <NodeContentFrame>
                <NodeContentTabs node={node} tabDict={node.tools[1]} title=""/>
            </NodeContentFrame>
        </div>
    </div>;
}