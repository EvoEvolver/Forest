import React, { memo, useState, useEffect, useRef } from 'react';
import { Handle, Position, NodeToolbar, Node } from 'reactflow';
import { Box, Paper, Button, IconButton, Typography } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

export default memo((node: Node) => {
    const data = node.data;
    const setShowFocusPage = data.setShowFocusPage;

    const sourcePosition = node.sourcePosition || Position.Bottom;
    const targetPosition = node.targetPosition || Position.Top;
    const [toolTipVisible, setToolTipVisible] = useState(node.selected);
    const [showFullContent, setShowFullContent] = useState(false);
    const nodeRef = useRef(null);

    const handleClickOutside = (event) => {
        if (nodeRef.current && !nodeRef.current.contains(event.target)) {
            setToolTipVisible(false);
            setShowFullContent(false);
        }
    };

    useEffect(() => {
        document.addEventListener('click', handleClickOutside);
        return () => {
            document.removeEventListener('click', handleClickOutside);
        };
    }, []); // Add any dependencies that need to trigger the effect

    return (
        <>
            <Box ref={nodeRef} onDoubleClick={() => setShowFocusPage(node)}>
                {node.data.content && (
                    <NodeToolbar isVisible={toolTipVisible} position={'bottom'}>
                        <Paper elevation={3} sx={{ maxWidth: '28rem', padding: '5px' }}>
                            {(showFullContent && node.data.content) || node.data.content.substr(0, 50)}
                        </Paper>
                    </NodeToolbar>
                )}

                <Box
                    style={{ padding: '15px', border: 'solid 1px', boxSizing: 'content-box' }}
                    onClick={() => {
                        if (!toolTipVisible) {
                            setToolTipVisible(true);
                        }
                        else {
                            setShowFullContent(true);
                        }
                    }}
                >
                    <Typography>{data.label}</Typography>
                    {data.content && <ExpandMoreIcon style={{ position: 'absolute', right: '0', bottom: '0' }} />}
                </Box>
            </Box>

            <Handle type="target" position={targetPosition} />
            <Handle type="source" position={sourcePosition} />
        </>
    );
});
