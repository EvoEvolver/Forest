import React, {memo, useEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import {Handle, NodeProps, Position} from 'reactflow';
import {useAtomValue, useSetAtom} from 'jotai';
import {nodeStateAtom} from './nodeStateAtom';
import {Box, Card, CardContent, IconButton, Menu, MenuItem, Paper, Typography, useTheme} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import {jumpToNodeAtom, scrollToNodeAtom, treeAtom} from "../TreeState/TreeState";
import {NodePreview} from "./PreviewPage";
import {currentPageAtom} from "../appState";


const ExpandableNode = ({id, data}: NodeProps) => {
    const theme = useTheme();
    const setNodeState = useSetAtom(nodeStateAtom(id));
    const [mouseInNode, setMouseInNode] = useState(false);
    const [mouseInPreview, setMouseInPreview] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const showTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [mousePosition, setMousePosition] = useState({x: 0, y: 0});
    const [contextMenu, setContextMenu] = useState<null | { x: number; y: number }>(null);

    const toggleCollapse = () => {
        if (!data.isExpandable)
            return
        setNodeState((prev) => ({...prev, isCollapsed: !prev.isCollapsed}));
    };
    const tree = useAtomValue(treeAtom)
    const nodeDict = tree.nodeDict
    const nodeAtom = nodeDict[id]
    const node = useAtomValue(nodeAtom)
    const nodeTitle = useAtomValue(node.title)

    const setCurrentPage = useSetAtom(currentPageAtom);
    const jumpToNode = useSetAtom(jumpToNodeAtom);
    const scrollToNode = useSetAtom(scrollToNodeAtom)
    const goToNodeInTreeView = () => {
        setCurrentPage("tree");
        setTimeout(() => {
            jumpToNode(node.id);
            setTimeout(() => {
                scrollToNode(node.id);
            }, 100)
        }, 300);

    };


    // Effect to manage preview visibility based on mouse states
    useEffect(() => {
        if (mouseInNode && !showPreview) {
            // Clear any pending hide timeout
            if (hideTimeoutRef.current) {
                clearTimeout(hideTimeoutRef.current);
                hideTimeoutRef.current = null;
            }
            // Show preview after delay when mouse enters node
            showTimeoutRef.current = setTimeout(() => {
                setShowPreview(true);
            }, 200);
        } else if (!mouseInNode && !mouseInPreview && showPreview) {
            // Clear any pending show timeout
            if (showTimeoutRef.current) {
                clearTimeout(showTimeoutRef.current);
                showTimeoutRef.current = null;
            }
            // Hide preview after delay when mouse leaves both node and preview
            hideTimeoutRef.current = setTimeout(() => {
                setShowPreview(false);
            }, 200);
        } else if ((mouseInNode || mouseInPreview) && hideTimeoutRef.current) {
            // Cancel hide timeout if mouse re-enters either area
            clearTimeout(hideTimeoutRef.current);
            hideTimeoutRef.current = null;
        }

        // Cleanup timeouts on unmount
        return () => {
            if (showTimeoutRef.current) {
                clearTimeout(showTimeoutRef.current);
                showTimeoutRef.current = null;
            }
            if (hideTimeoutRef.current) {
                clearTimeout(hideTimeoutRef.current);
                hideTimeoutRef.current = null;
            }
        };
    }, [mouseInNode, mouseInPreview, showPreview]);

    const handleMouseEnter = (event: React.MouseEvent<HTMLElement>) => {
        const rect = event.currentTarget.getBoundingClientRect();
        setMousePosition({x: rect.left, y: rect.top});
        setMouseInNode(true);
    };

    const handleMouseLeave = () => {
        setMouseInNode(false);
    };

    const handlePreviewMouseEnter = () => {
        setMouseInPreview(true);
    };

    const handlePreviewMouseLeave = () => {
        setMouseInPreview(false);
    };

    const handleContextMenu = (event: React.MouseEvent) => {
        event.preventDefault();
        setContextMenu(
            contextMenu === null
                ? {x: event.clientX + 2, y: event.clientY - 6}
                : null
        );
    };

    const handleCloseContextMenu = () => {
        setContextMenu(null);
    };

    const handleGoToTreeView = () => {
        goToNodeInTreeView()
        handleCloseContextMenu();
    };


    return (
        <>
            {showPreview && createPortal(
                <Card
                    onMouseEnter={handlePreviewMouseEnter}
                    onMouseLeave={handlePreviewMouseLeave}
                    sx={{
                        position: 'fixed',
                        left: 20,
                        top: "50vh",
                        maxWidth: 500,
                        maxHeight: 500,
                        overflow: 'auto',
                        boxShadow: 6,
                        border: `2px solid ${theme.palette.primary.main}`,
                        borderRadius: 3,
                        backgroundColor: theme.palette.background.paper,
                        zIndex: 10000,
                        transform: 'translateY(-50%)',
                    }}
                >
                    <CardContent sx={{p: 2}}>
                        <NodePreview node={node}/>
                    </CardContent>
                </Card>,
                document.body
            )}
            <Paper
                elevation={2}
                onClick={toggleCollapse}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                onContextMenu={handleContextMenu}
                sx={{
                    p: 2,
                    border: `1px solid ${theme.palette.divider}`,
                    borderRadius: 3,
                    backgroundColor: theme.palette.background.paper,
                    textAlign: 'center',
                    color: theme.palette.text.primary,
                    minWidth: 140,
                    maxWidth: 220,
                    position: 'relative',
                    cursor: data.isExpandable ? 'pointer' : 'default',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                        elevation: 4,
                        borderColor: theme.palette.primary.main,
                        backgroundColor: theme.palette.action.hover
                    }
                }}
            >
                <Handle
                    type="target"
                    position={Position.Left}
                    style={{
                        background: theme.palette.primary.main,
                        width: 10,
                        height: 10,
                        border: `2px solid ${theme.palette.background.paper}`,
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}
                />
                <Box display="flex" alignItems="center" justifyContent="space-between" gap={1}>
                    <Typography
                        variant="body1"
                        fontWeight={500}
                        fontSize={12}
                        sx={{
                            flexGrow: 1,
                            color: theme.palette.text.primary,
                            lineHeight: 1.3,
                            textAlign: 'left',
                            wordBreak: 'break-word'
                        }}
                    >
                        {nodeTitle}
                    </Typography>
                    {data.isExpandable && (
                        <IconButton
                            size="small"
                            onClick={(e) => {
                                e.stopPropagation();
                                toggleCollapse();
                            }}
                            sx={{
                                width: 24,
                                height: 24,
                                background: data.isCollapsed ? theme.palette.primary.light : theme.palette.primary.main,
                                color: data.isCollapsed ? theme.palette.primary.main : theme.palette.primary.contrastText,
                                border: `1px solid ${theme.palette.primary.main}`,
                                borderRadius: '50%',
                                transition: 'all 0.2s ease',
                                '&:hover': {
                                    background: data.isCollapsed ? theme.palette.primary.light : theme.palette.primary.dark,
                                    transform: 'scale(1.1)'
                                }
                            }}
                            aria-label={data.isCollapsed ? 'Expand' : 'Collapse'}
                        >
                            {data.isCollapsed ? <ExpandMoreIcon fontSize="small"/> : <ExpandLessIcon fontSize="small"/>}
                        </IconButton>
                    )}
                </Box>
                <Handle
                    type="source"
                    position={Position.Right}
                    style={{
                        background: theme.palette.primary.main,
                        width: 10,
                        height: 10,
                        border: `2px solid ${theme.palette.background.paper}`,
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}
                />
            </Paper>
            <Menu
                open={contextMenu !== null}
                onClose={handleCloseContextMenu}
                anchorReference="anchorPosition"
                anchorPosition={
                    contextMenu !== null
                        ? {top: contextMenu.y, left: contextMenu.x}
                        : undefined
                }
            >
                <MenuItem onClick={handleGoToTreeView}>
                    Go to Tree View
                </MenuItem>
            </Menu>
        </>
    );
};

export default memo(ExpandableNode);