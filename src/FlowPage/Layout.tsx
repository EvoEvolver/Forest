import { ReactFlowInstance, Node, Edge, Viewport  } from 'reactflow';
import dagre from 'dagre';


const nodeWidth = 200;
const nodeHeight = 50;


// export const getSiblings = (node: Node, currentNodes: Node[], currentEdges: Edge[]): Node[] => {
//     let parent: Edge | undefined = currentEdges.find((e: Edge) => e.target === node.id);
//     let siblings: Edge[] = [];
//     if (parent) {
//         siblings = currentEdges.filter((e: Edge) => (e.source === parent?.source) && (e.target !== node.id));
//     }
//     const siblingNodes = siblings.map((s) => currentNodes.find((n: Node) => n.id === s.target)) as Node[];

//     return siblingNodes;
// }

export const getSiblingsIncludeSelf = (node: Node, currentNodes: Node[], currentEdges: Edge[]): Node[] => {
    let parent: Edge | undefined = currentEdges.find((e: Edge) => e.target === node.id);
    let siblings: Edge[] = [];
    if (parent) {
        siblings = currentEdges.filter((e: Edge) => (e.source === parent?.source));
    }
    const siblingNodes = siblings.map((s) => currentNodes.find((n: Node) => n.id === s.target)) as Node[];
    if(siblingNodes.length === 0) {
        siblingNodes.push(node);
    }
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

const getLayoutedElements = (iNodes: Node[], iEdges: Edge[], oldNodes = undefined, selectedNode = undefined) => {
    let direction = 'TB'
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

    // if selectedNode is defined, we need to adjust the nodes' position referring to the selectedNode.
    if(oldNodes) {
        // first, let's try to find the selectedNode in the nodes array.
        for(let oldNode of oldNodes) {
            const node = nodes.find((n) => n.id === oldNode.id);
            if(node) {
                if(node) {
                    const dx = oldNode.position.x - node.position.x;
                    const dy = oldNode.position.y - node.position.y;
                    nodes.forEach((n) => {
                        n.position.x += dx;
                        n.position.y += dy;
                    });
                } 
                break;
            }
        }
    }


    if (selectedNode) {
        selectedNode = nodes.find((n) => n.id === selectedNode.id);
        let ancestors = getAncestors(selectedNode, nodes, edges);
        // Need to move the parent to horitonzol.
        if (ancestors.length > 0) {
            ancestors[0].position.x = selectedNode.position.x;
            for (let i = 1; i < ancestors.length; i++) {
                const ancestor = ancestors[i];
                if (ancestor) {
                    ancestor.position.y = ancestors[0].position.y;
    
                    // get the previous ancestor's nodeWidth.
                    // dynamically calculate node width.
                    ancestor.position.x = ancestors[i - 1].position.x + i * nodeWidth;
    
                    ancestor.sourcePosition = 'left';
                    ancestor.targetPosition = 'right';
    
                }
            }
    
            ancestors[0].targetPosition = 'right';
        }
    }

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


    public async autolayout(selectedNode: Node = undefined, numGenerations = 1, notToCenter = false): Promise<void> {
        const oldViewport = this.reactFlow.getViewport();
        if(this.nodes.length === 0) return;
        if (selectedNode) {
            // need to get visible nodes and edges.
            const siblings = getSiblingsIncludeSelf(selectedNode, this.nodes, this.edges);
            const ancestors = getAncestors(selectedNode, this.nodes, this.edges);
            const descents = getQualifiedDescents(selectedNode, this.nodes, this.edges, numGenerations);

            const visibleNodes = ancestors.concat(siblings).concat(descents);
            const visibleEdges = this.edges.filter((e) => {
                const source = visibleNodes.find((n) => n.id === e.source);
                const target = visibleNodes.find((n) => n.id === e.target);
                // The edge needs to be hidden if either the source or the target is hidden.

                return source && target;
            });
            const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
                visibleNodes,
                visibleEdges,
                this.reactFlow.getNodes(),
                selectedNode
            );

            const theNode = this.getNodeFromLayoutElement(layoutedNodes, selectedNode);
            theNode.selected = true;

            this.reactFlow.setNodes(layoutedNodes);
            this.reactFlow.setEdges(layoutedEdges);
            //this.reactFlow.fitView({ nodes: [theNode], padding: 0.2 });
            if(!notToCenter) {
                this.reactFlow.setCenter(
                    theNode.position.x,
                    theNode.position.y,
                    {zoom: this.reactFlow.getZoom(), duration: 200}
                );
            }
            else {
                this.reactFlow.setViewport(oldViewport);
            }
        }

        else {
            const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
                this.nodes,
                this.edges
            );
            this.reactFlow.setNodes(layoutedNodes);
            this.reactFlow.setEdges(layoutedEdges);
        }
    }



    public async restoreLayout(selectedNode: Node = undefined): Promise<void> {
        //if(this.nodes.length === 0) return;
        // if (!selectedNode) {
        //     selectedNode = this.nodes[0];
        // }
        //const oldViewport = this.reactFlow.getViewport();
        const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
            this.nodes,
            this.edges,
            this.reactFlow.getNodes()
        );
        this.reactFlow.setNodes(layoutedNodes);
        this.reactFlow.setEdges(layoutedEdges);
        // const theNode = this.getNodeFromLayoutElement(layoutedNodes, selectedNode);
        // this.reactFlow.setCenter(
        //     theNode.position.x,
        //     theNode.position.y,
        //     {zoom: this.reactFlow.getZoom()}
        // );
        //this.reactFlow.setViewport(oldViewport);
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

    public checkIfNodeExists(node: Node): boolean {
        return this.nodes.some((n) => n.id === node.id);
    }

    public move(direction: string): Node {
        let nodes = this.reactFlow.getNodes();

        // find the selectedNode, which is selected.
        const selectedNode = nodes.find((n) => n.selected);
        // if move up, get ancestors.
        if(direction === "up") {
            const ancestors = getAncestors(selectedNode, this.reactFlow.getNodes(), this.reactFlow.getEdges());
            if(ancestors.length > 0) {
                return ancestors[0];
            }
            else {
                return undefined;
            }
        }
        // if move down, get first descent.

        if(direction === "down") {
            const children = getChildren(selectedNode, this.reactFlow.getNodes(), this.reactFlow.getEdges());
            
            if(children.length > 0) {
                return children[0];
            }
            else {
                return undefined;
            }
        }
        // if move left, get left sibling.
        if(direction === "left") {
            const siblings = getSiblingsIncludeSelf(selectedNode, this.reactFlow.getNodes(), this.reactFlow.getEdges());
            
            if(getSiblingsIncludeSelf.length > 0) {
                // find the index of the selectedNode in the siblings.
                const index = siblings.findIndex((s) => s.id === selectedNode.id);
                if(index > 0) {
                    return siblings[index - 1];
                }
                else {
                    return undefined;
                }
            }
            else {
                return undefined;
            }
        }
        // if move right, get right sibling
        if(direction === "right") {
            const siblings = getSiblingsIncludeSelf(selectedNode, this.reactFlow.getNodes(), this.reactFlow.getEdges());
            
            if(getSiblingsIncludeSelf.length > 0) {
                // find the index of the selectedNode in the siblings.
                const index = siblings.findIndex((s) => s.id === selectedNode.id);
                if(index < siblings.length - 1) {
                    return siblings[index + 1];
                }
                else {
                    return undefined;
                }
            }
            else {
                return undefined;
            }
        }
    }
}