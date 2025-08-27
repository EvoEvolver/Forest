import React, { useState, useEffect } from 'react';
import { Box, Paper, Typography, Button, CircularProgress, Alert, IconButton, Tabs, Tab, Card, CardContent, TextField, Select, MenuItem, FormControl, InputLabel, Chip } from '@mui/material';
import { Close as CloseIcon, Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { useTheme } from '@mui/system';
import { httpUrl } from '@forest/schema/src/config';
import { NodeM } from '@forest/schema';
import { EditorNodeTypeM } from '@forest/node-type-editor/src';

interface LatexRendererProps {
  content: string;
  onClose: () => void;
  nodes: { node: NodeM; level: number; }[];
}

interface TemplateField {
  name: string;
  type: 'string' | 'node' | 'recursive node' | 'list string' | 'list recursive node' | 'list node';
}

interface Template {
  name: string;
  fields: TemplateField[];
}

const LatexRenderer: React.FC<LatexRendererProps> = ({ content, onClose, nodes }) => {
  const [latexContent, setLatexContent] = useState<string>('');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [fieldValues, setFieldValues] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [step, setStep] = useState<'fields' | 'preview'>('fields'); // fields = input form, preview = rendered result
  const theme = useTheme();

  // Fetch available templates on component mount
  useEffect(() => {
    fetchTemplates();
  }, []);

  // Initialize field values when template changes
  useEffect(() => {
    if (selectedTemplate && templates.length > 0) {
      const template = templates.find(t => t.name === selectedTemplate);
      if (template) {
        initializeFieldValues(template.fields);
      }
    }
  }, [selectedTemplate, templates]);

  const fetchTemplates = async () => {
    try {
      const response = await fetch(`${httpUrl}/api/html2latex/templates`);
      const data = await response.json();
      
      if (data.success) {
        setTemplates(data.templates);
        if (data.templates.length > 0) {
          setSelectedTemplate(data.templates[0].name);
        }
      } else {
        setError('Failed to load templates');
      }
    } catch (err) {
      setError('Failed to connect to server');
      console.error('Template fetch error:', err);
    }
  };

  const initializeFieldValues = (fields: TemplateField[]) => {
    const initialValues: Record<string, any> = {};
    fields.forEach(field => {
      switch (field.type) {
        case 'string':
          initialValues[field.name] = '';
          break;
        case 'list string':
          initialValues[field.name] = [''];  // Start with one empty item
          break;
        case 'node':
        case 'recursive node':
          initialValues[field.name] = '';
          break;
        case 'list node':
        case 'list recursive node':
          initialValues[field.name] = [];   // Start with empty array
          break;
        default:
          initialValues[field.name] = '';
      }
    });
    setFieldValues(initialValues);
  };

  const generateLatex = async () => {
    if (!selectedTemplate) return;
    
    setLoading(true);
    setError('');
    
    try {
      // Convert field values to the format expected by server
      const processedFields = processFieldValues();
      
      // Get LaTeX from server
      const latexResponse = await fetch(`${httpUrl}/api/html2latex/transform`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          template: selectedTemplate,
          fields: processedFields,
        }),
      });
      
      const latexData = await latexResponse.json();
      
      if (latexData.success) {
        setLatexContent(latexData.latex);
        
        // Simply display the LaTeX source
        setStep('preview');
      } else {
        setError(latexData.error || 'Failed to generate document');
      }
    } catch (err) {
      setError('Failed to generate document');
      console.error('Generation error:', err);
    } finally {
      setLoading(false);
    }
  };

  const processFieldValues = () => {
    const processed: Record<string, any> = {};
    
    Object.entries(fieldValues).forEach(([fieldName, value]) => {
      if (value === null || value === undefined || value === '') return;
      
      const field = templates.find(t => t.name === selectedTemplate)?.fields.find(f => f.name === fieldName);
      if (!field) return;
      
      switch (field.type) {
        case 'node':
        case 'recursive node':
          if (typeof value === 'string' && value.trim() !== '') {
            const node = nodes?.find(n => n.node.id === value);
            if (node) {
              const nodeData: any = {
                node_id: node.node.id,
                title: node.node.title(),
                content: EditorNodeTypeM.getEditorContent(node.node),
              };
              
              if (field.type === 'recursive node') {
                nodeData.children = getNodeChildren(node.node);
              }
              
              processed[fieldName] = nodeData;
            }
          }
          break;
        case 'list node':
        case 'list recursive node':
          if (Array.isArray(value) && value.length > 0) {
            processed[fieldName] = value
              .filter((nodeId: string) => nodeId && nodeId.trim() !== '')
              .map((nodeId: string) => {
                const node = nodes?.find(n => n.node.id === nodeId);
                if (node) {
                  const nodeData: any = {
                    node_id: node.node.id,
                    title: node.node.title(),
                    content: EditorNodeTypeM.getEditorContent(node.node),
                  };
                  
                  if (field.type === 'list recursive node') {
                    nodeData.children = getNodeChildren(node.node);
                  }
                  
                  return nodeData;
                }
                return null;
              }).filter(Boolean);
          }
          break;
        case 'list string':
          if (Array.isArray(value)) {
            const filteredList = value.filter((item: string) => item && item.trim() !== '');
            if (filteredList.length > 0) {
              processed[fieldName] = filteredList;
            }
          }
          break;
        default:
          processed[fieldName] = value;
      }
    });
    
    return processed;
  };

  const getNodeChildren = (node: NodeM): any[] => {
    try {
      const children = node.children().toJSON();
      const childrenArray = Array.isArray(children) ? children : [];
      
      return childrenArray.map((childNode: any) => {
        const nodeData: any = {
          node_id: childNode.id,
          title: childNode.title(),
          content: EditorNodeTypeM.getEditorContent(childNode),
          children: getNodeChildren(childNode) // Recursive call for nested children
        };
        
        return nodeData;
      });
    } catch (error) {
      console.warn('Error getting node children:', error);
      return [];
    }
  };

  const updateFieldValue = (fieldName: string, value: any) => {
    setFieldValues(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  const addListItem = (fieldName: string) => {
    const field = templates.find(t => t.name === selectedTemplate)?.fields.find(f => f.name === fieldName);
    if (!field) return;

    setFieldValues(prev => {
      const currentValue = prev[fieldName] || [];
      const newItem = field.type === 'list string' ? '' : '';
      return {
        ...prev,
        [fieldName]: [...currentValue, newItem]
      };
    });
  };

  const removeListItem = (fieldName: string, index: number) => {
    setFieldValues(prev => {
      const currentValue = prev[fieldName] || [];
      return {
        ...prev,
        [fieldName]: currentValue.filter((_: any, i: number) => i !== index)
      };
    });
  };

  const updateListItem = (fieldName: string, index: number, value: any) => {
    setFieldValues(prev => {
      const currentValue = prev[fieldName] || [];
      const newValue = [...currentValue];
      newValue[index] = value;
      return {
        ...prev,
        [fieldName]: newValue
      };
    });
  };

  const renderField = (field: TemplateField) => {
    const value = fieldValues[field.name];

    switch (field.type) {
      case 'string':
        return (
          <TextField
            fullWidth
            label={field.name}
            value={value || ''}
            onChange={(e) => updateFieldValue(field.name, e.target.value)}
            variant="outlined"
            size="small"
          />
        );

      case 'list string':
        const listValue = Array.isArray(value) ? value : [];
        return (
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              {field.name}
            </Typography>
            {listValue.map((item: string, index: number) => (
              <Box key={index} sx={{ display: 'flex', gap: 1, mb: 1 }}>
                <TextField
                  fullWidth
                  value={item || ''}
                  onChange={(e) => updateListItem(field.name, index, e.target.value)}
                  size="small"
                  placeholder={`Enter ${field.name.slice(0, -1)}`}
                />
                <IconButton 
                  onClick={() => removeListItem(field.name, index)}
                  size="small"
                  color="error"
                >
                  <DeleteIcon />
                </IconButton>
              </Box>
            ))}
            <Button
              startIcon={<AddIcon />}
              onClick={() => addListItem(field.name)}
              size="small"
              variant="outlined"
            >
              Add {field.name.slice(0, -1) || 'Item'}
            </Button>
          </Box>
        );

      case 'node':
      case 'recursive node':
        return (
          <FormControl fullWidth size="small">
            <InputLabel>{field.name}</InputLabel>
            <Select
              value={value || ''}
              label={field.name}
              onChange={(e) => updateFieldValue(field.name, e.target.value)}
              MenuProps={{
                PaperProps: {
                  style: {
                    maxHeight: 300,
                    zIndex: 1400, // Higher than modal
                  },
                },
              }}
            >
              <MenuItem value="">
                <em>Select a node</em>
              </MenuItem>
              {nodes && nodes.length > 0 ? nodes.map((nodeItem) => (
                <MenuItem 
                  key={nodeItem.node.id} 
                  value={nodeItem.node.id}
                  sx={{ pl: 2 + nodeItem.level * 2 }} // Dynamic left padding based on level
                >
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    {nodeItem.level > 0 && (
                      <Box sx={{ mr: 1, color: 'text.secondary', fontSize: '0.8rem' }}>
                        {'└─ '}
                      </Box>
                    )}
                    {nodeItem.node.title()}
                  </Box>
                </MenuItem>
              )) : (
                <MenuItem disabled>
                  <em>No nodes available</em>
                </MenuItem>
              )}
            </Select>
            {nodes && (
              <Typography variant="caption" color="text.secondary">
                {nodes.length} nodes available
              </Typography>
            )}
          </FormControl>
        );

      case 'list node':
      case 'list recursive node':
        const listNodeValue = Array.isArray(value) ? value : [];
        return (
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              {field.name}
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1, minHeight: '32px' }}>
              {listNodeValue.map((nodeId: string, index: number) => {
                const nodeItem = nodes?.find(n => n.node.id === nodeId);
                return nodeItem ? (
                  <Chip
                    key={`${nodeId}-${index}`}
                    label={nodeItem.node.title()}
                    onDelete={() => removeListItem(field.name, index)}
                    size="small"
                  />
                ) : (
                  <Chip
                    key={`unknown-${index}`}
                    label="Unknown Node"
                    onDelete={() => removeListItem(field.name, index)}
                    size="small"
                    color="error"
                  />
                );
              })}
              {listNodeValue.length === 0 && (
                <Typography variant="caption" color="text.secondary">
                  No nodes selected
                </Typography>
              )}
            </Box>
            <FormControl fullWidth size="small">
              <InputLabel>Add {field.name.slice(0, -1) || 'node'}</InputLabel>
              <Select
                value=""
                label={`Add ${field.name.slice(0, -1) || 'node'}`}
                onChange={(e) => {
                  const nodeId = e.target.value;
                  if (nodeId && !listNodeValue.includes(nodeId)) {
                    updateFieldValue(field.name, [...listNodeValue, nodeId]);
                  }
                }}
                MenuProps={{
                  PaperProps: {
                    style: {
                      maxHeight: 300,
                      zIndex: 1400, // Higher than modal
                    },
                  },
                }}
              >
                <MenuItem value="">
                  <em>Select a node</em>
                </MenuItem>
                {nodes && nodes.length > 0 ? nodes.map((nodeItem) => (
                  <MenuItem 
                    key={nodeItem.node.id} 
                    value={nodeItem.node.id}
                    disabled={listNodeValue.includes(nodeItem.node.id)}
                    sx={{ pl: 2 + nodeItem.level * 2 }} // Dynamic left padding based on level
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      {nodeItem.level > 0 && (
                        <Box sx={{ mr: 1, color: 'text.secondary', fontSize: '0.8rem' }}>
                          {'└─ '}
                        </Box>
                      )}
                      {nodeItem.node.title()}
                    </Box>
                  </MenuItem>
                )) : (
                  <MenuItem disabled>
                    <em>No nodes available</em>
                  </MenuItem>
                )}
              </Select>
            </FormControl>
            {nodes && (
              <Typography variant="caption" color="text.secondary">
                {nodes.length} total nodes, {listNodeValue.length} selected
              </Typography>
            )}
          </Box>
        );

      default:
        return <Typography>Unknown field type: {field.type}</Typography>;
    }
  };

  // No manual LaTeX parsing needed - using react-latex-next!

  const downloadLatex = () => {
    const blob = new Blob([latexContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'document.tex';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  // Removed downloadHtml since we're not generating HTML anymore

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(latexContent);
      // Could add a success toast here
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const selectedTemplateData = templates.find(t => t.name === selectedTemplate);

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1300, // Lower than MUI's Modal default (1300) but high enough
        p: 2,
      }}
      onClick={onClose}
    >
      <Paper
        sx={{
          width: '90%',
          maxWidth: '1200px',
          height: '90%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: theme.palette.background.paper,
          position: 'relative',
          zIndex: 1301, // Slightly higher than backdrop
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            p: 2,
            borderBottom: 1,
            borderColor: 'divider',
          }}
        >
          <Typography variant="h6" component="h2">
            {step === 'fields' ? 'Configure Template Fields' : 'Document Preview'}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            {step === 'fields' && templates.length > 1 && (
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Template</InputLabel>
                <Select
                  value={selectedTemplate}
                  label="Template"
                  onChange={(e) => setSelectedTemplate(e.target.value)}
                  MenuProps={{
                    PaperProps: {
                      style: {
                        zIndex: 1400, // Higher than modal
                      },
                    },
                  }}
                >
                  {templates.map((template) => (
                    <MenuItem key={template.name} value={template.name}>
                      {template.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
            {step === 'preview' && latexContent && (
              <>
                <Button onClick={copyToClipboard} size="small" variant="contained">
                  Copy LaTeX
                </Button>
                <Button onClick={downloadLatex} size="small" variant="outlined">
                  Download .tex
                </Button>
                <Button 
                  onClick={() => setStep('fields')} 
                  size="small"
                  variant="outlined"
                >
                  Edit Fields
                </Button>
              </>
            )}
            <IconButton onClick={onClose}>
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>

        {/* Content */}
        <Box
          sx={{
            flex: 1,
            overflow: 'auto',
            p: 2,
          }}
        >
          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          )}
          
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
          {step === 'fields' && selectedTemplateData && !loading && (
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                Fill in the template fields below:
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {selectedTemplateData.fields.map((field) => (
                  <Card key={field.name} variant="outlined">
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        {field.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Type: {field.type}
                      </Typography>
                      {renderField(field)}
                    </CardContent>
                  </Card>
                ))}
              </Box>
              <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
                <Button
                  variant="contained"
                  size="large"
                  onClick={generateLatex}
                  disabled={!selectedTemplate || loading}
                >
                  Generate Document
                </Button>
              </Box>
            </Box>
          )}
          
          {step === 'preview' && latexContent && !loading && (
            <Box>
              <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="h6">
                  📄 LaTeX Document Generated
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Copy this LaTeX code to Overleaf or any LaTeX editor
                </Typography>
              </Box>
              
              <Box
                sx={{
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 1,
                  overflow: 'hidden',
                  backgroundColor: 'white',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                }}
              >
                <Box
                  sx={{
                    backgroundColor: theme.palette.primary.main,
                    color: 'white',
                    p: 1,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <Typography variant="subtitle2">
                    LaTeX Source Code
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button 
                      onClick={copyToClipboard} 
                      size="small"
                      variant="contained"
                      sx={{ 
                        backgroundColor: 'rgba(255,255,255,0.2)',
                        '&:hover': { backgroundColor: 'rgba(255,255,255,0.3)' }
                      }}
                    >
                      Copy All
                    </Button>
                    <Button 
                      onClick={downloadLatex} 
                      size="small"
                      variant="contained"
                      sx={{ 
                        backgroundColor: 'rgba(255,255,255,0.2)',
                        '&:hover': { backgroundColor: 'rgba(255,255,255,0.3)' }
                      }}
                    >
                      Download .tex
                    </Button>
                  </Box>
                </Box>
                
                <Box
                  component="pre"
                  sx={{
                    backgroundColor: '#f8f9fa',
                    p: 3,
                    margin: 0,
                    overflow: 'auto',
                    fontFamily: '"Fira Code", "Monaco", "Menlo", monospace',
                    fontSize: '0.875rem',
                    lineHeight: 1.5,
                    color: '#2d3748',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    maxHeight: '60vh',
                    '&::-webkit-scrollbar': {
                      width: '8px',
                    },
                    '&::-webkit-scrollbar-track': {
                      backgroundColor: '#f1f1f1',
                    },
                    '&::-webkit-scrollbar-thumb': {
                      backgroundColor: '#c1c1c1',
                      borderRadius: '4px',
                    },
                    '&::-webkit-scrollbar-thumb:hover': {
                      backgroundColor: '#a8a8a8',
                    },
                  }}
                >
                  {latexContent}
                </Box>
              </Box>
              
              <Box sx={{ mt: 2, p: 2, backgroundColor: '#e3f2fd', borderRadius: 1 }}>
                <Typography variant="body2" color="primary">
                  💡 <strong>Next Steps:</strong> Copy the LaTeX code above and paste it into{' '}
                  <a href="https://www.overleaf.com" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit' }}>
                    Overleaf
                  </a>{' '}
                  or your preferred LaTeX editor to compile and view the PDF.
                </Typography>
              </Box>
            </Box>
          )}
        </Box>
      </Paper>
    </Box>
  );
};

export default LatexRenderer;