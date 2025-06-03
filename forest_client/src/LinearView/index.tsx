import React from 'react';
import {NodeContentTabs} from "../TreeView/NodeContentTab";
import {atom, useAtomValue} from "jotai";
import {treeAtom} from "../TreeState/TreeState";
import { Paper } from '@mui/material';



const linearNodeListAtom = atom((get) => {
    const currTree = get(treeAtom)
    if (!currTree)
        return
    const nodeDict = currTree.nodeDict
    const rootNode = get(Object.values(nodeDict).find(node => get(node).parent === null))
    // use get(node.children) to get children of root node
    // do a depth-first traversal to get all leaf node in a linear list
    const traverse = (node) => {
        const children = get(node.children) as string[];
        if (children.length === 0) {
            return [node];
        }
        return children.flatMap(childId => traverse(get(nodeDict[childId])));
    };
    const linearNodes = traverse(rootNode);
    return linearNodes;
})


export default function LinearView(props) {
    const nodes = useAtomValue(linearNodeListAtom);
    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '100%',
        }}>
            <Paper
                elevation={1}
                sx={{
                    maxWidth: '800px',
                    width: '100%',
                    margin: '20px',
                    padding: '20px',
                    bgcolor: '#f4f4f4'
                }}
            >
                {nodes.map((node) => (
                    <NodeContentTabs
                        key={node.id}
                        node={node}
                        tabDict={node.tabs}
                        titleAtom={node.title}
                    />
                ))}
            </Paper>
        </div>
    );
}