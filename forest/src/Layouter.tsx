import React, {Component} from 'react';
import {Tree, Node, Edge} from './entities';


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

export default class Layouter{
  /**
   * The constructor of the Layout class.
   * @param nodes: the nodes in the tree. No layout information.
   * @param edges: the edges in the tree. No layout information.
   * @param setNodes: Function to update nodes state.
   * @param setEdges: Function to update edges state.
   */

    public rawNodes: Node[] = [];
    public rawEdges: Edge[] = [];
  constructor() {
      this.rawNodes = undefined;
        this.rawEdges = undefined;
  }


    /**
     * Get the node that's currently being selected.
     * We should get this information from the object that controls the layout which is reactFlow.
     * @returns the selected node. undefined if no node is selected.
     */
    public getSelectedNode(nodes): Node {
        return nodes.find((n) => n.selected);
    }

    public setSelectedNode(currTree, node): void {
        let nodes = currTree.nodes;
        nodes.forEach((n) => {
            n.selected = false;
        });
        // make the selected node selected.
        let theNode = nodes.find((n) => n.id === node.id);
        if(theNode) {
            theNode.selected = true;
        }
        // return but update the nodes.
        return {...currTree, nodes: nodes};
    }

    //private checkIfNodeExists(node: Node): boolean {
        // TODO
    //    return false;
    //}

    public hasTree(tree): boolean {
        return tree.nodes !== undefined && tree.edges !== undefined;
    }

    public updateTree(currTree, tree): void {
        let nodes = tree.nodes;
        let edges = tree.edges;
        this.rawNodes = nodes.map((n) => {
            let newNode = {...n};
            delete newNode.selected;
            return newNode;
        });
        this.rawEdges = edges;
        if(!this.hasTree(currTree)) {
            nodes[0].selected = true;
        }
        else {
            let selectedNode = this.getSelectedNode(currTree.nodes);
            // TODO: cases for selectedNode not exist anymore, or there is no selected node.
            if(selectedNode === undefined || !this.checkIfNodeExists(tree, selectedNode)) {
                alert("not complete yet for when selected not exist anymore or there is no selected node.");
            }
            else {
                // find the selectedNode in the nodes array. Update the field 'selected' to true.
                let theNode = nodes.find((node) => node.id === selectedNode.id);
                if(theNode) {
                    theNode.selected = true;
                }
            }
        }
        return {...currTree, nodes: nodes, edges: edges};
    }

    public getAncestorNodes(currTree, node: Node): Node[] {
        return getAncestors(node, currTree.nodes, currTree.edges);
    }

    public getSiblingNodes(currTree, node: Node): Node[] {
        return getSiblingsIncludeSelf(node, currTree.nodes, currTree.edges);
    }

    public getChildrenNodes(currTree, node: Node): Node[] {
        return getChildren(node, currTree.nodes, currTree.edges);
    }



    public checkIfNodeExists(tree, node: Node): boolean {
        return tree.nodes.some((n) => n.id === node.id);
    }

    public move(tree, direction): Node {
        let nodes = tree.nodes;
        let edges = tree.edges;

        // find the selectedNode, which is selected.
        const selectedNode = nodes.find((n) => n.selected);
        if (!selectedNode) return;
        // if move up, get ancestors.
        if (direction === "up") {
            const ancestors = getAncestors(selectedNode, nodes, edges);
            if (ancestors.length > 0) {
                return ancestors[0];
            }
            else {
                return undefined;
            }
        }
        // if move down, get first descent.

        if (direction === "down") {
            const children = getChildren(selectedNode, nodes, edges);

            if (children.length > 0) {
                return children[0];
            }
            else {
                return undefined;
            }
        }
        // if move left, get left sibling.
        if (direction === "left") {
            const siblings = getSiblingsIncludeSelf(selectedNode, nodes, edges);

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
            const siblings = getSiblingsIncludeSelf(selectedNode, nodes, edges);

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

    public moveToChildByIndex(tree, index: number): Node {
        let nodes = tree.nodes;
        let edges = tree.edges;

        // find the selectedNode, which is selected.
        const selectedNode = nodes.find((n) => n.selected);
        if (!selectedNode) return;
        // if move up, get ancestors.
        const children = getChildren(selectedNode, nodes, edges);
        if (children.length > 0 && index < children.length) {
            return children[index];
        }
        else {
            return undefined;
        }
    }

    public moveToRoot(tree): Node {
        let root = tree.nodes[0];
        return root;
    }


    // move to the next available node on the right side of the tree.
    public moveToNextAvailableOnRightHelper(tree, node): Node {
        let nodes = tree.nodes;
        let edges = tree.edges;
        // base case: the node is root.
        // check if it is root.
        const ancestors = getAncestors(node, nodes, edges);
        if (ancestors.length === 0) {
            return undefined;
        }
        else {
            // get current index.
            const siblings = getSiblingsIncludeSelf(node, nodes, edges);
            const index = siblings.findIndex((s) => s.id === node.id);
            if (index === siblings.length - 1) {
                return this.moveToNextAvailableOnRightHelper(tree, ancestors[0]);
            }
            else {
                return siblings[index + 1];
            }
        }
    }
    public moveToNextAvailable(tree): Node {
        let nodes = tree.nodes;
        let edges = tree.edges;

        // find the selectedNode, which is selected.
        const selectedNode = nodes.find((n) => n.selected);
        if (!selectedNode) return;
        // find the next available node recursively.
        // TODO: what is the time complexity of this function?
        const children = getChildren(selectedNode, nodes, edges);
        if (children.length > 0) {
            return children[0];
        }
        else {
            return this.moveToNextAvailableOnRightHelper(tree, selectedNode);
        }
    }
}