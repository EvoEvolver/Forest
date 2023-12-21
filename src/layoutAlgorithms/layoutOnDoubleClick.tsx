import { Edge, Node } from "reactflow";
import dagre from 'dagre';


// get the node's siblings.
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

export const layoutOnDoubleClick = async (event, node, reactFlow, getLayoutedElements, numGenerations = 1, center = true) => {
    // Need to hide other nodes. Only includes the nodes that are i. the node itself, the node's siblings (not not siblings' children), and the node's ancestors (but not the ancestors' siblings and their children).

    // unhidden all nodes and edges first. and change back the orientation.
    const currentNodes: Node[] = reactFlow.getNodes();
    const currentEdges: Edge[] = reactFlow.getEdges();


    const siblings = getSiblings(node, currentNodes, currentEdges);
    const ancestors = getAncestors(node, currentNodes, currentEdges);
    const descents = getQualifiedDescents(node, currentNodes, currentEdges, numGenerations);

    // Now, we set the hidden attribute to true for all the nodes that are not in the siblings, ancestors, and descents.

    const nodesToHide = currentNodes.filter((n) => {
        return !(siblings.includes(n) || ancestors.includes(n) || descents.includes(n) || n.id === node.id);
    });

    currentNodes.forEach((n) => {
        if (!(siblings.includes(n) || ancestors.includes(n) || descents.includes(n) || n.id === node.id))
            n.hidden = true;
        else
            n.hidden = false;
    });

    const edgesToHide = currentEdges.filter((e) => {
        const source = nodesToHide.find((n) => n.id === e.source);
        const target = nodesToHide.find((n) => n.id === e.target);
        // The edge needs to be hidden if either the source or the target is hidden.

        return source?.hidden || target?.hidden;
    });

    currentEdges.forEach((e: Edge) => {
        const source = nodesToHide.find((n) => n.id === e.source);
        const target = nodesToHide.find((n) => n.id === e.target);

        if (source?.hidden || target?.hidden)
            e.hidden = true;
        else
            e.hidden = false;
    });


    let visibleNodes = currentNodes.filter((n) => !n.hidden);
    let visibleEdges = currentEdges.filter((e) => !e.hidden);

    // Now, we need to move the node to the center of the screen.

    // Need to display all ansectors on the same horizontal level.
    // And change the edges to be straight lines.

    // call the function.

    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
        visibleNodes,
        visibleEdges
    );

    let theNode = layoutedNodes.find((n) => n.id === node.id);

    // get the ancestors.
    let ancestorsRelayout = getAncestors(theNode, layoutedNodes, layoutedEdges);


    if (ancestorsRelayout.length > 0) {
        for (let i = 1; i < ancestorsRelayout.length; i++) {
            const ancestor = ancestorsRelayout[i];
            if (ancestor) {
                ancestor.position.y = ancestorsRelayout[0].position.y;

                // get the previous ancestor's nodeWidth.
                const nodeWidth = ancestorsRelayout[i - 1].width;
                ancestor.position.x = ancestorsRelayout[i - 1].position.x + i * nodeWidth * 1.2;

                ancestor.sourcePosition = 'left';
                ancestor.targetPosition = 'right';

            }
        }

        ancestorsRelayout[0].targetPosition = 'right';
    }

    reactFlow.setNodes(layoutedNodes);
    reactFlow.setEdges(layoutedEdges);
}
