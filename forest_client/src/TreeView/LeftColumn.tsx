import React from "react";
import { useAtomValue } from "jotai";
import { selectedNodeAtom } from "../TreeState/TreeState";
import { NodeContentTabs } from "./NodeContentTab";
import {Allotment} from "allotment";
import "allotment/dist/style.css";
import {NodeContentFrame} from "./NodeContentFrame";

export function LeftColumn(){
    const node = useAtomValue(selectedNodeAtom)

    return <Allotment vertical={true}>
        <Allotment.Pane minSize={200}>
            <NodeContentFrame>
                <NodeContentTabs node={node} tabDict={node.tools[0]} titleAtom=""/>
            </NodeContentFrame>
        </Allotment.Pane>
        <Allotment.Pane snap>
            <NodeContentTabs node={node} tabDict={node.tools[1]} titleAtom=""/>
        </Allotment.Pane>
    </Allotment>
}