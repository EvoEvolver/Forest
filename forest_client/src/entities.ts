import {PrimitiveAtom} from "jotai";
import { Map } from "yjs";

type Tabs = { [key: string]: string }

export interface Node {
    id: string
    title: PrimitiveAtom<string>
    parent: string
    other_parents: string[]
    tabs: Tabs
    children: PrimitiveAtom<string[]>
    ydata: Map<any>
    data: {}
    tools: [Tabs],
    ymapForNode: Map<any> | null
}

