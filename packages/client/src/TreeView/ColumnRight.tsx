import React from "react";
import {useAtomValue} from "jotai";
import {selectedNodeAtom} from "../TreeState/TreeState";
import {NodeContentFrame} from "./TreeView";
import {renderTabs} from "./NodeContent";

export function ColumnRight() {
    const node = useAtomValue(selectedNodeAtom)

    return <div style={{display: 'flex', flexDirection: 'column', height: '100%'}}>
        <div style={{flex: 0.9, height: '50%', marginBottom: '2%'}}>
            <NodeContentFrame>
                {renderTabs(node.tools[0], node)}
            </NodeContentFrame>
        </div>
        <div style={{flex: 0.9, height: '50%'}}>
            <NodeContentFrame>
                {renderTabs(node.tools[1], node)}
            </NodeContentFrame>
        </div>
    </div>;
}