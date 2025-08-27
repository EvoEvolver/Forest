import React, { useState } from 'react';
import { Button } from '@mui/material';
import { Article as ArticleIcon } from '@mui/icons-material';
import { NodeM } from '@forest/schema';
import LatexRenderer from './LatexRenderer';
import TemplateSelector from './TemplateSelector';

interface LatexButtonProps {
  getHtml: () => string;
  nodes: { node: NodeM; level: number; }[];
}

const LatexButton: React.FC<LatexButtonProps> = ({ getHtml, nodes }) => {
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [showLatexRenderer, setShowLatexRenderer] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');

  const handleClick = () => {
    setShowTemplateSelector(true);
  };

  const handleTemplateSelected = (templateName: string) => {
    setSelectedTemplate(templateName);
    setShowTemplateSelector(false);
    setShowLatexRenderer(true);
  };

  const handleClose = () => {
    setShowTemplateSelector(false);
    setShowLatexRenderer(false);
    setSelectedTemplate('');
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
      
      {showTemplateSelector && (
        <TemplateSelector
          onClose={handleClose}
          onTemplateSelected={handleTemplateSelected}
        />
      )}
      
      {showLatexRenderer && selectedTemplate && (
        <LatexRenderer
          content={getHtml()}
          nodes={nodes}
          selectedTemplate={selectedTemplate}
          onClose={handleClose}
        />
      )}
    </>
  );
};

export default LatexButton;