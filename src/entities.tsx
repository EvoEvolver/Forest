interface RawTree {
  id?: string;
  title: string;
  content: string;
  children?: RawTree[];
  tabs: {};
  path?: string;
}

interface Node {
  id: string;
  data: { label: string, content: string, tabs: {} };
}

interface Edge {
  id: string;
  source: string;
  target: string;
}
