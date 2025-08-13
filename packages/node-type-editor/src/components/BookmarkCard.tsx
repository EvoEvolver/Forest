import React, {useState} from 'react';
import {
    Avatar,
    Box,
    Card,
    CardContent,
    CircularProgress,
    ClickAwayListener,
    Fade,
    Paper,
    Popper,
    Typography
} from '@mui/material';
import {WebsiteMetadata} from '../services/bookmarkService';
import LinkIcon from '@mui/icons-material/Link';

interface BookmarkCardProps {
    metadata?: WebsiteMetadata;
    loading?: boolean;
    error?: string;
    onClick?: () => void;
    onDoubleClick?: () => void;
    style?: React.CSSProperties;
}

export const BookmarkCard: React.FC<BookmarkCardProps> = ({
                                                              metadata,
                                                              loading = false,
                                                              error,
                                                              onClick,
                                                              onDoubleClick,
                                                              style
                                                          }) => {
    const [summaryOpen, setSummaryOpen] = useState(false);
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

    const handleClick = (event: React.MouseEvent<HTMLElement>) => {
        if (!loading && !error && metadata) {
            setAnchorEl(event.currentTarget);
            setSummaryOpen(true);
        }
        onClick?.();
    };

    const handleDoubleClick = () => {
        if (!loading && !error && metadata) {
            window.open(metadata.url, '_blank', 'noopener noreferrer');
        }
        onDoubleClick?.();
    };

    const handleCloseSummary = () => {
        setSummaryOpen(false);
        setAnchorEl(null);
    };

    const renderContent = () => {
        if (loading) {
            return (
                <Box display="flex" alignItems="center" gap={1}>
                    <CircularProgress size={16}/>
                    <Typography variant="body2" color="text.secondary">
                        Fetching bookmark...
                    </Typography>
                </Box>
            );
        }

        if (error) {
            return (
                <Box display="flex" alignItems="center" gap={1}>
                    <LinkIcon fontSize="small" color="error"/>
                    <Typography variant="body2" color="error">
                        Failed to load bookmark
                    </Typography>
                </Box>
            );
        }

        if (!metadata) {
            return (
                <Box display="flex" alignItems="center" gap={1}>
                    <LinkIcon fontSize="small" color="disabled"/>
                    <Typography variant="body2" color="text.secondary">
                        No bookmark data
                    </Typography>
                </Box>
            );
        }

        return (
            <Box display="flex" alignItems="center" gap={1} sx={{minWidth: 0}}>
                <Avatar
                    src={metadata.favicon}
                    sx={{
                        width: 16,
                        height: 16,
                        '& img': {
                            objectFit: 'contain'
                        }
                    }}
                >
                    <LinkIcon sx={{fontSize: 12}}/>
                </Avatar>
                <Typography
                    variant="body2"
                    sx={{
                        fontWeight: 500,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        flex: 1,
                        minWidth: 0
                    }}
                    title={metadata.title}
                >
                    {metadata.title}
                </Typography>
            </Box>
        );
    };

    return (
        <>
            <Card
                sx={{
                    display: 'inline-block',
                    cursor: loading || error ? 'default' : 'pointer',
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': loading || error ? {} : {
                        boxShadow: 2,
                        transform: 'translateY(-1px)'
                    },
                    maxWidth: 400,
                    minWidth: 200,
                    ...style
                }}
                onClick={handleClick}
                onDoubleClick={handleDoubleClick}
                elevation={1}
            >
                <CardContent sx={{
                    padding: '8px 12px !important',
                    '&:last-child': {paddingBottom: '8px !important'}
                }}>
                    {renderContent()}
                </CardContent>
            </Card>

            {/* Summary Popover */}
            <Popper
                open={summaryOpen}
                anchorEl={anchorEl}
                placement="bottom-start"
                transition
                sx={{zIndex: 1300}}
            >
                {({TransitionProps}) => (
                    <Fade {...TransitionProps}>
                        <Paper
                            elevation={4}
                            sx={{
                                p: 2,
                                maxWidth: 350,
                                mt: 1,
                                backgroundColor: 'background.paper',
                                border: '1px solid',
                                borderColor: 'divider'
                            }}
                        >
                            <ClickAwayListener onClickAway={handleCloseSummary}>
                                <Box>
                                    {metadata && (
                                        <>
                                            <Box display="flex" alignItems="center" gap={1} mb={1}>
                                                <Avatar
                                                    src={metadata.favicon}
                                                    sx={{
                                                        width: 20,
                                                        height: 20,
                                                        '& img': {
                                                            objectFit: 'contain'
                                                        }
                                                    }}
                                                >
                                                    <LinkIcon sx={{fontSize: 14}}/>
                                                </Avatar>
                                                <Typography variant="subtitle2" fontWeight="bold">
                                                    {metadata.title}
                                                </Typography>
                                            </Box>
                                            <Typography
                                                variant="body2"
                                                color="text.secondary"
                                                sx={{mb: 1}}
                                            >
                                                {metadata.description}
                                            </Typography>
                                            <Typography
                                                variant="caption"
                                                color="text.disabled"
                                                sx={{
                                                    wordBreak: 'break-all',
                                                    fontSize: '0.75rem'
                                                }}
                                            >
                                                {metadata.url}
                                            </Typography>
                                            <Typography
                                                variant="caption"
                                                color="text.disabled"
                                                sx={{
                                                    display: 'block',
                                                    mt: 0.5,
                                                    fontStyle: 'italic'
                                                }}
                                            >
                                                Double-click to open link
                                            </Typography>
                                        </>
                                    )}
                                </Box>
                            </ClickAwayListener>
                        </Paper>
                    </Fade>
                )}
            </Popper>
        </>
    );
};