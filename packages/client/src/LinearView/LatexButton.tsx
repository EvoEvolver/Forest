import React, { useState } from 'react';
import { Button } from '@mui/material';
import { Article as ArticleIcon } from '@mui/icons-material';
import { NodeM } from '@forest/schema';
import LatexRenderer from './LatexRenderer';

interface LatexButtonProps {
  getHtml: () => string;
  nodes: { node: NodeM; level: number; }[];
}

const LatexButton: React.FC<LatexButtonProps> = ({ getHtml, nodes }) => {
  const [showLatexRenderer, setShowLatexRenderer] = useState(false);

  const handleClick = () => {
    setShowLatexRenderer(true);
  };

  const handleClose = () => {
    setShowLatexRenderer(false);
  };

  return (
    <>
      <Button
        variant="outlined"
        startIcon={<ArticleIcon />}
        onClick={handleClick}
        size="small"
      >
        Generate LaTeX
      </Button>
      
      {showLatexRenderer && (
        <LatexRenderer
          content={getHtml()}
          nodes={nodes}
          onClose={handleClose}
        />
      )}
    </>
  );
};

export default LatexButton;