
export type NodeDict = Record<string, Node>

export interface TreeData {
  selectedNode: string;
  selectedParent: string;
  nodeDict: NodeDict;
}

export interface Node {
  id: string;
  title: string;
  parent: string;
  other_parents: string[];
  tabs: {};
  children: string[],
  selected: boolean;
  data: {};
  tools: [{}]
}

