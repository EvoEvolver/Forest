import { NodeM } from "@forest/schema";

/**
 * Utility functions for checking and working with node types
 */

export function isMCPNode(node: NodeM): boolean {
    return node.nodeTypeName() === "MCPNodeType";
}

export function isA2ANode(node: NodeM): boolean {
    return node.nodeTypeName() === "A2ANodeType";
}

export function isConnectableNode(node: NodeM): boolean {
    return isMCPNode(node) || isA2ANode(node);
}

/**
 * Get all MCP and A2A nodes from a list of nodes
 */
export function getConnectableNodes(nodes: NodeM[]): { mcpNodes: NodeM[], a2aNodes: NodeM[] } {
    const mcpNodes: NodeM[] = [];
    const a2aNodes: NodeM[] = [];
    
    for (const node of nodes) {
        if (isMCPNode(node)) {
            mcpNodes.push(node);
        } else if (isA2ANode(node)) {
            a2aNodes.push(node);
        }
    }
    
    return { mcpNodes, a2aNodes };
}