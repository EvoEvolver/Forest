import React, {memo} from 'react';
import {Handle, NodeProps, Position} from 'reactflow';
import {useAtomValue, useSetAtom} from 'jotai';
import {nodeStateAtom} from './nodeStateAtom';
import {Typography, IconButton, Paper, Box} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import {treeAtom} from "../TreeState/TreeState";

const ExpandableNode = ({id, data}: NodeProps) => {
    const setNodeState = useSetAtom(nodeStateAtom(id));

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

    return (
        <Paper
            elevation={4}
            onClick={toggleCollapse}
            sx={{
                p: 1,
                border: '2px solid #1976d2',
                borderRadius: 2,
                background: 'linear-gradient(135deg, #e3f2fd 0%, #ffffff 100%)',
                textAlign: 'center',
                color: 'black',
                minWidth: 100,
                maxWidth: 200,
                position: 'relative',
                boxShadow: 3,
                transition: 'box-shadow 0.2s',
                '&:hover': { boxShadow: 8 }
            }}
        >
            <Handle type="target" position={Position.Left} style={{background: '#1976d2'}} />
            <Box display="flex" alignItems="center" justifyContent="center" gap={1} >
                <Typography
                    variant="subtitle1"
                    fontWeight={600}
                    fontSize={9}
                    sx={{flexGrow: 1, color: '#1976d2'}}
                >
                    {nodeTitle}
                </Typography>
                {/*{data.isExpandable && (*/}
                {/*    <IconButton*/}
                {/*        size="small"*/}
                {/*        onClick={toggleCollapse}*/}
                {/*        color="primary"*/}
                {/*        sx={{*/}
                {/*            background: '#fff',*/}
                {/*            border: '1px solid #1976d2',*/}
                {/*            '&:hover': { background: '#e3f2fd' }*/}
                {/*        }}*/}
                {/*        aria-label={data.isCollapsed ? 'Expand' : 'Collapse'}*/}
                {/*    >*/}
                {/*        {data.isCollapsed ? <ExpandMoreIcon /> : <ExpandLessIcon />}*/}
                {/*    </IconButton>*/}
                {/*)}*/}
            </Box>
            <Handle type="source" position={Position.Right} style={{background: '#1976d2'}} />
        </Paper>
    );
};

export default memo(ExpandableNode);