/**
 * SelectedDot component for TreeView nodes
 */

import React from 'react';
import {useAtomValue} from "jotai";
import {selectedNodeAtom} from "../../TreeState/TreeState";
import {NodeVM} from "@forest/schema";

interface SelectedDotProps {
    node: NodeVM;
}

export const SelectedDot = ({node}: SelectedDotProps) => {
    let selectedNode = useAtomValue(selectedNodeAtom)
    if (!selectedNode)
        return null
    const isSelected = selectedNode.id === node.id;

    if (!isSelected)
        return null
    else
        return <div
            style={{
                position: 'absolute',
                left: '8px',
                top: '35px', // Position near the title
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: '#1976d2', // Blue color
                zIndex: 10
            }}
        />
};