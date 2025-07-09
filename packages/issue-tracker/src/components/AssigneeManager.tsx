import React, {useEffect, useState} from 'react';
import {Avatar, Box, Button, Chip, IconButton, Stack, TextField, Tooltip, Typography,} from '@mui/material';
import {Add as AddIcon, Cancel as CancelIcon, Edit as EditIcon, Person as PersonIcon, Save as SaveIcon,} from '@mui/icons-material';

interface User {
    userId: string;
    username: string;
    email?: string;
    avatar?: string | null;
}

interface AssigneeManagerProps {
    assignees: User[];
    onAssigneesChange?: (assignees: User[]) => void;
    editable?: boolean;
    variant?: 'list' | 'detail';
    maxDisplay?: number;
    showTitle?: boolean;
    title?: string;
    disabled?: boolean;
}

const AssigneeManager: React.FC<AssigneeManagerProps> = ({
                                                             assignees = [],
                                                             onAssigneesChange,
                                                             editable = false,
                                                             variant = 'detail',
                                                             maxDisplay = 3,
                                                             showTitle = true,
                                                             title = 'Assignees',
                                                             disabled = false,
                                                         }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editingAssignees, setEditingAssignees] = useState<string[]>([]);
    const [newAssignee, setNewAssignee] = useState('');

    useEffect(() => {
        setEditingAssignees(assignees.map(a => a.username || a.userId));
    }, [assignees]);

    const handleStartEdit = () => {
        setIsEditing(true);
        setEditingAssignees(assignees.map(a => a.username || a.userId));
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        setEditingAssignees(assignees.map(a => a.username || a.userId));
        setNewAssignee('');
    };

    const handleSaveEdit = () => {
        if (onAssigneesChange) {
            const assigneeUsers = editingAssignees.map(username => ({
                userId: username,
                username: username
            }));
            onAssigneesChange(assigneeUsers);
        }
        setIsEditing(false);
        setNewAssignee('');
    };

    const handleAddAssignee = () => {
        if (newAssignee.trim() && !editingAssignees.includes(newAssignee.trim())) {
            setEditingAssignees([...editingAssignees, newAssignee.trim()]);
            setNewAssignee('');
        }
    };

    const handleRemoveAssignee = (assigneeToRemove: string) => {
        setEditingAssignees(editingAssignees.filter(assignee => assignee !== assigneeToRemove));
    };

    const handleKeyPress = (event: React.KeyboardEvent) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            handleAddAssignee();
        }
    };

    const getUserDisplayName = (user: User) => {
        return user.username || user.userId;
    };

    // List variant - compact display for table rows
    if (variant === 'list') {
        return (
            <>
                {assignees.length > 0 ? (
                    <>
                        {assignees.slice(0, maxDisplay).map((assignee, index) => (
                            <Tooltip key={index} title={getUserDisplayName(assignee)}>
                                <Chip
                                    label={getUserDisplayName(assignee)}
                                    size="small"
                                    sx={{
                                        bgcolor: '#f3e5f5',
                                        color: '#7b1fa2',
                                        maxWidth: 80,
                                        '& .MuiChip-label': {
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                        }
                                    }}
                                />
                            </Tooltip>
                        ))}
                        {assignees.length > maxDisplay && (
                            <Chip
                                label={`+${assignees.length - maxDisplay}`}
                                size="small"
                                sx={{
                                    bgcolor: '#f5f5f5',
                                    color: '#666'
                                }}
                            />
                        )}
                    </>
                ) : (
                    <Chip
                        label="Unassigned"
                        size="small"
                        sx={{
                            color: '#000000',
                        }}
                    />
                )}
            </>
        );
    }

    // Detail variant - full display for detail pages
    return (
        <Box sx={{mb: 3}}>
            {showTitle && (
                <Box sx={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1}}>
                    <Typography
                        variant="subtitle2"
                        sx={{
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1
                        }}
                    >
                        <PersonIcon fontSize="small"/>
                        {title}
                    </Typography>
                    {editable && !disabled && !isEditing && (
                        <IconButton size="small" onClick={handleStartEdit}>
                            <EditIcon fontSize="small"/>
                        </IconButton>
                    )}
                    {isEditing && (
                        <Box sx={{display: 'flex', gap: 0.5}}>
                            <IconButton size="small" onClick={handleSaveEdit}>
                                <SaveIcon fontSize="small"/>
                            </IconButton>
                            <IconButton size="small" onClick={handleCancelEdit}>
                                <CancelIcon fontSize="small"/>
                            </IconButton>
                        </Box>
                    )}
                </Box>
            )}

            {isEditing ? (
                <Box>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{mb: 2}}>
                        <TextField
                            size="small"
                            placeholder="Add assignee"
                            value={newAssignee}
                            onChange={(e) => setNewAssignee(e.target.value)}
                            onKeyPress={handleKeyPress}
                            sx={{flexGrow: 1}}
                        />
                        <Button
                            variant="outlined"
                            size="small"
                            onClick={handleAddAssignee}
                            startIcon={<AddIcon/>}
                            disabled={!newAssignee.trim()}
                        >
                            Add
                        </Button>
                    </Stack>

                    {editingAssignees.length > 0 && (
                        <Box>
                            <Stack direction="row" spacing={1} flexWrap="wrap">
                                {editingAssignees.map((assignee, index) => (
                                    <Chip
                                        key={index}
                                        label={assignee}
                                        onDelete={() => handleRemoveAssignee(assignee)}
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
            ) : (
                <Stack spacing={1}>
                    {assignees.length > 0 ? (
                        assignees.map((assignee, index) => (
                            <Box key={index} sx={{display: 'flex', alignItems: 'center', gap: 1}}>
                                <Avatar sx={{width: 24, height: 24}}>
                                    {assignee.avatar ? (
                                        <img src={assignee.avatar} alt={getUserDisplayName(assignee)}/>
                                    ) : (
                                        <PersonIcon fontSize="small"/>
                                    )}
                                </Avatar>
                                <Typography variant="body2">
                                    {getUserDisplayName(assignee)}
                                </Typography>
                                {assignee.email && (
                                    <Typography variant="caption" color="text.secondary">
                                        ({assignee.email})
                                    </Typography>
                                )}
                            </Box>
                        ))
                    ) : (
                        <Chip
                            label="No assignees"
                            size="small"
                            color="default"
                            variant="outlined"
                            sx={{color: 'text.secondary'}}
                        />
                    )}
                </Stack>
            )}
        </Box>
    );
};

export default AssigneeManager; 