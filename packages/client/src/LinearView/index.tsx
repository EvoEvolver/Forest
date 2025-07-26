import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {atom, useAtomValue} from "jotai";
import {treeAtom} from "../TreeState/TreeState";
import {Paper, Skeleton} from '@mui/material';
import {NodeVM} from '@forest/schema';
import {EditorNodeType} from '@forest/node-type-editor/src';


const linearNodeListAtom = atom((get) => {
    const currTree = get(treeAtom)
    if (!currTree)
        return
    const nodeDict = currTree.nodeDict
    const rootNode = get(Object.values(nodeDict).find(node => get(node).parent === null))
    // use get(node.children) to get children of root node
    // do a depth-first traversal to get all node in a linear list
    const traverse = (node: NodeVM) => {
        if (node.nodeM.nodeTypeName() !== "EditorNodeType") {
            // if node is not EditorNodeType, return empty array
            return [];
        }
        const children = get(node.children) as string[];
        if (children.length === 0) {
            return [node];
        }
        return [node, ...children.flatMap(childId => traverse(get(nodeDict[childId])))]
    };
    const linearNodes: NodeVM[] = traverse(rootNode);
    return linearNodes;
})


// Memoized node component with lazy HTML generation
const NodeRenderer = React.memo(({ node, editorNodeType }: { node: NodeVM, editorNodeType: EditorNodeType }) => {
    const children = useAtomValue(node.children) as string[];
    const title = useAtomValue(node.title);
    const [htmlContent, setHtmlContent] = useState<string | null>(null);
    const [isVisible, setIsVisible] = useState(false);
    const nodeRef = useRef<HTMLDivElement>(null);

    // Intersection Observer for lazy loading
    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    observer.disconnect();
                }
            },
            { threshold: 0.1, rootMargin: '100px' }
        );

        if (nodeRef.current) {
            observer.observe(nodeRef.current);
        }

        return () => observer.disconnect();
    }, []);

    // Generate HTML content asynchronously when visible
    useEffect(() => {
        if (isVisible && !htmlContent && children && children.length === 0) {
            // Use setTimeout to make HTML generation non-blocking
            const timer = setTimeout(() => {
                const content = editorNodeType.getEditorContent(node.nodeM);
                setHtmlContent(content);
            }, 0);
            
            return () => clearTimeout(timer);
        }
    }, [isVisible, htmlContent, children, node.nodeM, editorNodeType]);

    if (!children) {
        return <></>;
    }

    if (children.length > 0) {
        return (
            <div ref={nodeRef} key={node.id}>
                <h2>{title}</h2>
            </div>
        );
    }

    return (
        <div ref={nodeRef}>
            {isVisible ? (
                htmlContent ? (
                    <span dangerouslySetInnerHTML={{ __html: htmlContent }} />
                ) : (
                    <Skeleton variant="text" width="100%" height={60} />
                )
            ) : (
                <Skeleton variant="text" width="100%" height={60} />
            )}
        </div>
    );
});

export default function LinearView() {
    const nodes: NodeVM[] = useAtomValue(linearNodeListAtom);
    const editorNodeType = useMemo(() => new EditorNodeType(), []);


    return <>
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            overflow: 'auto',
            backgroundColor: '#f4f4f4',
        }}>
        <Paper
            elevation={1}
            sx={{
                maxWidth: '800px',
                width: '100%',
                margin: '10px',
                padding: '10px',
                borderRadius: 5
            }}
        >
            {nodes.map(node => (
                <NodeRenderer key={node.id} node={node} editorNodeType={editorNodeType} />
            ))}
        </Paper>
        </div>
    </>
}