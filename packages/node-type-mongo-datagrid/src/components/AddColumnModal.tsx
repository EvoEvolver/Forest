import React, {useState} from 'react';
import {
    Alert,
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    InputLabel,
    MenuItem,
    Select,
    TextField,
    Typography
} from '@mui/material';

type FieldType = 'string' | 'number' | 'boolean' | 'date' | 'object' | 'array';

interface AddColumnModalProps {
    open: boolean;
    onClose: () => void;
    onSubmit: (fieldName: string, fieldType: FieldType, defaultValue: string) => void;
    existingFields: string[];
}

export const AddColumnModal: React.FC<AddColumnModalProps> = ({
                                                                  open,
                                                                  onClose,
                                                                  onSubmit,
                                                                  existingFields
                                                              }) => {
    const [fieldName, setFieldName] = useState('');
    const [fieldType, setFieldType] = useState<FieldType>('string');
    const [defaultValue, setDefaultValue] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = () => {
        setError('');

        // Validate field name
        if (!fieldName.trim()) {
            setError('Field name is required');
            return;
        }

        if (existingFields.includes(fieldName.trim())) {
            setError('Field name already exists');
            return;
        }

        // Validate field name format (basic MongoDB field name rules)
        const fieldNameRegex = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
        if (!fieldNameRegex.test(fieldName.trim())) {
            setError('Field name must start with a letter or underscore and contain only letters, numbers, and underscores');
            return;
        }

        // Validate default value based on type
        if (defaultValue.trim()) {
            try {
                switch (fieldType) {
                    case 'number':
                        if (isNaN(parseFloat(defaultValue))) {
                            setError('Default value must be a valid number');
                            return;
                        }
                        break;
                    case 'boolean':
                        if (!['true', 'false'].includes(defaultValue.toLowerCase())) {
                            setError('Default value must be "true" or "false"');
                            return;
                        }
                        break;
                    case 'date':
                        if (isNaN(Date.parse(defaultValue))) {
                            setError('Default value must be a valid date');
                            return;
                        }
                        break;
                    case 'object':
                    case 'array':
                        try {
                            JSON.parse(defaultValue);
                        } catch {
                            setError('Default value must be valid JSON');
                            return;
                        }
                        break;
                }
            } catch (e) {
                setError('Invalid default value');
                return;
            }
        }

        onSubmit(fieldName.trim(), fieldType, defaultValue.trim());
        handleClose();
    };

    const handleClose = () => {
        setFieldName('');
        setFieldType('string');
        setDefaultValue('');
        setError('');
        onClose();
    };

    const getDefaultValuePlaceholder = () => {
        switch (fieldType) {
            case 'string':
                return 'e.g., "default text"';
            case 'number':
                return 'e.g., 0, 42, 3.14';
            case 'boolean':
                return 'true or false';
            case 'date':
                return 'e.g., 2024-01-01T10:30:00Z';
            case 'object':
                return 'e.g., {"key": "value"}';
            case 'array':
                return 'e.g., [1, 2, 3] or ["a", "b"]';
            default:
                return '';
        }
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle>Add New Column</DialogTitle>
            <DialogContent>
                <Box sx={{mt: 1}}>
                    <TextField
                        fullWidth
                        margin="normal"
                        label="Field Name"
                        value={fieldName}
                        onChange={(e) => setFieldName(e.target.value)}
                        error={!!error && !fieldName.trim()}
                        helperText="Field name for the new column"
                    />

                    <FormControl fullWidth margin="normal">
                        <InputLabel>Field Type</InputLabel>
                        <Select
                            value={fieldType}
                            onChange={(e) => setFieldType(e.target.value as FieldType)}
                            label="Field Type"
                        >
                            <MenuItem value="string">String</MenuItem>
                            <MenuItem value="number">Number</MenuItem>
                            <MenuItem value="boolean">Boolean</MenuItem>
                            <MenuItem value="date">Date</MenuItem>
                            <MenuItem value="object">Object</MenuItem>
                            <MenuItem value="array">Array</MenuItem>
                        </Select>
                    </FormControl>

                    <TextField
                        fullWidth
                        margin="normal"
                        label="Default Value (Optional)"
                        value={defaultValue}
                        onChange={(e) => setDefaultValue(e.target.value)}
                        placeholder={getDefaultValuePlaceholder()}
                        helperText="Default value for existing documents (leave empty for null)"
                        multiline={fieldType === 'object' || fieldType === 'array'}
                        rows={fieldType === 'object' || fieldType === 'array' ? 3 : 1}
                    />

                    {error && (
                        <Alert severity="error" sx={{mt: 1}}>
                            {error}
                        </Alert>
                    )}

                    <Typography variant="body2" color="textSecondary" sx={{mt: 2}}>
                        This will add a new field to all documents in the collection.
                    </Typography>
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose}>Cancel</Button>
                <Button onClick={handleSubmit} variant="contained">
                    Add Column
                </Button>
            </DialogActions>
        </Dialog>
    );
};