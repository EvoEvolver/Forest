import React, {useEffect, useRef, useState} from 'react';
import {atom, useAtomValue, useSetAtom} from "jotai";
import {jumpToNodeAtom, scrollToNodeAtom, treeAtom} from "../TreeState/TreeState";
import {Box, Paper, Skeleton} from '@mui/material';
import {NodeM} from '@forest/schema';
import {EditorNodeTypeM} from '@forest/node-type-editor/src';
import {currentPageAtom} from "../appState";
import {useTheme} from '@mui/system';
import ReferenceGenButton from './ReferenceGenButton';
import ReferenceIndexButton from './ReferenceIndexButton';


const linearNodeListAtom = atom((get) => {
    const currTree = get(treeAtom)
    if (!currTree)
        return
    get(currTree.viewCommitNumberAtom)
    const treeM = currTree.treeM

    const rootNode = treeM.getRoot()

    // do a depth-first traversal to get all node in a linear list
    const traverse = (node: NodeM, level: number = 0): Array<{ node: NodeM, level: number }> => {
        // if node is not EditorNodeType or archived, return empty array
        if (node.data()["archived"] === true) {
            return [];
        }
        if (node.nodeTypeName() !== "EditorNodeType") {
            return [];
        }
        const children = treeM.getChildren(node)
        // Always include the current node in the list
        return [{node, level}, ...children.flatMap(child => traverse(child, level + 1))]
    };
    const linearNodes = traverse(rootNode);
    return linearNodes;
})


// Memoized buttons component to prevent re-renders when linearNodeListAtom updates
const ButtonsSection = ({getHtml, rootNode, nodes}: {
    getHtml: () => string,
    rootNode: NodeM,
    nodes: { node: NodeM; level: number; }[]
}) => {
    return (
        <Box sx={{display: 'flex', gap: 1, mb: 2}}>
            <ReferenceGenButton getHtml={getHtml} rootNode={rootNode}/>
            <ReferenceIndexButton nodes={nodes}/>
        </Box>
    );
}

// Helper function to extract export content from HTML
const extractExportContent = (htmlContent: string): string => {
    const exportMatch = htmlContent.match(/<div[^>]*class="export"[^>]*>([\s\S]*?)<\/div>/gi);
    if (exportMatch) {
        return exportMatch.join('\n');
    }
    return '';
};

// Helper function to check if content has export divs
const hasExportContent = (htmlContent: string): boolean => {
    return /<div[^>]*class="export"[^>]*>[\s\S]*?<\/div>/i.test(htmlContent);
};

// Helper function to check if a node is terminal (has no children)
const isTerminalNode = (node: NodeM, treeM: any): boolean => {
    const children = treeM.getChildren(node);
    return children.length === 0;
};

// Memoized node component with lazy HTML generation
const NodeRenderer = ({node, level, treeM}: { node: NodeM, level: number, treeM: any }) => {
    const children = node.children().toJSON()
    const title = node.title()
    const [htmlContent, setHtmlContent] = useState<string | null>(null);
    const [isVisible, setIsVisible] = useState(false);
    const nodeRef = useRef<HTMLDivElement>(null);
    const theme = useTheme();

    const setCurrentPage = useSetAtom(currentPageAtom);
    const jumpToNode = useSetAtom(jumpToNodeAtom);
    const scrollToNode = useSetAtom(scrollToNodeAtom);
    
    const isTerminal = isTerminalNode(node, treeM);

    const goToNodeInTreeView = () => {
        setCurrentPage("tree");
        setTimeout(() => {
            jumpToNode(node.id);
            setTimeout(() => {
                scrollToNode(node.id);
            }, 100);
        }, 300);
    };

    // Intersection Observer for lazy loading
    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    observer.disconnect();
                }
            },
            {threshold: 0.1, rootMargin: '100px'}
        );

        if (nodeRef.current) {
            observer.observe(nodeRef.current);
        }

        return () => observer.disconnect();
    }, []);

    // Generate HTML content asynchronously when visible
    useEffect(() => {
        if (isVisible && !htmlContent) {
            // Use setTimeout to make HTML generation non-blocking
            const timer = setTimeout(() => {
                const fullContent = EditorNodeTypeM.getEditorContent(node);
                
                if (isTerminal) {
                    // Terminal node: if has export, show only export; otherwise show everything
                    if (hasExportContent(fullContent)) {
                        setHtmlContent(extractExportContent(fullContent));
                    } else {
                        setHtmlContent(fullContent);
                    }
                } else {
                    // Non-terminal node: show only export content if it exists
                    const exportContent = extractExportContent(fullContent);
                    setHtmlContent(exportContent || ''); // Empty string if no export content
                }
            }, 0);

            return () => clearTimeout(timer);
        }
    }, [isVisible, htmlContent, node, isTerminal]);

    if (!children) {
        return <></>;
    }

    const renderTitle = () => {
        const titleStyle = {
            cursor: 'pointer',
            color: theme.palette.text.primary,
            textDecoration: 'none',
            transition: 'color 0.2s ease',
        };

        const titleProps = {
            onClick: goToNodeInTreeView,
            style: titleStyle,
            onMouseEnter: (e: React.MouseEvent<HTMLElement>) => {
                e.currentTarget.style.textDecoration = 'underline';
            },
            onMouseLeave: (e: React.MouseEvent<HTMLElement>) => {
                e.currentTarget.style.textDecoration = 'none';
            }
        };

        if (level <= 5) {
            return React.createElement(`h${level + 1}` as keyof JSX.IntrinsicElements, titleProps, title);
        } else {
            return <strong {...titleProps}>{title}</strong>;
        }
    };

    // Don't render anything if it's a non-terminal node with no export content
    const shouldRenderContent = isTerminal || (htmlContent && htmlContent.trim().length > 0);

    return (
        <div ref={nodeRef} key={node.id}>
            {renderTitle()}
            {shouldRenderContent && (
                <>
                    {isVisible ? (
                        htmlContent && htmlContent.trim() ? (
                            <Box
                                sx={{
                                    color: theme.palette.text.primary,
                                    '& *': {
                                        color: `${theme.palette.text.primary} !important`,
                                        backgroundColor: 'transparent !important'
                                    },
                                    '& p, & div, & span, & h1, & h2, & h3, & h4, & h5, & h6': {
                                        color: `${theme.palette.text.primary} !important`
                                    },
                                    '& a': {
                                        color: `${theme.palette.primary.main} !important`
                                    },
                                    '& code': {
                                        backgroundColor: `${theme.palette.action.hover} !important`,
                                        color: `${theme.palette.text.primary} !important`
                                    },
                                    '& pre': {
                                        backgroundColor: `${theme.palette.action.hover} !important`,
                                        color: `${theme.palette.text.primary} !important`
                                    }
                                }}
                                dangerouslySetInnerHTML={{__html: htmlContent}}
                            />
                        ) : (
                            isTerminal && <Skeleton variant="text" width="100%" height={60}/>
                        )
                    ) : (
                        isTerminal && <Skeleton variant="text" width="100%" height={60}/>
                    )}
                </>
            )}
        </div>
    );
}

export default function LinearView() {
    const nodes: { node: NodeM; level: number; }[] = useAtomValue(linearNodeListAtom);
    const theme = useTheme();
    const currTree = useAtomValue(treeAtom);
    const treeM = currTree?.treeM;

    const getHtml = () => {
        if (!nodes || !treeM) return '';

        return nodes.map(({node}) => {
            try {
                const fullContent = EditorNodeTypeM.getEditorContent(node);
                const isTerminal = isTerminalNode(node, treeM);
                
                if (isTerminal) {
                    // Terminal node: if has export, show only export; otherwise show everything
                    if (hasExportContent(fullContent)) {
                        return extractExportContent(fullContent);
                    } else {
                        return fullContent;
                    }
                } else {
                    // Non-terminal node: show only export content if it exists
                    return extractExportContent(fullContent);
                }
            } catch (error) {
                console.warn('Error generating HTML for node:', error);
                return '';
            }
        }).filter(html => html.length > 0).join('\n\n');
    };

    if (!nodes || nodes.length === 0) return null;

    return <>
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            overflow: 'auto',
            backgroundColor: theme.palette.background.default,
        }}>
            <Paper
                elevation={1}
                data-testid="linear-view-paper"
                sx={{
                    maxWidth: '800px',
                    width: '100%',
                    margin: '10px',
                    padding: '10px',
                    borderRadius: 5,
                    backgroundColor: theme.palette.background.paper,
                    color: theme.palette.text.primary
                }}
            >
                <ButtonsSection getHtml={getHtml} rootNode={nodes[0].node} nodes={nodes}/>
                {treeM && nodes.map(({node, level}) => (
                    <NodeRenderer key={node.id} node={node} level={level} treeM={treeM}/>
                ))}
            </Paper>
        </div>
    </>
}