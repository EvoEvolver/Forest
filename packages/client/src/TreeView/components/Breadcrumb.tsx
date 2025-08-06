import React from 'react';
import { Breadcrumbs, Link, Typography, Box } from '@mui/material';
import { useAtomValue, useSetAtom } from 'jotai';
import { NavigateNext as NavigateNextIcon } from '@mui/icons-material';
import { breadcrumbPathAtom } from '../atoms/BreadcrumbAtoms';
import { jumpToNodeAtom } from '../../TreeState/TreeState';

export const Breadcrumb: React.FC = () => {
    const breadcrumbPath = useAtomValue(breadcrumbPathAtom);
    const jumpToNode = useSetAtom(jumpToNodeAtom);

    const handleBreadcrumbClick = (event: React.MouseEvent<HTMLAnchorElement>, nodeId: string) => {
        event.preventDefault();
        jumpToNode(nodeId);
    };

    // Don't render if no path or only root
    if (!breadcrumbPath || breadcrumbPath.length === 0) {
        return null;
    }

    // If only one item (root), show it as non-clickable
    if (breadcrumbPath.length === 1) {
        return (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Breadcrumbs aria-label="breadcrumb">
                    <Typography sx={{ color: 'text.primary', fontWeight: 500 }}>
                        {breadcrumbPath[0].title}
                    </Typography>
                </Breadcrumbs>
            </Box>
        );
    }

    return (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Breadcrumbs
                aria-label="breadcrumb"
                separator={<NavigateNextIcon fontSize="small" />}
                maxItems={5}
                sx={{
                    '& .MuiBreadcrumbs-separator': {
                        color: 'text.secondary',
                        marginX: 0.5,
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
                            '&:hover': {
                                color: 'primary.main',
                            },
                            // Truncate long titles
                            maxWidth: '150px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            display: 'inline-block',
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
                        // Truncate long titles
                        maxWidth: '200px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        display: 'inline-block',
                    }}
                    title={breadcrumbPath[breadcrumbPath.length - 1].title}
                >
                    {breadcrumbPath[breadcrumbPath.length - 1].title}
                </Typography>
            </Breadcrumbs>
        </Box>
    );
};