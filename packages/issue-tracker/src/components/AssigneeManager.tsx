import React, {useEffect, useState} from 'react';
import {Avatar, Box, Chip, IconButton, Stack, Tooltip, Typography,} from '@mui/material';
import {Cancel as CancelIcon, Edit as EditIcon, Person as PersonIcon, Save as SaveIcon,} from '@mui/icons-material';
import UserSelector from './UserSelector';
import {getUserMetadata, getUsername} from "@forest/user-system/src/userMetadata";

const currentPort = (process.env.NODE_ENV || 'development') == 'development' ? "29999" : window.location.port;
export const httpUrl = `${window.location.protocol}//${location.hostname}:${currentPort}`

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
    treeId: string;
    isEditing?: boolean; // External editing state
    editingAssignees?: User[]; // External editing assignees
    onEditingAssigneesChange?: (assignees: User[]) => void; // Callback for editing changes
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
                                                             treeId,
                                                             isEditing,
                                                             editingAssignees,
                                                             onEditingAssigneesChange,
                                                         }) => {
    const [treeMembers, setTreeMembers] = useState<User[]>([]);
    const [loadingMembers, setLoadingMembers] = useState(false);
    const [usernames, setUsernames] = useState<{ [userId: string]: string }>({});
    const [enrichedAssignees, setEnrichedAssignees] = useState<User[]>(assignees);

    // Fetch tree members with permission and enrich with user details
    useEffect(() => {
        async function fetchTreeMembers() {
            setLoadingMembers(true);
            try {
                const res = await fetch(`${httpUrl}/api/tree-permission/tree/${treeId}`, {
                    credentials: 'include',
                    headers: {'Content-Type': 'application/json'},
                });
                const data = await res.json();
                const permissions = data.permissions || [];
                const userIds = permissions.map((p: any) => p.userId);
                if (userIds.length === 0) {
                    setTreeMembers([]);
                    setLoadingMembers(false);
                    return;
                }
                // Fetch user details from Supabase and our user metadata API
                const userDetails: User[] = await Promise.all(userIds.map(async (id: string) => {
                    try {
                        const userMeta = await getUserMetadata(id);
                        console.log("User metadata for user", id, userMeta);
                        return {
                            userId: id,
                            username: userMeta.username,
                            email: userMeta.email || undefined,
                            avatar: userMeta.avatar || null,
                        };
                    } catch (error) {
                        return {
                            userId: id, 
                            username: id,
                            email: undefined,
                            avatar: null
                        };
                    }
                }));
                setTreeMembers(userDetails);
            } catch (e) {
                setTreeMembers([]);
            } finally {
                setLoadingMembers(false);
            }
        }

        if (isEditing) fetchTreeMembers();
    }, [treeId, isEditing]);

    useEffect(() => {
        // Fetch usernames and avatars for all assignees
        async function fetchUsernames() {
            const ids = assignees.map(a => a.userId);
            const usernameMap: { [userId: string]: string } = {};
            const enrichedUsers: User[] = await Promise.all(assignees.map(async (assignee) => {
                try {
                    const userMeta = await getUserMetadata(assignee.userId);
                    usernameMap[assignee.userId] = userMeta.username;
                    return {
                        userId: assignee.userId,
                        username: userMeta.username,
                        email: userMeta.email || assignee.email,
                        avatar: userMeta.avatar || assignee.avatar,
                    };
                } catch {
                    usernameMap[assignee.userId] = assignee.username || assignee.userId;
                    return assignee;
                }
            }));
            setUsernames(usernameMap);
            setEnrichedAssignees(enrichedUsers);
        }
        fetchUsernames();
    }, [assignees]);

    const getUserDisplayName = (user: User) => {
        return usernames[user.userId] || user.username || "loading";
    };

    // List variant - compact display for table rows
    if (variant === 'list') {
        return (
            <>
                {enrichedAssignees.length > 0 ? (
                    <>
                        {enrichedAssignees.slice(0, maxDisplay).map((assignee, index) => (
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
                        {enrichedAssignees.length > maxDisplay && (
                            <Chip
                                label={`+${enrichedAssignees.length - maxDisplay}`}
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
                        sx={{fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1}}
                    >
                        <PersonIcon fontSize="small"/>
                        {title}
                    </Typography>
                </Box>
            )}

            {isEditing ? (
                <Box>
                    {loadingMembers ? (
                        <Typography variant="body2">Loading members...</Typography>
                    ) : (
                        <UserSelector
                            selectedUsers={editingAssignees}
                            onUsersChange={onEditingAssigneesChange}
                            label="Select assignees"
                            placeholder="Search tree members..."
                            disabled={disabled}
                            maxUsers={undefined}
                            // Only allow selection from treeMembers
                            // UserSelector will only show these as options
                            // (UserSelector uses options from selectedUsers + mockUsers, so we override options prop)
                            options={treeMembers}
                        />
                    )}
                </Box>
            ) : (
                <Stack spacing={1}>
                    {enrichedAssignees.length > 0 ? (
                        enrichedAssignees.map((assignee, index) => (
                            <Box key={index} sx={{display: 'flex', alignItems: 'center', gap: 1}}>
                                <Avatar 
                                    sx={{width: 24, height: 24}}
                                    src={assignee.avatar || undefined}
                                >
                                    <PersonIcon fontSize="small"/>
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