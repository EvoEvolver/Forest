import React, {useEffect, useState} from 'react';
import {Autocomplete, Avatar, Box, Chip, CircularProgress, TextField, Typography,} from '@mui/material';
import {Person as PersonIcon} from '@mui/icons-material';


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
    options?: User[];
}

const UserSelector: React.FC<UserSelectorProps> = ({
    selectedUsers,
    onUsersChange,
    label = "Assignees",
    placeholder = "Search and select users...",
    disabled = false,
    maxUsers,
    options: externalOptions,
}) => {
    const [open, setOpen] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const [loading, setLoading] = useState(false);
    // Provide a fallback for mockUsers if not defined
    // @ts-ignore
    const mockUsers: User[] = typeof window !== 'undefined' && (window as any).mockUsers ? (window as any).mockUsers : [];
    const [options, setOptions] = useState<User[]>(externalOptions || []);

    // Simulate API call for user search
    const searchUsers = async (searchTerm: string): Promise<User[]> => {
        setLoading(true);

        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 300));

        let filtered: User[] = [];
        if (externalOptions) {
            filtered = externalOptions.filter(user =>
                user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                user.userId.toLowerCase().includes(searchTerm.toLowerCase())
            );
        } else {
            filtered = mockUsers.filter(user =>
                user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                user.userId.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        setLoading(false);
        return filtered;
    };

    useEffect(() => {
        if (externalOptions) {
            if (inputValue === '') {
                setOptions(externalOptions);
                return;
            }
            const delayedSearch = setTimeout(async () => {
                const results = await searchUsers(inputValue);
                setOptions(results);
            }, 200);
            return () => clearTimeout(delayedSearch);
        } else {
            if (inputValue === '') {
                setOptions(selectedUsers.length > 0 ? selectedUsers : mockUsers.slice(0, 8));
                return;
            }
            const delayedSearch = setTimeout(async () => {
                const results = await searchUsers(inputValue);
                setOptions(results);
            }, 200);
            return () => clearTimeout(delayedSearch);
        }
    }, [inputValue, selectedUsers, externalOptions]);

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
                    <Avatar 
                        sx={{width: 32, height: 32}}
                        src={option.avatar || undefined}
                    >
                        <PersonIcon fontSize="small"/>
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
                            <Avatar 
                                sx={{width: 24, height: 24}}
                                src={option.avatar || undefined}
                            >
                                <PersonIcon fontSize="small"/>
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
export type {User};
export default UserSelector; 