import React, {useEffect, useState} from 'react';
import {Autocomplete, Avatar, Box, Chip, CircularProgress, TextField, Typography,} from '@mui/material';
import {Person as PersonIcon} from '@mui/icons-material';

// Mock user data - in real app, this would come from an API
const mockUsers = [
    {userId: 'user1', username: 'alice', email: 'alice@example.com', avatar: null},
    {userId: 'user2', username: 'bob', email: 'bob@example.com', avatar: null},
    {userId: 'user3', username: 'charlie', email: 'charlie@example.com', avatar: null},
    {userId: 'user4', username: 'diana', email: 'diana@example.com', avatar: null},
    {userId: 'user5', username: 'eve', email: 'eve@example.com', avatar: null},
    {userId: 'user6', username: 'frank', email: 'frank@example.com', avatar: null},
    {userId: 'user7', username: 'grace', email: 'grace@example.com', avatar: null},
    {userId: 'user8', username: 'henry', email: 'henry@example.com', avatar: null},
    {userId: 'user9', username: 'ivy', email: 'ivy@example.com', avatar: null},
    {userId: 'user10', username: 'jack', email: 'jack@example.com', avatar: null},
    {userId: 'demo-user', username: 'Demo User', email: 'demo@example.com', avatar: null},
    {userId: 'test-user', username: 'Test User', email: 'test@example.com', avatar: null},
];

interface User {
    userId: string;
    username: string;
    email?: string;
    avatar?: string | null;
}

interface UserSelectorProps {
    selectedUsers: User[];
    onUsersChange: (users: User[]) => void;
    label?: string;
    placeholder?: string;
    disabled?: boolean;
    maxUsers?: number;
}

const UserSelector: React.FC<UserSelectorProps> = ({
                                                       selectedUsers,
                                                       onUsersChange,
                                                       label = "Assignees",
                                                       placeholder = "Search and select users...",
                                                       disabled = false,
                                                       maxUsers,
                                                   }) => {
    const [open, setOpen] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const [loading, setLoading] = useState(false);
    const [options, setOptions] = useState<User[]>([]);

    // Simulate API call for user search
    const searchUsers = async (searchTerm: string): Promise<User[]> => {
        setLoading(true);

        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 300));

        const filtered = mockUsers.filter(user =>
            user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.userId.toLowerCase().includes(searchTerm.toLowerCase())
        );

        setLoading(false);
        return filtered;
    };

    useEffect(() => {
        if (inputValue === '') {
            setOptions(selectedUsers.length > 0 ? selectedUsers : mockUsers.slice(0, 8));
            return;
        }

        const delayedSearch = setTimeout(async () => {
            const results = await searchUsers(inputValue);
            setOptions(results);
        }, 200);

        return () => clearTimeout(delayedSearch);
    }, [inputValue, selectedUsers]);

    const handleChange = (event: any, newValue: User[]) => {
        if (maxUsers && newValue.length > maxUsers) {
            return; // Don't allow more than maxUsers
        }
        onUsersChange(newValue);
    };

    const getUserDisplayName = (user: User) => {
        return user.username || user.userId;
    };

    return (
        <Autocomplete
            multiple
            open={open}
            onOpen={() => setOpen(true)}
            onClose={() => setOpen(false)}
            value={selectedUsers}
            onChange={handleChange}
            inputValue={inputValue}
            onInputChange={(event, newInputValue) => setInputValue(newInputValue)}
            options={options}
            getOptionLabel={(option) => getUserDisplayName(option)}
            isOptionEqualToValue={(option, value) => option.userId === value.userId}
            loading={loading}
            disabled={disabled}
            filterSelectedOptions
            ListboxProps={{
                style: {
                    maxHeight: '240px',
                }
            }}
            componentsProps={{
                popper: {
                    placement: 'bottom-start',
                    style: {
                        zIndex: 9999,
                    },
                    modifiers: [
                        {
                            name: 'flip',
                            enabled: true,
                            options: {
                                fallbackPlacements: ['top-start', 'bottom-start'],
                            },
                        },
                        {
                            name: 'preventOverflow',
                            enabled: true,
                            options: {
                                altAxis: true,
                                altBoundary: true,
                                tether: false,
                                rootBoundary: 'viewport',
                                padding: 8,
                            },
                        },
                        {
                            name: 'offset',
                            enabled: true,
                            options: {
                                offset: [0, 4],
                            },
                        },
                    ],
                },
            }}
            renderInput={(params) => (
                <TextField
                    {...params}
                    label={label}
                    placeholder={selectedUsers.length === 0 ? placeholder : ''}
                    variant="outlined"
                    InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                            <>
                                {loading ? <CircularProgress color="inherit" size={20}/> : null}
                                {params.InputProps.endAdornment}
                            </>
                        ),
                    }}
                    helperText={maxUsers ? `Maximum ${maxUsers} users` : ''}
                />
            )}
            renderOption={(props, option) => (
                <Box component="li" {...props} sx={{display: 'flex', alignItems: 'center', gap: 1}}>
                    <Avatar sx={{width: 32, height: 32}}>
                        {option.avatar ? (
                            <img src={option.avatar} alt={getUserDisplayName(option)}/>
                        ) : (
                            <PersonIcon fontSize="small"/>
                        )}
                    </Avatar>
                    <Box>
                        <Typography variant="body2" sx={{fontWeight: 500}}>
                            {getUserDisplayName(option)}
                        </Typography>
                        {option.email && (
                            <Typography variant="caption" color="text.secondary">
                                {option.email}
                            </Typography>
                        )}
                    </Box>
                </Box>
            )}
            renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                    <Chip
                        {...getTagProps({index})}
                        key={option.userId}
                        avatar={
                            <Avatar sx={{width: 24, height: 24}}>
                                {option.avatar ? (
                                    <img src={option.avatar} alt={getUserDisplayName(option)}/>
                                ) : (
                                    <PersonIcon fontSize="small"/>
                                )}
                            </Avatar>
                        }
                        label={getUserDisplayName(option)}
                        size="small"
                        sx={{
                            bgcolor: '#e3f2fd',
                            color: '#1976d2',
                            '& .MuiChip-deleteIcon': {
                                color: '#1976d2',
                            },
                        }}
                    />
                ))
            }
            sx={{
                '& .MuiAutocomplete-inputRoot': {
                    minHeight: selectedUsers.length > 0 ? 60 : 40,
                    alignItems: 'flex-start',
                    paddingTop: selectedUsers.length > 0 ? 1 : 0,
                },
            }}
        />
    );
};

// Export mock users for use in other components
export {mockUsers};
export type {User};
export default UserSelector; 