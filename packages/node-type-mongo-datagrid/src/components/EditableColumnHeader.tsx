import React, { useState } from 'react';
import {
  Box,
  Typography,
  IconButton,
  TextField,
} from '@mui/material';
import {
  Check as CheckIcon,
  Close as CloseIcon,
} from '@mui/icons-material';

interface EditableColumnHeaderProps {
  field: string;
  headerName: string;
  isEditing?: boolean;
  onStartEdit?: () => void;
  onRename?: (oldName: string, newName: string) => void;
  onCancelEdit?: () => void;
}

export const EditableColumnHeader: React.FC<EditableColumnHeaderProps> = ({
  field,
  headerName,
  isEditing = false,
  onRename,
  onCancelEdit
}) => {
  const [editValue, setEditValue] = useState(headerName);

  // Update editValue when headerName changes or editing starts
  React.useEffect(() => {
    if (isEditing) {
      setEditValue(headerName);
    }
  }, [isEditing, headerName]);

  const handleSaveEdit = () => {
    if (editValue.trim() && editValue !== headerName && onRename) {
      onRename(field, editValue.trim());
    }
    onCancelEdit?.();
  };

  const handleCancelEdit = () => {
    setEditValue(headerName);
    onCancelEdit?.();
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleSaveEdit();
    } else if (event.key === 'Escape') {
      handleCancelEdit();
    }
  };

  if (isEditing) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 0.5 }}>
        <TextField
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyPress}
          size="small"
          variant="standard"
          autoFocus
          sx={{ 
            flex: 1,
            '& .MuiInput-underline:before': {
              borderBottomColor: 'rgba(0, 0, 0, 0.12)',
            },
            '& .MuiInput-underline:hover:not(.Mui-disabled):before': {
              borderBottomColor: 'rgba(0, 0, 0, 0.87)',
            },
          }}
        />
        <IconButton size="small" onClick={handleSaveEdit} color="primary">
          <CheckIcon fontSize="small" />
        </IconButton>
        <IconButton size="small" onClick={handleCancelEdit}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>
    );
  }

  return (
    <Typography variant="inherit" sx={{ fontWeight: 'inherit' }}>
      {headerName}
    </Typography>
  );
};