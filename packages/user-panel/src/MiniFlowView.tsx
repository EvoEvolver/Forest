import React from 'react';
import { Box, Paper, Typography } from '@mui/material';
import { SimpleTreeView } from '@mui/x-tree-view/SimpleTreeView';
import { TreeItem2 } from '@mui/x-tree-view/TreeItem2';
import { ChevronRight, ExpandMore } from '@mui/icons-material';
import { TreeJson } from '@forest/schema';

interface MiniFlowViewProps {
    treeData: TreeJson;
    width?: number;
    height?: number;
}

const MiniFlowView: React.FC<MiniFlowViewProps> = ({ 
    treeData, 
    width = 400, 
    height = 300 
}) => {
    const getAllNodeIds = (nodeId: string, ids: string[] = []): string[] => {
        const node = treeData.nodeDict[nodeId];
        if (!node) return ids;
        
        ids.push(node.id);
        if (node.children) {
            node.children.forEach(childId => getAllNodeIds(childId, ids));
        }
        return ids;
    };

    const buildTreeItems = (nodeId: string): React.ReactNode => {
        const node = treeData.nodeDict[nodeId];
        if (!node || !node.id) return null;

        const label = node.title || 'Untitled';
        const hasChildren = node.children && node.children.length > 0;

        return (
            <TreeItem2 
                key={node.id}
                itemId={node.id} 
                label={label}
            >
                {hasChildren && node.children
                    .filter(childId => childId && treeData.nodeDict[childId]?.id)
                    .map(childId => buildTreeItems(childId))}
            </TreeItem2>
        );
    };

    const nodeCount = Object.keys(treeData?.nodeDict || {}).length;

    if (!treeData || !treeData.nodeDict || !treeData.metadata?.rootId) {
        return (
            <Paper 
                elevation={8} 
                sx={{
                    width,
                    height,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#fafafa',
                    border: '1px solid #e0e0e0',
                }}
            >
                <Typography variant="body2" color="text.secondary">
                    No tree data available
                </Typography>
            </Paper>
        );
    }

    return (
        <Paper 
            elevation={8} 
            sx={{
                width,
                height,
                overflow: 'hidden',
                position: 'relative',
                backgroundColor: '#fafafa',
                border: '1px solid #e0e0e0',
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            {/* Title Bar */}
            <Box sx={{
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
                padding: '8px 12px',
                backdropFilter: 'blur(8px)',
                flexShrink: 0,
            }}>
                <Typography
                    variant="subtitle2"
                    sx={{
                        fontSize: '12px',
                        fontWeight: 600,
                        color: 'primary.main',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                    }}
                >
                    Tree Preview
                </Typography>
            </Box>
            
            {/* Tree View */}
            <Box sx={{ 
                flex: 1, 
                overflow: 'auto', 
                padding: '8px',
                '& .MuiTreeItem2-root': {
                    '& .MuiTreeItem2-content': {
                        padding: '4px 8px',
                        fontSize: '10px',
                        borderRadius: '4px',
                        '&:hover': {
                            backgroundColor: 'rgba(25, 118, 210, 0.08)',
                        },
                        '&.Mui-selected': {
                            backgroundColor: 'rgba(25, 118, 210, 0.12)',
                            '&:hover': {
                                backgroundColor: 'rgba(25, 118, 210, 0.16)',
                            },
                        },
                    },
                    '& .MuiTreeItem2-label': {
                        fontSize: '12px',
                    }
                },
            }}>
                <SimpleTreeView
                    defaultCollapseIcon={<ExpandMore />}
                    defaultExpandIcon={<ChevronRight />}
                    defaultExpandedItems={treeData.metadata?.rootId ? getAllNodeIds(treeData.metadata.rootId) : []}
                >
                    {buildTreeItems(treeData.metadata.rootId)}
                </SimpleTreeView>
            </Box>
            
            {/* Node Count Badge */}
            <Box
                sx={{
                    position: 'absolute',
                    bottom: 8,
                    right: 8,
                    backgroundColor: 'primary.main',
                    color: 'white',
                    padding: '4px 8px',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: 500,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                }}
            >
                <span style={{ fontSize: '9px' }}>●</span> {nodeCount} nodes
            </Box>
        </Paper>
    );
};

export default MiniFlowView;