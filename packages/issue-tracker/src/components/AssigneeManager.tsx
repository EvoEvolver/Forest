import React, {useEffect, useState} from 'react';
import {Avatar, Box, Chip, IconButton, Stack, Tooltip, Typography,} from '@mui/material';
import {Cancel as CancelIcon, Edit as EditIcon, Person as PersonIcon, Save as SaveIcon,} from '@mui/icons-material';
import UserSelector, {type User} from './UserSelector';

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
    const [editingAssignees, setEditingAssignees] = useState<User[]>([]);

    useEffect(() => {
        setEditingAssignees(assignees);
    }, [assignees]);

    const handleStartEdit = () => {
        setIsEditing(true);
        setEditingAssignees(assignees);
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        setEditingAssignees(assignees);
    };

    const handleSaveEdit = () => {
        if (onAssigneesChange) {
            onAssigneesChange(editingAssignees);
        }
        setIsEditing(false);
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
                <UserSelector
                    selectedUsers={editingAssignees}
                    onUsersChange={setEditingAssignees}
                    placeholder="Search and assign users..."
                    maxUsers={10}
                    disabled={disabled}
                />
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