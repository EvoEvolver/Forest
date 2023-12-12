import { Edge, Node, ReactFlowInstance } from "reactflow";
// get the node's ancestors.
const getAncestors = (node: Node, currentNodes: Node[], currentEdges: Edge[]): Node[] => {
    let parent: Edge | undefined = currentEdges.find((e: Edge) => e.target === node.id);
    let ancestors: Edge[] = [];
    while (parent) {
        ancestors.push(parent);
        parent = currentEdges.find((e: Edge) => e.target === parent?.source);
    }
    const parentNodes = ancestors.map((a: Edge) => currentNodes.find((n: Node) => n.id === a.source)) as Node[];
    return parentNodes;
}

const onlyShowGenerationsHelper = (node: Node, currentNodes: Node[], currentEdges: Edge[], numGenerations: number) => {
    
    if(numGenerations === 0) {
        return [] as Node[];
    }

    else {
        let children: Edge[] = currentEdges.filter((e: Edge) => e.source === node.id) as Edge[];
        if(!children) {
            return [] as Node[];
        }
        else {
            const childrenNodes = children.map((c: Edge) => currentNodes.find((n: Node) => n.id === c.target)) as Node[];
            let des: Node[] = [];
            childrenNodes.forEach((c: Node) => {
                des.push(c);
                des = des.concat(onlyShowGenerationsHelper(c, currentNodes, currentEdges, numGenerations - 1));
            });
            return des;
        }
    }
}

// get the node's siblings.
const getSiblings = (node: Node, currentNodes: Node[], currentEdges: Edge[]): Node[] => {
    let parent: Edge | undefined = currentEdges.find((e: Edge) => e.target === node.id);
    let siblings: Edge[] = [];
    if (parent) {
        siblings = currentEdges.filter((e: Edge) => (e.source === parent?.source) && (e.target !== node.id));
    }
    const siblingNodes = siblings.map((s) => currentNodes.find((n: Node) => n.id === s.target)) as Node[];

    return siblingNodes;
}

export const onlyShowGenerations = async (node: Node, reactFlow: ReactFlowInstance, numGenerations: number) => {
    // Need to hide other nodes. Only includes the nodes that are i. the node itself, the node's siblings (not not siblings' children), and the node's ancestors (but not the ancestors' siblings and their children).

    // unhidden all nodes and edges first. and change back the orientation.
    const currentNodes: Node[] = reactFlow.getNodes();
    const currentEdges: Edge[] = reactFlow.getEdges();

    const nodesToShow = onlyShowGenerationsHelper(node, currentNodes, currentEdges, numGenerations as number);
    // includes node itself.

    const ancestors = getAncestors(node, currentNodes, currentEdges);
    const siblings = getSiblings(node, currentNodes, currentEdges);

    nodesToShow.push(node);
    nodesToShow.push(...ancestors);
    nodesToShow.push(...siblings);

    const nodesToHide = [] as Node[];
    currentNodes.forEach((n) => {
        // check if the node is in the nodesToShow.
        const nodeToShow = nodesToShow.find((n2) => n2.id === n.id);
        if(nodeToShow) {
            n.hidden = false;
        }
        else {
            n.hidden = true;
            nodesToHide.push(n);
        }
    });


    const edgesToHide = currentEdges.filter((e) => {
        const source = nodesToHide.find((n) => n.id === e.source);
        const target = nodesToHide.find((n) => n.id === e.target);
        // The edge needs to be hidden if either the source or the target is hidden.

        return source?.hidden || target?.hidden;
    });

    edgesToHide.forEach((e: Edge) => {
        e.hidden = true;
    });

    // node.selected = true;

    reactFlow.setNodes(currentNodes);
    reactFlow.setEdges(currentEdges);
    reactFlow.fitView({ nodes: [node], padding: 0.2 });
}
