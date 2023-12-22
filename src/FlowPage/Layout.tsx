import { ReactFlowInstance, Node, Edge } from 'reactflow';
import dagre from 'dagre';


const nodeWidth = 200;
const nodeHeight = 50;


export const getSiblings = (node: Node, currentNodes: Node[], currentEdges: Edge[]): Node[] => {
    let parent: Edge | undefined = currentEdges.find((e: Edge) => e.target === node.id);
    let siblings: Edge[] = [];
    if (parent) {
        siblings = currentEdges.filter((e: Edge) => (e.source === parent?.source) && (e.target !== node.id));
    }
    const siblingNodes = siblings.map((s) => currentNodes.find((n: Node) => n.id === s.target)) as Node[];

    return siblingNodes;
}


// get the node's ancestors.
export const getAncestors = (node: Node, currentNodes: Node[], currentEdges: Edge[]): Node[] => {
    let parent: Edge | undefined = currentEdges.find((e: Edge) => e.target === node.id);
    let ancestors: Edge[] = [];
    while (parent) {
        ancestors.push(parent);
        parent = currentEdges.find((e: Edge) => e.target === parent?.source);
    }
    const parentNodes = ancestors.map((a: Edge) => currentNodes.find((n: Node) => n.id === a.source)) as Node[];
    return parentNodes;
}


// get my descents.

export const getDescents = (node: Node, currentNodes: Node[], currentEdges: Edge[]): Node[] => {
    let children: Edge[] = currentEdges.filter((e: Edge) => e.source === node.id) as Edge[];
    if (!children) {
        return [] as Node[];
    }
    else {
        const childrenNodes = children.map((c: Edge) => currentNodes.find((n: Node) => n.id === c.target)) as Node[];
        let des: Node[] = [];
        childrenNodes.forEach((c: Node) => {
            des.push(c);
            des = des.concat(getDescents(c, currentNodes, currentEdges));
        });
        return des;
    }
}


// get my children.

export const getChildren = (node: Node, currentNodes: Node[], currentEdges: Edge[]): Node[] => {
    let children: Edge[] = currentEdges.filter((e: Edge) => e.source === node.id) as Edge[];
    if (!children) {
        return [] as Node[];
    }
    else {
        const childrenNodes = children.map((c: Edge) => currentNodes.find((n: Node) => n.id === c.target)) as Node[];
        return childrenNodes;
    }
};



export const getQualifiedDescents = (node: Node, currentNodes: Node[], currentEdges: Edge[], numGenerations: number) => {

    if (numGenerations === 0) {
        return [] as Node[];
    }

    else {
        let children: Edge[] = currentEdges.filter((e: Edge) => e.source === node.id) as Edge[];
        if (!children) {
            return [] as Node[];
        }
        else {
            const childrenNodes = children.map((c: Edge) => currentNodes.find((n: Node) => n.id === c.target)) as Node[];
            let des: Node[] = [];
            childrenNodes.forEach((c: Node) => {
                des.push(c);
                des = des.concat(getQualifiedDescents(c, currentNodes, currentEdges, numGenerations - 1));
            });
            return des;
        }
    }
}

const getLayoutedElements = (iNodes: Node[], iEdges: Edge[], direction = 'TB') => {
    let nodes = iNodes.map(e => ({ ...e }));
    let edges = iEdges.map(e => ({ ...e }));

    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    const isHorizontal = direction === 'LR';
    dagreGraph.setGraph({ rankdir: direction });

    nodes.forEach((node) => {
        dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
    });

    edges.forEach((edge) => {
        dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    nodes.forEach((node) => {
        const nodeWithPosition = dagreGraph.node(node.id);
        node.targetPosition = isHorizontal ? 'left' : 'top';
        node.sourcePosition = isHorizontal ? 'right' : 'bottom';

        // We are shifting the dagre node position (anchor=center center) to the top left
        // so it matches the React Flow node anchor point (top left).
        node.position = {
            x: nodeWithPosition.x - nodeWidth / 2,
            y: nodeWithPosition.y - nodeHeight / 2,
        };

        return node;
    });


    return { nodes, edges };
};

export default class Layout {
    private reactFlow: ReactFlowInstance;
    private nodes: Node[] = [];
    private edges: Edge[] = [];

    constructor(reactFlow: ReactFlowInstance, nodes: Node[], edges: Edge[]) {
        this.reactFlow = reactFlow;
        this.nodes = nodes;
        this.edges = edges;;

    }

    private getNodeFromLayoutElement(newLayoutElements: Node[], layoutElement: Node): Node {
        // By ID
        const node = newLayoutElements.find((node) => node.id === layoutElement.id);
        return node;
    }


    public async autolayout(nodeToCenter: Node = undefined, numGenerations = 1): Promise<void> {
        if(this.nodes.length === 0) return;
        if (nodeToCenter) {
            console.log(`Center on ${nodeToCenter.data.label}`)
            // need to get visible nodes and edges.
            const siblings = getSiblings(nodeToCenter, this.nodes, this.edges);
            const ancestors = getAncestors(nodeToCenter, this.nodes, this.edges);
            const descents = getQualifiedDescents(nodeToCenter, this.nodes, this.edges, numGenerations);

            const visibleNodes = [nodeToCenter].concat(siblings).concat(ancestors).concat(descents);
            const visibleEdges = this.edges.filter((e) => {
                const source = visibleNodes.find((n) => n.id === e.source);
                const target = visibleNodes.find((n) => n.id === e.target);
                // The edge needs to be hidden if either the source or the target is hidden.

                return source && target;
            });
            const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
                visibleNodes,
                visibleEdges
            );

            const theNode = this.getNodeFromLayoutElement(layoutedNodes, nodeToCenter);
            theNode.selected = true;

            this.reactFlow.setNodes(layoutedNodes);
            this.reactFlow.setEdges(layoutedEdges);
            //this.reactFlow.fitView({ nodes: [theNode], padding: 0.2 });

            this.reactFlow.setCenter(
                theNode.position.x,
                theNode.position.y,
                {zoom: this.reactFlow.getZoom(), duration: 500}
            );
        }

        else {
            const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
                this.nodes,
                this.edges
            );
            this.reactFlow.setNodes(layoutedNodes);
            this.reactFlow.setEdges(layoutedEdges);
            const theNode = layoutedNodes[0];
            this.reactFlow.setCenter(
                theNode.position.x,
                theNode.position.y,
                {zoom: this.reactFlow.getZoom()}
            );
        }
    }



    public async restoreLayout(nodeToCenter: Node = undefined): Promise<void> {
        //if(this.nodes.length === 0) return;
        if (!nodeToCenter) {
            nodeToCenter = this.nodes[0];
        }
        const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
            this.nodes,
            this.edges
        );
        this.reactFlow.setNodes(layoutedNodes);
        this.reactFlow.setEdges(layoutedEdges);
        const theNode = this.getNodeFromLayoutElement(layoutedNodes, nodeToCenter);
        this.reactFlow.setCenter(
            theNode.position.x,
            theNode.position.y,
            {zoom: this.reactFlow.getZoom()}
        );
    }


    public getRootNode(): Node {
        if (this.nodes.length > 0) return this.nodes[0]
        else return undefined
    }

    public getNodes(): Node[] {
        return this.nodes;
    }

    public getEdges(): Edge[] {
        return this.edges;
    }
}