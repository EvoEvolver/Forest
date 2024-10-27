import {Node, NodeDict, TreeData} from './entities';
import Tree from "react-d3-tree";


export const getSiblingsIncludeSelf = (node: Node, nodeDict: NodeDict): Node[] => {
    let parent = nodeDict[node.parent];
    if (!parent) {
        return [node];
    }
    const siblingNodes = parent.children.map((c: string) => nodeDict[c]) as Node[];
    if (siblingNodes.length === 0) {
        siblingNodes.push(node);
    }
    return siblingNodes;
}


// get the node's ancestors.
export const getAncestors = (node: Node, nodeDict: NodeDict): Node[] => {
    let parent = nodeDict[node.parent];
    let ancestors: Node[] = [];
    while (parent) {
        ancestors.push(parent);
        parent = nodeDict[parent.parent];
    }
    return ancestors;
}


// get my descents.

export const getDescents = (node: Node, nodeDict: NodeDict): Node[] => {
    let children: string[] = node.children;
    if (!children) {
        return [] as Node[];
    }
    else {
        const childrenNodes = children.map((c: string) => nodeDict[c]) as Node[];
        let des: Node[] = [];
        childrenNodes.forEach((c: Node) => {
            des.push(c);
            des = des.concat(getDescents(c, nodeDict));
        });
        return des;
    }
}


// get my children.

export const getChildren = (node: Node, nodeDict: NodeDict): Node[] => {
    let children: string[] = node.children;
    if (!children) {
        return [] as Node[];
    }
    else {
        return children.map((c: string) => nodeDict[c]) as Node[];
    }
};


export default class Layouter{
  /**
   * The constructor of the Layout class.
   * @param nodes: the nodes in the tree. No layout information.
   * @param setNodes: Function to update nodes state.
   */

    public rawNodes: Node[] = [];
      constructor() {
          this.rawNodes = undefined;
      }


    /**
     * Get the node that's currently being selected.
     * @returns the selected node. undefined if no node is selected.
     */
    public getSelectedNode(treeData: TreeData): Node {
        return treeData.nodeDict[treeData.selectedNode];
    }

    public setSelectedNode(currTree: TreeData, node_id: string): TreeData {
        let nodeDict: NodeDict = currTree.nodeDict;
        return {
            selectedNode: node_id,
            nodeDict: nodeDict
        }
    }


    public hasTree(tree: TreeData): boolean {
        if(!tree) return false;
        return Object.keys(tree.nodeDict).length > 0;
    }

    public updateTree(currTree: TreeData, tree: TreeData): TreeData {
        let nodeDict: NodeDict = tree.nodeDict;
        let nodes = Object.values(nodeDict);
        let selectedNode: string
        if(!tree.selectedNode) {
            selectedNode = currTree.selectedNode;
            if(!selectedNode) {
                selectedNode = nodes[0].id;
            }
        }
        else{
            selectedNode = tree.selectedNode
        }
        return {
            selectedNode: selectedNode,
            nodeDict: nodeDict
        }
    }

    public getAncestorNodes(currTree: TreeData, node: Node): Node[] {
        return getAncestors(node, currTree.nodeDict);
    }

    public getSiblingNodes(currTree: TreeData, node: Node): Node[] {
        return getSiblingsIncludeSelf(node, currTree.nodeDict);
    }

    public getChildrenNodes(currTree: TreeData, node: Node): Node[] {
        return getChildren(node, currTree.nodeDict);
    }


    public checkIfNodeExists(tree: TreeData, node: Node): boolean {
        return tree.nodeDict[node.id] !== undefined;
    }

    public move(tree: TreeData, direction): Node {
        let nodes = Object.values(tree.nodeDict);

        // find the selectedNode, which is selected.
        const selectedNode = tree.nodeDict[tree.selectedNode]
        if (!selectedNode) return;
        // if move up, get ancestors.
        if (direction === "parent") {
            const ancestors = getAncestors(selectedNode, tree.nodeDict);
            if (ancestors.length > 0) {
                return ancestors[0];
            }
            else {
                return undefined;
            }
        }
        // if move down, get first descent.

        if (direction === "child") {
            const children = getChildren(selectedNode, tree.nodeDict);

            if (children.length > 0) {
                return children[0];
            }
            else {
                return undefined;
            }
        }
        // if move left, get left sibling.
        if (direction === "left_sib") {
            const siblings = getSiblingsIncludeSelf(selectedNode, tree.nodeDict);

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
        if (direction === "right_sib") {
            const siblings = getSiblingsIncludeSelf(selectedNode, tree.nodeDict);

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

    public moveToChildByIndex(tree: TreeData, index: number): Node {
        let nodes = Object.values(tree.nodeDict);

        // find the selectedNode, which is selected.
        const selectedNode = tree.nodeDict[tree.selectedNode]
        if (!selectedNode) return;
        // if move up, get ancestors.
        const children = getChildren(selectedNode, tree.nodeDict);
        if (children.length > 0 && index < children.length) {
            return children[index];
        }
        else {
            return undefined;
        }
    }

    public moveToRoot(tree: TreeData): Node {
        let root = Object.values(tree.nodeDict)[0];
        while(root.parent){
            root = tree.nodeDict[root.parent]
        }
        return root;
    }

public getAllLeaves(tree: TreeData): Node[] {
    const root = this.moveToRoot(tree);
    const leaves: Node[] = [];

    // Helper function to recursively collect leaf nodes
    const collectLeaves = (nodeId: string) => {
        const node = tree.nodeDict[nodeId];

        // If the node has no children, it's a leaf node
        if (!node || !node.children || node.children.length === 0) {
            leaves.push(node);
            return;
        }

        // Otherwise, recursively process each child from left to right
        for (const childId of node.children) {
            collectLeaves(childId);
        }
    };

    // Start collecting leaves from the root node
    collectLeaves(root.id);

    return leaves;
}


    // move to the next available node on the right side of the tree.
    public moveToNextAvailableOnRightHelper(tree: TreeData, node: Node): Node {
        let nodes = Object.values(tree.nodeDict);
        // base case: the node is root.
        // check if it is root.
        const ancestors = getAncestors(node, tree.nodeDict);
        if (ancestors.length === 0) {
            return undefined;
        }
        else {
            // get current index.
            const siblings = getSiblingsIncludeSelf(node, tree.nodeDict);
            const index = siblings.findIndex((s) => s.id === node.id);
            if (index === siblings.length - 1) {
                return this.moveToNextAvailableOnRightHelper(tree, ancestors[0]);
            }
            else {
                return siblings[index + 1];
            }
        }
    }
    public moveToNextAvailable(tree: TreeData): Node {

        console.log("moveToNextAvailable");
        let nodes = Object.values(tree.nodeDict);
        // find the selectedNode, which is selected.
        const selectedNode = tree.nodeDict[tree.selectedNode]
        if (!selectedNode) return;
        // find the next available node recursively.
        // TODO: what is the time complexity of this function?
        const children = getChildren(selectedNode, tree.nodeDict);
        if (children.length > 0) {
            return children[0];
        }
        else {
            return this.moveToNextAvailableOnRightHelper(tree, selectedNode);
        }
    }
}