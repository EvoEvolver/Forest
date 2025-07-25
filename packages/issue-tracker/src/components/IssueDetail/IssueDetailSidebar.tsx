import React, {useEffect, useState} from 'react';
import type {SelectChangeEvent} from '@mui/material';
import {
    Avatar,
    Box,
    Button,
    Chip,
    Divider,
    FormControl,
    IconButton,
    MenuItem,
    Select,
    Stack,
    TextField,
    Typography
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import {
    AccountTree as TreeIcon,
    Add as AddIcon,
    CalendarToday as CalendarIcon,
    Close as CloseIcon,
    Flag as PriorityIcon,
    Label as LabelIcon,
    Launch as LaunchIcon,
    Person as PersonIcon,
} from '@mui/icons-material';
import type {Issue, UpdateIssueRequest} from '../../types/Issue';
import AssigneeManager from '../AssigneeManager';
import {getUserMetadata} from "@forest/user-system/src/userMetadata";
import {useTheme} from "@mui/system";

interface IssueDetailSidebarProps {
    issue: Issue;
    isEditing: boolean;
    editData: UpdateIssueRequest;
    loading: boolean;
    onEditDataChange: (updates: Partial<UpdateIssueRequest>) => void;
    isCreatingNew?: boolean; // Add this prop to know if we're creating a new issue
}

const IssueDetailSidebar: React.FC<IssueDetailSidebarProps> = ({
                                                                   issue,
                                                                   isEditing,
                                                                   editData,
                                                                   loading,
                                                                   onEditDataChange,
                                                                   isCreatingNew = false,
                                                               }) => {
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'open':
                return '#1976d2';
            case 'in_progress':
                return '#ed6c02';
            case 'in_review':
                return '#673ab7';
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

    const [newTag, setNewTag] = useState('');
    const [editingTagIndex, setEditingTagIndex] = useState<number | null>(null);
    const [editingTagValue, setEditingTagValue] = useState('');
    const theme = useTheme()

    const handleAddTag = () => {
        if (newTag.trim() && !editData.tags?.includes(newTag.trim())) {
            const updatedTags = [...(editData.tags || []), newTag.trim()];
            onEditDataChange({tags: updatedTags});
            setNewTag('');
        }
    };

    const handleRemoveTag = (index: number) => {
        const updatedTags = [...(editData.tags || [])];
        updatedTags.splice(index, 1);
        onEditDataChange({tags: updatedTags});
    };

    const handleStartEditTag = (index: number, tag: string) => {
        setEditingTagIndex(index);
        setEditingTagValue(tag);
    };

    const handleSaveEditTag = () => {
        if (editingTagValue.trim() && editingTagIndex !== null) {
            const updatedTags = [...(editData.tags || [])];
            updatedTags[editingTagIndex] = editingTagValue.trim();
            onEditDataChange({tags: updatedTags});
            setEditingTagIndex(null);
            setEditingTagValue('');
        }
    };

    const handleCancelEditTag = () => {
        setEditingTagIndex(null);
        setEditingTagValue('');
    };

    const handleKeyPress = (event: React.KeyboardEvent) => {
        if (event.key === 'Enter') {
            handleAddTag();
        }
    };

    const handleEditTagKeyPress = (event: React.KeyboardEvent) => {
        if (event.key === 'Enter') {
            handleSaveEditTag();
        } else if (event.key === 'Escape') {
            handleCancelEditTag();
        }
    };

    const [creatorInfo, setCreatorInfo] = useState<{ username: string, avatar?: string }>({
        username: issue.creator.username || issue.creator.userId,
        avatar: undefined
    });

    // Fetch creator information
    useEffect(() => {
        async function fetchCreatorInfo() {
            try {
                console.log("Fetching creator info for user", issue.creator.userId);
                const userMeta = await getUserMetadata(issue.creator.userId);
                console.log("User metadata for creator", userMeta);
                setCreatorInfo({
                    username: userMeta.username,
                    avatar: userMeta.avatar
                });

            } catch (error) {
                console.error('Failed to fetch creator info:', error);
                setCreatorInfo({
                    username: issue.creator.username || issue.creator.userId,
                    avatar: undefined
                });
            }
        }

        fetchCreatorInfo();
    }, [issue.creator.userId, issue.creator.username]);

    // Function to navigate to a specific node
    const handleGoToNode = (nodeId: string) => {
        // Get current base URL
        const getBaseUrl = () => {
            return `${window.location.protocol}//${window.location.hostname}:${window.location.port}`;
        };

        const baseUrl = getBaseUrl();
        const nodeUrl = `${baseUrl}/?id=${issue.treeId}&n=${nodeId}`;

        // Navigate to the node URL
        window.location.href = nodeUrl;
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
                            <MenuItem value="in_progress">🟠 In Progress</MenuItem>
                            <MenuItem value="in_review">🟣 In Review</MenuItem>
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
                    <LocalizationProvider dateAdapter={AdapterDateFns}>
                        <DatePicker
                            value={editData.dueDate ? new Date(editData.dueDate) : null}
                            onChange={(date) => onEditDataChange({dueDate: date ? date.toISOString().split('T')[0] + 'T23:59:00' : ''})}
                            slotProps={{
                                textField: {
                                    fullWidth: true,
                                    size: 'small',
                                    variant: 'outlined'
                                }
                            }}
                        />
                    </LocalizationProvider>
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

                {isEditing ? (
                    <>
                        {/* Add new tag */}
                        <Box sx={{display: 'flex', gap: 1, mb: 2}}>
                            <TextField
                                size="small"
                                placeholder="Add tag..."
                                value={newTag}
                                onChange={(e) => setNewTag(e.target.value)}
                                onKeyPress={handleKeyPress}
                                sx={{flex: 1}}
                            />
                            <IconButton
                                size="small"
                                onClick={handleAddTag}
                                disabled={!newTag.trim()}
                                sx={{bgcolor: '#e3f2fd', '&:hover': {bgcolor: '#bbdefb'}}}
                            >
                                <AddIcon fontSize="small"/>
                            </IconButton>
                        </Box>

                        {/* Existing tags */}
                        <Stack direction="row" spacing={1} flexWrap="wrap">
                            {(editData.tags || []).map((tag, index) => (
                                editingTagIndex === index ? (
                                    <Box key={index} sx={{display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5}}>
                                        <TextField
                                            size="small"
                                            value={editingTagValue}
                                            onChange={(e) => setEditingTagValue(e.target.value)}
                                            onKeyPress={handleEditTagKeyPress}
                                            onBlur={handleSaveEditTag}
                                            autoFocus
                                            sx={{
                                                '& .MuiOutlinedInput-root': {
                                                    height: 32,
                                                    fontSize: '0.75rem',
                                                }
                                            }}
                                        />
                                        <IconButton
                                            size="small"
                                            onClick={handleSaveEditTag}
                                            sx={{p: 0.5}}
                                        >
                                            <AddIcon fontSize="small"/>
                                        </IconButton>
                                        <IconButton
                                            size="small"
                                            onClick={handleCancelEditTag}
                                            sx={{p: 0.5}}
                                        >
                                            <CloseIcon fontSize="small"/>
                                        </IconButton>
                                    </Box>
                                ) : (
                                    <Chip
                                        key={index}
                                        label={tag}
                                        size="small"
                                        onDelete={() => handleRemoveTag(index)}
                                        onClick={() => handleStartEditTag(index, tag)}
                                        sx={{
                                            bgcolor: '#e3f2fd',
                                            color: '#1976d2',
                                            mb: 0.5,
                                            cursor: 'pointer',
                                            '&:hover': {
                                                bgcolor: '#bbdefb',
                                            }
                                        }}
                                    />
                                )
                            ))}
                            {(editData.tags || []).length === 0 && (
                                <Typography variant="body2" color="text.secondary">
                                    No tags
                                </Typography>
                            )}
                        </Stack>
                    </>
                ) : (
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
                )}
            </Box>

            {/* Assignees */}
            <AssigneeManager
                assignees={(issue.assignees || []).map(a => ({
                    userId: a.userId,
                    username: a.username || a.userId,
                    email: undefined,
                    avatar: null
                }))}
                onAssigneesChange={() => {
                }}
                editable={true}
                variant="detail"
                title="Assignees"
                disabled={loading}
                treeId={issue.treeId}
                isEditing={isEditing}
                editingAssignees={(editData.assignees || []).map(a => ({
                    userId: a.userId,
                    username: a.username || a.userId,
                    email: undefined,
                    avatar: null
                }))}
                onEditingAssigneesChange={(users) => {
                    const assigneeUpdates = users.map(u => ({
                        userId: u.userId,
                        username: u.username
                    }));
                    onEditDataChange({assignees: assigneeUpdates});
                }}
            />

            {/* Reviewers */}
            <AssigneeManager
                assignees={(issue.reviewers || []).map(a => ({
                    userId: a.userId,
                    username: a.username || a.userId,
                    email: undefined,
                    avatar: null
                }))}
                onAssigneesChange={() => {
                }}
                editable={true}
                variant="detail"
                title="Reviewers"
                disabled={loading}
                treeId={issue.treeId}
                isEditing={isEditing}
                editingAssignees={(editData.reviewers || []).map(a => ({
                    userId: a.userId,
                    username: a.username || a.userId,
                    email: undefined,
                    avatar: null
                }))}
                onEditingAssigneesChange={(users) => {
                    const reviewerUpdates = users.map(u => ({
                        userId: u.userId,
                        username: u.username
                    }));
                    onEditDataChange({reviewers: reviewerUpdates});
                }}
            />

            <Divider sx={{my: 2}}/>

            {/* Go to Node Section */}
            {!isCreatingNew && issue.nodes && issue.nodes.length > 0 && (
                <>
                    <Box sx={{mb: 3}}>
                        <Typography variant="subtitle2"
                                    sx={{mb: 1, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1}}>
                            <TreeIcon fontSize="small"/>
                            Related Nodes
                        </Typography>
                        <Stack spacing={1}>
                            {issue.nodes.map((node, index) => (
                                <Button
                                    key={index}
                                    variant="outlined"
                                    size="small"
                                    startIcon={<LaunchIcon fontSize="small"/>}
                                    onClick={() => handleGoToNode(node.nodeId)}
                                    sx={{
                                        justifyContent: 'flex-start',
                                        textTransform: 'none',
                                        color: '#1976d2',
                                        borderColor: '#1976d2',
                                        '&:hover': {
                                            bgcolor: '#e3f2fd',
                                            borderColor: '#1976d2',
                                        }
                                    }}
                                >
                                    Go to Node {node.nodeId.substring(0, 8)}...
                                </Button>
                            ))}
                        </Stack>
                    </Box>
                    <Divider sx={{my: 2}}/>
                </>
            )}

            {/* Only show Creator, Created, Last Updated sections when not creating new issue */}
            {!isCreatingNew && (
                <>
                    {/* Creator */}
                    <Box sx={{mb: 2}}>
                        <Typography variant="subtitle2"
                                    sx={{mb: 1, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1}}>
                            <PersonIcon fontSize="small"/>
                            Creator
                        </Typography>
                        <Box sx={{display: 'flex', alignItems: 'center', gap: 1}}>
                            <Avatar
                                sx={{width: 24, height: 24}}
                                src={creatorInfo.avatar || undefined}
                            >
                                <PersonIcon fontSize="small"/>
                            </Avatar>
                            <Typography variant="body2">
                                {creatorInfo.username}
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
                </>
            )}

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