import React, { memo, useState, useEffect, useRef } from 'react';
import { Handle, Position, NodeToolbar, Node, NodeProps } from 'reactflow';
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


function NodeWithToolTip(node: NodeProps) {
  const data = node.data;
  const setShowFocusPage = data.setShowFocusPage;

  const sourcePosition = node.sourcePosition || Position.Bottom;
  const targetPosition = node.targetPosition || Position.Top;
  const nodeRef = useRef(null);

  const handleClickOutside = (event) => {
    if (nodeRef.current && !nodeRef.current.contains(event.target)) {
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
      <Box className={"nopan"} ref={nodeRef} onDoubleClick={() => setShowFocusPage(true)} style={{ maxWidth: 200 }}>
        <Box
          style={{ padding: '10px', border: 'solid 2px', boxSizing: 'content-box' }}
        >
          <ResponsiveTypography label={data.label} />
        </Box>
      </Box>

      <Handle type="target" position={targetPosition} />
      <Handle type="source" position={sourcePosition} />
    </>
  );
};


export default NodeWithToolTip;