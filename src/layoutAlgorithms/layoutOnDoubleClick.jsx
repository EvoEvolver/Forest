export const layoutOnDoubleClick = (event, node, reactFlow) => {
    // Need to hide other nodes. Only includes the nodes that are i. the node itself, the node's siblings (not not siblings' children), and the node's ancestors (but not the ancestors' siblings and their children).

    // unhidden all nodes and edges first. and change back the orientation.
    const currentNodes = reactFlow.getNodes();
    const currentEdges = reactFlow.getEdges();

    // Relayout position.


    // We can hide by setting the `hidden` attribute.

    // get the node's siblings.
    const getSiblings = (node) => {
        let parent = currentEdges.find((e) => e.target === node.id);
        let siblings = [];
        if (parent) {
            siblings = currentEdges.filter((e) => (e.source === parent.source) && (e.target !== node.id));
        }
        const siblingNodes = siblings.map((s) => currentNodes.find((n) => n.id === s.target));
        return siblingNodes;
    }

    // get the node's ancestors.
    const getAncestors = (node) => {
        let parent = currentEdges.find((e) => e.target === node.id);
        let ancestors = [];
        while (parent) {
            ancestors.push(parent);
            parent = currentEdges.find((e) => e.target === parent.source);
        }
        const parentNodes = ancestors.map((a) => currentNodes.find((n) => n.id === a.source));
        return parentNodes;
    }

    // get my descents.

    const getDescents = (node) => {
        let children = currentEdges.filter((e) => e.source === node.id);
        const childrenNodes = children.map((c) => currentNodes.find((n) => n.id === c.target));
        let des = [];
        childrenNodes.forEach((c) => {
            des.push(c);
            des = des.concat(getDescents(c));
        });
        return des;
    }


    const siblings = getSiblings(node);
    const ancestors = getAncestors(node);
    const descents = getDescents(node);

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

        return source.hidden || target.hidden;
    });

    edgesToHide.forEach((e) => {
        e.hidden = true;
    });

    node.selected = true;

    reactFlow.setNodes(currentNodes);
    reactFlow.setEdges(currentEdges);

    // Now, we need to move the node to the center of the screen.

    // Need to display all ansectors on the same horizontal level.
    // And change the edges to be straight lines.

    if (ancestors.length > 0) {
        for(let i = 1; i < ancestors.length; i++) {
            const ancestor = ancestors[i];
            if (ancestor) {
                ancestor.position.y = ancestors[0].position.y;

                // get the previous ancestor's nodeWidth.
                const nodeWidth = ancestors[i - 1].width;
                ancestor.position.x = ancestors[0].position.x + i * nodeWidth * 1.28;

                ancestor.sourcePosition = 'left';
                ancestor.targetPosition = 'right';

            }
        }

        ancestors[0].targetPosition = 'right';
    }
    reactFlow.fitView({ nodes: [node], padding: 0.2 });
}
