import {Node} from "../TreeState/entities";
import React from "react";
import { useAtomValue } from "jotai";
import { selectedNodeAtom } from "../TreeState/TreeState";
import { NodeContentTabs } from "./NodeContentTab";
import {NodeContentFrame} from "./RightColumn";
import {Allotment} from "allotment";
import "allotment/dist/style.css";

export function LeftColumn(){
    const node = useAtomValue(selectedNodeAtom)

    return <Allotment vertical={true}>
        <Allotment.Pane minSize={200}>
            <NodeContentTabs node={node} tabDict={node.tools[0]} titleAtom=""/>
        </Allotment.Pane>
        <Allotment.Pane snap>
            <NodeContentTabs node={node} tabDict={node.tools[1]} titleAtom=""/>
        </Allotment.Pane>
    </Allotment>
}