import { ReactFlowInstance, Node, Edge, Viewport, Position, getNodesBounds } from 'reactflow';
import dagre from 'dagre';


const nodeWidth = 200;
const nodeHeight = 50;

export const getSiblingsIncludeSelf = (node: Node, currentNodes: Node[], currentEdges: Edge[]): Node[] => {
    let parent: Edge | undefined = currentEdges.find((e: Edge) => e.target === node.id);
    let siblings: Edge[] = [];
    if (parent) {
        siblings = currentEdges.filter((e: Edge) => (e.source === parent?.source));
    }
    const siblingNodes = siblings.map((s) => currentNodes.find((n: Node) => n.id === s.target)) as Node[];
    if (siblingNodes.length === 0) {
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

export default class Layout {
    private reactFlow: ReactFlowInstance; // the object that controls the layout.
    private nodes: Node[] = []; // the nodes in the tree. No layout information.
    private edges: Edge[] = []; // the edges in the tree. No layout information.


    /**
     * The constructor of the Layout class.
     * @param reactFlow: the reactFlowInstanceObject. 
     * @param nodes: the nodes in the tree. No layout information. 
     * @param edges: the edges in the tree. No layout information.
     */
    constructor(reactFlow: ReactFlowInstance, nodes: Node[], edges: Edge[]) {
        this.reactFlow = reactFlow;
        this.nodes = nodes;
        this.edges = edges;
    }

    /**
     * Get the node that's currently being selected.
     * We should get this information from the object that controls the layout which is reactFlow.
     * @returns the selected node. undefined if no node is selected. 
     */
    private getSelectedNode(): Node {
        let nodes = this.reactFlow.getNodes();
        return nodes.find((n) => n.selected);
    }


    private getVisibleNodesEdges(selectedNode: Node, numGenerations: number): { visibleNodes: Node[], visibleEdges: Edge[] } {
        if (selectedNode) {
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
            return { visibleNodes: visibleNodes, visibleEdges: visibleEdges };
        }
        else {
            return { visibleNodes: this.nodes, visibleEdges: this.edges };
        }
    }

    /**
     * This function is called when the layout is initialized (the tree is updated).
     * This function won't select or unselect any node.
     */
    public async autoLayout(selectedNode: Node = undefined, numGenerations: number = 1): Promise<void> {
        const startTime = performance.now();
        if (this.nodes.length === 0) return;
        const oldViewport = this.reactFlow.getViewport();
        const { visibleNodes, visibleEdges } = this.getVisibleNodesEdges(selectedNode, numGenerations);
        const { nodes: layoutedNodes, edges: layoutedEdges } = this.getLayoutedElements(
            visibleNodes,
            visibleEdges
        );
        this.reactFlow.setNodes(layoutedNodes);
        this.reactFlow.setEdges(layoutedEdges);
        this.reactFlow.setViewport(oldViewport);
        const endTime = performance.now();

        // Calculate and log the elapsed time
        const elapsedTime = endTime - startTime;
        console.log(`autoLayout took ${elapsedTime} milliseconds`);
    }

    /**
     * This function is called when the selected node is updated.
     * This function won't select or unselect any node.
     */
    public async updateLayout(selectedNode: Node, numGenerations: number = 1): Promise<void> {
        const startTime = performance.now();
        if (this.nodes.length === 0) return;
        const oldViewport = this.reactFlow.getViewport();
        const { visibleNodes, visibleEdges } = this.getVisibleNodesEdges(selectedNode, numGenerations);
        const { nodes: layoutedNodes, edges: layoutedEdges } = this.getLayoutedElements(
            visibleNodes,
            visibleEdges,
            selectedNode
        );

        this.reactFlow.setNodes(layoutedNodes);
        this.reactFlow.setEdges(layoutedEdges);
        this.reactFlow.setViewport(oldViewport);

        if(selectedNode !== undefined && selectedNode !== null) {
            let theNode = layoutedNodes.find((node) => node.id === selectedNode.id);
            if (theNode) {
                theNode.selected = true;
                this.reactFlow.setCenter(
                    theNode.position.x + 124 / 2,
                    theNode.position.y + 54 / 2, // those numbers are the div dims + parent paddings + border
                    {zoom: this.reactFlow.getZoom(), duration: 0}
                );
            }
        }

        const endTime = performance.now();

        // Calculate and log the elapsed time
        const elapsedTime = endTime - startTime;
        console.log(`updateLayout took ${elapsedTime} milliseconds`);
    }




    public async restoreLayout(): Promise<void> {
        // restore layout
        const startTime = performance.now();
        if (this.nodes.length === 0) return;
        const oldViewport = this.reactFlow.getViewport();
        const { visibleNodes, visibleEdges } = this.getVisibleNodesEdges(undefined, 1);

        const { nodes: layoutedNodes, edges: layoutedEdges } = this.getLayoutedElements(
            visibleNodes,
            visibleEdges,
        );

        // change selected to false.
        layoutedNodes.forEach((n) => {
            n.selected = false;
        });
        this.reactFlow.setNodes(layoutedNodes);
        this.reactFlow.setEdges(layoutedEdges);
        this.reactFlow.setViewport(oldViewport);
        const endTime = performance.now();

        // Calculate and log the elapsed time
        const elapsedTime = endTime - startTime;
        console.log(`unselect node took ${elapsedTime} milliseconds`);
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
        if (!selectedNode) return;
        // if move up, get ancestors.
        if (direction === "up") {
            const ancestors = getAncestors(selectedNode, this.reactFlow.getNodes(), this.reactFlow.getEdges());
            if (ancestors.length > 0) {
                return ancestors[0];
            }
            else {
                return undefined;
            }
        }
        // if move down, get first descent.

        if (direction === "down") {
            const children = getChildren(selectedNode, this.reactFlow.getNodes(), this.reactFlow.getEdges());

            if (children.length > 0) {
                return children[0];
            }
            else {
                return undefined;
            }
        }
        // if move left, get left sibling.
        if (direction === "left") {
            const siblings = getSiblingsIncludeSelf(selectedNode, this.reactFlow.getNodes(), this.reactFlow.getEdges());

            if (getSiblingsIncludeSelf.length > 0) {
                // find the index of the selectedNode in the siblings.
                const index = siblings.findIndex((s) => s.id === selectedNode.id);
                if (index > 0) {
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
        if (direction === "right") {
            const siblings = getSiblingsIncludeSelf(selectedNode, this.reactFlow.getNodes(), this.reactFlow.getEdges());

            if (getSiblingsIncludeSelf.length > 0) {
                // find the index of the selectedNode in the siblings.
                const index = siblings.findIndex((s) => s.id === selectedNode.id);
                if (index < siblings.length - 1) {
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

    public moveToChildByIndex(index: number): Node {
        let nodes = this.reactFlow.getNodes();

        // find the selectedNode, which is selected.
        const selectedNode = nodes.find((n) => n.selected);
        if (!selectedNode) return;
        // if move up, get ancestors.
        const children = getChildren(selectedNode, this.reactFlow.getNodes(), this.reactFlow.getEdges());
        if (children.length > 0 && index < children.length) {
            return children[index];
        }
        else {
            return undefined;
        }
    }

    private getLayoutedElements = (iNodes: Node[], iEdges: Edge[], newSelectedNode: Node = undefined) => {
        let selectedNode = undefined;
        if (newSelectedNode) {
            selectedNode = newSelectedNode;
        }
        else {
            selectedNode = this.getSelectedNode();
        }

        let direction = 'TB'
        let nodes = iNodes.map(e => ({ ...e }));
        let edges = iEdges.map(e => ({ ...e }));

        const dagreGraph = new dagre.graphlib.Graph();
        dagreGraph.setDefaultEdgeLabel(() => ({}));
        dagreGraph.setGraph({ rankdir: direction });

        nodes.forEach((node) => {
            dagreGraph.setNode(node.id, { width: nodeWidth * 1.5, height: nodeHeight * 2 });
        });

        edges.forEach((edge) => {
            dagreGraph.setEdge(edge.source, edge.target);
        });

        dagre.layout(dagreGraph);

        nodes.forEach((node) => {
            const nodeWithPosition = dagreGraph.node(node.id);
            node.position = {
                x: nodeWithPosition.x,
                y: nodeWithPosition.y,
            };
            return node;
        });

        // Shift the nodes to restore the old position.
        // get the offset of the selectedNode.

        // first, let's try to find the selectedNode in the nodes array.
        if (selectedNode) {
            const node = nodes.find((n) => n.id === selectedNode.id);
            if (node) {
                node.sourcePosition = 'bottom' as Position;
                node.targetPosition = 'top' as Position;
                const dx = selectedNode.position.x - node.position.x;
                const dy = selectedNode.position.y - node.position.y;
                nodes.forEach((n) => {
                    n.position.x += dx;
                    n.position.y += dy;
                });
            }
        }


        if (selectedNode && newSelectedNode) {
            let ancestors = getAncestors(selectedNode, nodes, edges);
            // Need to move the parent to horitonzol.
            if (ancestors.length > 0) {
                // Shift the ancestors to restore the old position.
                ancestors[0].position.x = selectedNode.position.x;
                for (let i = 1; i < ancestors.length; i++) {
                    const ancestor = ancestors[i];
                    if (ancestor) {
                        ancestor.position.y = ancestors[0].position.y;

                        // get the previous ancestor's nodeWidth.
                        // dynamically calculate node width.
                        ancestor.position.x = ancestors[i - 1].position.x + i * nodeWidth;

                        ancestor.sourcePosition = 'left' as Position;
                        ancestor.targetPosition = 'right' as Position;

                    }
                }

                ancestors[0].targetPosition = 'right' as Position;
            }
        }

        return { nodes, edges };
    };

    public moveToRoot(): Node {
        let root = this.nodes[0];
        // get from this.reactflow.getNodes();
        let theRootNode = this.reactFlow.getNodes().find((n) => n.id === root.id);
        if (!theRootNode) return;
        theRootNode.selected = true;
        return theRootNode;
    }


    // move to the next available node on the right side of the tree.
    public moveToNextAvailableOnRightHelper(node: Node): Node {
        // base case: the node is root.
        // check if it is root.
        const ancestors = getAncestors(node, this.reactFlow.getNodes(), this.reactFlow.getEdges());
        if (ancestors.length === 0) {
            return undefined;
        }
        else {
            // get current index.
            const siblings = getSiblingsIncludeSelf(node, this.nodes, this.edges);
            const index = siblings.findIndex((s) => s.id === node.id);
            console.log(node.data.label)
            console.log(index)
            console.log(siblings.length)
            if (index === siblings.length - 1) {
                return this.moveToNextAvailableOnRightHelper(ancestors[0]);
            }
            else {
                return siblings[index + 1];
            }
        }
    }
    public moveToNextAvailable(): Node {
        let nodes = this.reactFlow.getNodes();

        // find the selectedNode, which is selected.
        const selectedNode = nodes.find((n) => n.selected);
        if (!selectedNode) return;
        // find the next available node recursively.
        // TODO: what is the time complexity of this function?
        const children = getChildren(selectedNode, this.reactFlow.getNodes(), this.reactFlow.getEdges());
        if (children.length > 0) {
            return children[0];
        }
        else {
            return this.moveToNextAvailableOnRightHelper(selectedNode);
        }
    }


        public moveToPrevAvailableOnLeftHelper(node: Node): Node {
        // base case: the node is root.
        // check if it is root.
        const ancestors = getAncestors(node, this.reactFlow.getNodes(), this.reactFlow.getEdges());
        if (ancestors.length === 0) {
            return undefined;
        }
        else {
            // get current index.
            const siblings = getSiblingsIncludeSelf(node, this.nodes, this.edges);
            const index = siblings.findIndex((s) => s.id === node.id);
            if (index === 0) {
                return this.moveToPrevAvailableOnLeftHelper(ancestors[0]);
            }
            else {
                return siblings[index - 1];
            }
        }
    }
    public moveToPrevAvailable(): Node {
        let nodes = this.reactFlow.getNodes();

        // find the selectedNode, which is selected.
        const selectedNode = nodes.find((n) => n.selected);
        if (!selectedNode) return;
        // find the next available node recursively.
        // TODO: what is the time complexity of this function?
        const children = getChildren(selectedNode, this.reactFlow.getNodes(), this.reactFlow.getEdges());
        if (children.length > 0) {
            return children[-1];
        }
        else {
            return this.moveToPrevAvailableOnLeftHelper(selectedNode);
        }
    }



    public checkIfSelectedOnNode(): Node {
        const selectedNode = this.reactFlow.getNodes().find((n) => n.selected);
        if (selectedNode) {
            return selectedNode;
        }
        else {
            return undefined;
        }
    }

    public getNodePath(node: Node): Node[] {
        let path: Node[] = [];
        if (!node) return path;

        let ancestors = getAncestors(node, this.reactFlow.getNodes(), this.reactFlow.getEdges()).reverse();
        ancestors.push(node)
        return ancestors;
    }
}