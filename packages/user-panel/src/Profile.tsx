import React, {useEffect, useState} from 'react';
import {
    Alert,
    Box,
    Button,
    Divider,
    FormControl,
    FormControlLabel,
    Radio,
    RadioGroup,
    TextField,
    Typography
} from '@mui/material';
import {
    Brightness4 as DarkModeIcon,
    Cancel as CancelIcon,
    Edit as EditIcon,
    Save as SaveIcon,
    SettingsBrightness as SystemModeIcon,
    WbSunny as LightModeIcon
} from '@mui/icons-material';
import {useAtom} from 'jotai';
import {userAtom} from '@forest/user-system/src/authStates';
import DashboardCard from './DashboardCard';
import {themeModeAtom} from "@forest/client/src/theme";

export const Profile: React.FC = () => {
    const [user] = useAtom(userAtom);
    const [isEditingName, setIsEditingName] = useState(false);
    const [displayName, setDisplayName] = useState('');
    const [tempDisplayName, setTempDisplayName] = useState('');
    const [saveError, setSaveError] = useState<string | null>(null);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [currentMode, setCurrentMode] = useAtom(themeModeAtom);

    useEffect(() => {
        if (user?.name) {
            setDisplayName(user.name);
            setTempDisplayName(user.name);
        }
    }, [user]);

    const handleThemeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const newMode = event.target.value as 'light' | 'dark' | 'system';
        localStorage.setItem('userThemePreference', newMode);
        setCurrentMode(newMode);
    };

    const handleEditName = () => {
        setIsEditingName(true);
        setTempDisplayName(displayName);
        setSaveError(null);
        setSaveSuccess(false);
    };

    const handleCancelEdit = () => {
        setIsEditingName(false);
        setTempDisplayName(displayName);
        setSaveError(null);
        setSaveSuccess(false);
    };

    const handleSaveName = async () => {
        if (!tempDisplayName.trim()) {
            setSaveError('Display name cannot be empty');
            return;
        }

        try {
            // TODO: Implement API call to update display name
            // For now, just update locally
            setDisplayName(tempDisplayName);
            setIsEditingName(false);
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (error) {
            setSaveError('Failed to update display name');
        }
    };

    const getAvatarUrl = () => {
        return user?.user_metadata?.avatar_url || user?.avatar_url || null;
    };

    const getUserEmail = () => {
        return user?.email || 'No email available';
    };

    const getUserId = () => {
        return user?.id || 'No ID available';
    };

    return (
        <Box sx={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2
        }}>
            <DashboardCard
                title=""
                sx={{height: '100%', display: 'flex', flexDirection: 'column'}}
            >
                <Box sx={{flex: 1, overflow: 'auto', p: 2}}>
                    {/* User Info Section */}
                    <Box sx={{mb: 4}}>
                        <Typography variant="h6" sx={{mb: 2, fontWeight: 600}}>
                            User Information
                        </Typography>

                        <Box sx={{display: 'flex', alignItems: 'center', mb: 3}}>
                            <Box sx={{flex: 1}}>
                                {isEditingName ? (
                                    <Box sx={{display: 'flex', alignItems: 'center', gap: 1}}>
                                        <TextField
                                            size="small"
                                            value={tempDisplayName}
                                            onChange={(e) => setTempDisplayName(e.target.value)}
                                            error={!!saveError}
                                            helperText={saveError}
                                            sx={{flex: 1}}
                                        />
                                        <Button
                                            size="small"
                                            variant="contained"
                                            startIcon={<SaveIcon/>}
                                            onClick={handleSaveName}
                                        >
                                            Save
                                        </Button>
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            startIcon={<CancelIcon/>}
                                            onClick={handleCancelEdit}
                                        >
                                            Cancel
                                        </Button>
                                    </Box>
                                ) : (
                                    <Box sx={{display: 'flex', alignItems: 'center', gap: 1}}>
                                        <Typography variant="h6">
                                            {displayName || 'Unknown User'}
                                        </Typography>
                                        <Button
                                            size="small"
                                            startIcon={<EditIcon/>}
                                            onClick={handleEditName}
                                        >
                                            Edit
                                        </Button>
                                    </Box>
                                )}

                                <Typography variant="body2" color="text.secondary">
                                    {getUserEmail()}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    ID: {getUserId()}
                                </Typography>
                            </Box>
                        </Box>

                        {saveSuccess && (
                            <Alert severity="success" sx={{mb: 2}}>
                                Display name updated successfully!
                            </Alert>
                        )}
                    </Box>

                    <Divider sx={{my: 3}}/>

                    {/* Appearance Section */}
                    <Box sx={{mb: 4}}>
                        <Typography variant="h6" sx={{mb: 2, fontWeight: 600}}>
                            Appearance
                        </Typography>

                        <FormControl>
                            <RadioGroup
                                value={currentMode}
                                onChange={handleThemeChange}
                                sx={{gap: 1}}
                            >
                                <FormControlLabel
                                    value="light"
                                    control={<Radio/>}
                                    label={
                                        <Box sx={{display: 'flex', alignItems: 'center', gap: 1}}>
                                            <LightModeIcon sx={{fontSize: 20}}/>
                                            <Box>
                                                <Typography>Light</Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    Always use light theme
                                                </Typography>
                                            </Box>
                                        </Box>
                                    }
                                />
                                <FormControlLabel
                                    value="dark"
                                    control={<Radio/>}
                                    label={
                                        <Box sx={{display: 'flex', alignItems: 'center', gap: 1}}>
                                            <DarkModeIcon sx={{fontSize: 20}}/>
                                            <Box>
                                                <Typography>Dark</Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    Always use dark theme
                                                </Typography>
                                            </Box>
                                        </Box>
                                    }
                                />
                                <FormControlLabel
                                    value="system"
                                    control={<Radio/>}
                                    label={
                                        <Box sx={{display: 'flex', alignItems: 'center', gap: 1}}>
                                            <SystemModeIcon sx={{fontSize: 20}}/>
                                            <Box>
                                                <Typography>System</Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    Follow system preference
                                                </Typography>
                                            </Box>
                                        </Box>
                                    }
                                />
                            </RadioGroup>
                        </FormControl>
                    </Box>

                    <Divider sx={{my: 3}}/>

                    {/* Account Section */}
                    <Box sx={{mb: 4}}>
                        <Typography variant="h6" sx={{mb: 2, fontWeight: 600}}>
                            Account Details
                        </Typography>

                        <Box sx={{display: 'grid', gap: 2}}>
                            <Box>
                                <Typography variant="body2" color="text.secondary">
                                    Email Address
                                </Typography>
                                <Typography variant="body1">
                                    {getUserEmail()}
                                </Typography>
                            </Box>

                            <Box>
                                <Typography variant="body2" color="text.secondary">
                                    User ID
                                </Typography>
                                <Typography variant="body1" sx={{fontFamily: 'monospace', fontSize: '0.875rem'}}>
                                    {getUserId()}
                                </Typography>
                            </Box>

                            <Box>
                                <Typography variant="body2" color="text.secondary">
                                    Account Type
                                </Typography>
                                <Typography variant="body1">
                                    {user?.app_metadata?.provider || 'Standard'}
                                </Typography>
                            </Box>
                        </Box>
                    </Box>
                </Box>
            </DashboardCard>
        </Box>
    );
};