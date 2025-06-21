import React, {memo} from 'react';
import {Handle, NodeProps, Position} from 'reactflow';
import {useSetAtom} from 'jotai';
import {nodeStateAtom} from './nodeStateAtom';
import {Typography, IconButton, Paper, Box} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';

const ExpandableNode = ({id, data}: NodeProps) => {
    const setNodeState = useSetAtom(nodeStateAtom(id));

    const toggleCollapse = () => {
        setNodeState((prev) => ({...prev, isCollapsed: !prev.isCollapsed}));
    };

    return (
        <Paper
            elevation={4}
            sx={{
                p: 2,
                border: '2px solid #1976d2',
                borderRadius: 2,
                background: 'linear-gradient(135deg, #e3f2fd 0%, #ffffff 100%)',
                textAlign: 'center',
                color: 'black',
                minWidth: 180,
                maxWidth: 300,
                position: 'relative',
                boxShadow: 3,
                transition: 'box-shadow 0.2s',
                '&:hover': { boxShadow: 8 }
            }}
        >
            <Handle type="target" position={Position.Left} style={{background: '#1976d2'}} />
            <Box display="flex" alignItems="center" justifyContent="center" gap={1}>
                <Typography
                    variant="subtitle1"
                    fontWeight={600}
                    sx={{flexGrow: 1, color: '#1976d2'}}
                >
                    {data.label}
                </Typography>
                {data.isExpandable && (
                    <IconButton
                        size="small"
                        onClick={toggleCollapse}
                        color="primary"
                        sx={{
                            background: '#fff',
                            border: '1px solid #1976d2',
                            '&:hover': { background: '#e3f2fd' }
                        }}
                        aria-label={data.isCollapsed ? 'Expand' : 'Collapse'}
                    >
                        {data.isCollapsed ? <ExpandMoreIcon /> : <ExpandLessIcon />}
                    </IconButton>
                )}
            </Box>
            <Handle type="source" position={Position.Right} style={{background: '#1976d2'}} />
        </Paper>
    );
};

export default memo(ExpandableNode);