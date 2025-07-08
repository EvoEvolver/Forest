import React, {useState} from 'react';
import type {SelectChangeEvent} from '@mui/material';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  IconButton,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {Add as AddIcon, Close as CloseIcon,} from '@mui/icons-material';
import type {CreateIssueRequest} from '../../types/Issue.ts';
import UserSelector, {type User} from '../UserSelector.tsx';

interface CreateIssueDialogProps {
    open: boolean;
    onClose: () => void;
    onSubmit: (issueData: CreateIssueRequest) => Promise<void>;
    treeId: string;
    nodeId?: string;
}

const CreateIssueDialog: React.FC<CreateIssueDialogProps> = ({
                                                                 open,
                                                                 onClose,
                                                                 onSubmit,
                                                                 treeId,
                                                                 nodeId
                                                             }) => {
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
        dueDate: '',
        tags: [] as string[],
        newTag: '',
        assignees: [] as User[],
    });

    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({
        title: false,
        description: false,
    });

    const handleSubmit = async () => {
        // Check for required fields
        const newErrors = {
            title: !formData.title.trim(),
            description: !formData.description.trim(),
        };

        setErrors(newErrors);

        // If there are errors, don't submit
        if (newErrors.title || newErrors.description) {
            return;
        }

        setLoading(true);
        try {
            const issueData: CreateIssueRequest = {
                title: formData.title,
                description: formData.description,
                priority: formData.priority,
                dueDate: formData.dueDate || undefined,
                tags: formData.tags,
                assignees: formData.assignees.map(user => ({
                    userId: user.userId,
                    username: user.username
                })),
                nodes: nodeId ? [{nodeId}] : [],
            };

            await onSubmit(issueData);
            handleClose();
        } catch (error) {
            console.error('Failed to create issue:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setFormData({
            title: '',
            description: '',
            priority: 'medium',
            dueDate: '',
            tags: [],
            newTag: '',
            assignees: [],
        });
        onClose();
    };

    const handlePriorityChange = (event: SelectChangeEvent<string>) => {
        setFormData({...formData, priority: event.target.value as 'low' | 'medium' | 'high' | 'urgent'});
    };

    const handleAddTag = () => {
        if (formData.newTag.trim() && !formData.tags.includes(formData.newTag.trim())) {
            setFormData({
                ...formData,
                tags: [...formData.tags, formData.newTag.trim()],
                newTag: '',
            });
        }
    };

    const handleRemoveTag = (tagToRemove: string) => {
        setFormData({
            ...formData,
            tags: formData.tags.filter(tag => tag !== tagToRemove),
        });
    };

    const handleKeyPress = (event: React.KeyboardEvent) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            handleAddTag();
        }
    };

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            maxWidth="auto"
            PaperProps={{
                sx: {
                    borderRadius: 2,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                    height: '80vh',
                }
            }}
        >
            <DialogTitle
                sx={{
                    bgcolor: '#f6f8fa',
                    borderBottom: '1px solid #d1d9e0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    p: 3,
                }}
            >
                <Typography variant="h6" sx={{fontWeight: 600, color: '#24292f'}}>
                    Create a new issue
                </Typography>
                <IconButton onClick={handleClose} size="small">
                    <CloseIcon/>
                </IconButton>
            </DialogTitle>

            <DialogContent sx={{p: 0, height: '100%'}}>
                <Grid container spacing={0} sx={{height: '100%'}}>
                    {/* Main Content Area */}
                    <Grid item xs={12} md={9} sx={{overflow: 'auto'}}>
                        <Box sx={{p: 3}}>
                            {/* Title Section */}
                            <Box sx={{mb: 4}}>
                                <Typography variant="body2" sx={{mb: 1, fontWeight: 500, color: '#24292f'}}>
                                    Title *
                                </Typography>
                                <TextField
                                    fullWidth
                                    placeholder="Brief description of what you'd like to see added or changed"
                                    value={formData.title}
                                    onChange={(e) => {
                                        setFormData({...formData, title: e.target.value});
                                        if (e.target.value.trim() && errors.title) {
                                            setErrors({...errors, title: false});
                                        }
                                    }}
                                    variant="outlined"
                                    required
                                    error={errors.title}
                                    helperText={errors.title ? 'Title is required' : ''}
                                    sx={{
                                        '& .MuiOutlinedInput-root': {
                                            borderRadius: 1,
                                            '&:hover fieldset': {
                                                borderColor: '#1976d2',
                                            },
                                        },
                                    }}
                                />
                            </Box>

                            {/* Description Section */}
                            <Box sx={{mb: 4}}>
                                <Typography variant="body2" sx={{mb: 1, fontWeight: 500, color: '#24292f'}}>
                                    Description *
                                </Typography>
                                <TextField
                                    fullWidth
                                    multiline
                                    rows={8}
                                    placeholder="Add a more detailed description..."
                                    value={formData.description}
                                    onChange={(e) => {
                                        setFormData({...formData, description: e.target.value});
                                        if (e.target.value.trim() && errors.description) {
                                            setErrors({...errors, description: false});
                                        }
                                    }}
                                    variant="outlined"
                                    required
                                    error={errors.description}
                                    helperText={errors.description ? 'Description is required' : ''}
                                    sx={{
                                        '& .MuiOutlinedInput-root': {
                                            borderRadius: 1,
                                            '&:hover fieldset': {
                                                borderColor: '#1976d2',
                                            },
                                        },
                                    }}
                                />
                            </Box>

                            {/* Tags Section */}
                            <Box sx={{mb: 4}}>
                                <Typography variant="body2" sx={{mb: 1, fontWeight: 500, color: '#24292f'}}>
                                    Tags
                                </Typography>
                                <Stack direction="row" spacing={1} alignItems="center" sx={{mb: 2}}>
                                    <TextField
                                        size="small"
                                        placeholder="Add tag"
                                        value={formData.newTag}
                                        onChange={(e) => setFormData({...formData, newTag: e.target.value})}
                                        onKeyPress={handleKeyPress}
                                        sx={{flexGrow: 1}}
                                    />
                                    <Button
                                        variant="outlined"
                                        size="small"
                                        onClick={handleAddTag}
                                        startIcon={<AddIcon/>}
                                        disabled={!formData.newTag.trim()}
                                    >
                                        Add
                                    </Button>
                                </Stack>

                                {formData.tags.length > 0 && (
                                    <Box>
                                        <Stack direction="row" spacing={1} flexWrap="wrap">
                                            {formData.tags.map((tag, index) => (
                                                <Chip
                                                    key={index}
                                                    label={tag}
                                                    onDelete={() => handleRemoveTag(tag)}
                                                    size="small"
                                                    sx={{
                                                        bgcolor: '#e3f2fd',
                                                        color: '#1976d2',
                                                        '& .MuiChip-deleteIcon': {
                                                            color: '#1976d2',
                                                        },
                                                    }}
                                                />
                                            ))}
                                        </Stack>
                                    </Box>
                                )}
                            </Box>


                        </Box>
                    </Grid>

                    {/* Right Sidebar */}
                    <Grid item xs={12} md={3}>
                        <Box sx={{
                            p: 3,
                            bgcolor: '#f8f9fa',
                            height: '100%',
                            witdh: '100%',
                            borderLeft: '1px solid #e1e4e8'
                        }}>
                            {/* Priority Section */}
                            <Box sx={{mb: 4}}>
                                <Typography variant="body2" sx={{mb: 1, fontWeight: 500, color: '#24292f'}}>
                                    Priority
                                </Typography>
                                <FormControl fullWidth>
                                    <Select
                                        value={formData.priority}
                                        onChange={handlePriorityChange}
                                        variant="outlined"
                                        sx={{
                                            borderRadius: 1,
                                            '&:hover .MuiOutlinedInput-notchedOutline': {
                                                borderColor: '#1976d2',
                                            },
                                        }}
                                    >
                                        <MenuItem value="low">🟢 Low</MenuItem>
                                        <MenuItem value="medium">🟡 Medium</MenuItem>
                                        <MenuItem value="high">🟠 High</MenuItem>
                                        <MenuItem value="urgent">🔴 Urgent</MenuItem>
                                    </Select>
                                </FormControl>
                            </Box>

                            {/* Due Date Section */}
                            <Box sx={{mb: 4}}>
                                <Typography variant="body2" sx={{mb: 1, fontWeight: 500, color: '#24292f'}}>
                                    Due Date & Time
                                </Typography>
                                <TextField
                                    fullWidth
                                    type="datetime-local"
                                    value={formData.dueDate}
                                    onChange={(e) => setFormData({...formData, dueDate: e.target.value})}
                                    variant="outlined"
                                    InputLabelProps={{
                                        shrink: true,
                                    }}
                                    sx={{
                                        '& .MuiOutlinedInput-root': {
                                            borderRadius: 1,
                                            '&:hover .MuiOutlinedInput-notchedOutline': {
                                                borderColor: '#1976d2',
                                            },
                                        },
                                    }}
                                />
                            </Box>

                            {/* Assignees Section */}
                            <Box sx={{mb: 4}}>
                                <Typography variant="body2" sx={{mb: 1, fontWeight: 500, color: '#24292f'}}>
                                    Assignees
                                </Typography>
                                <UserSelector
                                    selectedUsers={formData.assignees}
                                    onUsersChange={(users) => setFormData({...formData, assignees: users})}
                                    placeholder="Search and assign users to this issue..."
                                    maxUsers={10}
                                />
                            </Box>

                            {/* Tree Info */}
                            <Box>
                                <Typography variant="body2" sx={{mb: 1, fontWeight: 500, color: '#24292f'}}>
                                    Tree Information
                                </Typography>
                                <Card variant="outlined" sx={{bgcolor: '#fff', borderColor: '#e1e4e8'}}>
                                    <CardContent sx={{py: 2, px: 3}}>
                                        <Typography variant="body2" color="text.secondary">
                                            <strong>Tree ID:</strong> {treeId}
                                            {nodeId && (
                                                <>
                                                    <br/>
                                                    <strong>Node ID:</strong> {nodeId}
                                                </>
                                            )}
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </Box>
                        </Box>
                    </Grid>
                </Grid>
            </DialogContent>

            <DialogActions
                sx={{
                    bgcolor: '#f6f8fa',
                    borderTop: '1px solid #d1d9e0',
                    p: 3,
                    justifyContent: 'flex-end',
                }}
            >
                <Button
                    onClick={handleClose}
                    variant="outlined"
                    sx={{
                        color: '#24292f',
                        borderColor: '#d1d9e0',
                        '&:hover': {
                            borderColor: '#1976d2',
                        },
                    }}
                >
                    Cancel
                </Button>
                <Button
                    onClick={handleSubmit}
                    variant="contained"
                    disabled={loading}
                    sx={{
                        bgcolor: '#1976d2',
                        '&:hover': {
                            bgcolor: '#1565c0',
                        },
                    }}
                >
                    {loading ? 'Creating...' : 'Create Issue'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default CreateIssueDialog; 