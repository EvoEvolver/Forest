import React from 'react';
import type {SelectChangeEvent} from '@mui/material';
import {Avatar, Box, Chip, Divider, FormControl, MenuItem, Select, Stack, TextField, Typography,} from '@mui/material';
import {
    CalendarToday as CalendarIcon,
    Flag as PriorityIcon,
    Label as LabelIcon,
    Person as PersonIcon,
} from '@mui/icons-material';
import type {Issue, UpdateIssueRequest} from '../../types/Issue';
import type {User} from '../UserSelector';
import AssigneeManager from '../AssigneeManager';

interface IssueDetailSidebarProps {
    issue: Issue;
    isEditing: boolean;
    editData: UpdateIssueRequest;
    loading: boolean;
    onEditDataChange: (updates: Partial<UpdateIssueRequest>) => void;
    onAssigneesChange: (users: User[]) => void;
}

const IssueDetailSidebar: React.FC<IssueDetailSidebarProps> = ({
                                                                   issue,
                                                                   isEditing,
                                                                   editData,
                                                                   loading,
                                                                   onEditDataChange,
                                                                   onAssigneesChange,
                                                               }) => {
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'open':
                return '#1976d2';
            case 'in_progress':
                return '#ed6c02';
            case 'resolved':
                return '#2e7d32';
            case 'closed':
                return '#757575';
            default:
                return '#757575';
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'low':
                return '#2e7d32';
            case 'medium':
                return '#ed6c02';
            case 'high':
                return '#d32f2f';
            case 'urgent':
                return '#d32f2f';
            default:
                return '#ed6c02';
        }
    };

    const handleStatusChange = (event: SelectChangeEvent<string>) => {
        onEditDataChange({status: event.target.value as Issue['status']});
    };

    const handlePriorityChange = (event: SelectChangeEvent<string>) => {
        onEditDataChange({priority: event.target.value as Issue['priority']});
    };

    return (
        <Box
            sx={{
                bgcolor: '#f8f9fa',
                borderLeft: '1px solid #e1e4e8',
                p: 3,
                overflow: 'auto',
                width: '300px',
                flexShrink: 0,
            }}
        >
            {/* Status */}
            <Box sx={{mb: 3}}>
                <Typography variant="subtitle2" sx={{mb: 1, fontWeight: 600}}>
                    Status
                </Typography>
                {isEditing ? (
                    <FormControl fullWidth size="small">
                        <Select
                            value={editData.status || issue.status}
                            onChange={handleStatusChange}
                        >
                            <MenuItem value="open">🔵 Open</MenuItem>
                            <MenuItem value="in_progress">🟡 In Progress</MenuItem>
                            <MenuItem value="resolved">🟢 Resolved</MenuItem>
                            <MenuItem value="closed">⚫ Closed</MenuItem>
                        </Select>
                    </FormControl>
                ) : (
                    <Chip
                        label={issue.status.replace('_', ' ')}
                        sx={{
                            bgcolor: getStatusColor(issue.status) + '20',
                            color: getStatusColor(issue.status),
                            fontWeight: 500,
                        }}
                    />
                )}
            </Box>

            {/* Priority */}
            <Box sx={{mb: 3}}>
                <Typography variant="subtitle2"
                            sx={{mb: 1, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1}}>
                    <PriorityIcon fontSize="small"/>
                    Priority
                </Typography>
                {isEditing ? (
                    <FormControl fullWidth size="small">
                        <Select
                            value={editData.priority || issue.priority || 'medium'}
                            onChange={handlePriorityChange}
                        >
                            <MenuItem value="low">🟢 Low</MenuItem>
                            <MenuItem value="medium">🟡 Medium</MenuItem>
                            <MenuItem value="high">🟠 High</MenuItem>
                            <MenuItem value="urgent">🔴 Urgent</MenuItem>
                        </Select>
                    </FormControl>
                ) : (
                    <Chip
                        label={issue.priority || 'medium'}
                        sx={{
                            bgcolor: getPriorityColor(issue.priority || 'medium') + '20',
                            color: getPriorityColor(issue.priority || 'medium'),
                            fontWeight: 500,
                        }}
                    />
                )}
            </Box>

            {/* Due Date */}
            <Box sx={{mb: 3}}>
                <Typography variant="subtitle2"
                            sx={{mb: 1, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1}}>
                    <CalendarIcon fontSize="small"/>
                    Due Date & Time
                </Typography>
                {isEditing ? (
                    <TextField
                        fullWidth
                        type="datetime-local"
                        value={editData.dueDate || ''}
                        onChange={(e) => onEditDataChange({dueDate: e.target.value})}
                        variant="outlined"
                        size="small"
                        InputLabelProps={{
                            shrink: true,
                        }}
                    />
                ) : (
                    <Typography variant="body2" color="text.secondary">
                        {issue.dueDate ? new Date(issue.dueDate).toLocaleString() : 'No due date set'}
                    </Typography>
                )}
            </Box>

            {/* Tags */}
            <Box sx={{mb: 3}}>
                <Typography variant="subtitle2"
                            sx={{mb: 1, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1}}>
                    <LabelIcon fontSize="small"/>
                    Tags
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                    {issue.tags && issue.tags.length > 0 ? (
                        issue.tags.map((tag, index) => (
                            <Chip
                                key={index}
                                label={tag}
                                size="small"
                                sx={{
                                    bgcolor: '#e3f2fd',
                                    color: '#1976d2',
                                    mb: 0.5,
                                }}
                            />
                        ))
                    ) : (
                        <Typography variant="body2" color="text.secondary">
                            No tags
                        </Typography>
                    )}
                </Stack>
            </Box>

            {/* Assignees */}
            <AssigneeManager
                assignees={(issue.assignees || []).map(a => ({
                    userId: a.userId,
                    username: a.username || a.userId,
                    email: undefined,
                    avatar: null
                }))}
                onAssigneesChange={onAssigneesChange}
                editable={true}
                variant="detail"
                title="Assignees"
                disabled={loading}
            />

            <Divider sx={{my: 2}}/>

            {/* Creator */}
            <Box sx={{mb: 2}}>
                <Typography variant="subtitle2"
                            sx={{mb: 1, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1}}>
                    <PersonIcon fontSize="small"/>
                    Creator
                </Typography>
                <Box sx={{display: 'flex', alignItems: 'center', gap: 1}}>
                    <Avatar sx={{width: 24, height: 24}}>
                        <PersonIcon fontSize="small"/>
                    </Avatar>
                    <Typography variant="body2">
                        {issue.creator.username || issue.creator.userId}
                    </Typography>
                </Box>
            </Box>

            {/* Created Date */}
            <Box sx={{mb: 2}}>
                <Typography variant="subtitle2"
                            sx={{mb: 1, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1}}>
                    <CalendarIcon fontSize="small"/>
                    Created
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    {new Date(issue.createdAt).toLocaleString()}
                </Typography>
            </Box>

            {/* Updated Date */}
            <Box sx={{mb: 2}}>
                <Typography variant="subtitle2" sx={{mb: 1, fontWeight: 600}}>
                    Last Updated
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    {new Date(issue.updatedAt).toLocaleString()}
                </Typography>
            </Box>

            {/* Tree and Node Info */}
            <Box sx={{mb: 2}}>
                <Typography variant="subtitle2" sx={{mb: 1, fontWeight: 600}}>
                    Tree Information
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    <strong>Tree ID:</strong> {issue.treeId}
                </Typography>
                {issue.nodes && issue.nodes.length > 0 && (
                    <Typography variant="body2" color="text.secondary">
                        <strong>Nodes:</strong> {issue.nodes.map(n => n.nodeId).join(', ')}
                    </Typography>
                )}
            </Box>
        </Box>
    );
};

export default IssueDetailSidebar; 