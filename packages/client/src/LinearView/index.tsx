import React, {useEffect, useRef, useState} from 'react';
import {useAtomValue, useSetAtom} from "jotai";
import {jumpToNodeAtom, scrollToNodeAtom, selectedNodeAtom} from "../TreeState/TreeState";
import {Box, Button, IconButton, Paper, Skeleton, Tooltip} from '@mui/material';
import {NodeM} from '@forest/schema';
import {EditorNodeTypeM} from '@forest/node-type-editor/src';
import {currentPageAtom, userStudy} from "../appState";
import {useTheme} from '@mui/system';
import ReferenceGenButton from './ReferenceGenButton';
import ReferenceIndexButton from './ReferenceIndexButton';
import WordCountButton from './WordCountButton';
import {extractExportContent} from '@forest/node-type-editor/src/editor/Extensions/exportHelpers';
import CheckIcon from '@mui/icons-material/Check';
import TiptapEditor from '@forest/node-type-editor/src/editor';
import {LinearClickMenu} from "./linearClickMenu";
import {Breadcrumb} from "../TreeView/components/Breadcrumb";
import {handlePrint} from "./handlePrint";
import { thisNodeContext } from '../TreeView/NodeContext';


const getLinearNodeList = (rootNode: NodeM): Array<{ node: NodeM, level: number }> | undefined => {
    const treeM = rootNode.treeM;
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
}




// Memoized buttons component to prevent re-renders when node list updates
const ButtonsSection = ({rootNode, nodes}: {
    rootNode: NodeM,
    nodes: { node: NodeM; level: number; }[]
}) => {
    return (
        <Box sx={{display: 'flex', gap: 1, mb: 2}} data-testid="buttons-section">
            {!userStudy && <><ReferenceGenButton rootNode={rootNode} nodes={nodes}/>
            <ReferenceIndexButton nodes={nodes}/> </>}
                <Button
                    onClick={() => handlePrint(nodes, rootNode.title() || 'Document')}
                    size="small"
                    variant="outlined"
                    sx={{mb: 2}}
                >Export & Print</Button>
                <WordCountButton nodes={nodes} />
        </Box>
    );
}


// Helper function to check if content has export divs
export const hasExportContent = (htmlContent: string): boolean => {
    return extractExportContent(htmlContent).trim().length > 0;
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
    const [isMenuVisible, setIsMenuVisible] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [clickPosition, setClickPosition] = useState<{ x: number, y: number } | null>(null);
    const nodeRef = useRef<HTMLDivElement>(null);
    const theme = useTheme();

    const isTerminal = isTerminalNode(node, treeM);

    const handleContentClick = (e: React.MouseEvent) => {
        // Check if user is making a text selection
        const selection = window.getSelection();
        if (selection && selection.toString().length > 0) {
            // User has selected text, don't show menu
            return;
        }

        e.stopPropagation();

        // Get click position relative to viewport
        const clickX = e.clientX;
        const clickY = e.clientY;

        setClickPosition({x: clickX, y: clickY});
        setIsMenuVisible(!isMenuVisible);
    };

    // Function to refresh HTML content from the node
    const refreshHtmlContent = () => {
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
    };

    const handleToggleEdit = () => {
        // If we're exiting edit mode, refresh the HTML content
        if (isEditing) {
            refreshHtmlContent();
        }

        setIsEditing(!isEditing);
        setIsMenuVisible(false); // Hide menu when toggling edit
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

    // Click outside to close menu
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (nodeRef.current && !nodeRef.current.contains(event.target as Node)) {
                setIsMenuVisible(false);
            }
        };

        if (isMenuVisible) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isMenuVisible]);

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
            onClick: (e: React.MouseEvent<HTMLElement>) => {
                e.stopPropagation();
                
                // Get click position relative to viewport
                const clickX = e.clientX;
                const clickY = e.clientY;
                
                setClickPosition({x: clickX, y: clickY});
                setIsMenuVisible(!isMenuVisible);
            },
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
        <div
            ref={nodeRef}
            key={node.id}
            style={{position: 'relative'}}
            id={`node-${node.id}`}
        >
            {renderTitle()}
            {shouldRenderContent && (
                <>
                    {isVisible ? (
                        isEditing ? (
                            <Box sx={{
                                minHeight: '100px',
                                border: `1px solid ${theme.palette.divider}`,
                                borderRadius: 1,
                                position: 'relative',
                                backgroundColor: theme.palette.background.default
                            }}>
                                {/* Check button to exit edit mode */}
                                <Box sx={{
                                    position: 'absolute',
                                    top: 8,
                                    right: 8,
                                    zIndex: 10,
                                    backgroundColor: theme.palette.background.paper,
                                    borderRadius: '50%',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                }}>
                                    <Tooltip title="Save and exit edit mode">
                                        <IconButton
                                            size="small"
                                            onClick={handleToggleEdit}
                                            sx={{
                                                color: theme.palette.success.main,
                                                '&:hover': {
                                                    backgroundColor: theme.palette.success.light + '20'
                                                }
                                            }}
                                        >
                                            <CheckIcon fontSize="small"/>
                                        </IconButton>
                                    </Tooltip>
                                </Box>
                                <thisNodeContext.Provider value={node}>
                                    <Box sx={{p: 1}}>
                                        <TiptapEditor yXML={EditorNodeTypeM.getYxml(node)} nodeM={node}/>
                                    </Box>
                                </thisNodeContext.Provider>
                            </Box>
                        ) : (
                            htmlContent && htmlContent.trim() ? (
                                <Box
                                    onClick={handleContentClick}
                                    sx={{
                                        color: theme.palette.text.primary,
                                        userSelect: 'text',
                                        cursor: 'text',
                                        '&:hover': {
                                            backgroundColor: theme.palette.action.hover + '20'
                                        },
                                        '& *': {
                                            color: `${theme.palette.text.primary} !important`,
                                            backgroundColor: 'transparent !important',
                                            userSelect: 'text'
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
                                        },
                                        '& img': {
                                            maxWidth: '100%',
                                            height: 'auto'
                                        }
                                    }}
                                    dangerouslySetInnerHTML={{__html: htmlContent}}
                                />
                            ) : (
                                isTerminal && <Skeleton variant="text" width="100%" height={60}/>
                            )
                        )
                    ) : (
                        isTerminal && <Skeleton variant="text" width="100%" height={60}/>
                    )}
                </>
            )}
            <LinearClickMenu
                node={node}
                isVisible={isMenuVisible}
                isEditing={isEditing}
                onToggleEdit={handleToggleEdit}
                position={clickPosition}
            />
        </div>
    );
}

export default function LinearView() {
    const theme = useTheme();
    const selectedNode = useAtomValue(selectedNodeAtom);

    if (!selectedNode) return null;

    // Subscribe to view commit number to trigger re-renders when tree changes
    useAtomValue(selectedNode.treeVM.viewCommitNumberAtom);

    const treeM = selectedNode.nodeM.treeM;
    let nodes = getLinearNodeList(selectedNode.nodeM) || [];

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
                    color: theme.palette.text.primary,
                    '& h4, & h5, & h6': {
                        fontSize: 'inherit',
                        fontWeight: 'bold',
                        margin: 0,
                        padding: 0,
                        lineHeight: 'inherit'
                    }
                }}
            >
                <Breadcrumb/>
                <ButtonsSection rootNode={nodes[0].node} nodes={nodes}/>
                {treeM && nodes.map(({node, level}) => (
                    <NodeRenderer key={node.id} node={node} level={level} treeM={treeM}/>
                ))}
            </Paper>
        </div>
    </>
}