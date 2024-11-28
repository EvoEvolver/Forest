
export type NodeDict = Record<string, Node>

export interface TreeBrowserState {
  selectedNode: string
  parentsStack: string[]
}

export interface TreeData {
  selectedNode: string
  selectedParent: string
  nodeDict: NodeDict
}

type Tabs = { [key: string]: string}

export interface Node {
  id: string
  title: string
  parent: string
  other_parents: string[]
  tabs: Tabs
  children: string[]
  data: {}
  tools: [Tabs]
}

