import { Edge, Node } from "reactflow";
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


// get my descents.

const getDescents = (node: Node, currentNodes: Node[], currentEdges: Edge[]): Node[] => {
    let children: Edge[] = currentEdges.filter((e: Edge) => e.source === node.id) as Edge[];
    if(!children) {
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

export const layoutOnDoubleClick = (event, node, reactFlow) => {
    // Need to hide other nodes. Only includes the nodes that are i. the node itself, the node's siblings (not not siblings' children), and the node's ancestors (but not the ancestors' siblings and their children).

    // unhidden all nodes and edges first. and change back the orientation.
    const currentNodes: Node[] = reactFlow.getNodes();
    const currentEdges: Edge[] = reactFlow.getEdges();


    const siblings = getSiblings(node, currentNodes, currentEdges);
    const ancestors = getAncestors(node, currentNodes, currentEdges);
    const descents = getDescents(node, currentNodes, currentEdges);

    // Now, we set the hidden attribute to true for all the nodes that are not in the siblings, ancestors, and descents.

    const nodesToHide = currentNodes.filter((n) => {
        return !(siblings.includes(n) || ancestors.includes(n) || descents.includes(n) || n.id === node.id);
    });

    nodesToHide.forEach((n) => {
        n.hidden = true;
    });

    const edgesToHide = currentEdges.filter((e) => {
        const source = currentNodes.find((n) => n.id === e.source);
        const target = currentNodes.find((n) => n.id === e.target);
        // The edge needs to be hidden if either the source or the target is hidden.

        return source?.hidden || target?.hidden;
    });

    edgesToHide.forEach((e: Edge) => {
        e.hidden = true;
    });

    node.selected = true;

    reactFlow.setNodes(currentNodes);
    reactFlow.setEdges(currentEdges);

    // Now, we need to move the node to the center of the screen.

    // Need to display all ansectors on the same horizontal level.
    // And change the edges to be straight lines.

    if (ancestors.length > 0) {
        for (let i = 1; i < ancestors.length; i++) {
            const ancestor = ancestors[i];
            if (ancestor) {
                ancestor.position.y = ancestors[0].position.y;

                // get the previous ancestor's nodeWidth.
                const nodeWidth = ancestors[i - 1].width;
                ancestor.position.x = ancestors[i - 1].position.x + i * nodeWidth * 1.2;

                ancestor.sourcePosition = 'left';
                ancestor.targetPosition = 'right';

            }
        }

        ancestors[0].targetPosition = 'right';
    }
    reactFlow.fitView({ nodes: [node], padding: 0.2 });
}
