export interface RawTree {
  id?: string;
  title: string;
  content: string;
  children?: RawTree[];
  tabs: {};
  path?: string;
}

export interface Node {
  id: string;
  data: { label: string, content: string, tabs: {} };
}

export interface Edge {
  id: string;
  source: string;
  target: string;
}

