import React from 'react';
import {atom, useAtomValue} from "jotai";
import {treeAtom} from "../TreeState/TreeState";
import {Paper} from '@mui/material';
import {NodeTitle} from "../TreeView/NodeTitle";
import {NodeVM} from '@forest/schema';
import {thisNodeContext} from '../TreeView/NodeContext';


const linearNodeListAtom = atom((get) => {
    const currTree = get(treeAtom)
    if (!currTree)
        return
    const nodeDict = currTree.nodeDict
    const rootNode = get(Object.values(nodeDict).find(node => get(node).parent === null))
    // use get(node.children) to get children of root node
    // do a depth-first traversal to get all node in a linear list
    const traverse = (node: NodeVM) => {
        const children = get(node.children) as string[];
        if (children.length === 0) {
            return [node];
        }
        return [node, ...children.flatMap(childId => traverse(get(nodeDict[childId])))]
    };
    const linearNodes: NodeVM[] = traverse(rootNode);
    return linearNodes;
})


export default function LinearView(props) {
    const nodes: NodeVM[] = useAtomValue(linearNodeListAtom);
    const renderNode = (node: NodeVM) => {
        const children = useAtomValue(node.children) as string[];
        const title = useAtomValue(node.title);
        if (!children) {
            return <></>;
        }
        if (children.length > 0) {
            return <div key={node.id}>
                <h2>{title}</h2>
            </div>;
        }
        return (
            <thisNodeContext.Provider value={node}>
                <NodeTitle node={node}/>
                {node.nodeType.render(node)}
            </thisNodeContext.Provider>
        );
    };


    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '100%',
            height: '100%', // Set container height to viewport height
        }}>
            <Paper
                elevation={1}
                sx={{
                    maxWidth: '800px',
                    width: '100%',
                    margin: '10px',
                    padding: '10px',
                    bgcolor: '#f4f4f4',
                    maxHeight: '100%', // Account for margins
                    overflowY: 'auto', // Enable vertical scrolling
                }}
            >
                {nodes.map(node => (
                    <React.Fragment key={node.id}>
                        {renderNode(node)}
                    </React.Fragment>
                ))}
            </Paper>
        </div>
    );
}