export type NodeDict = Record<string, Node>
import { Map } from "yjs";

export interface TreeData {
    selectedNode: string
    metadata: {}
    nodeDict: NodeDict
}

type Tabs = { [key: string]: string }

export interface Node {
    id: string
    title: string
    parent: string
    other_parents: string[]
    tabs: Tabs
    children: string[]
    ydata: Map<any>
    data: {}
    tools: [Tabs],
    ymapForNode: Map<any> | null
}

