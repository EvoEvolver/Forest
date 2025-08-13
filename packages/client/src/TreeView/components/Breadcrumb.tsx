import React from 'react';
import {Box, Breadcrumbs, IconButton, Link, Typography} from '@mui/material';
import {useAtomValue, useSetAtom} from 'jotai';
import {ArrowBack as ArrowBackIcon} from '@mui/icons-material';
import {breadcrumbPathAtom} from '../atoms/BreadcrumbAtoms';
import {jumpToNodeAtom, scrollToNodeAtom} from '../../TreeState/TreeState';

export const Breadcrumb: React.FC = () => {
    const breadcrumbPath = useAtomValue(breadcrumbPathAtom);
    const jumpToNode = useSetAtom(jumpToNodeAtom);
    const scrollToNode = useSetAtom(scrollToNodeAtom);

    const handleBreadcrumbClick = (event: React.MouseEvent<HTMLAnchorElement>, nodeId: string) => {
        event.preventDefault();
        jumpToNode(nodeId);
        // Add a small delay to ensure the node is selected before scrolling
        setTimeout(() => {
            scrollToNode(nodeId);
        }, 100);
    };

    const handleBackClick = () => {
        // Navigate to parent node (second to last in breadcrumb path)
        if (breadcrumbPath.length >= 2) {
            const parentNodeId = breadcrumbPath[breadcrumbPath.length - 2].id;
            jumpToNode(parentNodeId);
            setTimeout(() => {
                scrollToNode(parentNodeId);
            }, 100);
        }
    };

    // Don't render if no path or only root
    if (!breadcrumbPath || breadcrumbPath.length === 0) {
        return null;
    }

    return (
        <Box sx={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1}}>
            {/* Back button - only show if not at root */}
            {breadcrumbPath.length > 1 && (
                <IconButton
                    onClick={handleBackClick}
                    size="small"
                    sx={{
                        color: 'text.secondary',
                        '&:hover': {
                            color: 'primary.main',
                            backgroundColor: 'action.hover',
                        }
                    }}
                    title="Go to parent"
                >
                    <ArrowBackIcon fontSize="small"/>
                </IconButton>
            )}

            <Breadcrumbs
                aria-label="breadcrumb"
                separator="/"
                maxItems={5}
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    '& .MuiBreadcrumbs-separator': {
                        color: 'text.secondary',
                        marginX: 1,
                        fontSize: '0.875rem',
                        display: 'flex',
                        alignItems: 'center',
                    },
                    '& .MuiBreadcrumbs-ol': {
                        alignItems: 'center',
                    },
                    '& .MuiBreadcrumbs-li': {
                        display: 'flex',
                        alignItems: 'center',
                    }
                }}
            >
                {breadcrumbPath.slice(0, -1).map((item) => (
                    <Link
                        key={item.id}
                        underline="hover"
                        color="inherit"
                        href="#"
                        onClick={(event) => handleBreadcrumbClick(event, item.id)}
                        sx={{
                            cursor: 'pointer',
                            fontWeight: 400,
                            fontSize: '0.875rem',
                            color: 'text.secondary',
                            lineHeight: 1.2,
                            display: 'flex',
                            alignItems: 'center',
                            '&:hover': {
                                color: 'primary.main',
                            },
                            // Truncate long titles
                            maxWidth: '150px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                        }}
                        title={item.title} // Tooltip for truncated text
                    >
                        {item.title}
                    </Link>
                ))}
                <Typography
                    sx={{
                        color: 'text.primary',
                        fontWeight: 500,
                        fontSize: '0.875rem',
                        lineHeight: 1.2,
                        display: 'flex',
                        alignItems: 'center',
                        // Truncate long titles
                        maxWidth: '200px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                    }}
                    title={breadcrumbPath[breadcrumbPath.length - 1].title}
                >
                    {breadcrumbPath[breadcrumbPath.length - 1].title}
                </Typography>
            </Breadcrumbs>
        </Box>
    );
};