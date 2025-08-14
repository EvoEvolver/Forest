import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    Modal,
    Box,
    TextField,
    List,
    ListItem,
    ListItemText,
    Typography,
    Backdrop,
    Paper
} from '@mui/material';
import { useAtomValue, useSetAtom } from 'jotai';
import { treeAtom, selectedNodeAtom, jumpToNodeAtom, scrollToNodeAtom } from '../TreeState/TreeState';
import { SearchService, SearchResult } from '../services/searchService';
import SearchIcon from '@mui/icons-material/Search';
import NodePreview from './NodePreview';

interface SearchModalProps {
    open: boolean;
    onClose: () => void;
}

export default function SearchModal({ open, onClose }: SearchModalProps) {
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLUListElement>(null);
    
    const tree = useAtomValue(treeAtom);
    const jumpToNode = useSetAtom(jumpToNodeAtom);
    const scrollToNode = useSetAtom(scrollToNodeAtom);
    
    // Perform search
    const searchResults = useMemo(() => {
        if (!tree || !query.trim()) {
            return [];
        }
        return SearchService.searchTree(tree, query);
    }, [tree, query]);
    
    // Reset when modal opens/closes and handle auto-focus
    useEffect(() => {
        if (open) {
            setQuery('');
            setSelectedIndex(0);
            
            // Multiple attempts to focus for better reliability
            const focusInput = () => {
                if (inputRef.current) {
                    inputRef.current.focus();
                    // Select text if the method exists (not all input elements have it)
                    if (typeof inputRef.current.select === 'function') {
                        inputRef.current.select();
                    }
                }
            };
            
            // Immediate focus
            focusInput();
            
            // Backup focus after small delay
            const focusTimeout = setTimeout(focusInput, 50);
            
            // Another backup after modal transition
            const finalFocusTimeout = setTimeout(focusInput, 200);
            
            return () => {
                clearTimeout(focusTimeout);
                clearTimeout(finalFocusTimeout);
            };
        }
    }, [open]);
    
    // Reset selected index when results change
    useEffect(() => {
        setSelectedIndex(0);
    }, [searchResults]);
    
    // Handle keyboard navigation
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (!open) return;
            
            switch (event.key) {
                case 'ArrowDown':
                    event.preventDefault();
                    setSelectedIndex(prev => 
                        prev < searchResults.length - 1 ? prev + 1 : prev
                    );
                    break;
                case 'ArrowUp':
                    event.preventDefault();
                    setSelectedIndex(prev => prev > 0 ? prev - 1 : prev);
                    break;
                case 'Enter':
                    event.preventDefault();
                    if (searchResults.length > 0 && selectedIndex < searchResults.length) {
                        handleSelectResult(searchResults[selectedIndex]);
                    }
                    break;
                case 'Escape':
                    event.preventDefault();
                    onClose();
                    break;
            }
        };
        
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [open, searchResults, selectedIndex, onClose]);
    
    // Scroll selected item into view
    useEffect(() => {
        if (listRef.current && selectedIndex >= 0) {
            const selectedElement = listRef.current.children[selectedIndex] as HTMLElement;
            if (selectedElement) {
                selectedElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'nearest'
                });
            }
        }
    }, [selectedIndex]);
    
    const handleSelectResult = (result: SearchResult) => {
        jumpToNode(result.nodeId);
        setTimeout(() => {
            scrollToNode(result.nodeId);
        }, 100);
        onClose();
    };
    
    // Remove the handleModalEntered function since onTransitionEntered is not valid
    
    const highlightMatch = (text: string, query: string) => {
        if (!query) return text;
        
        const parts = text.split(new RegExp(`(${query})`, 'gi'));
        return parts.map((part, index) => 
            part.toLowerCase() === query.toLowerCase() ? 
                <span key={index} style={{ backgroundColor: '#ffeb3b', fontWeight: 'bold' }}>
                    {part}
                </span> : part
        );
    };
    
    return (
        <Modal
            open={open}
            onClose={onClose}
            closeAfterTransition
            BackdropComponent={Backdrop}
            BackdropProps={{
                timeout: 200,
                sx: {
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    backdropFilter: 'blur(4px)'
                }
            }}
        >
            <Box
                sx={{
                    position: 'absolute',
                    top: '10%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: { xs: '90%', sm: '800px' },
                    height: { xs: '80%', sm: '70vh' },
                    maxWidth: '90vw',
                    maxHeight: '80vh',
                    bgcolor: 'background.paper',
                    borderRadius: 3,
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                    overflow: 'hidden',
                    outline: 'none',
                    display: 'flex',
                    flexDirection: 'column'
                }}
            >
                {/* Search Input */}
                <Box
                    sx={{
                        p: 3,
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        flexShrink: 0
                    }}
                >
                    <SearchIcon sx={{ color: 'text.secondary' }} />
                    <TextField
                        inputRef={inputRef}
                        fullWidth
                        placeholder="Search nodes..."
                        variant="standard"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        InputProps={{
                            disableUnderline: true,
                            sx: {
                                fontSize: '1.2rem',
                                '& input': {
                                    padding: 0
                                }
                            }
                        }}
                    />
                </Box>
                
                {/* Main Content Area */}
                {query.trim() ? (
                    <Box sx={{ display: 'flex', flexGrow: 1, overflow: 'hidden' }}>
                        {/* Results Panel */}
                        <Box 
                            sx={{ 
                                width: '35%',
                                borderRight: '1px solid',
                                borderColor: 'divider',
                                display: 'flex',
                                flexDirection: 'column',
                                flexShrink: 0
                            }}
                        >
                            {searchResults.length === 0 ? (
                                <Box sx={{ p: 3, textAlign: 'center' }}>
                                    <Typography color="text.secondary">
                                        No results found for "{query}"
                                    </Typography>
                                </Box>
                            ) : (
                                <List 
                                    ref={listRef} 
                                    sx={{ 
                                        p: 0,
                                        flexGrow: 1,
                                        overflow: 'auto',
                                        maxHeight: 'calc(4 * 48px)', // Show 4 items max (reduced from 64px to 48px)
                                    }}
                                >
                                    {searchResults.map((result, index) => (
                                        <ListItem
                                            key={result.nodeId}
                                            sx={{
                                                cursor: 'pointer',
                                                backgroundColor: index === selectedIndex ? 
                                                    'action.hover' : 'transparent',
                                                '&:hover': {
                                                    backgroundColor: 'action.hover'
                                                },
                                                borderLeft: index === selectedIndex ? 
                                                    '3px solid' : '3px solid transparent',
                                                borderLeftColor: 'primary.main',
                                                minHeight: '48px',
                                                py: 1
                                            }}
                                            onClick={() => handleSelectResult(result)}
                                            onMouseEnter={() => setSelectedIndex(index)}
                                        >
                                            <ListItemText
                                                primary={
                                                    <Typography
                                                        variant="body2"
                                                        sx={{
                                                            fontWeight: index === selectedIndex ? 600 : 400,
                                                            fontSize: '0.875rem'
                                                        }}
                                                    >
                                                        {highlightMatch(result.title, query)}
                                                    </Typography>
                                                }
                                            />
                                        </ListItem>
                                    ))}
                                </List>
                            )}
                        </Box>
                        
                        {/* Preview Panel */}
                        <Box sx={{ width: '65%', overflow: 'hidden', flexShrink: 0 }}>
                            <NodePreview 
                                key={searchResults.length > 0 && selectedIndex < searchResults.length 
                                    ? searchResults[selectedIndex].nodeId 
                                    : 'no-selection'
                                }
                                nodeId={searchResults.length > 0 && selectedIndex < searchResults.length 
                                    ? searchResults[selectedIndex].nodeId 
                                    : null
                                } 
                            />
                        </Box>
                    </Box>
                ) : (
                    /* Instructions */
                    <Box sx={{ p: 3, textAlign: 'center', flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                        <Typography color="text.secondary" variant="body2">
                            Start typing to search through your nodes...
                        </Typography>
                        <Typography color="text.secondary" variant="caption" sx={{ mt: 1, display: 'block' }}>
                            Use ↑↓ to navigate, Enter to select, Esc to close
                        </Typography>
                    </Box>
                )}
            </Box>
        </Modal>
    );
}