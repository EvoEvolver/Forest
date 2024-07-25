
export type NodeDict = Record<string, Node>

export interface TreeData {
  selectedNode: string;
  nodeDict: NodeDict;
}

export interface Node {
  id: string;
  title: string;
  parent: string;
  tabs: {};
  children: string[],
  selected: boolean;
  data: {};
  tools: [{}]
}

