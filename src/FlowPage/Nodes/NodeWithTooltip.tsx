import React, { memo, useState, useEffect, useRef } from 'react';
import { Handle, Position, NodeToolbar, Node } from 'reactflow';
import { Box, Paper, Button, IconButton, Typography } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

const ResponsiveTypography = ({ label }) => {
    const [fontSize, setFontSize] = useState(20); // Initial font size
    const textRef = useRef(null);
  
    const adjustFontSize = () => {
      const textEl = textRef.current;
      if (!textEl) return;
  
      let currentFontSize = fontSize;
      while ((textEl.scrollWidth > 100 || textEl.scrollHeight > 30) && currentFontSize > 5) {
        // Reducing font size until text fits or reaches min size (5px here)
        currentFontSize--;
        textEl.style.fontSize = `${currentFontSize}px`;
      }
  
      if (currentFontSize !== fontSize) {
        setFontSize(currentFontSize);
      }
    };
  
    useEffect(() => {
      adjustFontSize();
    }, [label]); // Rerun effect when label changes
  
    return (
      <div style={{ height: 30, width: 100, textAlign: "center" }}>
        <Typography ref={textRef} style={{ fontSize: `${fontSize}px`, lineHeight: 'normal' }}>
          {label}
        </Typography>
      </div>
    );
  };


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
            <Box className={"nopan"} ref={nodeRef} onDoubleClick={() => setShowFocusPage(node)} style={{maxWidth: 200}}>
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
                    <ResponsiveTypography label= {data.label} />
                    {data.content && <ExpandMoreIcon style={{ position: 'absolute', right: '0', bottom: '0' }} />}
                </Box>
            </Box>

            <Handle type="target" position={targetPosition} />
            <Handle type="source" position={sourcePosition} />
        </>
    );
});
