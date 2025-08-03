import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch
} from '@mui/material';
import { MongoDocument } from '../components/MongoDataGridEditor';
import { getFieldTypeFromSchema } from '../utils/fieldTypeDetection';

interface AddRowModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (document: Partial<MongoDocument>) => void;
  existingDocuments: MongoDocument[];
  schema?: Record<string, string>;
}

export const AddRowModal: React.FC<AddRowModalProps> = ({
  open,
  onClose,
  onSubmit,
  existingDocuments,
  schema
}) => {
  const [formData, setFormData] = useState<Record<string, string>>({});

  // Get all unique field names from existing documents and schema
  const allFields = React.useMemo(() => {
    const fieldSet = new Set<string>();
    
    // Add fields from schema
    if (schema) {
      Object.keys(schema).forEach(field => fieldSet.add(field));
    }
    
    // Add fields from existing documents
    existingDocuments.forEach(doc => {
      Object.keys(doc).forEach(field => {
        if (field !== '_id') { // Skip _id as it's auto-generated
          fieldSet.add(field);
        }
      });
    });
    
    return Array.from(fieldSet).sort();
  }, [existingDocuments, schema]);

  const getFieldType = (fieldName: string): string => {
    if (schema && schema[fieldName]) {
      return schema[fieldName];
    }
    
    // Infer from existing documents
    for (const doc of existingDocuments) {
      const value = doc[fieldName];
      if (value !== null && value !== undefined) {
        if (typeof value === 'number') return 'number';
        if (typeof value === 'boolean') return 'boolean';
        if (value instanceof Date) return 'date';
        return 'string';
      }
    }
    return 'string';
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = () => {
    const newDocument: Partial<MongoDocument> = {};
    
    // Convert form data to appropriate types
    Object.entries(formData).forEach(([field, value]) => {
      if (value.trim() !== '') {
        const fieldType = getFieldTypeFromSchema(field, existingDocuments, schema);
        switch (fieldType) {
          case 'number':
            const num = parseFloat(value);
            newDocument[field] = isNaN(num) ? 0 : num;
            break;
          case 'boolean':
            newDocument[field] = value.toLowerCase() === 'true';
            break;
          case 'date':
            newDocument[field] = new Date(value);
            break;
          default:
            newDocument[field] = value;
        }
      }
    });

    onSubmit(newDocument);
    setFormData({});
    onClose();
  };

  const handleClose = () => {
    setFormData({});
    onClose();
  };

  const renderFieldInput = (field: string) => {
    const fieldType = getFieldTypeFromSchema(field, existingDocuments, schema);
    const value = formData[field] || '';

    switch (fieldType) {
      case 'boolean':
        return (
          <FormControl fullWidth margin="normal" key={field}>
            <InputLabel>{field}</InputLabel>
            <Select
              value={value}
              onChange={(e) => handleInputChange(field, e.target.value)}
              label={field}
            >
              <MenuItem value="true">true</MenuItem>
              <MenuItem value="false">false</MenuItem>
            </Select>
          </FormControl>
        );
      case 'date':
        return (
          <TextField
            key={field}
            fullWidth
            margin="normal"
            label={field}
            type="datetime-local"
            value={value}
            onChange={(e) => handleInputChange(field, e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
        );
      case 'number':
        return (
          <TextField
            key={field}
            fullWidth
            margin="normal"
            label={field}
            type="number"
            value={value}
            onChange={(e) => handleInputChange(field, e.target.value)}
          />
        );
      default:
        return (
          <TextField
            key={field}
            fullWidth
            margin="normal"
            label={field}
            value={value}
            onChange={(e) => handleInputChange(field, e.target.value)}
            multiline={fieldType === 'object' || fieldType === 'array'}
            rows={fieldType === 'object' || fieldType === 'array' ? 3 : 1}
          />
        );
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Add New Row</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 1 }}>
          {allFields.length === 0 ? (
            <Typography color="textSecondary">
              No fields available. Add some columns first or insert a document with fields.
            </Typography>
          ) : (
            allFields.map(field => renderFieldInput(field))
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained"
          disabled={allFields.length === 0}
        >
          Add Row
        </Button>
      </DialogActions>
    </Dialog>
  );
};