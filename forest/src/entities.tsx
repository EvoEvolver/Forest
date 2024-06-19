export interface RawTree {
  id?: string;
  title: string;
  content: string;
  children?: RawTree[];
  tabs: {};
  node_id?: string;
  data: {};
}

export type NodeDict = Record<string, Node>

export interface TreeData {
  selectedNode: string;
  nodeDict: NodeDict;
}

export interface Node {
  id: string;
  parent: string;
  tabs: {};
  children: string[],
  selected: boolean;
}

