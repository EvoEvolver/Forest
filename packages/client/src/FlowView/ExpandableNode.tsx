import React, {memo, useState, useEffect, useRef} from 'react';
import {createPortal} from 'react-dom';
import {Handle, NodeProps, Position} from 'reactflow';
import {useAtomValue, useSetAtom} from 'jotai';
import {nodeStateAtom} from './nodeStateAtom';
import {Box, Card, CardContent, IconButton, Paper, Typography} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import {treeAtom} from "../TreeState/TreeState";
import {contentEditableContext} from '@forest/schema/src/viewContext';

const ExpandableNode = ({id, data}: NodeProps) => {
    const setNodeState = useSetAtom(nodeStateAtom(id));
    const [mouseInNode, setMouseInNode] = useState(false);
    const [mouseInPreview, setMouseInPreview] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const showTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [mousePosition, setMousePosition] = useState({x: 0, y: 0});

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
        setMousePosition({x: rect.right + 10, y: rect.top});
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

    const renderNodeContent = () => {
        try {
            return node.nodeType.render(node);
        } catch (error) {
            return <Typography color="error">Error rendering node
                content: {error?.message || 'Unknown error'}</Typography>;
        }
    };

    return (
        <>
            <Paper
                elevation={2}
                onClick={toggleCollapse}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                sx={{
                    p: 2,
                    border: '1px solid #e0e0e0',
                    borderRadius: 3,
                    background: 'linear-gradient(135deg, #fafafa 0%, #ffffff 100%)',
                    textAlign: 'center',
                    color: '#333',
                    minWidth: 140,
                    maxWidth: 220,
                    position: 'relative',
                    cursor: data.isExpandable ? 'pointer' : 'default',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                        elevation: 4,
                        borderColor: '#1976d2',
                        background: 'linear-gradient(135deg, #f5f5f5 0%, #ffffff 100%)'
                    }
                }}
            >
                <Handle
                    type="target"
                    position={Position.Left}
                    style={{
                        background: '#1976d2',
                        width: 10,
                        height: 10,
                        border: '2px solid #fff',
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
                            color: '#2c3e50',
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
                                background: data.isCollapsed ? '#e3f2fd' : '#1976d2',
                                color: data.isCollapsed ? '#1976d2' : '#fff',
                                border: '1px solid #1976d2',
                                borderRadius: '50%',
                                transition: 'all 0.2s ease',
                                '&:hover': {
                                    background: data.isCollapsed ? '#bbdefb' : '#1565c0',
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
                        background: '#1976d2',
                        width: 10,
                        height: 10,
                        border: '2px solid #fff',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}
                />
            </Paper>
            {showPreview && createPortal(
                <Card
                    onMouseEnter={handlePreviewMouseEnter}
                    onMouseLeave={handlePreviewMouseLeave}
                    sx={{
                        position: 'fixed',
                        left: mousePosition.x,
                        top: mousePosition.y,
                        maxWidth: 500,
                        maxHeight: 500,
                        overflow: 'auto',
                        boxShadow: 6,
                        border: '2px solid #1976d2',
                        borderRadius: 3,
                        backgroundColor: 'white',
                        zIndex: 10000,
                        transform: 'translateY(-50%)',
                    }}
                >
                    <CardContent sx={{p: 2}}>
                        <Typography variant="h6" gutterBottom sx={{color: '#1976d2', mb: 1}}>
                            {nodeTitle}
                        </Typography>
                        <Box sx={{maxHeight: 400, overflow: 'auto'}}>
                            <contentEditableContext.Provider value={false}>
                                {renderNodeContent()}
                            </contentEditableContext.Provider>
                        </Box>
                    </CardContent>
                </Card>,
                document.body
            )}
        </>
    );
};

export default memo(ExpandableNode);