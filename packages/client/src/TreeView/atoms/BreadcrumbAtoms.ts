/**
 * Atoms and utilities for breadcrumb navigation
 */

import {atom} from "jotai";
import {selectedNodeAtom, treeAtom} from "../../TreeState/TreeState";
import {NodeVM} from '@forest/schema';

export interface BreadcrumbItem {
    id: string;
    title: string;
}

/**
 * Helper function to build breadcrumb path from root to current node
 */
function buildBreadcrumbPath(node: NodeVM): BreadcrumbItem[] {
    if (!node || !node.nodeM) {
        return [];
    }

    const breadcrumbs: BreadcrumbItem[] = [];
    let currentNodeM = node.nodeM;
    const treeM = currentNodeM.treeM;

    // Build path from current node back to root
    const nodePath = [currentNodeM];
    while (true) {
        const parent = treeM.getParent(currentNodeM);
        if (!parent) {
            break;
        }
        nodePath.push(parent);
        currentNodeM = parent;
    }

    // Reverse to get root-to-current path and build breadcrumb items
    return nodePath.reverse().map(nodeM => ({
        id: nodeM.id,
        title: nodeM.ymap.get('title') || 'Untitled'
    }));
}

/**
 * Atom that provides breadcrumb path for the currently selected node
 */
export const breadcrumbPathAtom = atom<BreadcrumbItem[]>((get) => {
    const selectedNode = get(selectedNodeAtom);
    const tree = get(treeAtom);

    if (!selectedNode || !tree) {
        return [];
    }

    return buildBreadcrumbPath(selectedNode);
});