import React from "react";
import {useAtomValue} from "jotai";
import {selectedNodeAtom} from "../TreeState/TreeState";
import {NodeContentFrame} from "./TreeView";
import {thisNodeContext} from "./NodeContext";

export function ColumnRight() {
    const node = useAtomValue(selectedNodeAtom)
    if (!node)
        return null
    return <div style={{display: 'flex', flexDirection: 'column', height: '100%'}}>
        <thisNodeContext.Provider value={node}>
            <div style={{flex: 0.9, height: '50%', marginBottom: '2%'}}>
                <NodeContentFrame>
                    {node.nodeType.renderTool1(node)}
                </NodeContentFrame>
            </div>
            <div style={{flex: 0.9, height: '50%'}}>
                <NodeContentFrame>
                    {node.nodeType.renderTool2(node)}
                </NodeContentFrame>
            </div>
        </thisNodeContext.Provider>
    </div>;
}