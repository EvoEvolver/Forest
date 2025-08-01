import React, { useEffect, useRef } from 'react';
import { 
    Paper, 
    MenuList, 
    MenuItem, 
    Typography, 
    Box,
    Fade
} from '@mui/material';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import BookmarkIcon from '@mui/icons-material/Bookmark';

export interface SuggestionOption {
    id: string;
    label: string;
    description: string;
    icon: React.ReactNode;
}

interface SuggestionMenuProps {
    options: SuggestionOption[];
    selectedIndex: number;
    onSelect: (option: SuggestionOption, index: number) => void;
    visible?: boolean;
}

export const SuggestionMenu: React.FC<SuggestionMenuProps> = ({
    options,
    selectedIndex,
    onSelect,
    visible = true
}) => {
    const menuRef = useRef<HTMLDivElement>(null);
    const selectedItemRef = useRef<HTMLLIElement>(null);

    // Scroll selected item into view when selectedIndex changes
    useEffect(() => {
        if (selectedItemRef.current) {
            selectedItemRef.current.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest'
            });
        }
    }, [selectedIndex]);

    if (!visible || options.length === 0) {
        return null;
    }

    return (
        <Fade in={visible}>
            <Paper
                ref={menuRef}
                elevation={8}
                sx={{
                    minWidth: 250,
                    maxWidth: 350,
                    backgroundColor: 'background.paper',
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 2
                }}
            >
                <MenuList dense sx={{ p: 0.5 }}>
                    {options.map((option, index) => (
                        <MenuItem
                            key={option.id}
                            ref={index === selectedIndex ? selectedItemRef : undefined}
                            selected={index === selectedIndex}
                            onClick={() => onSelect(option, index)}
                            sx={{
                                borderRadius: 1,
                                mb: index < options.length - 1 ? 0.5 : 0,
                                '&.Mui-selected': {
                                    backgroundColor: 'primary.main',
                                    color: 'primary.contrastText',
                                    '&:hover': {
                                        backgroundColor: 'primary.dark',
                                    }
                                },
                                '&:hover': {
                                    backgroundColor: index === selectedIndex ? 'primary.dark' : 'action.hover'
                                }
                            }}
                        >
                            <Box display="flex" alignItems="center" gap={1.5} width="100%">
                                <Box
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        width: 24,
                                        height: 24,
                                        color: index === selectedIndex ? 'inherit' : 'text.secondary'
                                    }}
                                >
                                    {option.icon}
                                </Box>
                                <Box flex={1} minWidth={0}>
                                    <Typography
                                        variant="body2"
                                        fontWeight="medium"
                                        sx={{
                                            color: index === selectedIndex ? 'inherit' : 'text.primary'
                                        }}
                                    >
                                        {option.label}
                                    </Typography>
                                    <Typography
                                        variant="caption"
                                        sx={{
                                            color: index === selectedIndex ? 'inherit' : 'text.secondary',
                                            opacity: index === selectedIndex ? 0.8 : 0.7
                                        }}
                                    >
                                        {option.description}
                                    </Typography>
                                </Box>
                                {index === selectedIndex && (
                                    <Typography
                                        variant="caption"
                                        sx={{
                                            color: 'inherit',
                                            opacity: 0.8,
                                            fontSize: '0.7rem',
                                            fontWeight: 'medium'
                                        }}
                                    >
                                        ↵
                                    </Typography>
                                )}
                            </Box>
                        </MenuItem>
                    ))}
                </MenuList>
                <Box
                    sx={{
                        px: 1.5,
                        py: 0.5,
                        borderTop: '1px solid',
                        borderColor: 'divider',
                        backgroundColor: 'action.hover'
                    }}
                >
                    <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ fontSize: '0.7rem' }}
                    >
                        ↑↓ Navigate • ↵ Select • Esc Cancel
                    </Typography>
                </Box>
            </Paper>
        </Fade>
    );
};

// Predefined options for paste suggestions
export const createPasteSuggestionOptions = (url: string): SuggestionOption[] => [
    {
        id: 'paste-text',
        label: 'Paste as text',
        description: 'Insert the URL as plain text',
        icon: <TextFieldsIcon fontSize="small" />
    },
    {
        id: 'paste-bookmark',
        label: 'Create bookmark',
        description: 'Fetch website info and create a rich bookmark',
        icon: <BookmarkIcon fontSize="small" />
    }
];